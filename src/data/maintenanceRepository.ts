import { CleanupItem, CleanupRecordType, UndoItem } from "../domain/types";
import { database } from "./database";

type DbExecutor = Awaited<ReturnType<typeof database>>;

type TransactionSnapshot = {
  id: number;
  uid: string;
  external_id: string | null;
  note: string;
  amount: number;
  category: string;
  report_group: string;
  debt_id: number | null;
  account: string;
  currency: string;
  date: string;
  event: string;
  exclude_report: number;
  important: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type DebtSnapshot = {
  id: number;
  uid: string;
  counterparty_id: number;
  direction: string;
  principal_amount: number;
  currency: string;
  start_date: string;
  due_date: string;
  note: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type UndoPayload =
  | { transaction: TransactionSnapshot }
  | { debt: DebtSnapshot; transactions: TransactionSnapshot[] }
  | { transactionIds: number[] }
  | { debtIds: number[] };

type UndoInsert = {
  action: UndoItem["action"];
  targetType: UndoItem["targetType"];
  targetId: number | null;
  label: string;
  payload: UndoPayload;
};

export async function listCleanupItems(): Promise<CleanupItem[]> {
  const db = await database();
  const [transactions, debts, counterparties] = await Promise.all([
    db.getAllAsync<{ id: number; note: string; amount: number; date: string; deleted_at: string }>(
      `SELECT id, note, amount, date, deleted_at
       FROM transactions
       WHERE deleted_at IS NOT NULL
       ORDER BY deleted_at DESC, id DESC`
    ),
    db.getAllAsync<{ id: number; counterparty_name: string; principal_amount: number; deleted_at: string }>(
      `SELECT d.id, c.name AS counterparty_name, d.principal_amount, d.deleted_at
       FROM debts d
       JOIN counterparties c ON c.id = d.counterparty_id
       WHERE d.deleted_at IS NOT NULL
       ORDER BY d.deleted_at DESC, d.id DESC`
    ),
    db.getAllAsync<{ id: number; name: string; type: string; deleted_at: string }>(
      `SELECT id, name, type, deleted_at
       FROM counterparties
       WHERE deleted_at IS NOT NULL
       ORDER BY deleted_at DESC, id DESC`
    )
  ]);

  return [
    ...transactions.map((item) => ({
      key: cleanupKey("transaction", item.id),
      type: "transaction" as const,
      id: item.id,
      title: item.note || "Transaction",
      subtitle: `${item.date} / ${formatSigned(item.amount)}`,
      deletedAt: item.deleted_at
    })),
    ...debts.map((item) => ({
      key: cleanupKey("debt", item.id),
      type: "debt" as const,
      id: item.id,
      title: item.counterparty_name,
      subtitle: `Debt / ${formatSigned(item.principal_amount)}`,
      deletedAt: item.deleted_at
    })),
    ...counterparties.map((item) => ({
      key: cleanupKey("counterparty", item.id),
      type: "counterparty" as const,
      id: item.id,
      title: item.name,
      subtitle: item.type === "organization" ? "Organization" : "Person",
      deletedAt: item.deleted_at
    }))
  ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

export async function purgeCleanupItems(items: Array<{ type: CleanupRecordType; id: number }>) {
  if (items.length === 0) return;
  const db = await database();
  await db.withTransactionAsync(async () => {
    for (const item of items) {
      if (item.type === "transaction") {
        await db.runAsync("DELETE FROM transactions WHERE id = ? AND deleted_at IS NOT NULL", [item.id]);
      }
      if (item.type === "debt") {
        await db.runAsync("DELETE FROM transactions WHERE debt_id = ? AND deleted_at IS NOT NULL", [item.id]);
        await db.runAsync("DELETE FROM debts WHERE id = ? AND deleted_at IS NOT NULL", [item.id]);
      }
      if (item.type === "counterparty") {
        await db.runAsync("DELETE FROM counterparties WHERE id = ? AND deleted_at IS NOT NULL", [item.id]);
      }
    }
    await db.runAsync("DELETE FROM undo_items");
  });
}

export async function listUndoItems(): Promise<UndoItem[]> {
  const db = await database();
  const rows = await db.getAllAsync<{
    id: number;
    action: UndoItem["action"];
    target_type: UndoItem["targetType"];
    target_id: number | null;
    label: string;
    created_at: string;
    undone_at: string | null;
  }>(
    `SELECT id, action, target_type, target_id, label, created_at, undone_at
     FROM undo_items
     WHERE undone_at IS NULL
     ORDER BY created_at DESC, id DESC
     LIMIT 10`
  );
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    label: row.label,
    createdAt: row.created_at,
    undoneAt: row.undone_at
  }));
}

export async function undoItem(undoId: number) {
  const db = await database();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const item = await db.getFirstAsync<{ id: number; action: UndoItem["action"]; target_type: UndoItem["targetType"]; payload: string }>(
      "SELECT id, action, target_type, payload FROM undo_items WHERE id = ? AND undone_at IS NULL",
      [undoId]
    );
    if (!item) throw new Error("Undo item not found.");
    const payload = JSON.parse(item.payload) as UndoPayload;

    if ("transaction" in payload) {
      await restoreTransactionInside(db, payload.transaction);
      if (payload.transaction.debt_id) await refreshDebtStatusInside(db, payload.transaction.debt_id, now);
    }
    if ("debt" in payload) {
      await restoreDebtInside(db, payload.debt);
      for (const transaction of payload.transactions) await restoreTransactionInside(db, transaction);
      await refreshDebtStatusInside(db, payload.debt.id, now);
    }
    if ("transactionIds" in payload) {
      for (const id of payload.transactionIds) {
        const row = await db.getFirstAsync<{ debt_id: number | null }>("SELECT debt_id FROM transactions WHERE id = ?", [id]);
        await db.runAsync("UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?", [now, now, id]);
        if (row?.debt_id) await refreshDebtStatusInside(db, row.debt_id, now);
      }
    }
    if ("debtIds" in payload) {
      for (const id of payload.debtIds) {
        await db.runAsync("UPDATE debts SET deleted_at = ?, updated_at = ? WHERE id = ?", [now, now, id]);
        await db.runAsync("UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE debt_id = ?", [now, now, id]);
      }
    }

    await db.runAsync("UPDATE undo_items SET undone_at = ? WHERE id = ?", [now, undoId]);
  });
}

