import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { FLOW_LABEL } from "./category";
import {
  CategoryIcon,
  DateField,
  DangerButton,
  Field,
  IconButton,
  Metric,
  MiniStat,
  PrimaryButton,
  SecondaryButton,
  SelectButton,
  TransactionRow
} from "./components";
import { categoryColor, compactVnd, monthLabel } from "./format";
import { styles } from "./styles";
import { CategorySummary, MonthlySummary, Transaction, TransactionFilter, TransactionInput } from "./types";

export function Dashboard({
  selectedMonth,
  setSelectedMonth,
  monthOptions,
  summary,
  categorySummary,
  recent,
  onEdit
}: {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  monthOptions: string[];
  summary: MonthlySummary | null;
  categorySummary: CategorySummary[];
  recent: Transaction[];
  onEdit: (tx: Transaction) => void;
}) {
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

export function TransactionsScreen({
  filter,
  setFilter,
  monthOptions,
  categoryOptions,
  transactions,
  onEdit,
  onDelete
}: {
  filter: TransactionFilter;
  setFilter: (filter: TransactionFilter) => void;
  monthOptions: string[];
  categoryOptions: string[];
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.content}>
      <View style={styles.filterPanel}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#64748B" />
          <TextInput
            value={filter.query}
            onChangeText={(query) => setFilter({ ...filter, query })}
            placeholder="Search note, category, event"
            style={styles.searchInput}
            placeholderTextColor="#94A3B8"
          />
        </View>
        <View style={styles.filterGrid}>
          <SelectButton
            title="Flow"
            options={["all", "expense", "income"]}
            value={filter.flow}
            onChange={(flow) => setFilter({ ...filter, flow: flow as TransactionFilter["flow"] })}
            label={(flow) => FLOW_LABEL[flow as TransactionFilter["flow"]]}
          />
          <SelectButton title="Month" options={monthOptions} value={filter.month} onChange={(month) => setFilter({ ...filter, month })} label={monthLabel} />
          <SelectButton
            title="Category"
            options={categoryOptions}
            value={filter.category}
            onChange={(category) => setFilter({ ...filter, category })}
            label={(category) => (category === "all" ? "All categories" : category)}
          />
        </View>
      </View>
      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listPad, { paddingBottom: 104 + insets.bottom }]}
        renderItem={({ item }) => (
          <TransactionRow tx={item} onPress={() => onEdit(item)} onLongPress={() => onDelete(item)} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No matching transactions.</Text>}
      />
    </View>
  );
}

export function SyncScreen({
  busy,
  total,
  categories,
  months,
  onImport,
  onExport,
  onClear
}: {
  busy: boolean;
  total: number;
  categories: number;
  months: number;
  onImport: () => void;
  onExport: () => void;
  onClear: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.content} contentContainerStyle={[styles.contentPad, { paddingBottom: 104 + insets.bottom }]}>
      <Text style={styles.sectionTitle}>CSV sync</Text>
      <View style={styles.panel}>
        <Text style={styles.syncText}>Money Lover compatible schema</Text>
        <Text style={styles.syncHint}>ID, Note, Amount, Category, Account, Currency, Date, Event, Exclude Report</Text>
        <View style={styles.syncStats}>
          <MiniStat label="Current filter rows" value={String(total)} />
          <MiniStat label="Categories" value={String(categories)} />
          <MiniStat label="Months" value={String(months)} />
        </View>
        <PrimaryButton icon="cloud-upload-outline" text="Import CSV" onPress={onImport} disabled={busy} />
        <SecondaryButton icon="download-outline" text="Export CSV" onPress={onExport} disabled={busy} />
        <DangerButton icon="trash-outline" text="Clear local database" onPress={onClear} disabled={busy} />
        {busy ? <ActivityIndicator color="#0F766E" /> : null}
      </View>
    </ScrollView>
  );
}

export function EditorModal({
  visible,
  draft,
  categories,
  busy,
  onChange,
  onClose,
  onSave
}: {
  visible: boolean;
  draft: TransactionInput | null;
  categories: string[];
  busy: boolean;
  onChange: (draft: TransactionInput) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!draft) return null;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView edges={["top", "left", "right"]} style={styles.modalShell}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Transaction</Text>
            <IconButton icon="close" onPress={onClose} label="Close editor" />
          </View>
          <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: 120 + insets.bottom }]}>
            <Field label="Note" value={draft.note} onChangeText={(note) => onChange({ ...draft, note })} />
            <Field
              label="Amount"
              value={String(draft.amount || "")}
              keyboardType="numeric"
              onChangeText={(amount) => onChange({ ...draft, amount: Number(amount.replace(/[^\d-]/g, "")) })}
              hint="Expense is negative, income is positive"
            />
            <DateField label="Date" value={draft.date} onChange={(date) => onChange({ ...draft, date })} />
            <View style={styles.categoryEditorHeader}>
              <CategoryIcon category={draft.category} size={38} />
              <View style={styles.flex}>
                <Text style={styles.fieldLabel}>Category</Text>
                <Text style={styles.categoryPreview}>{draft.category || "New category"}</Text>
              </View>
            </View>
            {categories.length ? (
              <SelectButton title="Existing categories" options={categories} value={draft.category} onChange={(category) => onChange({ ...draft, category })} />
            ) : null}
            <Field label="New / selected category" value={draft.category} onChangeText={(category) => onChange({ ...draft, category })} />
            <Field label="Account" value={draft.account} onChangeText={(account) => onChange({ ...draft, account })} />
            <Field label="Currency" value={draft.currency} onChangeText={(currency) => onChange({ ...draft, currency })} />
            <Field label="Event" value={draft.event} onChangeText={(event) => onChange({ ...draft, event })} />
            <Pressable style={styles.checkboxRow} onPress={() => onChange({ ...draft, excludeReport: !draft.excludeReport })}>
              <Ionicons name={draft.excludeReport ? "checkbox" : "square-outline"} size={22} color="#0F766E" />
              <Text style={styles.checkboxLabel}>Exclude from report</Text>
            </Pressable>
          </ScrollView>
          <View style={[styles.modalFooter, { paddingBottom: 16 + insets.bottom }]}>
            <SecondaryButton text="Cancel" icon="close-outline" onPress={onClose} />
            <PrimaryButton text="Save" icon="save-outline" onPress={onSave} disabled={busy} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
