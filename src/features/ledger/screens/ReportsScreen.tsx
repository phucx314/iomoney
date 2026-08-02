import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategorySummary, CashflowTrendPoint, ReportOverview } from "../../../domain/types";
import { compactVnd, formatSignedVnd } from "../../../shared/format";
import { space, styles, theme } from "../../../shared/styles";

type ReportsScreenProps = {
  overview: ReportOverview | null;
  trend: CashflowTrendPoint[];
  categories: CategorySummary[];
  onBack: () => void;
  onOpenCashflow: () => void;
  onOpenCategories: () => void;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

export function ReportsScreen({
  overview,
  trend,
  categories,
  onBack,
  onOpenCashflow,
  onOpenCategories,
  scrollOffset,
  onScrollOffsetChange
}: ReportsScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const expenseCategories = categories.filter((item) => item.flow === "expense").slice(0, 5);
  const incomeCategories = categories.filter((item) => item.flow === "income").slice(0, 5);
  const recentTrend = trend.slice(-6);
  const maxFlow = Math.max(1, ...recentTrend.flatMap((point) => [point.cashIn, point.cashOut]));
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollOffsetChange(event.nativeEvent.contentOffset.y);
  };

  useEffect(() => {
    const timeout = setTimeout(() => scrollRef.current?.scrollTo({ y: scrollOffset, animated: false }), 0);
    return () => clearTimeout(timeout);
  }, [scrollOffset]);

  return (
    <View style={styles.content}>
      <View style={styles.secondaryHeader}>
        <Pressable style={styles.pageBackButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.secondaryHeaderTitle} numberOfLines={1}>
          Reports
        </Text>
        <View style={styles.secondaryHeaderSpacer} />
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={[styles.contentPad, { paddingBottom: space.pageBottom + insets.bottom }]}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        <View style={styles.metricGrid}>
          <ReportStat label="Cash in" value={overview?.totalCashIn ?? 0} tone="income" />
          <ReportStat label="Cash out" value={-(overview?.totalCashOut ?? 0)} tone="expense" />
          <ReportStat label="Net" value={overview?.net ?? 0} tone={(overview?.net ?? 0) >= 0 ? "income" : "expense"} />
          <ReportStat label="Avg. net" value={overview?.averageMonthlyNet ?? 0} tone={(overview?.averageMonthlyNet ?? 0) >= 0 ? "income" : "expense"} />
        </View>

        <Pressable style={[styles.graphPanel, styles.panelSpaced]} onPress={onOpenCashflow}>
          <View style={styles.graphHeader}>
            <View style={styles.graphTitleRow}>
              <Ionicons name="analytics-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.graphTitle}>Cashflow report</Text>
            </View>
            <Text style={styles.graphActionText}>Open</Text>
          </View>
          <View style={styles.cashflowChart}>
            {recentTrend.map((point) => (
              <View key={point.month} style={styles.cashflowColumn}>
                <View style={styles.cashflowBars}>
                  <View style={styles.cashflowTrack}>
                    <View style={[styles.cashflowBar, styles.cashflowBarIncome, { height: barHeight(point.cashIn, maxFlow) }]} />
                  </View>
                  <View style={styles.cashflowTrack}>
                    <View style={[styles.cashflowBar, styles.cashflowBarExpense, { height: barHeight(point.cashOut, maxFlow) }]} />
                  </View>
                </View>
                <Text style={styles.cashflowMonth}>{shortMonthLabel(point.month)}</Text>
              </View>
            ))}
          </View>
        </Pressable>

        <Pressable style={[styles.panel, styles.panelSpaced]} onPress={onOpenCategories}>
          <View style={styles.graphHeader}>
            <View style={styles.graphTitleRow}>
              <Ionicons name="pie-chart-outline" size={18} color={theme.colors.warning} />
              <Text style={styles.graphTitle}>Category report</Text>
            </View>
            <Text style={styles.graphActionText}>Open</Text>
          </View>
          <CategoryList title="Top spending" items={expenseCategories} tone="expense" />
          <CategoryList title="Top income" items={incomeCategories} tone="income" />
        </Pressable>

        <View style={[styles.graphSignalPanel, styles.panelSpaced]}>
          <Ionicons name="trophy-outline" size={20} color={theme.colors.accent} />
          <View style={styles.flex}>
            <Text style={styles.graphSignalTitle}>Best / weakest month</Text>
            <Text style={styles.graphSignalText}>
              Best {overview?.bestMonth ? `${shortMonthLabel(overview.bestMonth.month)} ${formatSignedVnd(overview.bestMonth.net)}` : "-"}.
              Weakest {overview?.weakestMonth ? `${shortMonthLabel(overview.weakestMonth.month)} ${formatSignedVnd(overview.weakestMonth.net)}` : "-"}.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ReportStat({ label, value, tone }: { label: string; value: number; tone: "income" | "expense" }) {
  return (
    <View style={styles.trendStatCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, tone === "income" ? styles.amountIncome : styles.amountExpense]} numberOfLines={1}>
        {formatSignedVnd(value)}
      </Text>
    </View>
  );
}

function CategoryList({ title, items, tone }: { title: string; items: CategorySummary[]; tone: "income" | "expense" }) {
  return (
    <View style={styles.panelSpaced}>
      <Text style={styles.rowTitle}>{title}</Text>
      {items.length === 0 ? <Text style={styles.muted}>No data yet.</Text> : null}
      {items.map((item) => (
        <View key={`${tone}-${item.category}`} style={styles.graphCategoryRow}>
          <Text style={styles.graphCategoryLabel} numberOfLines={1}>
            {item.category}
          </Text>
          <Text style={tone === "income" ? styles.amountIncome : styles.amountExpense}>{compactVnd(item.amount)}</Text>
        </View>
      ))}
    </View>
  );
}

function barHeight(value: number, max: number) {
  if (value <= 0) return 0;
  return Math.max(8, Math.round((value / max) * 86));
}

function shortMonthLabel(month: string) {
  const [year, mm] = month.split("-");
  return `${Number(mm)}/${year.slice(2)}`;
}