export async function captureTransactionUndoInside(db: DbExecutor, action: "update" | "delete", id: number, label: string) {
  const transaction = await getTransactionSnapshotInside(db, id);
  if (!transaction) return;
  await recordUndoItemInside(db, {
    action,
    targetType: "transaction",
    targetId: id,
    label,
    payload: { transaction }
  });
}

export async function captureTransactionCreateUndoInside(db: DbExecutor, ids: number[], label: string) {
  if (ids.length === 0) return;
  await recordUndoItemInside(db, {
    action: "create",
    targetType: ids.length === 1 ? "transaction" : "transaction_batch",
    targetId: ids.length === 1 ? ids[0] : null,
    label,
    payload: { transactionIds: ids }
  });
}

export async function captureDebtUndoInside(db: DbExecutor, action: "update" | "delete", id: number, label: string) {
  const debt = await getDebtSnapshotInside(db, id);
  if (!debt) return;
  const transactions = await getDebtTransactionSnapshotsInside(db, id);
  await recordUndoItemInside(db, {
    action,
    targetType: "debt",
    targetId: id,
    label,
    payload: { debt, transactions }
  });
}

export async function captureDebtCreateUndoInside(db: DbExecutor, id: number, label: string) {
  await recordUndoItemInside(db, {
    action: "create",
    targetType: "debt",
    targetId: id,
    label,
    payload: { debtIds: [id] }
  });
}

