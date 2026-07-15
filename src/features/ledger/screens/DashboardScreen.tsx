import { useEffect, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategorySummary, MonthlySummary, PeriodFilter, Transaction } from "../../../domain/types";
import {
  BottomSheetModal,
  CategoryIcon,
  DateField,
  FilterButton,
  Metric,
  PrimaryButton,
  SegmentedControl,
  SelectButton,
  TransactionListItem
} from "../../../shared/components";
import { currentMonthRange } from "../../../shared/date";
import { categoryColor, compactVnd, formatSignedVnd, monthLabel } from "../../../shared/format";
import { space, styles } from "../../../shared/styles";

type DashboardScreenProps = {
  period: PeriodFilter;
  setPeriod: (period: PeriodFilter) => void;
  monthOptions: string[];
  summary: MonthlySummary | null;
  categorySummary: CategorySummary[];
  recent: Transaction[];
  onOpenTransaction: (tx: Transaction) => void;
  onOpenTransactions: () => void;
  onOpenCategories: () => void;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

export function DashboardScreen({
  period,
  setPeriod,
  monthOptions,
  summary,
  categorySummary,
  recent,
  onOpenTransaction,
  onOpenTransactions,
  onOpenCategories,
  scrollOffset,
  onScrollOffsetChange
}: DashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [incomeBreakdownOpen, setIncomeBreakdownOpen] = useState(false);
  const [netBreakdownOpen, setNetBreakdownOpen] = useState(false);
  const [draftPeriod, setDraftPeriod] = useState<PeriodFilter>(period);
  const periodModeOptions: PeriodFilter["mode"][] = ["month", "range"];
  const periodSummary = period.mode === "month" ? monthLabel(period.month) : `${period.startDate} - ${period.endDate}`;
  const draftRangePeriod = draftPeriod.mode === "range" ? draftPeriod : null;
  const openFilters = () => {
    setDraftPeriod(period);
    setFiltersOpen(true);
  };
  const applyFilters = () => {
    setPeriod(draftPeriod);
    setFiltersOpen(false);
  };
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollOffsetChange(event.nativeEvent.contentOffset.y);
  };

  useEffect(() => {
    const timeout = setTimeout(() => scrollRef.current?.scrollTo({ y: scrollOffset, animated: false }), 0);
    return () => clearTimeout(timeout);
  }, [scrollOffset]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.content}
      contentContainerStyle={[styles.contentPad, { paddingBottom: space.pageBottom + insets.bottom }]}
      onScroll={handleScroll}
      scrollEventThrottle={100}
    >
      <Text style={[styles.sectionTitle, styles.sectionTitleBlock]}>Overview</Text>
      <FilterButton label="Period" value={periodSummary} onPress={openFilters} />
      <BottomSheetModal
        visible={filtersOpen}
        title="Dashboard filters"
        onClose={() => setFiltersOpen(false)}
        footer={<PrimaryButton icon="checkmark" text="Apply filters" onPress={applyFilters} />}
      >
        <SegmentedControl
          title="Period type"
          options={periodModeOptions}
          value={draftPeriod.mode}
          onChange={(mode) =>
            setDraftPeriod(mode === "month" ? { mode, month: "all" } : draftPeriod.mode === "range" ? draftPeriod : currentMonthRange())
          }
          label={(mode) => (mode === "month" ? "Month" : "Date range")}
        />
        {draftPeriod.mode === "month" ? (
          <SelectButton
            title="Period"
            options={monthOptions}
            value={draftPeriod.month}
            onChange={(month) => setDraftPeriod({ mode: "month", month })}
            label={(month) => monthLabel(month)}
          />
        ) : null}
        {draftRangePeriod ? (
          <View style={styles.rangeGrid}>
            <DateField
              label="From"
              value={draftRangePeriod.startDate}
              onChange={(startDate) => setDraftPeriod({ mode: "range", startDate, endDate: draftRangePeriod.endDate })}
            />
            <DateField
              label="To"
              value={draftRangePeriod.endDate}
              onChange={(endDate) => setDraftPeriod({ mode: "range", startDate: draftRangePeriod.startDate, endDate })}
            />
          </View>
        ) : null}
      </BottomSheetModal>
      <View style={styles.metricGrid}>
        <Metric label="Income" value={summary?.totalInflow ?? 0} icon="trending-up" tone="income" onPress={() => setIncomeBreakdownOpen(true)} />
        <Metric label="Expense" value={summary ? -summary.expense : 0} icon="trending-down" tone="expense" />
        <Metric
          label="Net"
          value={summary?.net ?? 0}
          icon="pulse"
          tone={(summary?.net ?? 0) >= 0 ? "income" : "expense"}
          onPress={() => setNetBreakdownOpen(true)}
        />
        <Metric label="Rows" value={summary?.count ?? 0} icon="receipt" tone="neutral" isCount />
      </View>
      <BottomSheetModal visible={incomeBreakdownOpen} title="Income breakdown" onClose={() => setIncomeBreakdownOpen(false)}>
        <BreakdownRow label="Earned income" value={summary?.income ?? 0} />
        <BreakdownRow label="Gifts/Support" value={summary?.gift ?? 0} />
        <BreakdownRow label="Refund" value={summary?.refund ?? 0} />
        <BreakdownRow label="Transfer" value={summary?.transfer ?? 0} />
        <BreakdownRow label="Total income" value={summary?.totalInflow ?? 0} strong />
      </BottomSheetModal>
      <BottomSheetModal visible={netBreakdownOpen} title="Net breakdown" onClose={() => setNetBreakdownOpen(false)}>
        <BreakdownRow label="Total income" value={summary?.totalInflow ?? 0} />
        <BreakdownRow label="Expense" value={summary ? -summary.expense : 0} tone="expense" />
        <BreakdownRow label="Net" value={summary?.net ?? 0} tone={(summary?.net ?? 0) >= 0 ? "income" : "expense"} strong />
        <BreakdownRow label="Gifts/Support" value={summary?.gift ?? 0} />
        <BreakdownRow
          label="Net excl. Gifts/Support"
          value={(summary?.net ?? 0) - (summary?.gift ?? 0)}
          tone={(summary?.net ?? 0) - (summary?.gift ?? 0) >= 0 ? "income" : "expense"}
          strong
        />
      </BottomSheetModal>

      <Text style={[styles.sectionTitle, styles.sectionTitleBlock, styles.sectionTitleSpaced]}>Top categories</Text>
      <Pressable style={[styles.panel, styles.categoryPanel]} onPress={onOpenCategories}>
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
                        width: `${Math.max(space.sm, (item.amount / categorySummary[0].amount) * 100)}%`
                      }
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.amountExpense}>{compactVnd(item.amount)}</Text>
            </View>
          ))
        )}
        {categorySummary.length > 0 ? (
          <View style={styles.panelLinkRow}>
            <Text style={styles.listTextButtonText}>View all categories</Text>
          </View>
        ) : null}
      </Pressable>

      <Text style={[styles.sectionTitle, styles.sectionTitleBlock, styles.sectionTitleSpaced]}>Recent</Text>
      <View style={[styles.panel, styles.listPanel]}>
        <View style={styles.listSpacer} />
        {recent.map((tx, index) => (
          <TransactionListItem
            key={tx.id}
            tx={tx}
            onPress={() => onOpenTransaction(tx)}
            last={index === recent.length - 1}
          />
        ))}
        {recent.length === 0 ? <Text style={[styles.muted, styles.listEmptyText]}>Import CSV to start.</Text> : null}
        <Pressable style={styles.listTextButton} onPress={onOpenTransactions}>
          <Text style={styles.listTextButtonText}>View all transactions</Text>
        </Pressable>
        <View style={styles.listSpacer} />
      </View>
    </ScrollView>
  );
}

function BreakdownRow({
  label,
  value,
  tone = "income",
  strong
}: {
  label: string;
  value: number;
  tone?: "income" | "expense";
  strong?: boolean;
}) {
  const valueStyle = tone === "income" ? styles.amountIncome : styles.amountExpense;
  const totalValueStyle = tone === "income" ? styles.breakdownTotalValueIncome : styles.breakdownTotalValueExpense;
  return (
    <View style={[styles.detailRow, strong && styles.breakdownTotalRow]}>
      <Text style={strong ? styles.breakdownTotalLabel : styles.detailLabel}>{label}</Text>
      <Text style={strong ? totalValueStyle : valueStyle}>{formatSignedVnd(value)}</Text>
    </View>
  );
}
