import { CategorySummary, LedgerFilterSummary, MonthlySummary, PeriodFilter, TransactionFilter } from "../domain/types";
import { database } from "./database";
import {
  applyTransactionFilter,
  periodCondition,
  periodLabel,
  recordedDebtPaymentCondition
} from "./queryHelpers";
import { listDebtOnlyPaymentLedgerEntries } from "./debtLedgerRepository";

export async function getMonthlySummary(month: string): Promise<MonthlySummary> {
  return getPeriodSummary({ mode: "month", month });
}

export async function getPeriodSummary(period: PeriodFilter): Promise<MonthlySummary> {
  const db = await database();
  const periodWhere = periodCondition(period);
  const recordedDebtPayment = recordedDebtPaymentCondition("transactions");
  const row = await db.getFirstAsync<{
    income: number | null;
    gift: number | null;
    refund: number | null;
    transfer: number | null;
    debt_cash_in: number | null;
    total_inflow: number | null;
    expense: number | null;
    debt_cash_out: number | null;
    count: number;
  }>(
    `SELECT
       SUM(CASE WHEN amount > 0 AND report_group = 'income' THEN amount ELSE 0 END) AS income,
       SUM(CASE WHEN amount > 0 AND report_group = 'gift' THEN amount ELSE 0 END) AS gift,
       SUM(CASE WHEN amount > 0 AND report_group = 'refund' THEN amount ELSE 0 END) AS refund,
       SUM(CASE WHEN amount > 0 AND report_group = 'transfer' THEN amount ELSE 0 END) AS transfer,
       SUM(CASE WHEN amount > 0 AND ${recordedDebtPayment} THEN amount ELSE 0 END) AS debt_cash_in,
       SUM(CASE WHEN amount > 0 AND (report_group IN ('income', 'gift', 'refund', 'transfer') OR ${recordedDebtPayment}) THEN amount ELSE 0 END) AS total_inflow,
       SUM(CASE WHEN amount < 0 AND (report_group = 'expense' OR ${recordedDebtPayment}) THEN ABS(amount) ELSE 0 END) AS expense,
       SUM(CASE WHEN amount < 0 AND ${recordedDebtPayment} THEN ABS(amount) ELSE 0 END) AS debt_cash_out,
       COUNT(*) AS count
     FROM transactions
     WHERE deleted_at IS NULL ${periodWhere.where ? `AND ${periodWhere.where}` : ""}`,
    [
      ...debtPaymentGroupParams(),
      ...debtPaymentGroupParams(),
      ...debtPaymentGroupParams(),
      ...debtPaymentGroupParams(),
      ...periodWhere.params
    ]
  );
  const income = row?.income ?? 0;
  const gift = row?.gift ?? 0;
  const refund = row?.refund ?? 0;
  const transfer = row?.transfer ?? 0;
  const debtCashIn = row?.debt_cash_in ?? 0;
  const totalInflow = row?.total_inflow ?? 0;
  const expense = row?.expense ?? 0;
  const debtCashOut = row?.debt_cash_out ?? 0;
  return {
    month: periodLabel(period),
    income,
    gift,
    refund,
    transfer,
    debtCashIn,
    totalInflow,
    expense,
    debtCashOut,
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
  const recordedDebtPayment = recordedDebtPaymentCondition("transactions");
  const rows = await db.getAllAsync<CategorySummary>(
    `SELECT category, SUM(ABS(amount)) AS amount, COUNT(*) AS count, 'expense' AS flow
     FROM transactions
     WHERE deleted_at IS NULL
       AND amount < 0
       AND (report_group = 'expense' OR ${recordedDebtPayment})
       ${periodWhere.where ? `AND ${periodWhere.where}` : ""}
     GROUP BY category
     ORDER BY amount DESC
     LIMIT 4`,
    [...debtPaymentGroupParams(), ...periodWhere.params]
  );
  return rows;
}

export async function getFullCategorySummaryForPeriod(period: PeriodFilter): Promise<CategorySummary[]> {
  const db = await database();
  const periodWhere = periodCondition(period);
  const recordedDebtPayment = recordedDebtPaymentCondition("transactions");
  const rows = await db.getAllAsync<CategorySummary>(
    `SELECT
       category,
       CASE WHEN amount > 0 THEN 'income' ELSE 'expense' END AS flow,
       SUM(ABS(amount)) AS amount,
       COUNT(*) AS count
     FROM transactions
     WHERE deleted_at IS NULL
       AND (
         report_group IN ('income', 'gift', 'refund', 'transfer', 'expense')
         OR ${recordedDebtPayment}
       )
       ${periodWhere.where ? `AND ${periodWhere.where}` : ""}
     GROUP BY flow, category
     ORDER BY flow ASC, amount DESC`,
    [...debtPaymentGroupParams(), ...periodWhere.params]
  );
  return rows;
}

export async function getLedgerFilterSummary(filter: TransactionFilter): Promise<LedgerFilterSummary> {
  const db = await database();
  const where: string[] = ["deleted_at IS NULL"];
  const params: Array<string | number> = [];
  applyTransactionFilter(filter, where, params);

  const row = await db.getFirstAsync<{ earned: number | null; spent: number | null; count: number }>(
    `SELECT
       SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS earned,
       SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) AS spent,
       COUNT(*) AS count
     FROM transactions
     WHERE ${where.join(" AND ")}`,
    params
  );

  const debtOnlyPayments = filter.scope === "debt" ? await listDebtOnlyPaymentLedgerEntries(filter) : [];
  return {
    earned: (row?.earned ?? 0) + debtOnlyPayments.reduce((sum, entry) => sum + (entry.amount > 0 ? entry.amount : 0), 0),
    spent: (row?.spent ?? 0) + debtOnlyPayments.reduce((sum, entry) => sum + (entry.amount < 0 ? entry.amount : 0), 0),
    count: (row?.count ?? 0) + debtOnlyPayments.length
  };
}

function debtPaymentGroupParams() {
  return ["loan_repayment", "debt_payment"];
}
