import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategorySummary, MonthlySummary, PeriodFilter, Transaction } from "../../../domain/types";
import { BottomSheetModal, CategoryIcon, DateField, FilterButton, Metric, SelectButton, TransactionRow } from "../../../shared/components";
import { categoryColor, compactVnd, monthLabel } from "../../../shared/format";
import { styles } from "../../../shared/styles";

type DashboardScreenProps = {
  period: PeriodFilter;
  setPeriod: (period: PeriodFilter) => void;
  monthOptions: string[];
  summary: MonthlySummary | null;
  categorySummary: CategorySummary[];
  recent: Transaction[];
  onOpenTransaction: (tx: Transaction) => void;
};

export function DashboardScreen({
  period,
  setPeriod,
  monthOptions,
  summary,
  categorySummary,
  recent,
  onOpenTransaction
}: DashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const periodModeOptions: PeriodFilter["mode"][] = ["month", "range"];
  const periodSummary = period.mode === "month" ? monthLabel(period.month) : `${period.startDate} - ${period.endDate}`;

  return (
    <ScrollView style={styles.content} contentContainerStyle={[styles.contentPad, { paddingBottom: 104 + insets.bottom }]}>
      <Text style={styles.sectionTitle}>Overview</Text>
      <FilterButton label="Period" value={periodSummary} onPress={() => setFiltersOpen(true)} />
      <BottomSheetModal visible={filtersOpen} title="Dashboard filters" onClose={() => setFiltersOpen(false)}>
        <SelectButton
          title="Period type"
          options={periodModeOptions}
          value={period.mode}
          onChange={(mode) =>
            setPeriod(mode === "month" ? { mode, month: "all" } : period.mode === "range" ? period : currentMonthRange())
          }
          label={(mode) => (mode === "month" ? "Month" : "Date range")}
        />
        {period.mode === "month" ? (
          <SelectButton
            title="Period"
            options={monthOptions}
            value={period.month}
            onChange={(month) => setPeriod({ mode: "month", month })}
            label={(month) => monthLabel(month)}
          />
        ) : null}
        {period.mode === "range" ? (
          <View style={styles.rangeGrid}>
            <DateField label="From" value={period.startDate} onChange={(startDate) => setPeriod({ ...period, startDate })} />
            <DateField label="To" value={period.endDate} onChange={(endDate) => setPeriod({ ...period, endDate })} />
          </View>
        ) : null}
      </BottomSheetModal>
      <View style={styles.metricGrid}>
        <Metric label="Income" value={summary?.income ?? 0} icon="trending-up" tone="income" />
        <Metric label="Expense" value={summary ? -summary.expense : 0} icon="trending-down" tone="expense" />
        <Metric label="Net" value={summary?.net ?? 0} icon="pulse" tone={(summary?.net ?? 0) >= 0 ? "income" : "expense"} />
        <Metric label="Rows" value={summary?.count ?? 0} icon="receipt" tone="neutral" isCount />
      </View>

      <Text style={styles.sectionTitle}>Top categories</Text>
      <View style={styles.panel}>
        {categorySummary.length === 0 ? (
          <Text style={styles.muted}>No expense data in this period.</Text>
        ) : (
          categorySummary.map((item) => (
            <View key={item.category} style={styles.categoryRow}>
              <CategoryIcon category={item.category} size={32} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{item.category}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: categoryColor(item.category),
                        width: `${Math.max(8, (item.amount / categorySummary[0].amount) * 100)}%`
                      }
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.amountExpense}>{compactVnd(item.amount)}</Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>Recent</Text>
      <View style={styles.panel}>
        {recent.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} onPress={() => onOpenTransaction(tx)} />
        ))}
        {recent.length === 0 ? <Text style={styles.muted}>Import CSV to start.</Text> : null}
      </View>
    </ScrollView>
  );
}

function currentMonthRange(): PeriodFilter {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { mode: "range", startDate: toCsvDate(start), endDate: toCsvDate(end) };
}

function toCsvDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}
