import { normalizeReportGroup } from "../domain/reportGroup";
import { CsvTransaction, ImportResult, NativeCsvTransaction, PeriodFilter, Transaction, TransactionFilter, TransactionInput } from "../domain/types";
import { csvDateToKey, monthKeyFromDate } from "./csv";
import { database } from "./database";
import { DbTransaction, fromDb, periodCondition, SQL_DATE_KEY } from "./queryHelpers";

const ACCOUNT_DEFAULT = "Cash";

export async function importTransactions(rows: CsvTransaction[]): Promise<ImportResult> {
  const db = await database();
  const invalidRows: ImportResult["invalidRows"] = [];
  let inserted = 0;
  let skippedDuplicates = 0;
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        const result = await db.runAsync(
          `INSERT INTO transactions
            (uid, external_id, note, amount, category, report_group, debt_id, account, currency, date, event, exclude_report, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, NULL)
           ON CONFLICT(date, amount, note, category, account) DO UPDATE SET
             external_id = excluded.external_id,
             report_group = excluded.report_group,
             event = excluded.event,
             exclude_report = excluded.exclude_report,
             updated_at = excluded.updated_at,
             deleted_at = NULL`,
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

  if (filter.query.trim()) {
    where.push("(note LIKE ? OR category LIKE ? OR event LIKE ?)");
    const query = `%${filter.query.trim()}%`;
    params.push(query, query, query);
  }
  const periodWhere = periodCondition(filter.period);
  if (periodWhere.where) {
    where.push(periodWhere.where);
    params.push(...periodWhere.params);
  }
  if (filter.categories.length > 0) {
    where.push(`category IN (${filter.categories.map(() => "?").join(", ")})`);
    params.push(...filter.categories);
  }
  if (filter.flow === "expense") where.push("amount < 0");
  if (filter.flow === "income") where.push("amount > 0");

  const rows = await db.getAllAsync<DbTransaction>(
    `SELECT * FROM transactions
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY ${SQL_DATE_KEY} DESC, id DESC
     LIMIT ?`,
    [...params, limit]
  );
  return rows.map(fromDb);
}

export async function listTransactionsForPeriod(period: PeriodFilter, limit = 500): Promise<Transaction[]> {
  const db = await database();
  const periodWhere = periodCondition(period);
  const rows = await db.getAllAsync<DbTransaction>(
    `SELECT * FROM transactions
     WHERE deleted_at IS NULL ${periodWhere.where ? `AND ${periodWhere.where}` : ""}
     ORDER BY ${SQL_DATE_KEY} DESC, id DESC
     LIMIT ?`,
    [...periodWhere.params, limit]
  );
  return rows.map(fromDb);
}

export async function allTransactionsForExport(): Promise<Transaction[]> {
  const db = await database();
  const rows = await db.getAllAsync<DbTransaction>(
    `SELECT * FROM transactions
     WHERE deleted_at IS NULL
     ORDER BY ${SQL_DATE_KEY} DESC, id DESC`
  );
  return rows.map(fromDb);
}

export async function allTransactionsForNativeExport(): Promise<Transaction[]> {
  const db = await database();
  const rows = await db.getAllAsync<DbTransaction>(
    `SELECT t.*, d.uid AS debt_uid
     FROM transactions t
     LEFT JOIN debts d ON d.id = t.debt_id
     ORDER BY ${SQL_DATE_KEY} DESC, t.id DESC`
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
  const reportGroup = normalizeReportGroup(input.amount, input.category, input.reportGroup);
  if (id) {
    await db.runAsync(
      `UPDATE transactions
       SET external_id = ?, note = ?, amount = ?, category = ?, account = ?, currency = ?,
           report_group = ?, debt_id = ?, date = ?, event = ?, exclude_report = ?, important = ?, updated_at = ?, deleted_at = NULL
       WHERE id = ?`,
      [
        input.externalId,
        input.note,
        input.amount,
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
  } else {
    await db.runAsync(
      `INSERT INTO transactions
        (uid, external_id, note, amount, category, report_group, debt_id, account, currency, date, event, exclude_report, important, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        input.uid ?? makeUid(),
        input.externalId,
        input.note,
        input.amount,
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
  }
}

export async function createTransactions(inputs: TransactionInput[]) {
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const input of inputs) {
      await db.runAsync(
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
    }
  });
}

export async function moveTransactionsToCategory(ids: number[], category: string) {
  if (ids.length === 0) return;
  const db = await database();
  const now = new Date().toISOString();
  const incomeReportGroup = normalizeReportGroup(1, category);
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
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
      await db.runAsync("UPDATE transactions SET important = ?, updated_at = ? WHERE id = ?", [important ? 1 : 0, now, id]);
    }
  });
}

export async function deleteTransactions(ids: number[]) {
  if (ids.length === 0) return;
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.runAsync("UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?", [now, now, id]);
    }
  });
}

export async function deleteTransaction(id: number) {
  const db = await database();
  const now = new Date().toISOString();
  await db.runAsync("UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?", [now, now, id]);
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
