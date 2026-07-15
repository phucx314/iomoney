import { CategorySummary, MonthlySummary, PeriodFilter } from "../domain/types";
import { database } from "./database";
import { periodCondition, periodLabel } from "./queryHelpers";

export async function getMonthlySummary(month: string): Promise<MonthlySummary> {
  return getPeriodSummary({ mode: "month", month });
}

export async function getPeriodSummary(period: PeriodFilter): Promise<MonthlySummary> {
  const db = await database();
  const periodWhere = periodCondition(period);
  const row = await db.getFirstAsync<{
    income: number | null;
    gift: number | null;
    refund: number | null;
    transfer: number | null;
    total_inflow: number | null;
    expense: number | null;
    count: number;
  }>(
    `SELECT
       SUM(CASE WHEN amount > 0 AND report_group = 'income' THEN amount ELSE 0 END) AS income,
       SUM(CASE WHEN amount > 0 AND report_group = 'gift' THEN amount ELSE 0 END) AS gift,
       SUM(CASE WHEN amount > 0 AND report_group = 'refund' THEN amount ELSE 0 END) AS refund,
       SUM(CASE WHEN amount > 0 AND report_group = 'transfer' THEN amount ELSE 0 END) AS transfer,
       SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_inflow,
       SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS expense,
       COUNT(*) AS count
     FROM transactions
     WHERE deleted_at IS NULL ${periodWhere.where ? `AND ${periodWhere.where}` : ""}`,
    periodWhere.params
  );
  const income = row?.income ?? 0;
  const gift = row?.gift ?? 0;
  const refund = row?.refund ?? 0;
  const transfer = row?.transfer ?? 0;
  const totalInflow = row?.total_inflow ?? 0;
  const expense = row?.expense ?? 0;
  return {
    month: periodLabel(period),
    income,
    gift,
    refund,
    transfer,
    totalInflow,
    expense,
    net: totalInflow - expense,
    count: row?.count ?? 0
  };
}

export async function getCategorySummary(month: string): Promise<CategorySummary[]> {
  return getCategorySummaryForPeriod({ mode: "month", month });
}

export async function getCategorySummaryForPeriod(period: PeriodFilter): Promise<CategorySummary[]> {
  const db = await database();
  const periodWhere = periodCondition(period);
  const rows = await db.getAllAsync<{ category: string; amount: number; count: number }>(
    `SELECT category, SUM(ABS(amount)) AS amount, COUNT(*) AS count
     FROM transactions
     WHERE deleted_at IS NULL AND amount < 0 ${periodWhere.where ? `AND ${periodWhere.where}` : ""}
     GROUP BY category
     ORDER BY amount DESC
     LIMIT 8`,
    periodWhere.params
  );
  return rows;
}
