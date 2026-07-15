import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCategorySummaryForPeriod,
  getFullCategorySummaryForPeriod,
  getLedgerFilterSummary,
  getPeriodSummary,
  initDb,
  listCategories,
  listMonths,
  listTransactions,
  listTransactionsForPeriod
} from "../../data/db";
import { CategorySummary, LedgerFilterSummary, MonthlySummary, PeriodFilter, Transaction, TransactionFilter } from "../../domain/types";

export const EMPTY_FILTER: TransactionFilter = {
  query: "",
  period: { mode: "month", month: "all" },
  categories: [],
  flow: "all"
};

export function useLedgerData(notify: (message: string) => void) {
  const [ready, setReady] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [dashboardPeriod, setDashboardPeriod] = useState<PeriodFilter>({ mode: "month", month: "all" });
  const [filter, setFilter] = useState<TransactionFilter>(EMPTY_FILTER);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [fullCategorySummary, setFullCategorySummary] = useState<CategorySummary[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<LedgerFilterSummary>({ earned: 0, spent: 0, count: 0 });
  const monthOptions = useMemo(() => ["all", ...months], [months]);
  const categoryOptions = useMemo(() => ["all", ...categories], [categories]);

  const refresh = useCallback(async () => {
    const [txs, latest, allMonths, allCategories, monthSummary, cats, fullCats, filterSummary] = await Promise.all([
      listTransactions(filter, 500),
      listTransactionsForPeriod(dashboardPeriod, 8),
      listMonths(),
      listCategories(),
      getPeriodSummary(dashboardPeriod),
      getCategorySummaryForPeriod(dashboardPeriod),
      getFullCategorySummaryForPeriod(dashboardPeriod),
      getLedgerFilterSummary(filter)
    ]);
    setTransactions(txs);
    setRecent(latest);
    setMonths(allMonths);
    setCategories(allCategories);
    setSummary(monthSummary);
    setCategorySummary(cats);
    setFullCategorySummary(fullCats);
    setLedgerSummary(filterSummary);
  }, [dashboardPeriod, filter]);

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
    dashboardPeriod,
    setDashboardPeriod,
    filter,
    setFilter,
    summary,
    categorySummary,
    fullCategorySummary,
    ledgerSummary,
    monthOptions,
    categoryOptions,
    refresh
  };
}
