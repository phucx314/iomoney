import { isDebtPaymentReportGroup, isDebtReportGroup, normalizeReportGroup, signedDebtTransactionAmount } from "../domain/reportGroup";
import { CsvTransaction, ImportResult, NativeCsvTransaction, PeriodFilter, ReportGroup, Transaction, TransactionFilter, TransactionInput, TransactionSort } from "../domain/types";
import { csvDateToKey, monthKeyFromDate } from "./csv";
import { database } from "./database";
import { refreshDebtStatusesInside } from "./debtConsistency";
import { listDebtOnlyPaymentLedgerEntries, sortLedgerEntries } from "./debtLedgerRepository";
import { captureTransactionCreateUndoInside, captureTransactionUndoInside } from "./maintenanceRepository";
import { applyTransactionFilter, DbTransaction, fromDb, periodCondition, SQL_DATE_KEY } from "./queryHelpers";

const ACCOUNT_DEFAULT = "Cash";
const TRANSACTION_ORDER = `${SQL_DATE_KEY} DESC, created_at DESC, id DESC`;
const NATIVE_TRANSACTION_ORDER = "substr(t.date, 7, 4) || '-' || substr(t.date, 4, 2) || '-' || substr(t.date, 1, 2) DESC, t.created_at DESC, t.id DESC";
const TRANSACTION_SELECT = `
  transactions.*,
  (SELECT d.uid FROM debts d WHERE d.id = transactions.debt_id) AS debt_uid,
  (SELECT p.uid
   FROM debt_payments p
   WHERE p.id = transactions.debt_payment_id
     AND p.transaction_id = transactions.id
     AND p.deleted_at IS NULL) AS debt_payment_uid,
  (SELECT p.record_cash_flow
   FROM debt_payments p
   WHERE p.id = transactions.debt_payment_id
     AND p.transaction_id = transactions.id
     AND p.deleted_at IS NULL) AS debt_payment_record_cash_flow
`;
const TRANSACTION_SELECT_ALIAS = `
  t.*,
  d.uid AS debt_uid,
  CASE WHEN p.transaction_id = t.id AND p.deleted_at IS NULL THEN p.uid ELSE NULL END AS debt_payment_uid,
  CASE WHEN p.transaction_id = t.id AND p.deleted_at IS NULL THEN p.record_cash_flow ELSE NULL END AS debt_payment_record_cash_flow
`;

export async function importTransactions(rows: CsvTransaction[]): Promise<ImportResult> {
  const db = await database();
  const invalidRows: ImportResult["invalidRows"] = [];
  let inserted = 0;
  let skippedDuplicates = 0;
  const now = new Date().toISOString();
  await db.execAsync("DROP INDEX IF EXISTS idx_transactions_dedupe");

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        const existingDuplicate = await db.getFirstAsync<{ id: number }>(
          `SELECT id
           FROM transactions
           WHERE date = ?
             AND amount = ?
             AND note = ?
             AND category = ?
             AND account = ?
             AND debt_id IS NULL
           ORDER BY deleted_at IS NULL DESC, updated_at DESC, id DESC
           LIMIT 1`,
          [row.date, row.amount, row.note, row.category, row.account]
        );

        if (existingDuplicate) {
          await db.runAsync(
            `UPDATE transactions
             SET external_id = ?,
                 report_group = ?,
                 event = ?,
                 exclude_report = ?,
                 updated_at = ?,
                 deleted_at = NULL
             WHERE id = ?`,
            [
              row.externalId,
              normalizeReportGroup(row.amount, row.category),
              row.event,
              row.excludeReport ? 1 : 0,
              now,
              existingDuplicate.id
            ]
          );
          skippedDuplicates += 1;
          continue;
        }

        const result = await db.runAsync(
          `INSERT INTO transactions
            (uid, external_id, note, amount, category, report_group, debt_id, account, currency, date, event, exclude_report, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, NULL)`,
          [
            makeUid(),
            row.externalId,
            row.note,
            row.amount,
            row.category,
            normalizeReportGroup(row.amount, row.category),
            row.account,
            row.currency,
            row.date,
            row.event,
            row.excludeReport ? 1 : 0,
            now,
            now
          ]
        );
        if (result.changes > 0) inserted += 1;
        else skippedDuplicates += 1;
      } catch (error) {
        invalidRows.push({ row: i + 2, reason: error instanceof Error ? error.message : "insert failed" });
      }
    }
  });

  return { inserted, skippedDuplicates, invalidRows };
}

