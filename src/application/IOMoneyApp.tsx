import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Image, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { isDdMmYyyy, parseMoneyLoverCsv, toMoneyLoverCsv } from "../data/csv";
import {
  allTransactionsForExport,
  clearTransactions,
  createTransactions,
  deleteTransactions,
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
  markTransactionsImportant,
  moveTransactionsToCategory,
  todayCsvDate,
  upsertTransaction
} from "../data/db";
import { AppNotification, CategorySummary, MonthlySummary, PeriodFilter, RecurrenceDraft, Tab, Transaction, TransactionFilter, TransactionInput } from "../domain/types";
import { AppIcon } from "../domain/category";
import { DashboardScreen, EditorModal, NotificationScreen, SyncScreen, TransactionDetailsModal, TransactionsScreen } from "../features/ledger/screens";
import { ConfirmDialog, TabBar } from "../shared/components";
import { addCycleToCsvDate } from "../shared/date";
import { styles } from "../shared/styles";

const EMPTY_FILTER: TransactionFilter = {
  query: "",
  period: { mode: "month", month: "all" },
  categories: [],
  flow: "all"
};

const DEFAULT_RECURRENCE: RecurrenceDraft = {
  enabled: false,
  frequency: "monthly",
  count: 2
};

type ConfirmDialogState = {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  confirmIcon?: AppIcon;
  destructive?: boolean;
  onConfirm: () => void;
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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [draft, setDraft] = useState<TransactionInput | null>(null);
  const [draftBaseline, setDraftBaseline] = useState<TransactionInput | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceDraft>(DEFAULT_RECURRENCE);
  const [recurrenceBaseline, setRecurrenceBaseline] = useState<RecurrenceDraft>(DEFAULT_RECURRENCE);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<number[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const scrollOffsets = useRef<Record<Tab, number>>({ dashboard: 0, transactions: 0, sync: 0, notifications: 0 });

  const saveScrollOffset = useCallback((targetTab: Tab, offset: number) => {
    scrollOffsets.current[targetTab] = offset;
  }, []);

  const requestConfirmation = useCallback((dialog: ConfirmDialogState) => {
    setConfirmDialog(dialog);
  }, []);

  const notify = useCallback((message: string) => {
    setNotifications((current) => [
      {
        id: `${Date.now()}-${current.length}`,
        type: notificationTypeForMessage(message),
        message,
        createdAt: new Date().toLocaleString()
      },
      ...current
    ]);
  }, []);

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
        notify(error instanceof Error ? error.message : "Cannot initialize database");
        setReady(true);
      });
  }, [notify]);

  useEffect(() => {
    if (ready) refresh().catch((error) => notify(error instanceof Error ? error.message : "Refresh failed"));
  }, [notify, ready, refresh]);

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
      excludeReport: tx.excludeReport,
      important: tx.important
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

    requestConfirmation({
      title: "Discard changes?",
      message: "This transaction has unsaved changes.",
      confirmText: "Discard",
      cancelText: "Keep editing",
      destructive: true,
      onConfirm: closeEditor
    });
  }, [closeEditor, draft, draftBaseline, recurrence, recurrenceBaseline, requestConfirmation]);

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
      if (tab !== "dashboard") {
        setTab("dashboard");
        return true;
      }

      requestConfirmation({
        title: "Exit IOMoney?",
        message: "Close the app now?",
        confirmText: "Exit",
        destructive: true,
        onConfirm: () => BackHandler.exitApp()
      });
      return true;
    });

    return () => subscription.remove();
  }, [draft, requestCloseEditor, requestConfirmation, selectedTransaction, tab]);

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.note.trim()) {
      notify("Note is required.");
      return;
    }
    if (!Number.isInteger(draft.amount) || draft.amount === 0) {
      notify("Amount must be a non-zero integer. Expense is negative, income is positive.");
      return;
    }
    if (!isDdMmYyyy(draft.date)) {
      notify("Date must be dd/MM/yyyy.");
      return;
    }
    if (!editing && recurrence.enabled && (!Number.isInteger(recurrence.count) || recurrence.count < 2 || recurrence.count > 120)) {
      notify("Repeat count must be between 2 and 120.");
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
      notify(
        editing
          ? "Transaction updated."
          : recurrence.enabled
            ? `Recurring transaction added: ${recurrence.count} rows.`
            : "Transaction added."
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const removeTransaction = async (tx: Transaction) => {
    requestConfirmation({
      title: "Delete transaction",
      message: tx.note,
      confirmText: "Delete",
      confirmIcon: "trash-outline",
      destructive: true,
      onConfirm: async () => {
          await deleteTransaction(tx.id);
          await refresh();
          notify("Transaction deleted.");
      }
    });
  };

  const toggleTransactionSelection = useCallback((id: number) => {
    setSelectedTransactionIds((selected) =>
      selected.includes(id) ? selected.filter((selectedId) => selectedId !== id) : [...selected, id]
    );
  }, []);

  const moveSelectedTransactions = async (category: string) => {
    if (selectedTransactionIds.length === 0 || !category) return;
    setBusy(true);
    try {
      await moveTransactionsToCategory(selectedTransactionIds, category);
      const moved = selectedTransactionIds.length;
      setSelectedTransactionIds([]);
      await refresh();
      notify(`Moved ${moved} transactions to ${category}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Move failed");
    } finally {
      setBusy(false);
    }
  };

  const setSelectedTransactionsImportant = async (important: boolean) => {
    if (selectedTransactionIds.length === 0) return;
    setBusy(true);
    try {
      await markTransactionsImportant(selectedTransactionIds, important);
      const changed = selectedTransactionIds.length;
      setSelectedTransactionIds([]);
      await refresh();
      notify(important ? `Marked ${changed} transactions as important.` : `Removed important from ${changed} transactions.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Update important failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteSelectedTransactions = () => {
    if (selectedTransactionIds.length === 0) return;
    const ids = [...selectedTransactionIds];
    requestConfirmation({
      title: "Delete selected transactions",
      message: `Delete ${ids.length} selected transactions?`,
      confirmText: "Delete",
      confirmIcon: "trash-outline",
      destructive: true,
      onConfirm: async () => {
          setBusy(true);
          try {
            await deleteTransactions(ids);
            setSelectedTransactionIds([]);
            await refresh();
            notify(`Deleted ${ids.length} transactions.`);
          } catch (error) {
            notify(error instanceof Error ? error.message : "Delete failed");
          } finally {
            setBusy(false);
          }
      }
    });
  };

  const importCsv = async () => {
    setBusy(true);
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
        notify(`Import blocked: ${parsed.invalidRows[0].reason}`);
        return;
      }
      const result = await importTransactions(parsed.rows);
      await refresh();
      notify(
        `Imported ${result.inserted}. Skipped duplicates ${result.skippedDuplicates}. Invalid rows ${
          parsed.invalidRows.length + result.invalidRows.length
        }.`
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    setBusy(true);
    try {
      const rows = await allTransactionsForExport();
      const csv = toMoneyLoverCsv(rows);
      const filename = `iomoney-export-${new Date().toISOString().slice(0, 10)}.csv`;
      const output = new File(Paths.document, filename);
      output.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(output.uri, { mimeType: "text/csv", dialogTitle: "Export CSV" });
      }
      notify(`Exported ${rows.length} rows to ${filename}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    requestConfirmation({
      title: "Clear local database",
      message: "This only deletes local app data, not your CSV files.",
      confirmText: "Clear",
      confirmIcon: "trash-outline",
      destructive: true,
      onConfirm: async () => {
          await clearTransactions();
          await refresh();
          notify("Local database cleared.");
      }
    });
  };

  const clearNotifications = () => {
    if (notifications.length === 0) return;
    requestConfirmation({
      title: "Clear notifications",
      message: `Clear ${notifications.length} notifications?`,
      confirmText: "Clear",
      confirmIcon: "trash-outline",
      destructive: true,
      onConfirm: () => setNotifications([])
    });
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
        <Image source={require("../../assets/coine-peek-a-boo.png")} style={styles.headerCharacter} resizeMode="contain" />
      </View>

      {tab === "dashboard" ? (
        <DashboardScreen
          period={dashboardPeriod}
          setPeriod={setDashboardPeriod}
          monthOptions={monthOptions}
          summary={summary}
          categorySummary={categorySummary}
          recent={recent}
          onOpenTransaction={setSelectedTransaction}
          onOpenTransactions={() => setTab("transactions")}
          scrollOffset={scrollOffsets.current.dashboard}
          onScrollOffsetChange={(offset) => saveScrollOffset("dashboard", offset)}
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
          onMarkSelectedImportant={() => setSelectedTransactionsImportant(true)}
          onUnmarkSelectedImportant={() => setSelectedTransactionsImportant(false)}
          onDeleteSelected={deleteSelectedTransactions}
          busy={busy}
          scrollOffset={scrollOffsets.current.transactions}
          onScrollOffsetChange={(offset) => saveScrollOffset("transactions", offset)}
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
          scrollOffset={scrollOffsets.current.sync}
          onScrollOffsetChange={(offset) => saveScrollOffset("sync", offset)}
        />
      ) : null}

      {tab === "notifications" ? (
        <NotificationScreen
          notifications={notifications}
          onClear={clearNotifications}
          scrollOffset={scrollOffsets.current.notifications}
          onScrollOffsetChange={(offset) => saveScrollOffset("notifications", offset)}
        />
      ) : null}

      <TabBar tab={tab} setTab={setTab} bottomInset={insets.bottom} onAdd={openCreate} />
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
      <ConfirmDialog
        visible={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ""}
        message={confirmDialog?.message ?? ""}
        confirmText={confirmDialog?.confirmText ?? "Confirm"}
        cancelText={confirmDialog?.cancelText}
        confirmIcon={confirmDialog?.confirmIcon}
        destructive={confirmDialog?.destructive}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => {
          const action = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          action?.();
        }}
      />
    </SafeAreaView>
  );
}

function notificationTypeForMessage(message: string): AppNotification["type"] {
  const normalized = message.toLowerCase();
  if (normalized.includes("deleted") || normalized.includes("clear")) return "danger";
  if (normalized.includes("failed") || normalized.includes("blocked") || normalized.includes("required") || normalized.includes("must")) return "warning";
  if (normalized.includes("import") || normalized.includes("export")) return "sync";
  if (normalized.includes("added") || normalized.includes("updated") || normalized.includes("moved") || normalized.includes("marked")) return "success";
  return "system";
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
