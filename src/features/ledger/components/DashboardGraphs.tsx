import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { categoryColor, compactVnd } from "../../../shared/format";
import { styles, theme } from "../../../shared/styles";
import { CashflowTrendPoint, CategorySummary, DebtSummary, MonthlySummary } from "../../../domain/types";

type DashboardGraphsProps = {
  trend: CashflowTrendPoint[];
  debts: DebtSummary[];
  categories: CategorySummary[];
  summary: MonthlySummary | null;
  onOpenCategories: () => void;
};

export function DashboardGraphs({ trend, debts, categories, summary, onOpenCategories }: DashboardGraphsProps) {
  const debt = debtTotals(debts);
  const expenseCategories = categories.filter((item) => item.flow === "expense").slice(0, 4);
  const maxFlow = Math.max(1, ...trend.flatMap((point) => [point.cashIn, point.cashOut]));
  const totalExpenseMix = expenseCategories.reduce((sum, item) => sum + item.amount, 0);
  const signal = buildSignal(summary, debt, expenseCategories);

  return (
    <>
      <Text style={[styles.sectionTitle, styles.sectionTitleBlock, styles.sectionTitleSpaced]}>Insights</Text>
      <View style={styles.graphPanel}>
        <View style={styles.graphHeader}>
          <View style={styles.graphTitleRow}>
            <Ionicons name="analytics-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.graphTitle}>Cashflow trend</Text>
          </View>
          <Text style={styles.graphMeta}>Last {trend.length || 0} months</Text>
        </View>
        {trend.length === 0 ? (
          <Text style={styles.muted}>No trend data yet.</Text>
        ) : (
          <View style={styles.cashflowChart}>
            {trend.map((point) => (
              <View key={point.month} style={styles.cashflowColumn}>
                <View style={styles.cashflowBars}>
                  <View style={styles.cashflowTrack}>
                    <View
                      style={[
                        styles.cashflowBar,
                        styles.cashflowBarIncome,
                        { height: barHeight(point.cashIn, maxFlow) }
                      ]}
                    />
                  </View>
                  <View style={styles.cashflowTrack}>
                    <View
                      style={[
                        styles.cashflowBar,
                        styles.cashflowBarExpense,
                        { height: barHeight(point.cashOut, maxFlow) }
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.cashflowMonth}>{shortMonthLabel(point.month)}</Text>
                <Text style={[styles.cashflowNet, point.net >= 0 ? styles.amountIncome : styles.amountExpense]} numberOfLines={1}>
                  {compactVnd(point.net)}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.graphLegendRow}>
          <LegendDot color={theme.colors.income} label="Cash in" />
          <LegendDot color={theme.colors.expense} label="Cash out" />
          <LegendDot color={theme.colors.neutral} label="Net" />
        </View>
      </View>

      <Pressable style={[styles.graphPanel, styles.panelSpaced]} onPress={onOpenCategories}>
        <View style={styles.graphHeader}>
          <View style={styles.graphTitleRow}>
            <Ionicons name="pie-chart-outline" size={18} color={theme.colors.warning} />
            <Text style={styles.graphTitle}>Spending mix</Text>
          </View>
          <Text style={styles.graphActionText}>View all</Text>
        </View>
        {expenseCategories.length === 0 ? (
          <Text style={styles.muted}>No spending mix in this period.</Text>
        ) : (
          <>
            <View style={styles.categoryMixTrack}>
              {expenseCategories.map((item) => (
                <View
                  key={item.category}
                  style={[
                    styles.categoryMixSegment,
                    {
                      backgroundColor: categoryColor(item.category),
                      flex: Math.max(1, item.amount)
                    }
                  ]}
                />
              ))}
            </View>
            {expenseCategories.map((item) => (
              <View key={item.category} style={styles.graphCategoryRow}>
                <View style={[styles.legendDot, { backgroundColor: categoryColor(item.category) }]} />
                <Text style={styles.graphCategoryLabel} numberOfLines={1}>
                  {item.category}
                </Text>
                <Text style={styles.graphCategoryValue}>{compactVnd(item.amount)}</Text>
                <Text style={styles.graphCategoryShare}>{Math.round((item.amount / Math.max(1, totalExpenseMix)) * 100)}%</Text>
              </View>
            ))}
          </>
        )}
      </Pressable>

      <View style={[styles.graphSignalPanel, styles.panelSpaced]}>
        <Ionicons name={signal.icon} size={20} color={signal.color} />
        <View style={styles.flex}>
          <Text style={styles.graphSignalTitle}>{signal.title}</Text>
          <Text style={styles.graphSignalText}>{signal.text}</Text>
        </View>
      </View>
    </>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.graphLegendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.graphLegendText}>{label}</Text>
    </View>
  );
}

function barHeight(value: number, max: number) {
  if (value <= 0) return 0;
  return Math.max(8, Math.round((value / max) * 86));
}

function shortMonthLabel(month: string) {
  if (month === "all") return "All";
  const [year, mm] = month.split("-");
  return `${Number(mm)}/${year.slice(2)}`;
}

function debtTotals(debts: DebtSummary[]) {
  return debts.reduce(
    (acc, debt) => {
      if (debt.direction === "lent") acc.receivable += debt.remainingAmount;
      else acc.payable += debt.remainingAmount;
      return acc;
    },
    { receivable: 0, payable: 0 }
  );
}

function buildSignal(summary: MonthlySummary | null, debt: { receivable: number; payable: number }, categories: CategorySummary[]) {
  if (!summary || summary.count === 0) {
    return {
      icon: "sparkles-outline" as const,
      color: theme.colors.accent,
      title: "Ready for data",
      text: "Import or add records to unlock spending signals and cashflow comparisons."
    };
  }

  const burnRate = summary.totalInflow > 0 ? summary.expense / summary.totalInflow : 0;
  if (summary.net < 0) {
    return {
      icon: "alert-circle-outline" as const,
      color: theme.colors.expense,
      title: "Cash out is ahead",
      text: `This period is ${compactVnd(Math.abs(summary.net))} below break-even. Top pressure: ${categories[0]?.category ?? "spending"}.`
    };
  }
  if (burnRate > 0.75) {
    return {
      icon: "speedometer-outline" as const,
      color: theme.colors.warning,
      title: "Tight margin",
      text: `Cash out is about ${Math.round(burnRate * 100)}% of cash in. Keeping it under 70% gives more room.`
    };
  }
  if (debt.payable > debt.receivable && debt.payable > 0) {
    return {
      icon: "trending-down-outline" as const,
      color: theme.colors.debtPayable,
      title: "Debt pressure",
      text: `You owe ${compactVnd(debt.payable - debt.receivable)} more than people owe you.`
    };
  }
  return {
    icon: "checkmark-circle-outline" as const,
    color: theme.colors.income,
    title: "Positive position",
    text: `Net cashflow is ${compactVnd(summary.net)} for this period. Keep watching the spending mix.`
  };
}
