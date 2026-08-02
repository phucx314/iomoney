import {
  AccountBalance,
  BackupSnapshot,
  BudgetLimit,
  BudgetStatus,
  DebtReminder,
  RecurringRule,
  RecurrenceDraft,
  TransactionInput
} from "../domain/types";
import { addCycleToCsvDate } from "../shared/date";
import { database } from "./database";
import { todayCsvDate } from "./transactionsRepository";

type DbBudget = {
  id: number;
  category: string;
  month: string;
  limit_amount: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type DbAccount = {
  id: number;
  name: string;
  opening_balance: number;
  current_balance: number | null;
  transaction_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type DbRecurringRule = {
  id: number;
  uid: string;
  note: string;
  amount: number;
  category: string;
  report_group: RecurringRule["reportGroup"];
  account: string;
  currency: string;
  start_date: string;
  next_date: string;
  frequency: RecurringRule["frequency"];
  active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type DbBackup = {
  id: number;
  filename: string;
  uri: string;
  record_count: number;
  created_at: string;
  deleted_at: string | null;
};

export async function listBudgetStatuses(month = monthKey(todayCsvDate())): Promise<BudgetStatus[]> {
  const db = await database();
  const rows = await db.getAllAsync<
    DbBudget & {
      spent_amount: number | null;
    }
  >(
    `SELECT
       budget_limits.*,
       COALESCE((
         SELECT SUM(ABS(transactions.amount))
         FROM transactions
         WHERE transactions.deleted_at IS NULL
           AND transactions.amount < 0
           AND transactions.category = budget_limits.category
           AND substr(transactions.date, 7, 4) || '-' || substr(transactions.date, 4, 2) = budget_limits.month
           AND transactions.report_group IN ('expense', 'debt_payment')
       ), 0) AS spent_amount
     FROM budget_limits
     WHERE budget_limits.deleted_at IS NULL
       AND budget_limits.month = ?
     ORDER BY spent_amount DESC, budget_limits.category COLLATE NOCASE`,
    [month]
  );
  return rows.map((row) => {
    const spentAmount = row.spent_amount ?? 0;
    return {
      ...budgetFromDb(row),
      spentAmount,
      remainingAmount: row.limit_amount - spentAmount,
      usageRatio: row.limit_amount > 0 ? spentAmount / row.limit_amount : 0
    };
  });
}

export async function saveBudgetLimit(category: string, month: string, limitAmount: number) {
  const db = await database();
  const now = new Date().toISOString();
  const cleanCategory = category.trim();
  if (!cleanCategory) throw new Error("Budget category is required.");
  if (!month || month === "all") throw new Error("Budget month is required.");
  if (!Number.isInteger(limitAmount) || limitAmount <= 0) throw new Error("Budget limit must be a positive integer.");
  await db.runAsync(
    `INSERT INTO budget_limits (category, month, limit_amount, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, NULL)
     ON CONFLICT(category, month) WHERE deleted_at IS NULL
     DO UPDATE SET limit_amount = excluded.limit_amount, updated_at = excluded.updated_at`,
    [cleanCategory, month, limitAmount, now, now]
  );
}

export async function deleteBudgetLimit(id: number) {
  const db = await database();
  await db.runAsync("UPDATE budget_limits SET deleted_at = ?, updated_at = ? WHERE id = ?", [new Date().toISOString(), new Date().toISOString(), id]);
}

export async function listAccountBalances(): Promise<AccountBalance[]> {
  const db = await database();
  await ensureAccountRowsFromTransactions();
  const rows = await db.getAllAsync<DbAccount>(
    `SELECT
       accounts.*,
       accounts.opening_balance + COALESCE(SUM(transactions.amount), 0) AS current_balance,
       COUNT(transactions.id) AS transaction_count
     FROM accounts
     LEFT JOIN transactions ON transactions.account = accounts.name AND transactions.deleted_at IS NULL
     WHERE accounts.deleted_at IS NULL
     GROUP BY accounts.id
     ORDER BY accounts.name COLLATE NOCASE`
  );
  return rows.map(accountFromDb);
}

export async function saveAccount(name: string, openingBalance: number) {
  const db = await database();
  const now = new Date().toISOString();
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Account name is required.");
  if (!Number.isInteger(openingBalance)) throw new Error("Opening balance must be an integer.");
  await db.runAsync(
    `INSERT INTO accounts (name, opening_balance, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, NULL)
     ON CONFLICT(name) DO UPDATE SET opening_balance = excluded.opening_balance, updated_at = excluded.updated_at, deleted_at = NULL`,
    [cleanName, openingBalance, now, now]
  );
}

export async function deleteAccount(id: number) {
  const db = await database();
  const now = new Date().toISOString();
  await db.runAsync("UPDATE accounts SET deleted_at = ?, updated_at = ? WHERE id = ?", [now, now, id]);
}

export async function listRecurringRules(): Promise<RecurringRule[]> {
  const db = await database();
  const rows = await db.getAllAsync<DbRecurringRule>(
    `SELECT *
     FROM recurring_rules
     WHERE deleted_at IS NULL
     ORDER BY active DESC, next_date ASC, created_at DESC`
  );
  return rows.map(recurringFromDb);
}

export async function createRecurringRuleFromTransaction(input: TransactionInput, recurrence: RecurrenceDraft) {
  if (!recurrence.enabled) return;
  const db = await database();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO recurring_rules
       (uid, note, amount, category, report_group, account, currency, start_date, next_date, frequency, active, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NULL)`,
    [
      makeUid("rec"),
      input.note.trim(),
      input.amount,
      input.category.trim(),
      input.reportGroup,
      input.account.trim() || "Cash",
      input.currency.trim() || "VND",
      input.date,
      addCycleToCsvDate(input.date, recurrence.frequency, 1),
      recurrence.frequency,
      now,
      now
    ]
  );
}

export async function setRecurringRuleActive(id: number, active: boolean) {
  const db = await database();
  await db.runAsync("UPDATE recurring_rules SET active = ?, updated_at = ? WHERE id = ?", [active ? 1 : 0, new Date().toISOString(), id]);
}

export async function runDueRecurringRules(): Promise<number> {
  const db = await database();
  const today = todayCsvDate();
  const now = new Date().toISOString();
  let created = 0;
  await db.withTransactionAsync(async () => {
    const rules = await db.getAllAsync<DbRecurringRule>(
      `SELECT *
       FROM recurring_rules
       WHERE deleted_at IS NULL AND active = 1`
    );
    for (const rule of rules) {
      let nextDate = rule.next_date;
      let guard = 0;
      while (dateValue(nextDate) <= dateValue(today) && guard < 24) {
        await db.runAsync(
          `INSERT INTO transactions
             (uid, external_id, note, amount, category, report_group, account, currency, date, event, exclude_report, important, created_at, updated_at, deleted_at)
           VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, '', 0, 0, ?, ?, NULL)`,
          [
            makeUid("tx"),
            rule.note,
            rule.amount,
            rule.category,
            rule.report_group,
            rule.account,
            rule.currency,
            nextDate,
            now,
            now
          ]
        );
        created += 1;
        nextDate = addCycleToCsvDate(nextDate, rule.frequency, 1);
        guard += 1;
      }
      if (nextDate !== rule.next_date) {
        await db.runAsync("UPDATE recurring_rules SET next_date = ?, updated_at = ? WHERE id = ?", [nextDate, now, rule.id]);
      }
    }
  });
  return created;
}

export async function deleteRecurringRule(id: number) {
  const db = await database();
  await db.runAsync("UPDATE recurring_rules SET deleted_at = ?, updated_at = ? WHERE id = ?", [new Date().toISOString(), new Date().toISOString(), id]);
}

export async function listDebtReminders(windowDays = 7): Promise<DebtReminder[]> {
  const db = await database();
  const rows = await db.getAllAsync<{
    debt_id: number;
    counterparty_name: string;
    direction: "lent" | "borrowed";
    remaining_amount: number;
    due_date: string;
  }>(
    `SELECT
       debts.id AS debt_id,
       counterparties.name AS counterparty_name,
       debts.direction,
       MAX(0, debts.principal_amount - COALESCE(SUM(debt_payments.amount), 0)) AS remaining_amount,
       debts.due_date
     FROM debts
     JOIN counterparties ON counterparties.id = debts.counterparty_id
     LEFT JOIN debt_payments ON debt_payments.debt_id = debts.id AND debt_payments.deleted_at IS NULL
     WHERE debts.deleted_at IS NULL
       AND debts.status <> 'settled'
       AND debts.due_date <> ''
     GROUP BY debts.id
     HAVING remaining_amount > 0`
  );
  return rows
    .map((row) => ({
      debtId: row.debt_id,
      counterpartyName: row.counterparty_name,
      direction: row.direction,
      remainingAmount: row.remaining_amount,
      dueDate: row.due_date,
      daysUntilDue: daysBetween(todayCsvDate(), row.due_date)
    }))
    .filter((row) => row.daysUntilDue <= windowDays)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

export async function listBackupSnapshots(): Promise<BackupSnapshot[]> {
  const db = await database();
  const rows = await db.getAllAsync<DbBackup>(
    `SELECT *
     FROM backup_snapshots
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 20`
  );
  return rows.map(backupFromDb);
}

export async function recordBackupSnapshot(filename: string, uri: string, recordCount: number) {
  const db = await database();
  await db.runAsync(
    "INSERT INTO backup_snapshots (filename, uri, record_count, created_at, deleted_at) VALUES (?, ?, ?, ?, NULL)",
    [filename, uri, recordCount, new Date().toISOString()]
  );
}

export async function deleteBackupSnapshot(id: number) {
  const db = await database();
  await db.runAsync("UPDATE backup_snapshots SET deleted_at = ? WHERE id = ?", [new Date().toISOString(), id]);
}

async function ensureAccountRowsFromTransactions() {
  const db = await database();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR IGNORE INTO accounts (name, opening_balance, created_at, updated_at, deleted_at)
     SELECT DISTINCT account, 0, ?, ?, NULL
     FROM transactions
     WHERE deleted_at IS NULL AND account <> ''`,
    [now, now]
  );
}

function budgetFromDb(row: DbBudget): BudgetLimit {
  return {
    id: row.id,
    category: row.category,
    month: row.month,
    limitAmount: row.limit_amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function accountFromDb(row: DbAccount): AccountBalance {
  return {
    id: row.id,
    name: row.name,
    openingBalance: row.opening_balance,
    currentBalance: row.current_balance ?? row.opening_balance,
    transactionCount: row.transaction_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function recurringFromDb(row: DbRecurringRule): RecurringRule {
  return {
    id: row.id,
    uid: row.uid,
    note: row.note,
    amount: row.amount,
    category: row.category,
    reportGroup: row.report_group,
    account: row.account,
    currency: row.currency,
    startDate: row.start_date,
    nextDate: row.next_date,
    frequency: row.frequency,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function backupFromDb(row: DbBackup): BackupSnapshot {
  return {
    id: row.id,
    filename: row.filename,
    uri: row.uri,
    recordCount: row.record_count,
    createdAt: row.created_at,
    deletedAt: row.deleted_at
  };
}

function monthKey(date: string) {
  const [day, month, year] = date.split("/");
  void day;
  return `${year}-${month}`;
}

function daysBetween(fromDate: string, toDate: string) {
  return Math.round((dateValue(toDate) - dateValue(fromDate)) / 86_400_000);
}

function dateValue(date: string) {
  const [day, month, year] = date.split("/").map(Number);
  return new Date(year, month - 1, day).getTime();
}

function makeUid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