export async function listTransactions(filter: TransactionFilter, limit = 500): Promise<Transaction[]> {
  const db = await database();
  const where: string[] = ["deleted_at IS NULL"];
  const params: Array<string | number> = [];
  applyTransactionFilter(filter, where, params);

  const rows = await db.getAllAsync<DbTransaction>(
    `SELECT ${TRANSACTION_SELECT}
     FROM transactions
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY ${transactionOrder(filter.sort)}
     LIMIT ?`,
    [...params, filter.scope === "debt" ? limit * 2 : limit]
  );
  const transactions = rows.map(fromDb);
  if (filter.scope !== "debt") return transactions.slice(0, limit);

  const debtOnlyPayments = await listDebtOnlyPaymentLedgerEntries(filter);
  return sortLedgerEntries([...transactions, ...debtOnlyPayments], filter.sort).slice(0, limit);
}

export async function listTransactionsForPeriod(period: PeriodFilter, limit = 500): Promise<Transaction[]> {
  const db = await database();
  const periodWhere = periodCondition(period);
  const rows = await db.getAllAsync<DbTransaction>(
    `SELECT ${TRANSACTION_SELECT}
     FROM transactions
     WHERE deleted_at IS NULL ${periodWhere.where ? `AND ${periodWhere.where}` : ""}
     ORDER BY ${TRANSACTION_ORDER}
     LIMIT ?`,
    [...periodWhere.params, limit]
  );
  return rows.map(fromDb);
}

