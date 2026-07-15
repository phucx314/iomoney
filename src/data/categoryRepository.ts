import { AppIcon, normalizeAppIcon } from "../domain/category";
import { isReportGroup, normalizeReportGroup } from "../domain/reportGroup";
import { CategoryMetadata, ReportGroup } from "../domain/types";
import { database } from "./database";

export async function listCategoryMetadata(): Promise<CategoryMetadata[]> {
  const db = await database();
  const rows = await db.getAllAsync<{ name: string; icon: string; default_report_group: string; created_at: string; updated_at: string }>(
    "SELECT name, icon, default_report_group, created_at, updated_at FROM category_meta ORDER BY name COLLATE NOCASE"
  );
  return rows.map((row) => ({
    name: row.name,
    icon: normalizeAppIcon(row.icon),
    defaultReportGroup: isReportGroup(row.default_report_group) ? row.default_report_group : "expense",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function upsertCategoryMetadata(name: string, icon: AppIcon, defaultReportGroup: ReportGroup) {
  const db = await database();
  const now = new Date().toISOString();
  const cleanName = name.trim();
  if (!cleanName) return;
  await db.runAsync(
    `INSERT INTO category_meta (name, icon, default_report_group, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       icon = excluded.icon,
       default_report_group = excluded.default_report_group,
       updated_at = excluded.updated_at`,
    [cleanName, icon, normalizeReportGroup(defaultReportGroup === "expense" ? -1 : 1, cleanName, defaultReportGroup), now, now]
  );
}
