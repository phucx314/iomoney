import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { isDdMmYyyy, parseMoneyLoverCsv, toMoneyLoverCsv } from "../data/csv";
import {
  allTransactionsForExport,
  clearTransactions,
  createTransactions,
  deleteTransaction,
  getCategorySummaryForPeriod,
  getPeriodSummary,
  importTransactions,
  initDb,
  listCategories,
  listMonths,
  listTransactions,
  listTransactionsForPeriod,
  makeBlankTransaction,
  moveTransactionsToCategory,
  todayCsvDate,
  upsertTransaction
} from "../data/db";
import { CategorySummary, MonthlySummary, PeriodFilter, RecurrenceDraft, Tab, Transaction, TransactionFilter, TransactionInput } from "../domain/types";
import { DashboardScreen, EditorModal, SyncScreen, TransactionDetailsModal, TransactionsScreen } from "../features/ledger/screens";
import { IconButton, TabBar } from "../shared/components";
import { addCycleToCsvDate } from "../shared/date";
import { styles } from "../shared/styles";

const EMPTY_FILTER: TransactionFilter = {
  query: "",
  month: "all",
  category: "all",
  flow: "all"
};

const DEFAULT_RECURRENCE: RecurrenceDraft = {
  enabled: false,
  frequency: "monthly",
  count: 2
};

