import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function database() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync("iomoney.db");
  return dbPromise;
}
