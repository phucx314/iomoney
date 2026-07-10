import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { isDdMmYyyy, parseMoneyLoverCsv, toMoneyLoverCsv } from "./src/csv";
import {
  allTransactionsForExport,
  clearTransactions,
  deleteTransaction,
  getCategorySummary,
  getMonthlySummary,
  importTransactions,
  initDb,
  listCategories,
  listMonths,
  listTransactions,
  makeBlankTransaction,
  todayCsvDate,
  upsertTransaction
} from "./src/db";
import { categoryColor, compactVnd, formatVnd, monthLabel } from "./src/format";
import { CategorySummary, MonthlySummary, Transaction, TransactionFilter, TransactionInput } from "./src/types";

type Tab = "dashboard" | "transactions" | "sync";

const EMPTY_FILTER: TransactionFilter = {
  query: "",
  month: "all",
  category: "all",
  flow: "all"
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [filter, setFilter] = useState<TransactionFilter>(EMPTY_FILTER);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [draft, setDraft] = useState<TransactionInput | null>(null);

  const refresh = useCallback(async () => {
    const [txs, latest, allMonths, allCategories, monthSummary, cats] = await Promise.all([
      listTransactions(filter, 500),
      listTransactions({ query: "", month: "all", category: "all", flow: "all" }, 8),
      listMonths(),
      listCategories(),
      getMonthlySummary(selectedMonth),
      getCategorySummary(selectedMonth)
    ]);
    setTransactions(txs);
    setRecent(latest);
    setMonths(allMonths);
    setCategories(allCategories);
    setSummary(monthSummary);
    setCategorySummary(cats);
  }, [filter, selectedMonth]);

  useEffect(() => {
    initDb()
      .then(() => setReady(true))
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Cannot initialize database");
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (ready) refresh().catch((error) => setMessage(error instanceof Error ? error.message : "Refresh failed"));
  }, [ready, refresh]);

  const openCreate = () => {
    setEditing(null);
    setDraft(makeBlankTransaction(todayCsvDate()));
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setDraft({
      externalId: tx.externalId,
      note: tx.note,
      amount: tx.amount,
      category: tx.category,
      account: tx.account,
      currency: tx.currency,
      date: tx.date,
      event: tx.event,
      excludeReport: tx.excludeReport
    });
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.note.trim()) {
      setMessage("Note is required.");
      return;
    }
    if (!Number.isInteger(draft.amount) || draft.amount === 0) {
      setMessage("Amount must be a non-zero integer. Expense is negative, income is positive.");
      return;
    }
    if (!isDdMmYyyy(draft.date)) {
      setMessage("Date must be dd/MM/yyyy.");
      return;
    }
    setBusy(true);
    try {
      await upsertTransaction({ ...draft, note: draft.note.trim(), category: draft.category.trim() }, editing?.id);
      setDraft(null);
      setEditing(null);
      await refresh();
      setMessage(editing ? "Transaction updated." : "Transaction added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const removeTransaction = async (tx: Transaction) => {
    Alert.alert("Delete transaction", tx.note, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTransaction(tx.id);
          await refresh();
          setMessage("Transaction deleted.");
        }
      }
    ]);
  };

  const importCsv = async () => {
    setBusy(true);
    setMessage("");
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "text/plain"],
        copyToCacheDirectory: true
      });
      if (picked.canceled) return;
      const file = picked.assets[0];
      const text = await new File(file.uri).text();
      const parsed = parseMoneyLoverCsv(text);
      if (parsed.invalidRows.length > 0 && parsed.rows.length === 0) {
        setMessage(`Import blocked: ${parsed.invalidRows[0].reason}`);
        return;
      }
      const result = await importTransactions(parsed.rows);
      await refresh();
      setMessage(
        `Imported ${result.inserted}. Skipped duplicates ${result.skippedDuplicates}. Invalid rows ${
          parsed.invalidRows.length + result.invalidRows.length
        }.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    setBusy(true);
    setMessage("");
    try {
      const rows = await allTransactionsForExport();
      const csv = toMoneyLoverCsv(rows);
      const filename = `iomoney-export-${new Date().toISOString().slice(0, 10)}.csv`;
      const output = new File(Paths.document, filename);
      output.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(output.uri, { mimeType: "text/csv", dialogTitle: "Export CSV" });
      }
      setMessage(`Exported ${rows.length} rows to ${filename}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    Alert.alert("Clear local database", "This only deletes local app data, not your CSV files.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await clearTransactions();
          await refresh();
          setMessage("Local database cleared.");
        }
      }
    ]);
  };

  const monthOptions = useMemo(() => ["all", ...months], [months]);
  const categoryOptions = useMemo(() => ["all", ...categories], [categories]);

  if (!ready) {
    return (
      <SafeAreaView style={styles.shell}>
        <StatusBar style="dark" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.muted}>Loading local database</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>IOMoney</Text>
          <Text style={styles.subtitle}>Offline expense ledger</Text>
        </View>
        <IconButton icon="add" onPress={openCreate} label="Add transaction" />
      </View>

      {message ? (
        <Pressable style={styles.notice} onPress={() => setMessage("")}>
          <Text style={styles.noticeText}>{message}</Text>
        </Pressable>
      ) : null}

      {tab === "dashboard" ? (
        <Dashboard
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          monthOptions={monthOptions}
          summary={summary}
          categorySummary={categorySummary}
          recent={recent}
          onEdit={openEdit}
        />
      ) : null}

      {tab === "transactions" ? (
        <TransactionsScreen
          filter={filter}
          setFilter={setFilter}
          monthOptions={monthOptions}
          categoryOptions={categoryOptions}
          transactions={transactions}
          onEdit={openEdit}
          onDelete={removeTransaction}
        />
      ) : null}

      {tab === "sync" ? (
        <SyncScreen
          busy={busy}
          total={summary?.count ?? 0}
          onImport={importCsv}
          onExport={exportCsv}
          onClear={clearAll}
          categories={categories.length}
          months={months.length}
        />
      ) : null}

      <TabBar tab={tab} setTab={setTab} />
      <EditorModal
        visible={Boolean(draft)}
        draft={draft}
        categories={categories}
        busy={busy}
        onChange={setDraft}
        onClose={() => {
          setDraft(null);
          setEditing(null);
        }}
        onSave={saveDraft}
      />
    </SafeAreaView>
  );
}