export async function getTransactionById(id: number): Promise<Transaction | null> {
  const db = await database();
  const row = await db.getFirstAsync<DbTransaction>(
    `SELECT ${TRANSACTION_SELECT}
     FROM transactions
     WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return row ? fromDb(row) : null;
}

export async function allTransactionsForExport(): Promise<Transaction[]> {
  const db = await database();
  const rows = await db.getAllAsync<DbTransaction>(
    `SELECT ${TRANSACTION_SELECT}
     FROM transactions
     WHERE deleted_at IS NULL
     ORDER BY ${TRANSACTION_ORDER}`
  );
  return rows.map(fromDb);
}

export async function allTransactionsForNativeExport(): Promise<Transaction[]> {
  const db = await database();
  const rows = await db.getAllAsync<DbTransaction>(
    `SELECT ${TRANSACTION_SELECT_ALIAS}
     FROM transactions t
     LEFT JOIN debts d ON d.id = t.debt_id
     LEFT JOIN debt_payments p ON p.id = t.debt_payment_id
     ORDER BY ${NATIVE_TRANSACTION_ORDER}`
  );
  return rows.map(fromDb);
}

export async function importNativeTransactions(rows: NativeCsvTransaction[]): Promise<ImportResult> {
  const db = await database();
  const invalidRows: ImportResult["invalidRows"] = [];
  let inserted = 0;
  let skippedDuplicates = 0;

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        const existing = await db.getFirstAsync<{ updated_at: string }>("SELECT updated_at FROM transactions WHERE uid = ?", [row.uid]);
        if (existing && existing.updated_at > row.updatedAt) {
          skippedDuplicates += 1;
          continue;
        }
        const result = await db.runAsync(
          `INSERT INTO transactions
            (uid, external_id, note, amount, category, report_group, debt_id, account, currency, date, event, exclude_report, important, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, (SELECT id FROM debts WHERE uid = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(uid) DO UPDATE SET
             external_id = excluded.external_id,
             note = excluded.note,
             amount = excluded.amount,
             category = excluded.category,
             report_group = excluded.report_group,
             debt_id = excluded.debt_id,
             account = excluded.account,
             currency = excluded.currency,
             date = excluded.date,
             event = excluded.event,
             exclude_report = excluded.exclude_report,
             important = excluded.important,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at`,
          [
            row.uid,
            row.externalId,
            row.note,
            row.amount,
            row.category,
            normalizeReportGroup(row.amount, row.category, row.reportGroup),
            row.debtUid ?? null,
            row.account,
            row.currency,
            row.date,
            row.event,
            row.excludeReport ? 1 : 0,
            row.important ? 1 : 0,
            row.createdAt,
            row.updatedAt,
            row.deletedAt
          ]
        );
        if (result.changes > 0) inserted += 1;
        else skippedDuplicates += 1;
      } catch (error) {
        invalidRows.push({ row: i + 2, reason: error instanceof Error ? error.message : "insert failed" });
      }
    }
  });

  return { inserted, skippedDuplicates, invalidRows };
}

export async function upsertTransaction(input: TransactionInput, id?: number) {
  const db = await database();
  const now = new Date().toISOString();
  const { amount, reportGroup } = await normalizeTransactionForSave(db, input, id);
  if (id) {
    const linkedPayment = await db.getFirstAsync<{ debt_payment_id: number | null; debt_id: number | null }>(
      "SELECT debt_payment_id, debt_id FROM transactions WHERE id = ?",
      [id]
    );
    await captureTransactionUndoInside(db, "update", id, `Edited ${input.note || "transaction"}`);
    await db.runAsync(
      `UPDATE transactions
       SET external_id = ?, note = ?, amount = ?, category = ?, account = ?, currency = ?,
           report_group = ?, debt_id = ?, date = ?, event = ?, exclude_report = ?, important = ?, updated_at = ?, deleted_at = NULL
       WHERE id = ?`,
      [
        input.externalId,
        input.note,
        amount,
        input.category,
        input.account,
        input.currency,
        reportGroup,
        input.debtId ?? null,
        input.date,
        input.event,
        input.excludeReport ? 1 : 0,
        input.important ? 1 : 0,
        now,
        id
      ]
    );
    const isPaymentCashFlow = isDebtPaymentReportGroup(reportGroup);
    if (linkedPayment?.debt_payment_id && isPaymentCashFlow) {
      await db.runAsync(
        `UPDATE debt_payments
         SET amount = ?, date = ?, note = ?, account = ?, record_cash_flow = 1, transaction_id = ?, updated_at = ?, deleted_at = NULL
         WHERE id = ?`,
        [Math.abs(amount), input.date, input.note, input.account, id, now, linkedPayment.debt_payment_id]
      );
      if (linkedPayment.debt_id) await refreshDebtStatusesInside(db, [linkedPayment.debt_id], now);
    } else if (linkedPayment?.debt_payment_id) {
      await db.runAsync("UPDATE debt_payments SET deleted_at = ?, transaction_id = NULL, updated_at = ? WHERE id = ?", [
        now,
        now,
        linkedPayment.debt_payment_id
      ]);
      await db.runAsync("UPDATE transactions SET debt_payment_id = NULL WHERE id = ?", [id]);
      if (linkedPayment.debt_id) await refreshDebtStatusesInside(db, [linkedPayment.debt_id], now);
    }
  } else {
    const result = await db.runAsync(
      `INSERT INTO transactions
        (uid, external_id, note, amount, category, report_group, debt_id, account, currency, date, event, exclude_report, important, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        input.uid ?? makeUid(),
        input.externalId,
        input.note,
        amount,
        input.category,
        reportGroup,
        input.debtId ?? null,
        input.account,
        input.currency,
        input.date,
        input.event,
        input.excludeReport ? 1 : 0,
        input.important ? 1 : 0,
        now,
        now
      ]
    );
    if (result.lastInsertRowId) await captureTransactionCreateUndoInside(db, [result.lastInsertRowId], `Added ${input.note || "transaction"}`);
  }
}

async function normalizeTransactionForSave(
  db: Awaited<ReturnType<typeof database>>,
  input: TransactionInput,
  id?: number
): Promise<{ amount: number; reportGroup: ReportGroup }> {
  if (!input.debtId) {
    return {
      amount: input.amount,
      reportGroup: normalizeReportGroup(input.amount, input.category, input.reportGroup)
    };
  }

  if (isDebtReportGroup(input.reportGroup)) {
    return {
      amount: signedDebtTransactionAmount(input.reportGroup, input.amount),
      reportGroup: input.reportGroup
    };
  }

  if (!id) throw new Error("Debt transaction report group is invalid.");

  const existing = await db.getFirstAsync<{ report_group: ReportGroup | null; debt_id: number | null; direction: "lent" | "borrowed" | null }>(
    `SELECT t.report_group, t.debt_id, d.direction
     FROM transactions t
     LEFT JOIN debts d ON d.id = t.debt_id
     WHERE t.id = ?`,
    [id]
  );
  if (!existing?.debt_id || !existing.direction) throw new Error("Debt transaction is no longer linked to a debt.");
  if (isDebtReportGroup(existing.report_group)) {
    return {
      amount: signedDebtTransactionAmount(existing.report_group, input.amount),
      reportGroup: existing.report_group
    };
  }

  const reportGroup: ReportGroup = input.amount < 0 ? (existing.direction === "lent" ? "loan_out" : "debt_payment") : existing.direction === "lent" ? "loan_repayment" : "borrowed";
  return {
    amount: signedDebtTransactionAmount(reportGroup, input.amount),
    reportGroup
  };
}

export async function createTransactions(inputs: TransactionInput[]) {
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const createdIds: number[] = [];
    for (const input of inputs) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO transactions
         (uid, external_id, note, amount, category, report_group, debt_id, account, currency, date, event, exclude_report, important, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [
          input.uid ?? makeUid(),
          input.externalId,
          input.note,
          input.amount,
          input.category,
          normalizeReportGroup(input.amount, input.category, input.reportGroup),
          input.debtId ?? null,
          input.account,
          input.currency,
          input.date,
          input.event,
          input.excludeReport ? 1 : 0,
          input.important ? 1 : 0,
          now,
          now
        ]
      );
      if (result.changes > 0 && result.lastInsertRowId) createdIds.push(result.lastInsertRowId);
    }
    await captureTransactionCreateUndoInside(db, createdIds, createdIds.length > 1 ? `Added ${createdIds.length} recurring transactions` : "Added transaction");
  });
}

