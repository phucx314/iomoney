import {
  Counterparty,
  CounterpartyType,
  Debt,
  DebtDraft,
  DebtPayment,
  DebtPaymentHistory,
  DebtPaymentDraft,
  DebtStatus,
  DebtSummary
} from "../domain/types";
import { database } from "./database";
import { reconcileDebtConsistencyInside, refreshDebtStatusesInside } from "./debtConsistency";
import { captureDebtCreateUndoInside, captureDebtUndoInside, captureTransactionCreateUndoInside } from "./maintenanceRepository";
import { todayCsvDate } from "./transactionsRepository";

type DbCounterparty = {
  id: number;
  uid: string;
  name: string;
  type: CounterpartyType;
  phone: string;
  note: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type DbDebtSummary = {
  id: number;
  uid: string;
  counterparty_id: number;
  counterparty_uid: string;
  counterparty_name: string;
  counterparty_type: CounterpartyType;
  direction: "lent" | "borrowed";
  principal_amount: number;
  currency: string;
  start_date: string;
  due_date: string;
  note: string;
  status: DebtStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  paid_amount: number | null;
};

export async function listCounterparties(): Promise<Counterparty[]> {
  const db = await database();
  const rows = await db.getAllAsync<DbCounterparty>(
    "SELECT * FROM counterparties WHERE deleted_at IS NULL ORDER BY updated_at DESC, name COLLATE NOCASE"
  );
  return rows.map(fromCounterpartyDb);
}

export async function listDebtSummaries(): Promise<DebtSummary[]> {
  const db = await database();
  const rows = await db.getAllAsync<DbDebtSummary>(
    `SELECT
       d.*,
       c.uid AS counterparty_uid,
       c.name AS counterparty_name,
       c.type AS counterparty_type,
       SUM(
         CASE
           WHEN p.amount IS NOT NULL THEN p.amount
           ELSE 0
         END
       ) AS paid_amount
     FROM debts d
     JOIN counterparties c ON c.id = d.counterparty_id
     LEFT JOIN debt_payments p ON p.debt_id = d.id AND p.deleted_at IS NULL
     WHERE d.deleted_at IS NULL AND c.deleted_at IS NULL
     GROUP BY d.id
     ORDER BY
       CASE d.status WHEN 'settled' THEN 1 ELSE 0 END,
       d.updated_at DESC`
  );
  return rows.map(fromDebtSummaryDb);
}

export async function listDebtPaymentHistory(): Promise<DebtPaymentHistory[]> {
  const db = await database();
  const rows = await db.getAllAsync<{
    id: number;
    uid: string;
    debt_id: number;
    amount: number;
    date: string;
    note: string;
    account: string;
    record_cash_flow: number;
    transaction_id: number | null;
    transaction_uid: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  }>(
    `SELECT p.*, tx.uid AS transaction_uid
     FROM debt_payments p
     LEFT JOIN transactions tx ON tx.id = p.transaction_id
     WHERE p.deleted_at IS NULL
     ORDER BY substr(p.date, 7, 4) || '-' || substr(p.date, 4, 2) || '-' || substr(p.date, 1, 2) DESC, p.id DESC`
  );
  return rows.map((row) => ({
    id: row.id,
    uid: row.uid,
    debtId: row.debt_id,
    amount: row.amount,
    date: row.date,
    note: row.note,
    account: row.account,
    recordCashFlow: row.record_cash_flow === 1,
    transactionId: row.transaction_id,
    transactionUid: row.transaction_uid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }));
}

export async function createDebt(draft: DebtDraft): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  const amount = Math.abs(draft.amount);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Debt amount must be a positive integer.");

  await db.withTransactionAsync(async () => {
    const counterpartyId = draft.counterpartyId ?? (await createCounterpartyInside(draft.newCounterpartyName, draft.newCounterpartyType, now));
    const debtUid = makeUid("debt");
    const debtResult = await db.runAsync(
      `INSERT INTO debts
        (uid, counterparty_id, direction, principal_amount, currency, start_date, due_date, note, status, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, NULL)`,
      [
        debtUid,
        counterpartyId,
        draft.direction,
        amount,
        draft.currency || "VND",
        draft.date || todayCsvDate(),
        draft.dueDate,
        draft.note,
        now,
        now
      ]
    );
    const debtId = debtResult.lastInsertRowId;
    const txAmount = draft.direction === "lent" ? -amount : amount;
    await db.runAsync(
      `INSERT INTO transactions
        (uid, external_id, note, amount, category, report_group, debt_id, account, currency, date, event, exclude_report, important, created_at, updated_at, deleted_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, '', 0, 0, ?, ?, NULL)`,
      [
        makeUid("tx"),
        draft.note || (draft.direction === "lent" ? "Lent money" : "Borrowed money"),
        txAmount,
        draft.direction === "lent" ? "Debt - lent" : "Debt - borrowed",
        draft.direction === "lent" ? "loan_out" : "borrowed",
        debtId,
        draft.account || "Cash",
        draft.currency || "VND",
        draft.date || todayCsvDate(),
        now,
        now
      ]
    );
    await captureDebtCreateUndoInside(db, debtId, draft.direction === "lent" ? "Added money lent" : "Added money borrowed");
  });
}

