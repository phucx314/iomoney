import { database } from "./database";

export async function initDb() {
  const db = await database();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL,
      external_id TEXT,
      note TEXT NOT NULL,
      amount INTEGER NOT NULL,
      category TEXT NOT NULL,
      report_group TEXT NOT NULL DEFAULT 'income',
      account TEXT NOT NULL,
      currency TEXT NOT NULL,
      date TEXT NOT NULL,
      event TEXT NOT NULL DEFAULT '',
      exclude_report INTEGER NOT NULL DEFAULT 0,
      important INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_dedupe
      ON transactions(date, amount, note, category, account);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS category_meta (
      name TEXT PRIMARY KEY,
      icon TEXT NOT NULL,
      default_report_group TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS counterparties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL UNIQUE,
      counterparty_id INTEGER NOT NULL,
      direction TEXT NOT NULL,
      principal_amount INTEGER NOT NULL,
      currency TEXT NOT NULL,
      start_date TEXT NOT NULL,
      due_date TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY(counterparty_id) REFERENCES counterparties(id)
    );
    CREATE INDEX IF NOT EXISTS idx_debts_counterparty ON debts(counterparty_id);
  `);
  await ensureColumn("transactions", "uid", "TEXT");
  await backfillUids();
  await ensureColumn("transactions", "important", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("transactions", "debt_id", "INTEGER");
  const addedReportGroup = await ensureColumn("transactions", "report_group", "TEXT NOT NULL DEFAULT 'income'");
  if (addedReportGroup) await backfillReportGroups();
  await ensureColumn("transactions", "deleted_at", "TEXT");
  await repairInvalidReportGroups();
  await db.execAsync("CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_uid ON transactions(uid)");
}

async function ensureColumn(table: string, column: string, definition: string) {
  const db = await database();
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    return true;
  }
  return false;
}

async function backfillUids() {
  const db = await database();
  await db.execAsync("UPDATE transactions SET uid = 'legacy-' || lower(hex(randomblob(16))) WHERE uid IS NULL OR uid = ''");
}

async function backfillReportGroups() {
  const db = await database();
  await db.execAsync(`
    UPDATE transactions
    SET report_group = CASE
      WHEN amount < 0 THEN 'expense'
      WHEN lower(category) LIKE '%gift%' OR lower(category) LIKE '%donation%' OR lower(category) LIKE '%support%' OR lower(category) LIKE '%cho%' OR lower(category) LIKE '%tang%' THEN 'gift'
      WHEN lower(category) LIKE '%refund%' OR lower(category) LIKE '%deposit%' OR lower(category) LIKE '%return%' OR lower(category) LIKE '%hoan%' THEN 'refund'
      WHEN lower(category) LIKE '%transfer%' OR lower(category) LIKE '%chuyen%' THEN 'transfer'
      ELSE 'income'
    END
    WHERE report_group IS NULL OR report_group = '' OR report_group = 'income';
  `);
}

async function repairInvalidReportGroups() {
  const db = await database();
  await db.execAsync(`
    UPDATE transactions
    SET report_group = 'expense'
    WHERE amount < 0 AND report_group NOT IN ('expense', 'loan_out', 'debt_payment');

    UPDATE transactions
    SET report_group = 'income'
    WHERE amount > 0 AND (report_group IS NULL OR report_group = '' OR report_group = 'expense');
  `);
}
