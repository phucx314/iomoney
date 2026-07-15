import { database } from "./database";

export async function getSetting(key: string): Promise<string | null> {
  const db = await database();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  const db = await database();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, now]
  );
}
