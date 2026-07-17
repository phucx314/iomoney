import { AppNotification, AppNotificationTargetType, AppNotificationType } from "../domain/types";
import { database } from "./database";

type DbNotification = {
  id: number;
  type: AppNotificationType;
  message: string;
  target_type: AppNotificationTargetType | null;
  target_id: number | null;
  read_at: string | null;
  created_at: string;
  deleted_at: string | null;
};

type NotificationInput = {
  type: AppNotificationType;
  message: string;
  targetType?: AppNotificationTargetType;
  targetId?: number;
};

export async function listNotifications(): Promise<AppNotification[]> {
  const db = await database();
  const rows = await db.getAllAsync<DbNotification>(
    `SELECT *
     FROM app_notifications
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC, id DESC
     LIMIT 150`
  );
  return rows.map(fromDb);
}

export async function createNotification(input: NotificationInput): Promise<AppNotification> {
  const db = await database();
  const now = new Date().toISOString();
  let insertedId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO app_notifications (type, message, target_type, target_id, read_at, created_at, deleted_at)
       VALUES (?, ?, ?, ?, NULL, ?, NULL)`,
      [input.type, input.message, input.targetType ?? null, input.targetId ?? null, now]
    );
    insertedId = result.lastInsertRowId;
    await trimNotificationsInside(db);
  });
  return {
    id: insertedId,
    type: input.type,
    message: input.message,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    readAt: null,
    createdAt: now,
    deletedAt: null
  };
}

export async function markNotificationsRead(): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  await db.runAsync("UPDATE app_notifications SET read_at = ? WHERE read_at IS NULL AND deleted_at IS NULL", [now]);
}

export async function clearNotificationsSoft(): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  await db.runAsync("UPDATE app_notifications SET deleted_at = ? WHERE deleted_at IS NULL", [now]);
}

async function trimNotificationsInside(db: Awaited<ReturnType<typeof database>>) {
  await db.runAsync(
    `DELETE FROM app_notifications
     WHERE id NOT IN (
       SELECT id FROM app_notifications
       ORDER BY created_at DESC, id DESC
       LIMIT 150
     )`
  );
}

function fromDb(row: DbNotification): AppNotification {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    targetType: row.target_type,
    targetId: row.target_id,
    readAt: row.read_at,
    createdAt: row.created_at,
    deletedAt: row.deleted_at
  };
}