export async function moveTransactionsToCategory(ids: number[], category: string) {
  if (ids.length === 0) return;
  const db = await database();
  const now = new Date().toISOString();
  const incomeReportGroup = normalizeReportGroup(1, category);
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await captureTransactionUndoInside(db, "update", id, `Moved transaction to ${category}`);
      await db.runAsync(
        "UPDATE transactions SET category = ?, report_group = CASE WHEN debt_id IS NOT NULL THEN report_group WHEN amount < 0 THEN 'expense' ELSE ? END, updated_at = ? WHERE id = ?",
        [category, incomeReportGroup, now, id]
      );
    }
  });
}

export async function markTransactionsImportant(ids: number[], important: boolean) {
  if (ids.length === 0) return;
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await captureTransactionUndoInside(db, "update", id, important ? "Marked important" : "Removed important");
      await db.runAsync("UPDATE transactions SET important = ?, updated_at = ? WHERE id = ?", [important ? 1 : 0, now, id]);
    }
  });
}

export async function deleteTransactions(ids: number[]) {
  if (ids.length === 0) return;
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const affectedDebtIds = await linkedDebtIdsForTransactions(db, ids);
    for (const id of ids) {
      await captureTransactionUndoInside(db, "delete", id, "Deleted transaction");
    }
    await unlinkDebtPaymentsForTransactionsInside(db, ids, now);
    for (const id of ids) {
      await db.runAsync("UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?", [now, now, id]);
    }
    await refreshDebtStatusesInside(db, affectedDebtIds, now);
  });
}

