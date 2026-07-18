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
    CREATE TABLE IF NOT EXISTS debt_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL UNIQUE,
      debt_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      account TEXT NOT NULL DEFAULT 'Cash',
      record_cash_flow INTEGER NOT NULL DEFAULT 1,
      transaction_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY(debt_id) REFERENCES debts(id),
      FOREIGN KEY(transaction_id) REFERENCES transactions(id)
    );
    CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id, deleted_at);
    CREATE TABLE IF NOT EXISTS undo_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      label TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      undone_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_undo_items_active ON undo_items(undone_at, created_at);
    CREATE TABLE IF NOT EXISTS app_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      read_at TEXT,
      created_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_app_notifications_visible ON app_notifications(deleted_at, created_at);
  `);
  await ensureColumn("transactions", "uid", "TEXT");
  await backfillUids();
  await ensureColumn("transactions", "important", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("transactions", "debt_id", "INTEGER");
  await ensureColumn("transactions", "debt_payment_id", "INTEGER");
  const addedReportGroup = await ensureColumn("transactions", "report_group", "TEXT NOT NULL DEFAULT 'income'");
  if (addedReportGroup) await backfillReportGroups();
  await ensureColumn("transactions", "deleted_at", "TEXT");
  await migrateLegacyDebtPayments();
  await repairInvalidReportGroups();
  await repairLinkedDebtTransactions();
  await repairDebtStatuses();
  await db.execAsync("CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_uid ON transactions(uid)");
  await db.execAsync("CREATE INDEX IF NOT EXISTS idx_transactions_debt_payment ON transactions(debt_payment_id)");
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

async function repairLinkedDebtTransactions() {
  const db = await database();
  await db.execAsync(`
    UPDATE transactions
    SET amount = CASE report_group
          WHEN 'loan_out' THEN -ABS(amount)
          WHEN 'borrowed' THEN ABS(amount)
          ELSE amount
        END,
        debt_payment_id = NULL
    WHERE debt_id IS NOT NULL
      AND deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM debts WHERE debts.id = transactions.debt_id AND debts.deleted_at IS NULL)
      AND report_group IN ('loan_out', 'borrowed');

    UPDATE transactions
    SET amount = CASE report_group
          WHEN 'loan_repayment' THEN ABS(amount)
          WHEN 'debt_payment' THEN -ABS(amount)
          ELSE amount
        END
    WHERE debt_id IS NOT NULL
      AND deleted_at IS NULL
      AND debt_payment_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM debts WHERE debts.id = transactions.debt_id AND debts.deleted_at IS NULL)
      AND EXISTS (SELECT 1 FROM debt_payments WHERE debt_payments.id = transactions.debt_payment_id AND debt_payments.deleted_at IS NULL);
  `);
}

async function repairDebtStatuses() {
  const db = await database();
  await db.execAsync(`
    UPDATE debts
    SET status = CASE
      WHEN COALESCE((
        SELECT SUM(
          debt_payments.amount
        )
        FROM debt_payments
        WHERE debt_payments.debt_id = debts.id AND debt_payments.deleted_at IS NULL
      ), 0) >= debts.principal_amount THEN 'settled'
      WHEN COALESCE((
        SELECT SUM(
          debt_payments.amount
        )
        FROM debt_payments
        WHERE debt_payments.debt_id = debts.id AND debt_payments.deleted_at IS NULL
      ), 0) > 0 THEN 'partial'
      ELSE 'open'
    END
    WHERE deleted_at IS NULL;
  `);
}

async function migrateLegacyDebtPayments() {
  const db = await database();
  await db.execAsync(`
    UPDATE transactions
    SET report_group = 'debt_payment'
    WHERE debt_id IS NOT NULL
      AND lower(category) LIKE '%debt%'
      AND lower(category) LIKE '%payment%';

    UPDATE transactions
    SET report_group = 'loan_repayment'
    WHERE debt_id IS NOT NULL
      AND lower(category) LIKE '%debt%'
      AND lower(category) LIKE '%repayment%';

    UPDATE transactions
    SET report_group = 'borrowed'
    WHERE debt_id IS NOT NULL
      AND lower(category) LIKE '%debt%'
      AND lower(category) LIKE '%borrowed%';

    UPDATE transactions
    SET report_group = 'loan_out'
    WHERE debt_id IS NOT NULL
      AND lower(category) LIKE '%debt%'
      AND lower(category) LIKE '%lent%';

    UPDATE transactions
    SET amount = CASE report_group
          WHEN 'borrowed' THEN ABS(amount)
          WHEN 'loan_repayment' THEN ABS(amount)
          WHEN 'loan_out' THEN -ABS(amount)
          WHEN 'debt_payment' THEN -ABS(amount)
          ELSE amount
        END
    WHERE debt_id IS NOT NULL;

    INSERT OR IGNORE INTO debt_payments
      (uid, debt_id, amount, date, note, account, record_cash_flow, transaction_id, created_at, updated_at, deleted_at)
    SELECT
      'pay-' || tx.uid,
      tx.debt_id,
      CASE
        WHEN d.direction = 'lent' THEN ABS(tx.amount)
        ELSE ABS(tx.amount)
      END,
      tx.date,
      tx.note,
      tx.account,
      CASE WHEN tx.deleted_at IS NULL THEN 1 ELSE 0 END,
      tx.id,
      tx.created_at,
      tx.updated_at,
      tx.deleted_at
    FROM transactions tx
    JOIN debts d ON d.id = tx.debt_id
    WHERE tx.debt_id IS NOT NULL
      AND tx.report_group IN ('loan_repayment', 'debt_payment');

    DELETE FROM debt_payments
    WHERE transaction_id IN (
      SELECT id
      FROM transactions
      WHERE report_group IN ('loan_out', 'borrowed')
    );

    UPDATE transactions
    SET debt_payment_id = (
      SELECT debt_payments.id
      FROM debt_payments
      WHERE debt_payments.transaction_id = transactions.id
      LIMIT 1
    )
    WHERE debt_id IS NOT NULL
      AND debt_payment_id IS NULL
      AND report_group IN ('loan_repayment', 'debt_payment')
      AND EXISTS (SELECT 1 FROM debt_payments WHERE debt_payments.transaction_id = transactions.id);

    UPDATE transactions
    SET debt_payment_id = NULL
    WHERE report_group IN ('loan_out', 'borrowed');
  `);
}