async function recordUndoItemInside(db: DbExecutor, item: UndoInsert) {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO undo_items (action, target_type, target_id, label, payload, created_at, undone_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    [item.action, item.targetType, item.targetId, item.label, JSON.stringify(item.payload), now]
  );
  await db.runAsync(
    `DELETE FROM undo_items
     WHERE undone_at IS NULL
       AND id NOT IN (
         SELECT id FROM undo_items
         WHERE undone_at IS NULL
         ORDER BY created_at DESC, id DESC
         LIMIT 10
       )`
  );
}

async function getTransactionSnapshotInside(db: DbExecutor, id: number) {
  return db.getFirstAsync<TransactionSnapshot>("SELECT * FROM transactions WHERE id = ?", [id]);
}

async function getDebtSnapshotInside(db: DbExecutor, id: number) {
  return db.getFirstAsync<DebtSnapshot>("SELECT * FROM debts WHERE id = ?", [id]);
}

async function getDebtTransactionSnapshotsInside(db: DbExecutor, debtId: number) {
  return db.getAllAsync<TransactionSnapshot>("SELECT * FROM transactions WHERE debt_id = ? ORDER BY id", [debtId]);
}

async function restoreTransactionInside(db: DbExecutor, tx: TransactionSnapshot) {
  await db.runAsync(
    `INSERT INTO transactions
      (id, uid, external_id, note, amount, category, report_group, debt_id, account, currency, date, event, exclude_report, important, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       uid = excluded.uid,
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
      tx.id,
      tx.uid,
      tx.external_id,
      tx.note,
      tx.amount,
      tx.category,
      tx.report_group,
      tx.debt_id,
      tx.account,
      tx.currency,
      tx.date,
      tx.event,
      tx.exclude_report,
      tx.important,
      tx.created_at,
      tx.updated_at,
      tx.deleted_at
    ]
  );
}

async function restoreDebtInside(db: DbExecutor, debt: DebtSnapshot) {
  await db.runAsync(
    `INSERT INTO debts
      (id, uid, counterparty_id, direction, principal_amount, currency, start_date, due_date, note, status, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       uid = excluded.uid,
       counterparty_id = excluded.counterparty_id,
       direction = excluded.direction,
       principal_amount = excluded.principal_amount,
       currency = excluded.currency,
       start_date = excluded.start_date,
       due_date = excluded.due_date,
       note = excluded.note,
       status = excluded.status,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    [
      debt.id,
      debt.uid,
      debt.counterparty_id,
      debt.direction,
      debt.principal_amount,
      debt.currency,
      debt.start_date,
      debt.due_date,
      debt.note,
      debt.status,
      debt.created_at,
      debt.updated_at,
      debt.deleted_at
    ]
  );
}

async function refreshDebtStatusInside(db: DbExecutor, debtId: number, now: string) {
  await db.runAsync(
    `UPDATE debts
     SET status = CASE
       WHEN COALESCE((
         SELECT SUM(
           CASE
             WHEN debts.direction = 'lent' AND transactions.amount > 0 THEN transactions.amount
             WHEN debts.direction = 'borrowed' AND transactions.amount < 0 THEN ABS(transactions.amount)
             ELSE 0
           END
         )
         FROM transactions
         WHERE transactions.debt_id = debts.id AND transactions.deleted_at IS NULL
       ), 0) >= debts.principal_amount THEN 'settled'
       WHEN COALESCE((
         SELECT SUM(
           CASE
             WHEN debts.direction = 'lent' AND transactions.amount > 0 THEN transactions.amount
             WHEN debts.direction = 'borrowed' AND transactions.amount < 0 THEN ABS(transactions.amount)
             ELSE 0
           END
         )
         FROM transactions
         WHERE transactions.debt_id = debts.id AND transactions.deleted_at IS NULL
       ), 0) > 0 THEN 'partial'
       ELSE 'open'
     END,
     updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [now, debtId]
  );
}

function cleanupKey(type: CleanupRecordType, id: number) {
  return `${type}:${id}`;
}

function formatSigned(amount: number) {
  return `${amount >= 0 ? "+" : "-"}${Math.abs(amount).toLocaleString("en-US")} VND`;
}
