import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCashflowTrend,
  getFullCategorySummaryForPeriod,
  getLedgerFilterSummary,
  getPeriodSummary,
  getReportOverview,
  initDb,
  listAccountBalances,
  listBackupSnapshots,
  listCounterparties,
  listDebtPaymentHistory,
  listDebtReminders,
  listDebtSummaries,
  listCategoryMetadata,
  listCategories,
  listMonths,
  listBudgetStatuses,
  listRecurringRules,
  listTransactions,
  listTransactionsForPeriod
} from "../../data/db";
import { setCategoryIconOverrides } from "../../domain/category";
import {
  CategoryMetadata,
  CategorySummary,
  CashflowTrendPoint,
  AccountBalance,
  BackupSnapshot,
  BudgetStatus,
  Counterparty,
  DebtSummary,
  DebtPaymentHistory,
  DebtReminder,
  LedgerFilterSummary,
  MonthlySummary,
  PeriodFilter,
  RecurringRule,
  ReportOverview,
  Transaction,
  TransactionFilter
} from "../../domain/types";

export const EMPTY_FILTER: TransactionFilter = {
  query: "",
  period: { mode: "month", month: "all" },
  categories: [],
  flow: "all",
  scope: "all",
  sort: "dateDesc"
};

export function useLedgerData(notify: (message: string) => void) {
  const [ready, setReady] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryMetadata, setCategoryMetadata] = useState<CategoryMetadata[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [debts, setDebts] = useState<DebtSummary[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPaymentHistory[]>([]);
  const [dashboardPeriod, setDashboardPeriod] = useState<PeriodFilter>({ mode: "month", month: "all" });
  const [categoryPeriod, setCategoryPeriod] = useState<PeriodFilter>({ mode: "month", month: "all" });
  const [filter, setFilter] = useState<TransactionFilter>(EMPTY_FILTER);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [fullCategorySummary, setFullCategorySummary] = useState<CategorySummary[]>([]);
  const [categoryDetailsSummary, setCategoryDetailsSummary] = useState<CategorySummary[]>([]);
  const [reportCategorySummary, setReportCategorySummary] = useState<CategorySummary[]>([]);
  const [cashflowTrend, setCashflowTrend] = useState<CashflowTrendPoint[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<LedgerFilterSummary>({ earned: 0, spent: 0, count: 0 });
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [backupSnapshots, setBackupSnapshots] = useState<BackupSnapshot[]>([]);
  const [debtReminders, setDebtReminders] = useState<DebtReminder[]>([]);
  const [reportOverview, setReportOverview] = useState<ReportOverview | null>(null);
  const monthOptions = useMemo(() => uniqueOptions(["all", ...months]), [months]);
  const categoryOptions = useMemo(() => uniqueOptions(["all", ...categories]), [categories]);

  const refresh = useCallback(async () => {
    const [
      txs,
      latest,
      allMonths,
      allCategories,
      meta,
      allCounterparties,
      debtRows,
      debtPaymentRows,
      monthSummary,
      fullCats,
      categoryDetailCats,
      reportCats,
      trend,
      filterSummary,
      budgets,
      accounts,
      rules,
      backups,
      reminders,
      overview
    ] = await Promise.all([
      listTransactions(filter, 500),
      listTransactionsForPeriod(dashboardPeriod, 8),
      listMonths(),
      listCategories(),
      listCategoryMetadata(),
      listCounterparties(),
      listDebtSummaries(),
      listDebtPaymentHistory(),
      getPeriodSummary(dashboardPeriod),
      getFullCategorySummaryForPeriod(dashboardPeriod),
      getFullCategorySummaryForPeriod(categoryPeriod),
      getFullCategorySummaryForPeriod({ mode: "month", month: "all" }),
      getCashflowTrend(null),
      getLedgerFilterSummary(filter),
      listBudgetStatuses(dashboardPeriod.mode === "month" && dashboardPeriod.month !== "all" ? dashboardPeriod.month : undefined),
      listAccountBalances(),
      listRecurringRules(),
      listBackupSnapshots(),
      listDebtReminders(),
      getReportOverview()
    ]);
    setTransactions(txs);
    setRecent(latest);
    setMonths(allMonths);
    setCategories(allCategories);
    setCategoryMetadata(meta);
    setCounterparties(allCounterparties);
    setDebts(debtRows);
    setDebtPayments(debtPaymentRows);
    setCategoryIconOverrides(Object.fromEntries(meta.map((item) => [item.name, item.icon])));
    setSummary(monthSummary);
    setFullCategorySummary(fullCats);
    setCategoryDetailsSummary(categoryDetailCats);
    setReportCategorySummary(reportCats);
    setCashflowTrend(trend);
    setLedgerSummary(filterSummary);
    setBudgetStatuses(budgets);
    setAccountBalances(accounts);
    setRecurringRules(rules);
    setBackupSnapshots(backups);
    setDebtReminders(reminders);
    setReportOverview(overview);
  }, [categoryPeriod, dashboardPeriod, filter]);

  useEffect(() => {
    initDb()
      .then(() => setReady(true))
      .catch((error) => {
        notify(error instanceof Error ? error.message : "Cannot initialize database");
        setReady(true);
      });
  }, [notify]);

  useEffect(() => {
    if (ready) refresh().catch((error) => notify(error instanceof Error ? error.message : "Refresh failed"));
  }, [notify, ready, refresh]);

  return {
    ready,
    transactions,
    recent,
    months,
    categories,
    categoryMetadata,
    counterparties,
    debts,
    debtPayments,
    dashboardPeriod,
    setDashboardPeriod,
    categoryPeriod,
    setCategoryPeriod,
    filter,
    setFilter,
    summary,
    fullCategorySummary,
    categoryDetailsSummary,
    reportCategorySummary,
    cashflowTrend,
    ledgerSummary,
    budgetStatuses,
    accountBalances,
    recurringRules,
    backupSnapshots,
    debtReminders,
    reportOverview,
    monthOptions,
    categoryOptions,
    refresh
  };
}

function uniqueOptions(options: string[]) {
  return Array.from(new Set(options));
}