export async function updateDebt(debtId: number, draft: DebtDraft): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  const amount = Math.abs(draft.amount);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Debt amount must be a positive integer.");

  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<{ id: number }>("SELECT id FROM debts WHERE id = ? AND deleted_at IS NULL", [debtId]);
    if (!existing) throw new Error("Debt not found.");
    await captureDebtUndoInside(db, "update", debtId, "Edited debt / loan");
    const counterpartyId = draft.counterpartyId ?? (await createCounterpartyInside(draft.newCounterpartyName, draft.newCounterpartyType, now));
    await db.runAsync(
      `UPDATE debts
       SET counterparty_id = ?, direction = ?, principal_amount = ?, currency = ?, start_date = ?, due_date = ?, note = ?, updated_at = ?
       WHERE id = ?`,
      [
        counterpartyId,
        draft.direction,
        amount,
        draft.currency || "VND",
        draft.date || todayCsvDate(),
        draft.dueDate,
        draft.note,
        now,
        debtId
      ]
    );
    const txAmount = draft.direction === "lent" ? -amount : amount;
    await db.runAsync(
      `UPDATE transactions
       SET note = ?, amount = ?, category = ?, report_group = ?, account = ?, currency = ?, date = ?, updated_at = ?
       WHERE id = (
         SELECT id FROM transactions
         WHERE debt_id = ? AND deleted_at IS NULL
         ORDER BY id ASC
         LIMIT 1
       )`,
      [
        draft.note || (draft.direction === "lent" ? "Money I lent" : "Money I borrowed"),
        txAmount,
        draft.direction === "lent" ? "Debt - lent" : "Debt - borrowed",
        draft.direction === "lent" ? "loan_out" : "borrowed",
        draft.account || "Cash",
        draft.currency || "VND",
        draft.date || todayCsvDate(),
        now,
        debtId
      ]
    );
    await db.runAsync(
      `UPDATE transactions
       SET amount = CASE WHEN ? = 'lent' THEN ABS(amount) ELSE -ABS(amount) END,
           report_group = ?,
           category = ?,
           currency = ?,
           updated_at = ?
       WHERE debt_id = ? AND deleted_at IS NULL
         AND debt_payment_id IS NOT NULL`,
      [
        draft.direction,
        draft.direction === "lent" ? "loan_repayment" : "debt_payment",
        draft.direction === "lent" ? "Debt - repayment" : "Debt - payment",
        draft.currency || "VND",
        now,
        debtId
      ]
    );
    await refreshDebtStatusesInside(db, [debtId], now);
  });
}

export async function deleteDebt(debtId: number): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await captureDebtUndoInside(db, "delete", debtId, "Deleted debt / loan");
    await db.runAsync("UPDATE debts SET deleted_at = ?, updated_at = ? WHERE id = ?", [now, now, debtId]);
    await db.runAsync("UPDATE debt_payments SET deleted_at = ?, updated_at = ? WHERE debt_id = ?", [now, now, debtId]);
    await db.runAsync("UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE debt_id = ?", [now, now, debtId]);
  });
}

