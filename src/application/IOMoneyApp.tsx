import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, BackHandler, Image, Modal, Pressable, Text, useColorScheme, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { parseIOMoneyCsv, parseMoneyLoverCsv, toIOMoneyCsv, toMoneyLoverCsv } from "../data/csv";
import {
  allCounterpartiesForExport,
  allDebtPaymentsForExport,
  allDebtsForExport,
  allTransactionsForExport,
  allTransactionsForNativeExport,
  clearDebtData,
  clearTransactions,
  createDebt,
  deleteDebt,
  deleteDebtPayments,
  deleteTransactions,
  getSetting,
  getTransactionById,
  hardDeleteSmartNote,
  importNativeCounterparties,
  importNativeDebtPayments,
  importNativeDebts,
  importNativeTransactions,
  importTransactions,
  ignoreSmartNote,
  ignoreSmartNoteDraft,
  listSmartNotes,
  listCleanupItems,
  listUndoItems,
  markSmartNoteDraftConverted,
  recordDebtPayment,
  reconcileLegacyDebtPayments,
  markTransactionsImportant,
  moveTransactionsToCategory,
  purgeCleanupItems,
  deleteAccount,
  deleteBackupSnapshot,
  deleteBudgetLimit,
  deleteRecurringRule,
  recordBackupSnapshot,
  runDueRecurringRules,
  saveAccount,
  saveBudgetLimit,
  saveSmartNoteParse,
  setSetting,
  setRecurringRuleActive,
  softDeleteSmartNote,
  todayCsvDate,
  undoItem as undoMaintenanceItem,
  updateDebt,
  updateSmartNoteParse,
  upsertCategoryMetadata,
  upsertTransaction
} from "../data/db";
import { AppIcon, normalizeAppIcon } from "../domain/category";
import {
  AppNotification,
  AccountBalance,
  BackupSnapshot,
  BudgetStatus,
  CleanupItem,
  DebtDirection,
  DebtDraft,
  DebtPaymentDraft,
  DebtSummary,
  PeriodFilter,
  ReportGroup,
  RecurringRule,
  SmartNote,
  SmartNoteDraft,
  SmartParserSettings,
  Tab,
  Transaction,
  TransactionInput,
  UndoItem
} from "../domain/types";
import {
  CategoriesScreen,
  CashflowTrendScreen,
  CleanupScreen,
  DashboardScreen,
  DebtEditorModal,
  DebtsScreen,
  EditorModal,
  NotificationScreen,
  PlanningScreen,
  ReportsScreen,
  SettingsScreen,
  SmartNotesScreen,
  SyncScreen,
  TransactionDetailsModal,
  TransactionsScreen,
  UndoScreen
} from "../features/ledger/screens";
import { BottomSheetModal, ConfirmDialog, Field, IconButton, PrimaryButton, TabBar } from "../shared/components";
import { AppThemeMode, setThemeStyles, sizing, space, styles, theme } from "../shared/styles";
import { ConfirmDialogState } from "./confirmDialog";
import { useLedgerData } from "./hooks/useLedgerData";
import { useNotifications } from "./hooks/useNotifications";
import { useTransactionEditor } from "./hooks/useTransactionEditor";
import { DEFAULT_SMART_PARSER_SETTINGS, parseSmartNote } from "./smartParser";

