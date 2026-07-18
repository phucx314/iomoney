import { database } from "./database";

type DbExecutor = Awaited<ReturnType<typeof database>>;

type ReconcileOptions = {
  debtIds?: number[];
  now?: string;
  touchUpdatedAt?: boolean;
};

const DEBT_PAYMENT_GROUPS_SQL = "'loan_repayment', 'debt_payment'";
const DEBT_PRINCIPAL_GROUPS_SQL = "'loan_out', 'borrowed'";

export async function reconcileDebtConsistencyInside(db: DbExecutor, options: ReconcileOptions = {}) {
  const now = options.now ?? new Date().toISOString();
  await normalizeDebtLinkedTransactionsInside(db);
  await migrateDebtPaymentRecordsInside(db);
  await refreshDebtStatusesInside(db, options.debtIds, now, options.touchUpdatedAt ?? false);
}

export async function normalizeDebtLinkedTransactionsInside(db: DbExecutor) {
  await db.execAsync(`
    UPDATE transactions
    SET report_group = 'borrowed'
    WHERE debt_id IS NOT NULL
      AND lower(trim(category)) = 'debt - borrowed';

    UPDATE transactions
    SET report_group = 'loan_out'
    WHERE debt_id IS NOT NULL
      AND lower(trim(category)) = 'debt - lent';

    UPDATE transactions
    SET report_group = 'loan_repayment'
    WHERE debt_id IS NOT NULL
      AND lower(trim(category)) = 'debt - repayment';

    UPDATE transactions
    SET report_group = 'debt_payment'
    WHERE debt_id IS NOT NULL
      AND lower(trim(category)) = 'debt - payment';

    UPDATE transactions
    SET amount = CASE report_group
          WHEN 'borrowed' THEN ABS(amount)
          WHEN 'loan_repayment' THEN ABS(amount)
          WHEN 'loan_out' THEN -ABS(amount)
          WHEN 'debt_payment' THEN -ABS(amount)
          ELSE amount
        END
    WHERE debt_id IS NOT NULL
      AND report_group IN (${DEBT_PRINCIPAL_GROUPS_SQL}, ${DEBT_PAYMENT_GROUPS_SQL});
  `);
}

export async function migrateDebtPaymentRecordsInside(db: DbExecutor) {
  await db.execAsync(`
    DELETE FROM debt_payments
    WHERE transaction_id IN (
      SELECT id
      FROM transactions
      WHERE report_group IN (${DEBT_PRINCIPAL_GROUPS_SQL})
    );

    UPDATE transactions
    SET debt_payment_id = NULL
    WHERE report_group IN (${DEBT_PRINCIPAL_GROUPS_SQL});

    INSERT OR IGNORE INTO debt_payments
      (uid, debt_id, amount, date, note, account, record_cash_flow, transaction_id, created_at, updated_at, deleted_at)
    SELECT
      'pay-' || tx.uid,
      tx.debt_id,
      ABS(tx.amount),
      tx.date,
      tx.note,
      tx.account,
      CASE WHEN tx.deleted_at IS NULL THEN 1 ELSE 0 END,
      tx.id,
      tx.created_at,
      tx.updated_at,
      tx.deleted_at
    FROM transactions tx
    WHERE tx.debt_id IS NOT NULL
      AND tx.report_group IN (${DEBT_PAYMENT_GROUPS_SQL});

    UPDATE debt_payments
    SET
      debt_id = (SELECT tx.debt_id FROM transactions tx WHERE tx.id = debt_payments.transaction_id),
      amount = ABS((SELECT tx.amount FROM transactions tx WHERE tx.id = debt_payments.transaction_id)),
      date = (SELECT tx.date FROM transactions tx WHERE tx.id = debt_payments.transaction_id),
      note = (SELECT tx.note FROM transactions tx WHERE tx.id = debt_payments.transaction_id),
      account = (SELECT tx.account FROM transactions tx WHERE tx.id = debt_payments.transaction_id),
      record_cash_flow = CASE
        WHEN (SELECT tx.deleted_at FROM transactions tx WHERE tx.id = debt_payments.transaction_id) IS NULL THEN 1
        ELSE 0
      END,
      updated_at = (SELECT tx.updated_at FROM transactions tx WHERE tx.id = debt_payments.transaction_id),
      deleted_at = (SELECT tx.deleted_at FROM transactions tx WHERE tx.id = debt_payments.transaction_id)
    WHERE transaction_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM transactions tx
        WHERE tx.id = debt_payments.transaction_id
          AND tx.debt_id IS NOT NULL
          AND tx.report_group IN (${DEBT_PAYMENT_GROUPS_SQL})
      );

    UPDATE transactions
    SET debt_payment_id = (
      SELECT debt_payments.id
      FROM debt_payments
      WHERE debt_payments.transaction_id = transactions.id
        AND debt_payments.record_cash_flow = 1
      LIMIT 1
    )
    WHERE debt_id IS NOT NULL
      AND report_group IN (${DEBT_PAYMENT_GROUPS_SQL})
      AND EXISTS (
        SELECT 1
        FROM debt_payments
        WHERE debt_payments.transaction_id = transactions.id
          AND debt_payments.record_cash_flow = 1
      );

    UPDATE transactions
    SET debt_payment_id = NULL
    WHERE debt_payment_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM debt_payments
        WHERE debt_payments.id = transactions.debt_payment_id
          AND debt_payments.record_cash_flow != 1
      );
  `);
}

export async function refreshDebtStatusesInside(
  db: DbExecutor,
  debtIds?: number[],
  now = new Date().toISOString(),
  touchUpdatedAt = true
) {
  const uniqueIds = Array.from(new Set((debtIds ?? []).filter((id) => Number.isInteger(id))));
  const filterSql = uniqueIds.length > 0 ? `AND id IN (${uniqueIds.map(() => "?").join(", ")})` : "";
  await db.runAsync(
    `UPDATE debts
     SET status = CASE
       WHEN COALESCE((
         SELECT SUM(debt_payments.amount)
         FROM debt_payments
         WHERE debt_payments.debt_id = debts.id AND debt_payments.deleted_at IS NULL
       ), 0) >= debts.principal_amount THEN 'settled'
       WHEN COALESCE((
         SELECT SUM(debt_payments.amount)
         FROM debt_payments
         WHERE debt_payments.debt_id = debts.id AND debt_payments.deleted_at IS NULL
       ), 0) > 0 THEN 'partial'
       ELSE 'open'
     END,
     updated_at = CASE WHEN ? = 1 THEN ? ELSE updated_at END
     WHERE deleted_at IS NULL
       ${filterSql}`,
    [touchUpdatedAt ? 1 : 0, now, ...uniqueIds]
  );
}