export async function recordDebtPayment(draft: DebtPaymentDraft): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  const amount = Math.abs(draft.amount);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Payment amount must be a positive integer.");

  await db.withTransactionAsync(async () => {
    const debt = await db.getFirstAsync<{ id: number; direction: "lent" | "borrowed"; principal_amount: number; currency: string }>(
      "SELECT id, direction, principal_amount, currency FROM debts WHERE id = ? AND deleted_at IS NULL",
      [draft.debtId]
    );
    if (!debt) throw new Error("Debt not found.");

    const existing = draft.id
      ? await db.getFirstAsync<{ id: number; uid: string; transaction_id: number | null }>(
          "SELECT id, uid, transaction_id FROM debt_payments WHERE id = ? AND debt_id = ? AND deleted_at IS NULL",
          [draft.id, debt.id]
        )
      : null;
    let paymentId = existing?.id ?? null;

    if (existing) {
      await db.runAsync(
        `UPDATE debt_payments
         SET amount = ?, date = ?, note = ?, account = ?, record_cash_flow = ?, updated_at = ?
         WHERE id = ?`,
        [amount, draft.date || todayCsvDate(), draft.note, draft.account || "Cash", draft.recordCashFlow ? 1 : 0, now, existing.id]
      );
    } else {
      const result = await db.runAsync(
        `INSERT INTO debt_payments
          (uid, debt_id, amount, date, note, account, record_cash_flow, transaction_id, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL)`,
        [makeUid("pay"), debt.id, amount, draft.date || todayCsvDate(), draft.note, draft.account || "Cash", draft.recordCashFlow ? 1 : 0, now, now]
      );
      paymentId = result.lastInsertRowId;
    }

    if (!paymentId) throw new Error("Debt payment save failed.");
    if (draft.recordCashFlow) {
      const transactionId = await upsertDebtPaymentTransactionInside(db, paymentId, existing?.transaction_id ?? null, debt, draft, amount, now);
      await db.runAsync("UPDATE debt_payments SET transaction_id = ?, updated_at = ? WHERE id = ?", [transactionId, now, paymentId]);
    } else if (existing?.transaction_id) {
      await db.runAsync("UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?", [now, now, existing.transaction_id]);
      await db.runAsync("UPDATE debt_payments SET transaction_id = NULL, updated_at = ? WHERE id = ?", [now, paymentId]);
    }

    await refreshDebtStatusesInside(db, [debt.id], now);
  });
}

export async function allCounterpartiesForExport(): Promise<Counterparty[]> {
  const db = await database();
  const rows = await db.getAllAsync<DbCounterparty>("SELECT * FROM counterparties ORDER BY id");
  return rows.map(fromCounterpartyDb);
}

export async function allDebtsForExport(): Promise<Debt[]> {
  const db = await database();
  const rows = await db.getAllAsync<DbDebtSummary>(
    `SELECT d.*, c.uid AS counterparty_uid, c.name AS counterparty_name, c.type AS counterparty_type, 0 AS paid_amount
     FROM debts d
     JOIN counterparties c ON c.id = d.counterparty_id
     ORDER BY d.id`
  );
  return rows.map((row) => ({
    id: row.id,
    uid: row.uid,
    counterpartyId: row.counterparty_id,
    counterpartyUid: row.counterparty_uid,
    direction: row.direction,
    principalAmount: row.principal_amount,
    currency: row.currency,
    startDate: row.start_date,
    dueDate: row.due_date,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }));
}

