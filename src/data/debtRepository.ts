import {
  Counterparty,
  CounterpartyType,
  Debt,
  DebtDraft,
  DebtPaymentDraft,
  DebtStatus,
  DebtSummary
} from "../domain/types";
import { database } from "./database";
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
           WHEN d.direction = 'lent' AND t.report_group = 'loan_repayment' THEN t.amount
           WHEN d.direction = 'borrowed' AND t.report_group = 'debt_payment' THEN ABS(t.amount)
           ELSE 0
         END
       ) AS paid_amount
     FROM debts d
     JOIN counterparties c ON c.id = d.counterparty_id
     LEFT JOIN transactions t ON t.debt_id = d.id AND t.deleted_at IS NULL
     WHERE d.deleted_at IS NULL AND c.deleted_at IS NULL
     GROUP BY d.id
     ORDER BY
       CASE d.status WHEN 'settled' THEN 1 ELSE 0 END,
       d.updated_at DESC`
  );
  return rows.map(fromDebtSummaryDb);
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
         WHERE debt_id = ? AND report_group IN ('loan_out', 'borrowed') AND deleted_at IS NULL
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
       WHERE debt_id = ? AND report_group IN ('loan_repayment', 'debt_payment') AND deleted_at IS NULL`,
      [
        draft.direction,
        draft.direction === "lent" ? "loan_repayment" : "debt_payment",
        draft.direction === "lent" ? "Debt - repayment" : "Debt - payment",
        draft.currency || "VND",
        now,
        debtId
      ]
    );
    await refreshDebtStatusInside(debtId, now);
  });
}

export async function deleteDebt(debtId: number): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE debts SET deleted_at = ?, updated_at = ? WHERE id = ?", [now, now, debtId]);
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

    const txAmount = debt.direction === "lent" ? amount : -amount;
    await db.runAsync(
      `INSERT INTO transactions
        (uid, external_id, note, amount, category, report_group, debt_id, account, currency, date, event, exclude_report, important, created_at, updated_at, deleted_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, '', 0, 0, ?, ?, NULL)`,
      [
        makeUid("tx"),
        draft.note || (debt.direction === "lent" ? "Debt repayment received" : "Debt payment"),
        txAmount,
        debt.direction === "lent" ? "Debt - repayment" : "Debt - payment",
        debt.direction === "lent" ? "loan_repayment" : "debt_payment",
        debt.id,
        draft.account || "Cash",
        debt.currency,
        draft.date || todayCsvDate(),
        now,
        now
      ]
    );

    await refreshDebtStatusInside(debt.id, now);
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

export async function clearDebtData(): Promise<void> {
  const db = await database();
  await db.withTransactionAsync(async () => {
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

async function refreshDebtStatusInside(debtId: number, now: string) {
  const db = await database();
  const debt = await db.getFirstAsync<{ id: number; direction: "lent" | "borrowed"; principal_amount: number }>(
    "SELECT id, direction, principal_amount FROM debts WHERE id = ?",
    [debtId]
  );
  if (!debt) return;
  const paidRow = await db.getFirstAsync<{ paid: number | null }>(
    `SELECT SUM(
       CASE
         WHEN ? = 'lent' AND report_group = 'loan_repayment' THEN amount
         WHEN ? = 'borrowed' AND report_group = 'debt_payment' THEN ABS(amount)
         ELSE 0
       END
     ) AS paid
     FROM transactions
     WHERE debt_id = ? AND deleted_at IS NULL`,
    [debt.direction, debt.direction, debt.id]
  );
  const paid = paidRow?.paid ?? 0;
  const status: DebtStatus = paid >= debt.principal_amount ? "settled" : paid > 0 ? "partial" : "open";
  await db.runAsync("UPDATE debts SET status = ?, updated_at = ? WHERE id = ?", [status, now, debt.id]);
}

function makeUid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