function Dashboard({
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
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentPad}>
      <Text style={styles.sectionTitle}>Overview</Text>
      <ChipRow
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
              <View style={[styles.categoryDot, { backgroundColor: categoryColor(item.category) }]} />
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

function TransactionsScreen({
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
        <ChipRow
          options={["all", "expense", "income"]}
          value={filter.flow}
          onChange={(flow) => setFilter({ ...filter, flow: flow as TransactionFilter["flow"] })}
          label={(flow) => (flow === "all" ? "All" : flow === "expense" ? "Expense" : "Income")}
        />
        <ChipRow options={monthOptions} value={filter.month} onChange={(month) => setFilter({ ...filter, month })} label={monthLabel} />
        <ChipRow
          options={categoryOptions}
          value={filter.category}
          onChange={(category) => setFilter({ ...filter, category })}
          label={(category) => (category === "all" ? "All categories" : category)}
        />
      </View>
      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listPad}
        renderItem={({ item }) => (
          <TransactionRow tx={item} onPress={() => onEdit(item)} onLongPress={() => onDelete(item)} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No matching transactions.</Text>}
      />
    </View>
  );
}

function SyncScreen({
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
  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentPad}>
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

function EditorModal({
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
  if (!draft) return null;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalShell}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Transaction</Text>
            <IconButton icon="close" onPress={onClose} label="Close editor" />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Field label="Note" value={draft.note} onChangeText={(note) => onChange({ ...draft, note })} />
            <Field
              label="Amount"
              value={String(draft.amount || "")}
              keyboardType="numeric"
              onChangeText={(amount) => onChange({ ...draft, amount: Number(amount.replace(/[^\d-]/g, "")) })}
              hint="Expense is negative, income is positive"
            />
            <Field label="Date" value={draft.date} onChangeText={(date) => onChange({ ...draft, date })} hint="dd/MM/yyyy" />
            <Field label="Category" value={draft.category} onChangeText={(category) => onChange({ ...draft, category })} />
            {categories.length ? (
              <ChipRow options={categories.slice(0, 16)} value={draft.category} onChange={(category) => onChange({ ...draft, category })} />
            ) : null}
            <Field label="Account" value={draft.account} onChangeText={(account) => onChange({ ...draft, account })} />
            <Field label="Currency" value={draft.currency} onChangeText={(currency) => onChange({ ...draft, currency })} />
            <Field label="Event" value={draft.event} onChangeText={(event) => onChange({ ...draft, event })} />
            <Pressable style={styles.checkboxRow} onPress={() => onChange({ ...draft, excludeReport: !draft.excludeReport })}>
              <Ionicons name={draft.excludeReport ? "checkbox" : "square-outline"} size={22} color="#0F766E" />
              <Text style={styles.checkboxLabel}>Exclude from report</Text>
            </Pressable>
          </ScrollView>
          <View style={styles.modalFooter}>
            <SecondaryButton text="Cancel" icon="close-outline" onPress={onClose} />
            <PrimaryButton text="Save" icon="save-outline" onPress={onSave} disabled={busy} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function TransactionRow({
  tx,
  onPress,
  onLongPress
}: {
  tx: Transaction;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const positive = tx.amount > 0;
  return (
    <Pressable style={styles.txRow} onPress={onPress} onLongPress={onLongPress}>
      <View style={[styles.txIcon, { backgroundColor: `${categoryColor(tx.category)}22` }]}>
        <Ionicons name={positive ? "arrow-down" : "arrow-up"} size={18} color={categoryColor(tx.category)} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {tx.note}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {tx.date} · {tx.category}
        </Text>
      </View>
      <Text style={positive ? styles.amountIncome : styles.amountExpense}>{formatVnd(tx.amount)}</Text>
    </Pressable>
  );
}

function Metric({
  label,
  value,
  icon,
  tone,
  isCount
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  tone: "income" | "expense" | "neutral";
  isCount?: boolean;
}) {
  const color = tone === "income" ? "#047857" : tone === "expense" ? "#B91C1C" : "#334155";
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{isCount ? value : compactVnd(value)}</Text>
    </View>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
  label = (option: T) => option
}: {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  label?: (value: T) => string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable key={option} style={[styles.chip, active && styles.chipActive]} onPress={() => onChange(option)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
              {label(option)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function TabBar({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  return (
    <View style={styles.tabBar}>
      <TabButton tab="dashboard" current={tab} setTab={setTab} icon="grid-outline" label="Dashboard" />
      <TabButton tab="transactions" current={tab} setTab={setTab} icon="list-outline" label="Transactions" />
      <TabButton tab="sync" current={tab} setTab={setTab} icon="swap-horizontal-outline" label="Sync" />
    </View>
  );
}

function TabButton({
  tab,
  current,
  setTab,
  icon,
  label
}: {
  tab: Tab;
  current: Tab;
  setTab: (tab: Tab) => void;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  const active = tab === current;
  return (
    <Pressable style={styles.tabButton} onPress={() => setTab(tab)}>
      <Ionicons name={icon} size={21} color={active ? "#0F766E" : "#64748B"} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function IconButton({ icon, onPress, label }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityLabel={label} style={styles.iconButton} onPress={onPress}>
      <Ionicons name={icon} size={22} color="#0F172A" />
    </Pressable>
  );
}

function PrimaryButton({ icon, text, onPress, disabled }: ButtonProps) {
  return <ButtonBase icon={icon} text={text} onPress={onPress} disabled={disabled} style={styles.primaryButton} textStyle={styles.primaryButtonText} />;
}

function SecondaryButton({ icon, text, onPress, disabled }: ButtonProps) {
  return <ButtonBase icon={icon} text={text} onPress={onPress} disabled={disabled} style={styles.secondaryButton} textStyle={styles.secondaryButtonText} />;
}

function DangerButton({ icon, text, onPress, disabled }: ButtonProps) {
  return <ButtonBase icon={icon} text={text} onPress={onPress} disabled={disabled} style={styles.dangerButton} textStyle={styles.dangerButtonText} />;
}

type ButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  onPress: () => void;
  disabled?: boolean;
};

function ButtonBase({
  icon,
  text,
  onPress,
  disabled,
  style,
  textStyle
}: ButtonProps & { style: object; textStyle: object }) {
  return (
    <Pressable style={[style, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Ionicons name={icon} size={18} color={(textStyle as { color: string }).color} />
      <Text style={textStyle}>{text}</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  hint
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={styles.input}
        placeholderTextColor="#94A3B8"
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  flex: {
    flex: 1
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF"
  },
  appName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A"
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#64748B"
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0"
  },
  notice: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0"
  },
  noticeText: {
    color: "#065F46",
    fontSize: 13
  },
  content: {
    flex: 1
  },
  contentPad: {
    padding: 16,
    paddingBottom: 104
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
    marginTop: 8
  },
  chipRow: {
    gap: 8,
    paddingRight: 16,
    paddingBottom: 10
  },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1"
  },
  chipActive: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E"
  },
  chipText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600"
  },
  chipTextActive: {
    color: "#FFFFFF"
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metric: {
    width: "48%",
    minHeight: 112,
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10
  },
  metricLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase"
  },
  metricValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: "800"
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 10
  },
  categoryRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    marginTop: 6,
    overflow: "hidden"
  },
  barFill: {
    height: 6,
    borderRadius: 3
  },
  txRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0"
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  rowTitle: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "700"
  },
  rowMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B"
  },
  amountExpense: {
    color: "#B91C1C",
    fontWeight: "800",
    fontSize: 13
  },
  amountIncome: {
    color: "#047857",
    fontWeight: "800",
    fontSize: 13
  },
  muted: {
    color: "#64748B",
    fontSize: 13
  },
  empty: {
    textAlign: "center",
    marginTop: 44,
    color: "#64748B"
  },
  filterPanel: {
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0"
  },
  searchBox: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A"
  },
  listPad: {
    paddingHorizontal: 16,
    paddingBottom: 104
  },
  syncText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A"
  },
  syncHint: {
    color: "#64748B",
    marginTop: 6,
    lineHeight: 20
  },
  syncStats: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 14
  },
  miniStat: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9"
  },
  miniValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A"
  },
  miniLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 10
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 10
  },
  secondaryButtonText: {
    color: "#0F172A",
    fontWeight: "800"
  },
  dangerButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 10
  },
  dangerButtonText: {
    color: "#991B1B",
    fontWeight: "800"
  },
  disabled: {
    opacity: 0.55
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 72,
    paddingBottom: 12,
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#CBD5E1",
    flexDirection: "row"
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  tabLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700"
  },
  tabLabelActive: {
    color: "#0F766E"
  },
  modalShell: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  modalHeader: {
    height: 64,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0"
  },
  modalTitle: {
    fontSize: 20,
    color: "#0F172A",
    fontWeight: "800"
  },
  modalContent: {
    padding: 16,
    paddingBottom: 120
  },
  field: {
    marginBottom: 14
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase"
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    paddingHorizontal: 12,
    fontSize: 15
  },
  hint: {
    marginTop: 5,
    color: "#64748B",
    fontSize: 12
  },
  checkboxRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  checkboxLabel: {
    color: "#0F172A",
    fontWeight: "700"
  },
  modalFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    gap: 10
  }
});
