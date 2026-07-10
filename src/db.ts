import * as SQLite from "expo-sqlite";
import { csvDateToKey, monthKeyFromDate } from "./csv";
import {
  CategorySummary,
  CsvTransaction,
  ImportResult,
  MonthlySummary,
  Transaction,
  TransactionFilter,
  TransactionInput
} from "./types";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function database() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync("iomoney.db");
  return dbPromise;
}

export async function initDb() {
  const db = await database();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT,
      note TEXT NOT NULL,
      amount INTEGER NOT NULL,
      category TEXT NOT NULL,
      account TEXT NOT NULL,
      currency TEXT NOT NULL,
      date TEXT NOT NULL,
      event TEXT NOT NULL DEFAULT '',
      exclude_report INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_dedupe
      ON transactions(date, amount, note, category, account);
  `);
}

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
          `INSERT OR IGNORE INTO transactions
            (external_id, note, amount, category, account, currency, date, event, exclude_report, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.externalId,
            row.note,
            row.amount,
            row.category,
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
  const where: string[] = [];
  const params: Array<string | number> = [];

  if (filter.query.trim()) {
    where.push("(note LIKE ? OR category LIKE ? OR event LIKE ?)");
    const query = `%${filter.query.trim()}%`;
    params.push(query, query, query);
  }
  if (filter.month !== "all") {
    where.push("substr(date, 7, 4) || '-' || substr(date, 4, 2) = ?");
    params.push(filter.month);
  }
  if (filter.category !== "all") {
    where.push("category = ?");
    params.push(filter.category);
  }
  if (filter.flow === "expense") where.push("amount < 0");
  if (filter.flow === "income") where.push("amount > 0");

  const rows = await db.getAllAsync<DbTransaction>(
    `SELECT * FROM transactions
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY substr(date, 7, 4) || '-' || substr(date, 4, 2) || '-' || substr(date, 1, 2) DESC,
              id DESC
     LIMIT ?`,
    [...params, limit]
  );
  return rows.map(fromDb);
}

export async function allTransactionsForExport(): Promise<Transaction[]> {
  const db = await database();
  const rows = await db.getAllAsync<DbTransaction>(
    `SELECT * FROM transactions
     ORDER BY substr(date, 7, 4) || '-' || substr(date, 4, 2) || '-' || substr(date, 1, 2) DESC,
              id DESC`
  );
  return rows.map(fromDb);
}

export async function upsertTransaction(input: TransactionInput, id?: number) {
  const db = await database();
  const now = new Date().toISOString();
  if (id) {
    await db.runAsync(
      `UPDATE transactions
       SET external_id = ?, note = ?, amount = ?, category = ?, account = ?, currency = ?,
           date = ?, event = ?, exclude_report = ?, updated_at = ?
       WHERE id = ?`,
      [
        input.externalId,
        input.note,
        input.amount,
        input.category,
        input.account,
        input.currency,
        input.date,
        input.event,
        input.excludeReport ? 1 : 0,
        now,
        id
      ]
    );
  } else {
    await db.runAsync(
      `INSERT INTO transactions
        (external_id, note, amount, category, account, currency, date, event, exclude_report, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.externalId,
        input.note,
        input.amount,
        input.category,
        input.account,
        input.currency,
        input.date,
        input.event,
        input.excludeReport ? 1 : 0,
        now,
        now
      ]
    );
  }
}

export async function deleteTransaction(id: number) {
  const db = await database();
  await db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);
}

export async function clearTransactions() {
  const db = await database();
  await db.runAsync("DELETE FROM transactions");
}

export async function listCategories(): Promise<string[]> {
  const db = await database();
  const rows = await db.getAllAsync<{ category: string }>(
    "SELECT DISTINCT category FROM transactions ORDER BY category COLLATE NOCASE"
  );
  return rows.map((row) => row.category);
}

export async function listMonths(): Promise<string[]> {
  const db = await database();
  const rows = await db.getAllAsync<{ month: string }>(
    `SELECT DISTINCT substr(date, 7, 4) || '-' || substr(date, 4, 2) AS month
     FROM transactions
     ORDER BY month DESC`
  );
  return rows.map((row) => row.month);
}

export async function getMonthlySummary(month: string): Promise<MonthlySummary> {
  const transactions = await listTransactions({ query: "", month, category: "all", flow: "all" }, 100000);
  const income = transactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
  const expense = transactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  return { month, income, expense, net: income - expense, count: transactions.length };
}

export async function getCategorySummary(month: string): Promise<CategorySummary[]> {
  const db = await database();
  const rows = await db.getAllAsync<{ category: string; amount: number; count: number }>(
    `SELECT category, SUM(ABS(amount)) AS amount, COUNT(*) AS count
     FROM transactions
     WHERE amount < 0 AND (? = 'all' OR substr(date, 7, 4) || '-' || substr(date, 4, 2) = ?)
     GROUP BY category
     ORDER BY amount DESC
     LIMIT 8`,
    [month, month]
  );
  return rows;
}

export function makeBlankTransaction(date: string): TransactionInput {
  return {
    externalId: null,
    note: "",
    amount: -0,
    category: "Food & Beverage",
    account: ACCOUNT_DEFAULT,
    currency: "VND",
    date,
    event: "",
    excludeReport: false
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

const ACCOUNT_DEFAULT = "Chi tiêu kiểu:";

type DbTransaction = {
  id: number;
  external_id: string | null;
  note: string;
  amount: number;
  category: string;
  account: string;
  currency: string;
  date: string;
  event: string;
  exclude_report: number;
  created_at: string;
  updated_at: string;
};

function fromDb(row: DbTransaction): Transaction {
  return {
    id: row.id,
    externalId: row.external_id,
    note: row.note,
    amount: row.amount,
    category: row.category,
    account: row.account,
    currency: row.currency,
    date: row.date,
    event: row.event,
    excludeReport: row.exclude_report === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