export async function allDebtPaymentsForExport(): Promise<DebtPayment[]> {
  const db = await database();
  const rows = await db.getAllAsync<{
    id: number;
    uid: string;
    debt_id: number;
    debt_uid: string;
    amount: number;
    date: string;
    note: string;
    account: string;
    record_cash_flow: number;
    transaction_id: number | null;
    transaction_uid: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  }>(
    `SELECT p.*, d.uid AS debt_uid, tx.uid AS transaction_uid
     FROM debt_payments p
     JOIN debts d ON d.id = p.debt_id
     LEFT JOIN transactions tx ON tx.id = p.transaction_id
     ORDER BY p.id`
  );
  return rows.map((row) => ({
    id: row.id,
    uid: row.uid,
    debtId: row.debt_id,
    debtUid: row.debt_uid,
    amount: row.amount,
    date: row.date,
    note: row.note,
    account: row.account,
    recordCashFlow: row.record_cash_flow === 1,
    transactionId: row.transaction_id,
    transactionUid: row.transaction_uid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }));
}

export async function importNativeCounterparties(counterparties: Omit<Counterparty, "id">[]): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const counterparty of counterparties) {
      await db.runAsync(
        `INSERT INTO counterparties (uid, name, type, phone, note, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(uid) DO UPDATE SET
           name = excluded.name,
           type = excluded.type,
           phone = excluded.phone,
           note = excluded.note,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at`,
        [
          counterparty.uid,
          counterparty.name,
          counterparty.type,
          counterparty.phone,
          counterparty.note,
          counterparty.createdAt || now,
          counterparty.updatedAt || now,
          counterparty.deletedAt
        ]
      );
    }
  });
}

export async function importNativeDebts(debts: Array<Omit<Debt, "id" | "counterpartyId"> & { counterpartyUid: string }>): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const debt of debts) {
      const counterparty = await db.getFirstAsync<{ id: number }>("SELECT id FROM counterparties WHERE uid = ?", [debt.counterpartyUid]);
      if (!counterparty) continue;
      await db.runAsync(
        `INSERT INTO debts
          (uid, counterparty_id, direction, principal_amount, currency, start_date, due_date, note, status, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(uid) DO UPDATE SET
           counterparty_id = excluded.counterparty_id,
           direction = excluded.direction,
           principal_amount = excluded.principal_amount,
           currency = excluded.currency,
           start_date = excluded.start_date,
           due_date = excluded.due_date,
           note = excluded.note,
           status = excluded.status,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at`,
        [
          debt.uid,
          counterparty.id,
          debt.direction,
          debt.principalAmount,
          debt.currency,
          debt.startDate,
          debt.dueDate,
          debt.note,
          debt.status,
          debt.createdAt || now,
          debt.updatedAt || now,
          debt.deletedAt
        ]
      );
    }
  });
}

export async function importNativeDebtPayments(payments: Array<Omit<DebtPayment, "id" | "debtId" | "transactionId"> & { debtUid: string }>): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const payment of payments) {
      const debt = await db.getFirstAsync<{ id: number }>("SELECT id FROM debts WHERE uid = ?", [payment.debtUid]);
      if (!debt) continue;
      const transaction = payment.transactionUid
        ? await db.getFirstAsync<{ id: number }>("SELECT id FROM transactions WHERE uid = ?", [payment.transactionUid])
        : null;
      await db.runAsync(
        `INSERT INTO debt_payments
          (uid, debt_id, amount, date, note, account, record_cash_flow, transaction_id, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(uid) DO UPDATE SET
           debt_id = excluded.debt_id,
           amount = excluded.amount,
           date = excluded.date,
           note = excluded.note,
           account = excluded.account,
           record_cash_flow = excluded.record_cash_flow,
           transaction_id = excluded.transaction_id,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at`,
        [
          payment.uid,
          debt.id,
          Math.abs(payment.amount),
          payment.date,
          payment.note,
          payment.account,
          payment.recordCashFlow ? 1 : 0,
          transaction?.id ?? null,
          payment.createdAt || now,
          payment.updatedAt || now,
          payment.deletedAt
        ]
      );
      const savedPayment = await db.getFirstAsync<{ id: number }>("SELECT id FROM debt_payments WHERE uid = ?", [payment.uid]);
      if (savedPayment && transaction?.id) {
        await db.runAsync("UPDATE transactions SET debt_payment_id = ?, debt_id = ? WHERE id = ?", [savedPayment.id, debt.id, transaction.id]);
      }
      await refreshDebtStatusesInside(db, [debt.id], payment.updatedAt || now, false);
    }
  });
}