export function IOMoneyApp() {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [dashboardPeriod, setDashboardPeriod] = useState<PeriodFilter>({ mode: "month", month: "all" });
  const [filter, setFilter] = useState<TransactionFilter>(EMPTY_FILTER);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [draft, setDraft] = useState<TransactionInput | null>(null);
  const [draftBaseline, setDraftBaseline] = useState<TransactionInput | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceDraft>(DEFAULT_RECURRENCE);
  const [recurrenceBaseline, setRecurrenceBaseline] = useState<RecurrenceDraft>(DEFAULT_RECURRENCE);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<number[]>([]);

  const refresh = useCallback(async () => {
    const [txs, latest, allMonths, allCategories, monthSummary, cats] = await Promise.all([
      listTransactions(filter, 500),
      listTransactionsForPeriod(dashboardPeriod, 8),
      listMonths(),
      listCategories(),
      getPeriodSummary(dashboardPeriod),
      getCategorySummaryForPeriod(dashboardPeriod)
    ]);
    setTransactions(txs);
    setRecent(latest);
    setMonths(allMonths);
    setCategories(allCategories);
    setSummary(monthSummary);
    setCategorySummary(cats);
  }, [dashboardPeriod, filter]);

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
    const blank = makeBlankTransaction(todayCsvDate());
    setSelectedTransaction(null);
    setEditing(null);
    setDraft(blank);
    setDraftBaseline(blank);
    setRecurrence(DEFAULT_RECURRENCE);
    setRecurrenceBaseline(DEFAULT_RECURRENCE);
  };

  const openEdit = (tx: Transaction) => {
    const input = {
      externalId: tx.externalId,
      note: tx.note,
      amount: tx.amount,
      category: tx.category,
      account: tx.account,
      currency: tx.currency,
      date: tx.date,
      event: tx.event,
      excludeReport: tx.excludeReport
    };
    setSelectedTransaction(null);
    setEditing(tx);
    setDraft(input);
    setDraftBaseline(input);
    setRecurrence({ ...DEFAULT_RECURRENCE, enabled: false });
    setRecurrenceBaseline({ ...DEFAULT_RECURRENCE, enabled: false });
  };

  const closeEditor = useCallback(() => {
    setDraft(null);
    setDraftBaseline(null);
    setEditing(null);
    setRecurrence(DEFAULT_RECURRENCE);
    setRecurrenceBaseline(DEFAULT_RECURRENCE);
  }, []);

  const requestCloseEditor = useCallback(() => {
    if (!draft || (!isDraftDirty(draft, draftBaseline) && !isRecurrenceDirty(recurrence, recurrenceBaseline))) {
      closeEditor();
      return;
    }

    Alert.alert("Discard changes?", "This transaction has unsaved changes.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: closeEditor }
    ]);
  }, [closeEditor, draft, draftBaseline, recurrence, recurrenceBaseline]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (draft) {
        requestCloseEditor();
        return true;
      }
      if (selectedTransaction) {
        setSelectedTransaction(null);
        return true;
      }

      Alert.alert("Exit IOMoney?", "Close the app now?", [
        { text: "Cancel", style: "cancel" },
        { text: "Exit", style: "destructive", onPress: () => BackHandler.exitApp() }
      ]);
      return true;
    });

    return () => subscription.remove();
  }, [draft, requestCloseEditor, selectedTransaction]);

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
    if (!editing && recurrence.enabled && (!Number.isInteger(recurrence.count) || recurrence.count < 2 || recurrence.count > 120)) {
      setMessage("Repeat count must be between 2 and 120.");
      return;
    }
    setBusy(true);
    try {
      const normalized = { ...draft, note: draft.note.trim(), category: draft.category.trim() };
      if (!editing && recurrence.enabled) {
        await createTransactions(
          Array.from({ length: recurrence.count }, (_value, index) => ({
            ...normalized,
            externalId: index === 0 ? normalized.externalId : null,
            date: addCycleToCsvDate(normalized.date, recurrence.frequency, index)
          }))
        );
      } else {
        await upsertTransaction(normalized, editing?.id);
      }
      closeEditor();
      await refresh();
      setMessage(
        editing
          ? "Transaction updated."
          : recurrence.enabled
            ? `Recurring transaction added: ${recurrence.count} rows.`
            : "Transaction added."
      );
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

  const toggleTransactionSelection = (id: number) => {
    setSelectedTransactionIds((selected) =>
      selected.includes(id) ? selected.filter((selectedId) => selectedId !== id) : [...selected, id]
    );
  };

  const moveSelectedTransactions = async (category: string) => {
    if (selectedTransactionIds.length === 0 || !category) return;
    setBusy(true);
    try {
      await moveTransactionsToCategory(selectedTransactionIds, category);
      const moved = selectedTransactionIds.length;
      setSelectedTransactionIds([]);
      await refresh();
      setMessage(`Moved ${moved} transactions to ${category}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Move failed");
    } finally {
      setBusy(false);
    }
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
      <SafeAreaView edges={["top", "left", "right"]} style={styles.shell}>
        <StatusBar style="dark" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.muted}>Loading local database</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.shell}>
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
        <DashboardScreen
          period={dashboardPeriod}
          setPeriod={setDashboardPeriod}
          monthOptions={monthOptions}
          summary={summary}
          categorySummary={categorySummary}
          recent={recent}
          onOpenTransaction={setSelectedTransaction}
        />
      ) : null}

      {tab === "transactions" ? (
        <TransactionsScreen
          filter={filter}
          setFilter={setFilter}
          monthOptions={monthOptions}
          categoryOptions={categoryOptions}
          transactions={transactions}
          onOpenTransaction={setSelectedTransaction}
          selectedIds={selectedTransactionIds}
          onToggleSelection={toggleTransactionSelection}
          onClearSelection={() => setSelectedTransactionIds([])}
          onMoveSelected={moveSelectedTransactions}
          busy={busy}
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

      <TabBar tab={tab} setTab={setTab} bottomInset={insets.bottom} />
      <TransactionDetailsModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onEdit={openEdit}
        onDelete={(tx) => {
          setSelectedTransaction(null);
          removeTransaction(tx);
        }}
      />
      <EditorModal
        visible={Boolean(draft)}
        draft={draft}
        categories={categories}
        busy={busy}
        editing={Boolean(editing)}
        recurrence={recurrence}
        onRecurrenceChange={setRecurrence}
        onChange={setDraft}
        onClose={requestCloseEditor}
        onSave={saveDraft}
      />
    </SafeAreaView>
  );
}

function isDraftDirty(draft: TransactionInput, baseline: TransactionInput | null) {
  if (!baseline) return true;
  return JSON.stringify(normalizeDraft(draft)) !== JSON.stringify(normalizeDraft(baseline));
}

function isRecurrenceDirty(recurrence: RecurrenceDraft, baseline: RecurrenceDraft) {
  return JSON.stringify(recurrence) !== JSON.stringify(baseline);
}

function normalizeDraft(draft: TransactionInput) {
  return {
    ...draft,
    note: draft.note.trim(),
    category: draft.category.trim(),
    account: draft.account.trim(),
    currency: draft.currency.trim(),
    event: draft.event.trim()
  };
}
