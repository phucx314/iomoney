import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategorySummary, MonthlySummary, Transaction } from "../../../domain/types";
import { CategoryIcon, Metric, SelectButton, TransactionRow } from "../../../shared/components";
import { categoryColor, compactVnd, monthLabel } from "../../../shared/format";
import { styles } from "../../../shared/styles";

type DashboardScreenProps = {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  monthOptions: string[];
  summary: MonthlySummary | null;
  categorySummary: CategorySummary[];
  recent: Transaction[];
  onEdit: (tx: Transaction) => void;
};

export function DashboardScreen({
  selectedMonth,
  setSelectedMonth,
  monthOptions,
  summary,
  categorySummary,
  recent,
  onEdit
}: DashboardScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.content} contentContainerStyle={[styles.contentPad, { paddingBottom: 104 + insets.bottom }]}>
      <Text style={styles.sectionTitle}>Overview</Text>
      <SelectButton
        title="Period"
        options={monthOptions}
        value={selectedMonth}
        onChange={setSelectedMonth}
        label={(month) => monthLabel(month)}
      />
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
          <TransactionRow key={tx.id} tx={tx} onPress={() => onEdit(tx)} />
        ))}
        {recent.length === 0 ? <Text style={styles.muted}>Import CSV to start.</Text> : null}
      </View>
    </ScrollView>
  );
}