export async function reconcileLegacyDebtPayments(): Promise<void> {
  const db = await database();
  await db.withTransactionAsync(async () => {
    await reconcileDebtConsistencyInside(db);
  });
}

export async function clearDebtData(): Promise<void> {
  const db = await database();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM debt_payments");
    await db.runAsync("DELETE FROM debts");
    await db.runAsync("DELETE FROM counterparties");
  });
}

async function createCounterpartyInside(name: string, type: CounterpartyType, now: string) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Counterparty is required.");
  const db = await database();
  const existing = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM counterparties WHERE lower(name) = lower(?) AND deleted_at IS NULL",
    [cleanName]
  );
  if (existing) return existing.id;
  const result = await db.runAsync(
    `INSERT INTO counterparties (uid, name, type, phone, note, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, '', '', ?, ?, NULL)`,
    [makeUid("party"), cleanName, type, now, now]
  );
  return result.lastInsertRowId;
}

function fromCounterpartyDb(row: DbCounterparty): Counterparty {
  return {
    id: row.id,
    uid: row.uid,
    name: row.name,
    type: row.type,
    phone: row.phone,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function fromDebtSummaryDb(row: DbDebtSummary): DebtSummary {
  const paidAmount = row.paid_amount ?? 0;
  return {
    id: row.id,
    uid: row.uid,
    counterpartyId: row.counterparty_id,
    counterpartyUid: row.counterparty_uid,
    counterpartyName: row.counterparty_name,
    counterpartyType: row.counterparty_type,
    direction: row.direction,
    principalAmount: row.principal_amount,
    paidAmount,
    remainingAmount: Math.max(0, row.principal_amount - paidAmount),
    currency: row.currency,
    startDate: row.start_date,
    dueDate: row.due_date,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

async function upsertDebtPaymentTransactionInside(
  db: Awaited<ReturnType<typeof database>>,
  paymentId: number,
  transactionId: number | null,
  debt: { id: number; direction: "lent" | "borrowed"; currency: string },
  draft: DebtPaymentDraft,
  amount: number,
  now: string
) {
  const txAmount = debt.direction === "lent" ? amount : -amount;
  const note = draft.note || (debt.direction === "lent" ? "Debt repayment received" : "Debt payment");
  const category = debt.direction === "lent" ? "Debt - repayment" : "Debt - payment";
  const reportGroup = debt.direction === "lent" ? "loan_repayment" : "debt_payment";
  const date = draft.date || todayCsvDate();
  const account = draft.account || "Cash";

  if (transactionId) {
    const existing = await db.getFirstAsync<{ id: number }>("SELECT id FROM transactions WHERE id = ?", [transactionId]);
    if (existing) {
      await db.runAsync(
        `UPDATE transactions
         SET note = ?, amount = ?, category = ?, report_group = ?, debt_id = ?, debt_payment_id = ?, account = ?, currency = ?, date = ?, updated_at = ?, deleted_at = NULL
         WHERE id = ?`,
        [note, txAmount, category, reportGroup, debt.id, paymentId, account, debt.currency, date, now, transactionId]
      );
      return transactionId;
    }
  }

  const result = await db.runAsync(
    `INSERT INTO transactions
      (uid, external_id, note, amount, category, report_group, debt_id, debt_payment_id, account, currency, date, event, exclude_report, important, created_at, updated_at, deleted_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 0, 0, ?, ?, NULL)`,
    [makeUid("tx"), note, txAmount, category, reportGroup, debt.id, paymentId, account, debt.currency, date, now, now]
  );
  if (result.lastInsertRowId) {
    await captureTransactionCreateUndoInside(
      db,
      [result.lastInsertRowId],
      debt.direction === "lent" ? "Recorded debt repayment" : "Recorded debt payment"
    );
  }
  return result.lastInsertRowId;
}

function makeUid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