export async function deleteTransaction(id: number) {
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const affectedDebtIds = await linkedDebtIdsForTransactions(db, [id]);
    await captureTransactionUndoInside(db, "delete", id, "Deleted transaction");
    await unlinkDebtPaymentsForTransactionsInside(db, [id], now);
    await db.runAsync("UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?", [now, now, id]);
    await refreshDebtStatusesInside(db, affectedDebtIds, now);
  });
}

async function linkedDebtIdsForTransactions(db: Awaited<ReturnType<typeof database>>, ids: number[]) {
  if (ids.length === 0) return [];
  const rows = await db.getAllAsync<{ debt_id: number }>(
    `SELECT DISTINCT debt_id
     FROM transactions
     WHERE id IN (${ids.map(() => "?").join(", ")})
       AND debt_id IS NOT NULL
       AND deleted_at IS NULL`,
    ids
  );
  return rows.map((row) => row.debt_id);
}

async function unlinkDebtPaymentsForTransactionsInside(db: Awaited<ReturnType<typeof database>>, ids: number[], now: string) {
  if (ids.length === 0) return;
  await db.runAsync(
    `UPDATE debt_payments
     SET record_cash_flow = 0, transaction_id = NULL, updated_at = ?
     WHERE transaction_id IN (${ids.map(() => "?").join(", ")})`,
    [now, ...ids]
  );
}

export async function clearTransactions() {
  const db = await database();
  await db.runAsync("DELETE FROM transactions");
}

export async function listCategories(): Promise<string[]> {
  const db = await database();
  const rows = await db.getAllAsync<{ category: string }>(
    `SELECT name AS category FROM category_meta
     UNION
     SELECT DISTINCT category FROM transactions WHERE deleted_at IS NULL
     ORDER BY category COLLATE NOCASE`
  );
  return rows.map((row) => row.category);
}

export async function listNoteSuggestions(query: string): Promise<string[]> {
  const db = await database();
  const trimmed = query.trim();
  if (!trimmed) return [];
  const rows = await db.getAllAsync<{ note: string }>(
    `SELECT note, MAX(id) AS latest_id
     FROM transactions
     WHERE deleted_at IS NULL AND note LIKE ?
     GROUP BY note
     ORDER BY latest_id DESC
     LIMIT 8`,
    [`%${trimmed}%`]
  );
  return rows.map((row) => row.note);
}

export async function listMonths(): Promise<string[]> {
  const db = await database();
  const rows = await db.getAllAsync<{ month: string }>(
    `SELECT DISTINCT substr(date, 7, 4) || '-' || substr(date, 4, 2) AS month
     FROM transactions
     WHERE deleted_at IS NULL
     ORDER BY month DESC`
  );
  return rows.map((row) => row.month);
}

function makeUid() {
  return `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function makeBlankTransaction(date: string): TransactionInput {
  return {
    externalId: null,
    note: "",
    amount: -0,
    category: "Food & Beverage",
    reportGroup: "expense",
    debtId: null,
    account: ACCOUNT_DEFAULT,
    currency: "VND",
    date,
    event: "",
    excludeReport: false,
    important: false
  };
}

export function todayCsvDate() {
  const today = new Date();
  return `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
}

export function transactionKey(tx: Transaction | CsvTransaction) {
  return `${tx.date}|${tx.amount}|${tx.note}|${tx.category}|${tx.account}`;
}

export function sortByDateDesc<T extends { date: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => csvDateToKey(b.date).localeCompare(csvDateToKey(a.date)));
}

export function monthOf(tx: Transaction) {
  return monthKeyFromDate(tx.date);
}

function transactionOrder(sort: TransactionSort) {
  if (sort === "createdDesc") return "created_at DESC, id DESC";
  if (sort === "updatedDesc") return "updated_at DESC, id DESC";
  if (sort === "amountDesc") return "ABS(amount) DESC, created_at DESC, id DESC";
  if (sort === "amountAsc") return "ABS(amount) ASC, created_at DESC, id DESC";
  return TRANSACTION_ORDER;
}