export function IOMoneyApp() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [busy, setBusy] = useState(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<number[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [themeMode, setThemeMode] = useState<AppThemeMode>("system");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState("");
  const [addChooserOpen, setAddChooserOpen] = useState(false);
  const [debtDraft, setDebtDraft] = useState<DebtDraft | null>(null);
  const [editingDebt, setEditingDebt] = useState<DebtSummary | null>(null);
  const [debtPaymentDraft, setDebtPaymentDraft] = useState<DebtPaymentDraft | null>(null);
  const [debtPaymentBaseline, setDebtPaymentBaseline] = useState<DebtPaymentDraft | null>(null);
  const [cleanupItems, setCleanupItems] = useState<CleanupItem[]>([]);
  const [undoItems, setUndoItems] = useState<UndoItem[]>([]);
  const [categoryBackTab, setCategoryBackTab] = useState<Tab>("dashboard");
  const [debtDirectionFilter, setDebtDirectionFilter] = useState<"all" | DebtDirection>("all");
  const [smartNotes, setSmartNotes] = useState<SmartNote[]>([]);
  const [smartNoteText, setSmartNoteText] = useState("");
  const [editingSmartNoteId, setEditingSmartNoteId] = useState<number | null>(null);
  const [smartParserSettings, setSmartParserSettings] = useState<SmartParserSettings>(DEFAULT_SMART_PARSER_SETTINGS);
  const [smartParserBusy, setSmartParserBusy] = useState(false);
  const [pendingSmartDraftId, setPendingSmartDraftId] = useState<number | null>(null);
  const addChooserMotion = useRef(new Animated.Value(0)).current;
  const {
    notifications,
    unreadCount,
    notify,
    refreshNotifications,
    markAllRead,
    clearNotifications: clearNotificationsNow
  } = useNotifications();
  const {
    ready,
    transactions,
    recent,
    months,
    categories,
    categoryMetadata,
    counterparties,
    debts,
    debtPayments,
    dashboardPeriod,
    setDashboardPeriod,
    categoryPeriod,
    setCategoryPeriod,
    filter,
    setFilter,
    summary,
    fullCategorySummary,
    categoryDetailsSummary,
    reportCategorySummary,
    cashflowTrend,
    ledgerSummary,
    budgetStatuses,
    accountBalances,
    recurringRules,
    backupSnapshots,
    debtReminders,
    reportOverview,
    monthOptions,
    categoryOptions,
    refresh
  } = useLedgerData(notify);
  const scrollOffsets = useRef<Record<Tab, number>>({
    dashboard: 0,
    transactions: 0,
    debts: 0,
    sync: 0,
    settings: 0,
    notifications: 0,
    categories: 0,
    cashflow: 0,
    planning: 0,
    reports: 0,
    smartNotes: 0,
    cleanup: 0,
    undo: 0
  });
  const systemColorScheme = useColorScheme();
  const isDarkTheme = themeMode === "dark" || (themeMode === "system" && systemColorScheme === "dark");
  setThemeStyles(isDarkTheme);

  const saveScrollOffset = useCallback((targetTab: Tab, offset: number) => {
    scrollOffsets.current[targetTab] = offset;
  }, []);

  const openCategoriesForPeriod = useCallback(
    (period: PeriodFilter, backTab: Tab) => {
      setCategoryPeriod(period);
      setCategoryBackTab(backTab);
      scrollOffsets.current.categories = 0;
      setTab("categories");
    },
    [setCategoryPeriod]
  );

  const requestConfirmation = useCallback((dialog: ConfirmDialogState) => {
    setConfirmDialog(dialog);
  }, []);

  const refreshSmartNotes = useCallback(async () => {
    setSmartNotes(await listSmartNotes());
  }, []);

  const refreshMaintenance = useCallback(async () => {
    try {
      const [deletedRows, undoRows] = await Promise.all([listCleanupItems(), listUndoItems()]);
      setCleanupItems(deletedRows);
      setUndoItems(undoRows);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Maintenance refresh failed");
    }
  }, [notify]);
  const {
    selectedTransaction,
    setSelectedTransaction,
    draft,
    setDraft,
    recurrence,
    setRecurrence,
    editing,
    openCreate,
    openCreateFromDraft,
    openEdit,
    requestCloseEditor,
    saveDraft,
    removeTransaction
  } = useTransactionEditor({
    refresh,
    notify,
    requestConfirmation,
    setBusy,
    onTransactionSaved: async (transactionId, editingTransaction) => {
      if (editingTransaction || !pendingSmartDraftId) return;
      await markSmartNoteDraftConverted(pendingSmartDraftId, transactionId);
      setPendingSmartDraftId(null);
      await refreshSmartNotes();
    },
    onEditorClosed: () => setPendingSmartDraftId(null)
  });

  useEffect(() => {
    if (!ready) return;
    refreshNotifications().catch((error) => notify(error instanceof Error ? error.message : "Cannot load notifications"));
    refreshSmartNotes().catch((error) => notify(error instanceof Error ? error.message : "Cannot load smart notes"));
    Promise.all([getSetting("displayName"), getSetting("themeMode"), getSetting("smartParserSettings")])
      .then(([savedDisplayName, savedThemeMode, savedSmartParserSettings]) => {
        setDisplayName(savedDisplayName ?? "");
        setThemeMode(isAppThemeMode(savedThemeMode) ? savedThemeMode : "system");
        setSmartParserSettings(parseSmartParserSettings(savedSmartParserSettings));
      })
      .catch((error) => {
        notify(error instanceof Error ? error.message : "Cannot load settings");
      });
  }, [notify, ready, refreshNotifications, refreshSmartNotes]);

  useEffect(() => {
    if (!ready) return;
    const today = new Date().toISOString().slice(0, 10);
    getSetting("recurring_last_run")
      .then(async (lastRun) => {
        if (lastRun === today) return;
        const created = await runDueRecurringRules();
        await setSetting("recurring_last_run", today);
        if (created > 0) {
          await refresh();
          notify(`Generated ${created} recurring transaction${created === 1 ? "" : "s"}.`);
        }
      })
      .catch((error) => notify(error instanceof Error ? error.message : "Recurring check failed"));
  }, [notify, ready, refresh]);

  useEffect(() => {
    if (!ready || debtReminders.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    getSetting("debt_reminder_last_run")
      .then(async (lastRun) => {
        if (lastRun === today) return;
        const overdue = debtReminders.filter((reminder) => reminder.daysUntilDue < 0).length;
        const upcoming = debtReminders.length - overdue;
        notify(`${overdue} overdue and ${upcoming} upcoming debt reminder${debtReminders.length === 1 ? "" : "s"}.`);
        await setSetting("debt_reminder_last_run", today);
      })
      .catch((error) => notify(error instanceof Error ? error.message : "Debt reminder check failed"));
  }, [debtReminders, notify, ready]);

  useEffect(() => {
    if (!ready || budgetStatuses.length === 0) return;
    const riskyBudgets = budgetStatuses.filter((budget) => budget.usageRatio >= 0.8);
    if (riskyBudgets.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    getSetting("budget_warning_last_run")
      .then(async (lastRun) => {
        if (lastRun === today) return;
        const over = riskyBudgets.filter((budget) => budget.usageRatio >= 1).length;
        notify(`${over} over budget and ${riskyBudgets.length - over} near budget limit.`);
        await setSetting("budget_warning_last_run", today);
      })
      .catch((error) => notify(error instanceof Error ? error.message : "Budget warning check failed"));
  }, [budgetStatuses, notify, ready]);

  const openProfile = () => {
    setProfileDraft(displayName);
    setProfileOpen(true);
  };

  const saveProfile = async () => {
    const normalized = profileDraft.trim();
    setBusy(true);
    try {
      await setSetting("displayName", normalized);
      setDisplayName(normalized);
      setProfileOpen(false);
      notify("Profile updated.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Profile save failed");
    } finally {
      setBusy(false);
    }
  };

  const updateThemeMode = async (mode: AppThemeMode) => {
    setThemeMode(mode);
    try {
      await setSetting("themeMode", mode);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Theme save failed");
    }
  };

  const createCategory = async (name: string, icon: AppIcon, defaultReportGroup: ReportGroup) => {
    await upsertCategoryMetadata(name, icon, defaultReportGroup);
    await refresh();
  };

  const toggleAddChooser = () => setAddChooserOpen((open) => !open);

  const parseSmartNoteNow = async () => {
    setSmartParserBusy(true);
    try {
      await setSetting("smartParserSettings", JSON.stringify(smartParserSettings));
      const result = await parseSmartNote(smartNoteText, smartParserSettings, {
        categories,
        accounts: accountBalances.map((account) => account.name),
        defaultAccount: smartParserSettings.defaultAccount
      });
      const saved = editingSmartNoteId
        ? null
        : await saveSmartNoteParse(smartNoteText, smartParserSettings, result);
      if (editingSmartNoteId) await updateSmartNoteParse(editingSmartNoteId, smartNoteText, smartParserSettings, result);
      await refreshSmartNotes();
      setSmartNoteText("");
      setEditingSmartNoteId(null);
      const source = result[0]?.source ?? smartParserSettings.provider;
      notify(
        `${result.length} smart draft${result.length === 1 ? "" : "s"} ${editingSmartNoteId ? "updated" : "parsed"} ${source === "online" ? "online" : "locally"}.${
          saved && saved.duplicateCount > 0 ? " Similar note exists." : ""
        }`
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Smart note parse failed");
    } finally {
      setSmartParserBusy(false);
    }
  };

  const useSmartParseDraft = (smartDraft: SmartNoteDraft) => {
    setPendingSmartDraftId(smartDraft.id);
    openCreateFromDraft(transactionInputFromSmartDraft(smartDraft));
  };

  const acceptSmartDraftNow = async (smartDraft: SmartNoteDraft) => {
    setBusy(true);
    try {
      const transactionId = await upsertTransaction(transactionInputFromSmartDraft(smartDraft));
      if (!transactionId) throw new Error("Transaction was not created.");
      await markSmartNoteDraftConverted(smartDraft.id, transactionId);
      await Promise.all([refresh(), refreshSmartNotes()]);
      notify("Smart draft accepted.", { targetType: "transaction", targetId: transactionId });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Cannot accept smart draft");
    } finally {
      setBusy(false);
    }
  };

  const acceptSmartDraft = (smartDraft: SmartNoteDraft) => {
    if (smartDraft.duplicateCount === 0) {
      acceptSmartDraftNow(smartDraft);
      return;
    }
    requestConfirmation({
      title: "Potential duplicate",
      message: `${smartDraft.payload.note} looks similar to ${smartDraft.duplicateCount} existing record${smartDraft.duplicateCount === 1 ? "" : "s"}. Accept anyway?`,
      confirmText: "Accept",
      confirmIcon: "checkmark-outline",
      onConfirm: () => acceptSmartDraftNow(smartDraft)
    });
  };

  const requestIgnoreSmartDraft = (smartDraft: SmartNoteDraft) => {
    requestConfirmation({
      title: "Ignore smart draft?",
      message: smartDraft.payload.note,
      confirmText: "Ignore",
      confirmIcon: "remove-circle-outline",
      onConfirm: async () => {
        try {
          await ignoreSmartNoteDraft(smartDraft.id);
          await refreshSmartNotes();
          notify("Smart draft ignored.");
        } catch (error) {
          notify(error instanceof Error ? error.message : "Cannot ignore smart draft");
        }
      }
    });
  };

  const requestIgnoreSmartNote = (smartNote: SmartNote) => {
    requestConfirmation({
      title: "Ignore remaining drafts?",
      message: smartNote.content,
      confirmText: "Ignore",
      confirmIcon: "checkmark-done-outline",
      onConfirm: async () => {
        try {
          await ignoreSmartNote(smartNote.id);
          await refreshSmartNotes();
          notify("Smart note closed.");
        } catch (error) {
          notify(error instanceof Error ? error.message : "Cannot close smart note");
        }
      }
    });
  };

  const editSmartNote = (smartNote: SmartNote) => {
    if (smartNote.convertedCount > 0) {
      notify("Cannot edit a smart note after drafts were converted.");
      return;
    }
    setEditingSmartNoteId(smartNote.id);
    setSmartNoteText(smartNote.content);
  };

  const cancelSmartNoteEdit = () => {
    setEditingSmartNoteId(null);
    setSmartNoteText("");
  };

  const requestSoftDeleteSmartNote = (smartNote: SmartNote) => {
    requestConfirmation({
      title: "Delete smart note?",
      message: "This only removes the raw note and draft records from the inbox. Converted transactions stay untouched.",
      confirmText: "Delete",
      confirmIcon: "trash-outline",
      destructive: true,
      onConfirm: async () => {
        try {
          await softDeleteSmartNote(smartNote.id);
          if (editingSmartNoteId === smartNote.id) cancelSmartNoteEdit();
          await refreshSmartNotes();
          notify("Smart note deleted.");
        } catch (error) {
          notify(error instanceof Error ? error.message : "Cannot delete smart note");
        }
      }
    });
  };

  const requestHardDeleteSmartNote = (smartNote: SmartNote) => {
    requestConfirmation({
      title: "Permanently delete smart note?",
      message: "This removes the smart note history permanently. Converted transactions stay untouched.",
      confirmText: "Delete forever",
      confirmIcon: "trash-bin-outline",
      destructive: true,
      onConfirm: async () => {
        try {
          await hardDeleteSmartNote(smartNote.id);
          if (editingSmartNoteId === smartNote.id) cancelSmartNoteEdit();
          await refreshSmartNotes();
          notify("Smart note permanently deleted.");
        } catch (error) {
          notify(error instanceof Error ? error.message : "Cannot permanently delete smart note");
        }
      }
    });
  };

  useEffect(() => {
    if (!addChooserOpen) {
      addChooserMotion.setValue(0);
      return;
    }
    Animated.spring(addChooserMotion, {
      toValue: 1,
      damping: 16,
      stiffness: 240,
      mass: 0.8,
      useNativeDriver: true
    }).start();
  }, [addChooserMotion, addChooserOpen]);

  const openTransactionCreate = () => {
    setAddChooserOpen(false);
    setPendingSmartDraftId(null);
    openCreate();
  };

  const openDebtCreate = () => {
    const today = todayCsvDate();
    setAddChooserOpen(false);
    setEditingDebt(null);
    setDebtDraft({
      counterpartyId: null,
      newCounterpartyName: "",
      newCounterpartyType: "person",
      direction: "lent",
      amount: 0,
      currency: "VND",
      date: today,
      dueDate: "",
      note: "",
      account: "Cash"
    });
  };

  const saveDebtDraft = async () => {
    if (!debtDraft) return;
    setBusy(true);
    try {
      if (editingDebt) await updateDebt(editingDebt.id, debtDraft);
      else await createDebt(debtDraft);
      setDebtDraft(null);
      setEditingDebt(null);
      await refresh();
      notify(editingDebt ? "Debt updated." : "Debt added.", editingDebt ? { targetType: "debt", targetId: editingDebt.id } : undefined);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Debt save failed");
    } finally {
      setBusy(false);
    }
  };

  const openDebtEdit = (debt: DebtSummary) => {
    setEditingDebt(debt);
    setDebtDraft({
      counterpartyId: debt.counterpartyId,
      newCounterpartyName: "",
      newCounterpartyType: debt.counterpartyType,
      direction: debt.direction,
      amount: debt.principalAmount,
      currency: debt.currency,
      date: debt.startDate,
      dueDate: debt.dueDate,
      note: debt.note,
      account: "Cash"
    });
  };

  const requestDeleteDebts = (targetDebts: DebtSummary[]) => {
    if (targetDebts.length === 0) return;
    const ids = targetDebts.map((debt) => debt.id);
    const label = targetDebts.length === 1 ? targetDebts[0].counterpartyName : `${targetDebts.length} debts / loans`;
    requestConfirmation({
      title: "Delete debt / loan",
      message: `Delete ${label} and all linked debt transactions?`,
      confirmText: "Delete",
      confirmIcon: "trash-outline",
      destructive: true,
      onConfirm: async () => {
        setBusy(true);
        try {
          for (const id of ids) await deleteDebt(id);
          await refresh();
          await refreshMaintenance();
          notify(targetDebts.length === 1 ? "Debt deleted." : `${targetDebts.length} debts deleted.`);
        } catch (error) {
          notify(error instanceof Error ? error.message : "Debt delete failed");
        } finally {
          setBusy(false);
        }
      }
    });
  };

  const openDebtPayment = (debt: DebtSummary) => {
    const nextDraft = {
      debtId: debt.id,
      amount: 0,
      date: todayCsvDate(),
      note: debt.direction === "lent" ? "Debt repayment received" : "Debt payment",
      account: "Cash",
      recordCashFlow: false
    };
    setDebtPaymentDraft(nextDraft);
    setDebtPaymentBaseline(nextDraft);
  };

  const openDebtPaymentEdit = (payment: DebtPaymentDraft) => {
    const nextDraft = { ...payment };
    setDebtPaymentDraft(nextDraft);
    setDebtPaymentBaseline(nextDraft);
  };

  const openLedgerEntry = (transaction: Transaction) => {
    if (transaction.debtPaymentId) {
      const payment = debtPayments.find((item) => item.id === transaction.debtPaymentId);
      if (payment) {
        setTab("debts");
        openDebtPaymentEdit(payment);
        return;
      }
    }
    setSelectedTransaction(transaction);
  };

  const openTransactionEdit = (transaction: Transaction) => {
    setPendingSmartDraftId(null);
    openEdit(transaction);
  };

  const closeDebtPayment = () => {
    setDebtPaymentDraft(null);
    setDebtPaymentBaseline(null);
  };

  const requestCloseDebtPayment = () => {
    if (!debtPaymentDraft || !isDebtPaymentDirty(debtPaymentDraft, debtPaymentBaseline)) {
      closeDebtPayment();
      return;
    }
    requestConfirmation({
      title: "Discard payment changes?",
      message: "This debt payment has unsaved changes.",
      confirmText: "Discard",
      cancelText: "Keep editing",
      destructive: true,
      onConfirm: closeDebtPayment
    });
  };

  const saveDebtPayment = async () => {
    if (!debtPaymentDraft) return;
    setBusy(true);
    try {
      const editingPayment = Boolean(debtPaymentDraft.id);
      await recordDebtPayment(debtPaymentDraft);
      closeDebtPayment();
      await refresh();
      notify(editingPayment ? "Debt payment updated." : "Debt payment recorded.", { targetType: "debt", targetId: debtPaymentDraft.debtId });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Payment save failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (addChooserOpen) {
        setAddChooserOpen(false);
        return true;
      }
      if (debtPaymentDraft) {
        requestCloseDebtPayment();
        return true;
      }
      if (debtDraft) {
        setDebtDraft(null);
        setEditingDebt(null);
        return true;
      }
      if (draft) {
        requestCloseEditor();
        return true;
      }
      if (selectedTransaction) {
        setSelectedTransaction(null);
        return true;
      }
      if (tab === "sync" || tab === "cleanup" || tab === "undo") {
        setTab("settings");
        return true;
      }
      if (tab === "planning" || tab === "reports") {
        setTab("settings");
        return true;
      }
      if (tab === "categories") {
        setTab(categoryBackTab);
        return true;
      }
      if (tab === "cashflow") {
        setTab("dashboard");
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
  }, [addChooserOpen, categoryBackTab, debtDraft, debtPaymentDraft, draft, requestCloseEditor, requestConfirmation, selectedTransaction, tab]);

  const toggleTransactionSelection = useCallback((id: number) => {
    setSelectedTransactionIds((selected) =>
      selected.includes(id) ? selected.filter((selectedId) => selectedId !== id) : [...selected, id]
    );
  }, []);

  const moveSelectedTransactions = async (category: string) => {
    const transactionIds = selectedTransactionIds.filter(isPersistedTransactionId);
    if (transactionIds.length === 0 || !category) return;
    setBusy(true);
    try {
      await moveTransactionsToCategory(transactionIds, category);
      const moved = transactionIds.length;
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
    const transactionIds = selectedTransactionIds.filter(isPersistedTransactionId);
    if (transactionIds.length === 0) return;
    setBusy(true);
    try {
      await markTransactionsImportant(transactionIds, important);
      const changed = transactionIds.length;
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
    const transactionIds = selectedTransactionIds.filter(isPersistedTransactionId);
    const debtPaymentIds = selectedTransactionIds.filter(isDebtOnlyLedgerId).map((id) => -id);
    const selectedCount = transactionIds.length + debtPaymentIds.length;
    requestConfirmation({
      title: "Delete selected records",
      message: `Delete ${selectedCount} selected ledger record${selectedCount === 1 ? "" : "s"}?`,
      confirmText: "Delete",
      confirmIcon: "trash-outline",
      destructive: true,
      onConfirm: async () => {
          setBusy(true);
          try {
            await deleteTransactions(transactionIds);
            await deleteDebtPayments(debtPaymentIds);
            setSelectedTransactionIds([]);
            await refresh();
            await refreshMaintenance();
            notify(`Deleted ${selectedCount} selected record${selectedCount === 1 ? "" : "s"}.`);
          } catch (error) {
            notify(error instanceof Error ? error.message : "Delete failed");
          } finally {
            setBusy(false);
          }
      }
    });
  };

  const importMoneyLoverCsv = async () => {
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
        `Money Lover import: ${result.inserted}. Skipped duplicates ${result.skippedDuplicates}. Invalid rows ${
          parsed.invalidRows.length + result.invalidRows.length
        }.`
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const importIOMoneyCsv = async () => {
    setBusy(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "text/plain"],
        copyToCacheDirectory: true
      });
      if (picked.canceled) return;
      const file = picked.assets[0];
      const text = await new File(file.uri).text();
      const parsed = parseIOMoneyCsv(text);
      if (parsed.invalidRows.length > 0 && parsed.rows.length === 0) {
        notify(`IOMoney import blocked: ${parsed.invalidRows[0].reason}`);
        return;
      }
      await importNativeCounterparties(parsed.counterparties);
      await importNativeDebts(parsed.debts);
      const result = await importNativeTransactions(parsed.rows);
      await importNativeDebtPayments(parsed.debtPayments);
      await reconcileLegacyDebtPayments();
      for (const category of parsed.categoryMetadata) {
        await upsertCategoryMetadata(category.name, normalizeAppIcon(category.icon), category.defaultReportGroup);
      }
      await refresh();
      notify(
        `IOMoney import: ${result.inserted}. Categories ${parsed.categoryMetadata.length}. Debts ${parsed.debts.length}. Payments ${parsed.debtPayments.length}. Skipped older ${result.skippedDuplicates}. Invalid rows ${
          parsed.invalidRows.length + result.invalidRows.length
        }.`
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "IOMoney import failed");
    } finally {
      setBusy(false);
    }
  };

  const exportMoneyLoverCsv = async () => {
    setBusy(true);
    try {
      const rows = await allTransactionsForExport();
      const csv = toMoneyLoverCsv(rows);
      const filename = `iomoney-moneylover-${new Date().toISOString().slice(0, 10)}.csv`;
      const output = new File(Paths.document, filename);
      output.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(output.uri, { mimeType: "text/csv", dialogTitle: "Export CSV" });
      }
      notify(`Exported ${rows.length} records to ${filename}.`);
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
          await clearDebtData();
          await refresh();
          notify("Local database cleared.");
      }
    });
  };

  const exportIOMoneyCsv = async () => {
    setBusy(true);
    try {
      const rows = await allTransactionsForNativeExport();
      const [exportCounterparties, exportDebts, exportDebtPayments] = await Promise.all([
        allCounterpartiesForExport(),
        allDebtsForExport(),
        allDebtPaymentsForExport()
      ]);
      const csv = toIOMoneyCsv(rows, categoryMetadata, exportCounterparties, exportDebts, exportDebtPayments);
      const filename = `iomoney-native-${new Date().toISOString().slice(0, 10)}.csv`;
      const output = new File(Paths.document, filename);
      output.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(output.uri, { mimeType: "text/csv", dialogTitle: "Export IOMoney CSV" });
      }
      notify(`Exported ${rows.length} native records to ${filename}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "IOMoney export failed");
    } finally {
      setBusy(false);
    }
  };

  const createBackupSnapshot = async () => {
    setBusy(true);
    try {
      const rows = await allTransactionsForNativeExport();
      const [exportCounterparties, exportDebts, exportDebtPayments] = await Promise.all([
        allCounterpartiesForExport(),
        allDebtsForExport(),
        allDebtPaymentsForExport()
      ]);
      const csv = toIOMoneyCsv(rows, categoryMetadata, exportCounterparties, exportDebts, exportDebtPayments);
      const filename = `iomoney-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
      const output = new File(Paths.document, filename);
      output.write(csv);
      await recordBackupSnapshot(filename, output.uri, rows.length);
      await refresh();
      notify(`Backup snapshot saved: ${filename}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Backup failed");
    } finally {
      setBusy(false);
    }
  };

  const shareBackupSnapshot = async (backup: BackupSnapshot) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backup.uri, { mimeType: "text/csv", dialogTitle: "Share backup snapshot" });
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Cannot share backup");
    }
  };

  const requestDeleteBackupSnapshot = (backup: BackupSnapshot) => {
    requestConfirmation({
      title: "Delete backup snapshot?",
      message: backup.filename,
      confirmText: "Delete",
      confirmIcon: "trash-outline",
      destructive: true,
      onConfirm: async () => {
        await deleteBackupSnapshot(backup.id);
        await refresh();
        notify("Backup snapshot removed.");
      }
    });
  };

  const savePlanningBudget = async (category: string, month: string, limitAmount: number) => {
    setBusy(true);
    try {
      await saveBudgetLimit(category, month, limitAmount);
      await refresh();
      notify("Budget saved.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Cannot save budget");
    } finally {
      setBusy(false);
    }
  };

  const requestDeleteBudget = (budget: BudgetStatus) => {
    requestConfirmation({
      title: "Delete budget?",
      message: `${budget.category} / ${budget.month}`,
      confirmText: "Delete",
      confirmIcon: "trash-outline",
      destructive: true,
      onConfirm: async () => {
        await deleteBudgetLimit(budget.id);
        await refresh();
        notify("Budget deleted.");
      }
    });
  };

  const savePlanningAccount = async (name: string, openingBalance: number) => {
    setBusy(true);
    try {
      await saveAccount(name, openingBalance);
      await refresh();
      notify("Account saved.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Cannot save account");
    } finally {
      setBusy(false);
    }
  };

  const requestDeleteAccount = (account: AccountBalance) => {
    requestConfirmation({
      title: "Delete account?",
      message: `${account.name}. Existing transactions keep their account text.`,
      confirmText: "Delete",
      confirmIcon: "trash-outline",
      destructive: true,
      onConfirm: async () => {
        await deleteAccount(account.id);
        await refresh();
        notify("Account deleted.");
      }
    });
  };

  const toggleRecurringRule = async (rule: RecurringRule) => {
    await setRecurringRuleActive(rule.id, !rule.active);
    await refresh();
    notify(rule.active ? "Recurring rule paused." : "Recurring rule resumed.");
  };

  const requestDeleteRecurringRule = (rule: RecurringRule) => {
    requestConfirmation({
      title: "Delete recurring rule?",
      message: rule.note,
      confirmText: "Delete",
      confirmIcon: "trash-outline",
      destructive: true,
      onConfirm: async () => {
        await deleteRecurringRule(rule.id);
        await refresh();
        notify("Recurring rule deleted.");
      }
    });
  };

  const generateDebtReminderNotifications = async () => {
    if (debtReminders.length === 0) {
      notify("No due debt reminders.");
      return;
    }
    for (const reminder of debtReminders) {
      notify(
        `${reminder.counterpartyName}: ${reminder.daysUntilDue < 0 ? `${Math.abs(reminder.daysUntilDue)} days overdue` : `due in ${reminder.daysUntilDue} days`}.`,
        { targetType: "debt", targetId: reminder.debtId }
      );
    }
  };

  const clearNotifications = () => {
    if (notifications.length === 0) return;
    requestConfirmation({
      title: "Clear notifications",
      message: `Clear ${notifications.length} notifications?`,
      confirmText: "Clear",
      confirmIcon: "trash-outline",
      destructive: true,
      onConfirm: () => {
        clearNotificationsNow().catch((error) => notify(error instanceof Error ? error.message : "Clear notifications failed"));
      }
    });
  };

  const openNotifications = () => {
    setTab("notifications");
    markAllRead().catch((error) => notify(error instanceof Error ? error.message : "Cannot mark notifications read"));
  };

  const openNotificationTarget = async (notification: AppNotification) => {
    try {
      if (!notification.targetType || !notification.targetId) return;
      if (notification.targetType === "transaction") {
        const tx =
          transactions.find((item) => item.id === notification.targetId) ??
          recent.find((item) => item.id === notification.targetId) ??
          (await getTransactionById(notification.targetId));
        if (!tx) {
          notify("Notification target is no longer available");
          return;
        }
        setSelectedTransaction(tx);
        return;
      }
      if (notification.targetType === "debt") {
        const debt = debts.find((item) => item.id === notification.targetId);
        if (!debt) {
          notify("Notification target is no longer available");
          return;
        }
        setTab("debts");
        openDebtPayment(debt);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Cannot open notification target");
    }
  };

  const openLedgerWithFlow = (flow: "all" | "expense" | "income") => {
    setSelectedTransactionIds([]);
    setFilter({
      query: "",
      period: dashboardPeriod,
      categories: [],
      flow,
      scope: "operating",
      sort: "dateDesc"
    });
    setTab("transactions");
  };

  const openDebtsWithDirection = (direction: "all" | DebtDirection = "all") => {
    setDebtDirectionFilter(direction);
    setTab("debts");
  };

  const requestPurgeCleanupItems = (items: CleanupItem[]) => {
    if (items.length === 0) return;
    requestConfirmation({
      title: "Permanently delete items?",
      message: `Purge ${items.length} selected deleted item${items.length === 1 ? "" : "s"}? This also clears undo history.`,
      confirmText: "Purge",
      confirmIcon: "trash-outline",
      destructive: true,
      onConfirm: async () => {
        setBusy(true);
        try {
          await purgeCleanupItems(items.map((item) => ({ type: item.type, id: item.id })));
          await refresh();
          await refreshMaintenance();
          notify(`Purged ${items.length} deleted item${items.length === 1 ? "" : "s"}.`);
        } catch (error) {
          notify(error instanceof Error ? error.message : "Purge failed");
        } finally {
          setBusy(false);
        }
      }
    });
  };

  const requestUndoItem = (item: UndoItem) => {
    requestConfirmation({
      title: "Undo this action?",
      message: item.label,
      confirmText: "Undo",
      confirmIcon: "arrow-undo-outline",
      onConfirm: async () => {
        setBusy(true);
        try {
          await undoMaintenanceItem(item.id);
          await refresh();
          await refreshMaintenance();
          notify("Undo applied.");
        } catch (error) {
          notify(error instanceof Error ? error.message : "Undo failed");
        } finally {
          setBusy(false);
        }
      }
    });
  };

  if (!ready) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.shell}>
        <StatusBar style={theme.dark ? "light" : "dark"} backgroundColor="transparent" translucent />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.muted}>Loading local database</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.shell}>
      <StatusBar style={theme.dark ? "light" : "dark"} backgroundColor="transparent" translucent />
      {tab !== "categories" && tab !== "cashflow" && tab !== "planning" && tab !== "reports" && tab !== "sync" && tab !== "cleanup" && tab !== "undo" ? (
        <View style={styles.header}>
          <Pressable accessibilityLabel="Edit profile" style={styles.headerCharacter} onPress={openProfile}>
            <Image source={require("../../assets/coine-peek-a-boo.png")} style={styles.headerCharacterImage} resizeMode="contain" />
          </Pressable>
          <Text style={styles.headerGreeting} numberOfLines={1}>
            Hello, {displayName || "my friend"}
          </Text>
          <View style={styles.headerActions}>
            <IconButton
              icon="notifications-outline"
              onPress={openNotifications}
              label="Notifications"
              style={styles.headerIconButton}
            />
            {unreadCount > 0 ? (
              <View style={styles.headerNotificationBadge}>
                <Text style={styles.headerNotificationBadgeText}>{Math.min(unreadCount, 9)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {tab === "dashboard" ? (
        <DashboardScreen
          period={dashboardPeriod}
          setPeriod={setDashboardPeriod}
          monthOptions={monthOptions}
          summary={summary}
          debts={debts}
          fullCategorySummary={fullCategorySummary}
          cashflowTrend={cashflowTrend}
          recent={recent}
          onOpenTransaction={openLedgerEntry}
          onOpenTransactions={() => setTab("transactions")}
          onOpenIncome={() => openLedgerWithFlow("income")}
          onOpenExpense={() => openLedgerWithFlow("expense")}
          onOpenNet={() => openLedgerWithFlow("all")}
          onOpenDebts={openDebtsWithDirection}
          onOpenCashflow={() => setTab("cashflow")}
          onOpenCategories={() => openCategoriesForPeriod(dashboardPeriod, "dashboard")}
          scrollOffset={scrollOffsets.current.dashboard}
          onScrollOffsetChange={(offset) => saveScrollOffset("dashboard", offset)}
        />
      ) : null}

      {tab === "categories" ? (
        <CategoriesScreen
          period={categoryPeriod}
          categories={categoryDetailsSummary}
          onBack={() => setTab(categoryBackTab)}
          scrollOffset={scrollOffsets.current.categories}
          onScrollOffsetChange={(offset) => saveScrollOffset("categories", offset)}
        />
      ) : null}

      {tab === "cashflow" ? (
        <CashflowTrendScreen
          trend={cashflowTrend}
          onBack={() => setTab("dashboard")}
          onOpenMonthCategories={(month) => openCategoriesForPeriod({ mode: "month", month }, "cashflow")}
          scrollOffset={scrollOffsets.current.cashflow}
          onScrollOffsetChange={(offset) => saveScrollOffset("cashflow", offset)}
        />
      ) : null}

      {tab === "planning" ? (
        <PlanningScreen
          budgets={budgetStatuses}
          accounts={accountBalances}
          recurringRules={recurringRules}
          backups={backupSnapshots}
          reminders={debtReminders}
          monthOptions={monthOptions}
          categoryOptions={categoryOptions}
          busy={busy}
          onBack={() => setTab("settings")}
          onSaveBudget={savePlanningBudget}
          onDeleteBudget={requestDeleteBudget}
          onSaveAccount={savePlanningAccount}
          onDeleteAccount={requestDeleteAccount}
          onToggleRecurring={toggleRecurringRule}
          onDeleteRecurring={requestDeleteRecurringRule}
          onCreateBackup={createBackupSnapshot}
          onShareBackup={shareBackupSnapshot}
          onDeleteBackup={requestDeleteBackupSnapshot}
          onGenerateDebtReminders={generateDebtReminderNotifications}
          scrollOffset={scrollOffsets.current.planning}
          onScrollOffsetChange={(offset) => saveScrollOffset("planning", offset)}
        />
      ) : null}

      {tab === "reports" ? (
        <ReportsScreen
          overview={reportOverview}
          trend={cashflowTrend}
          categories={reportCategorySummary}
          onBack={() => setTab("settings")}
          onOpenCashflow={() => setTab("cashflow")}
          onOpenCategories={() => openCategoriesForPeriod({ mode: "month", month: "all" }, "reports")}
          scrollOffset={scrollOffsets.current.reports}
          onScrollOffsetChange={(offset) => saveScrollOffset("reports", offset)}
        />
      ) : null}

      {tab === "smartNotes" ? (
        <SmartNotesScreen
          notes={smartNotes}
          text={smartNoteText}
          settings={smartParserSettings}
          accounts={accountBalances.map((account) => account.name)}
          editingNoteId={editingSmartNoteId}
          busy={smartParserBusy || busy}
          onBack={() => setTab("dashboard")}
          onTextChange={setSmartNoteText}
          onSettingsChange={setSmartParserSettings}
          onParse={parseSmartNoteNow}
          onReviewDraft={useSmartParseDraft}
          onAcceptDraft={acceptSmartDraft}
          onIgnoreDraft={requestIgnoreSmartDraft}
          onIgnoreNote={requestIgnoreSmartNote}
          onEditNote={editSmartNote}
          onCancelEdit={cancelSmartNoteEdit}
          onSoftDeleteNote={requestSoftDeleteSmartNote}
          onHardDeleteNote={requestHardDeleteSmartNote}
          showBack={false}
          scrollOffset={scrollOffsets.current.smartNotes}
          onScrollOffsetChange={(offset) => saveScrollOffset("smartNotes", offset)}
        />
      ) : null}

      {tab === "transactions" ? (
        <TransactionsScreen
          filter={filter}
          setFilter={setFilter}
          monthOptions={monthOptions}
          categoryOptions={categoryOptions}
          transactions={transactions}
          ledgerSummary={ledgerSummary}
          onOpenTransaction={openLedgerEntry}
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
          onImportMoneyLover={importMoneyLoverCsv}
          onExportMoneyLover={exportMoneyLoverCsv}
          onImportIOMoney={importIOMoneyCsv}
          onExportIOMoney={exportIOMoneyCsv}
          onClear={clearAll}
          onBack={() => setTab("settings")}
          categories={categories.length}
          months={months.length}
          scrollOffset={scrollOffsets.current.sync}
          onScrollOffsetChange={(offset) => saveScrollOffset("sync", offset)}
        />
      ) : null}

      {tab === "cleanup" ? (
        <CleanupScreen
          items={cleanupItems}
          busy={busy}
          onBack={() => setTab("settings")}
          onRefresh={refreshMaintenance}
          onPurge={requestPurgeCleanupItems}
          scrollOffset={scrollOffsets.current.cleanup}
          onScrollOffsetChange={(offset) => saveScrollOffset("cleanup", offset)}
        />
      ) : null}

      {tab === "undo" ? (
        <UndoScreen
          items={undoItems}
          busy={busy}
          onBack={() => setTab("settings")}
          onRefresh={refreshMaintenance}
          onUndo={requestUndoItem}
          scrollOffset={scrollOffsets.current.undo}
          onScrollOffsetChange={(offset) => saveScrollOffset("undo", offset)}
        />
      ) : null}

      {tab === "debts" ? (
        <DebtsScreen
          debts={debts}
          debtPayments={debtPayments}
          busy={busy}
          paymentDraft={debtPaymentDraft}
          onEditDebt={openDebtEdit}
          onDeleteDebts={requestDeleteDebts}
          onOpenPayment={openDebtPayment}
          onOpenPaymentEdit={openDebtPaymentEdit}
          onPaymentChange={setDebtPaymentDraft}
          onClosePayment={requestCloseDebtPayment}
          onSavePayment={saveDebtPayment}
          directionFilter={debtDirectionFilter}
          onDirectionFilterChange={setDebtDirectionFilter}
          scrollOffset={scrollOffsets.current.debts}
          onScrollOffsetChange={(offset) => saveScrollOffset("debts", offset)}
        />
      ) : null}

      {tab === "settings" ? (
        <SettingsScreen
          displayName={displayName}
          total={summary?.count ?? 0}
          categories={categories.length}
          months={months.length}
          themeMode={themeMode}
          onEditProfile={openProfile}
          onThemeModeChange={updateThemeMode}
          onOpenPlanning={() => setTab("planning")}
          onOpenReports={() => setTab("reports")}
          onOpenSmartNotes={() => setTab("smartNotes")}
          onOpenSync={() => setTab("sync")}
          onOpenCleanup={() => {
            refreshMaintenance();
            setTab("cleanup");
          }}
          onOpenUndo={() => {
            refreshMaintenance();
            setTab("undo");
          }}
          scrollOffset={scrollOffsets.current.settings}
          onScrollOffsetChange={(offset) => saveScrollOffset("settings", offset)}
        />
      ) : null}

      {tab === "notifications" ? (
        <NotificationScreen
          notifications={notifications}
          onClear={clearNotifications}
          onOpenNotification={openNotificationTarget}
          scrollOffset={scrollOffsets.current.notifications}
          onScrollOffsetChange={(offset) => saveScrollOffset("notifications", offset)}
        />
      ) : null}

      <TabBar tab={tab} setTab={setTab} bottomInset={insets.bottom} onAdd={toggleAddChooser} addOpen={addChooserOpen} />
      <TransactionDetailsModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onEdit={openTransactionEdit}
        onDelete={(tx) => {
          setSelectedTransaction(null);
          removeTransaction(tx);
        }}
      />
      <EditorModal
        visible={Boolean(draft)}
        draft={draft}
        categories={categories}
        categoryMetadata={categoryMetadata}
        busy={busy}
        editing={Boolean(editing)}
        recurrence={recurrence}
        onRecurrenceChange={setRecurrence}
        onChange={setDraft}
        onCreateCategory={createCategory}
        onClose={requestCloseEditor}
        onSave={saveDraft}
      />
      <DebtEditorModal
        visible={Boolean(debtDraft)}
        draft={debtDraft}
        counterparties={counterparties}
        busy={busy}
        editing={Boolean(editingDebt)}
        onChange={setDebtDraft}
        onClose={() => {
          setDebtDraft(null);
          setEditingDebt(null);
        }}
        onSave={saveDebtDraft}
      />
      <Modal visible={addChooserOpen} transparent animationType="fade" onRequestClose={() => setAddChooserOpen(false)}>
        <Pressable style={styles.speedDialOverlay} onPress={() => setAddChooserOpen(false)}>
          <Animated.View
            style={[
              styles.speedDialMenu,
              {
                right: space.lg,
                bottom: Math.max(space.md, insets.bottom) + sizing.tabBase + space.xxl,
                opacity: addChooserMotion,
                transform: [
                  {
                    translateY: addChooserMotion.interpolate({
                      inputRange: [0, 1],
                      outputRange: [sizing.tabBase + space.md, 0]
                    })
                  },
                  {
                    scale: addChooserMotion.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1]
                    })
                  }
                ]
              }
            ]}
          >
            <SpeedDialAction icon="receipt-outline" title="Transaction" subtitle="Regular income or outcome" onPress={openTransactionCreate} />
            <SpeedDialAction icon="people-outline" title="Debt / loan" subtitle="Track money borrowed or lent" onPress={openDebtCreate} />
          </Animated.View>
        </Pressable>
      </Modal>
      <BottomSheetModal
        visible={profileOpen}
        title="Profile"
        onClose={() => setProfileOpen(false)}
        footer={<PrimaryButton icon="save-outline" text="Save profile" onPress={saveProfile} disabled={busy} />}
      >
        <Field label="Name" value={profileDraft} onChangeText={setProfileDraft} />
      </BottomSheetModal>
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

function SpeedDialAction({
  icon,
  title,
  subtitle,
  onPress
}: {
  icon: AppIcon;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.speedDialAction} onPress={onPress}>
      <View style={styles.speedDialTextBox}>
        <Text style={styles.speedDialTitle}>{title}</Text>
        <Text style={styles.speedDialSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.speedDialIcon}>
        <Ionicons name={icon} size={21} color={theme.colors.onAccent} />
      </View>
    </Pressable>
  );
}

function isAppThemeMode(value: string | null): value is AppThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function parseSmartParserSettings(value: string | null): SmartParserSettings {
  if (!value) return DEFAULT_SMART_PARSER_SETTINGS;
  try {
    const parsed = JSON.parse(value) as Partial<SmartParserSettings>;
    return {
      provider: parsed.provider === "online" ? "online" : "local",
      endpoint: typeof parsed.endpoint === "string" ? parsed.endpoint : "",
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model: typeof parsed.model === "string" ? parsed.model : "",
      defaultAccount: typeof parsed.defaultAccount === "string" ? parsed.defaultAccount : ""
    };
  } catch {
    return DEFAULT_SMART_PARSER_SETTINGS;
  }
}

function transactionInputFromSmartDraft(smartDraft: SmartNoteDraft): TransactionInput {
  const result = smartDraft.payload;
  return {
    externalId: null,
    note: result.note,
    amount: result.amount,
    category: result.category,
    reportGroup: result.reportGroup,
    debtId: null,
    account: result.account,
    currency: result.currency,
    date: result.date,
    event: result.event,
    excludeReport: result.excludeReport,
    important: result.important
  };
}

function isDebtPaymentDirty(draft: DebtPaymentDraft, baseline: DebtPaymentDraft | null) {
  if (!baseline) return true;
  return (
    draft.debtId !== baseline.debtId ||
    draft.amount !== baseline.amount ||
    draft.date !== baseline.date ||
    draft.note.trim() !== baseline.note.trim() ||
    draft.account.trim() !== baseline.account.trim() ||
    draft.recordCashFlow !== baseline.recordCashFlow
  );
}

function isPersistedTransactionId(id: number) {
  return id > 0;
}

function isDebtOnlyLedgerId(id: number) {
  return id < 0;
}
