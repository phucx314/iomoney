import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Image, Pressable, Text, useColorScheme, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { parseIOMoneyCsv, parseMoneyLoverCsv, toIOMoneyCsv, toMoneyLoverCsv } from "../data/csv";
import {
  allTransactionsForExport,
  allTransactionsForNativeExport,
  clearTransactions,
  deleteTransactions,
  getSetting,
  importNativeTransactions,
  importTransactions,
  markTransactionsImportant,
  moveTransactionsToCategory,
  setSetting
} from "../data/db";
import { Tab } from "../domain/types";
import {
  CategoriesScreen,
  DashboardScreen,
  EditorModal,
  NotificationScreen,
  SettingsScreen,
  SyncScreen,
  TransactionDetailsModal,
  TransactionsScreen
} from "../features/ledger/screens";
import { BottomSheetModal, ConfirmDialog, Field, IconButton, PrimaryButton, TabBar } from "../shared/components";
import { AppThemeMode, setThemeStyles, styles, theme } from "../shared/styles";
import { ConfirmDialogState } from "./confirmDialog";
import { useLedgerData } from "./hooks/useLedgerData";
import { useNotifications } from "./hooks/useNotifications";
import { useTransactionEditor } from "./hooks/useTransactionEditor";

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
  const { notifications, notify, clearNotifications: clearNotificationsNow } = useNotifications();
  const {
    ready,
    transactions,
    recent,
    months,
    categories,
    dashboardPeriod,
    setDashboardPeriod,
    filter,
    setFilter,
    summary,
    categorySummary,
    fullCategorySummary,
    ledgerSummary,
    monthOptions,
    categoryOptions,
    refresh
  } = useLedgerData(notify);
  const scrollOffsets = useRef<Record<Tab, number>>({ dashboard: 0, transactions: 0, sync: 0, settings: 0, notifications: 0, categories: 0 });
  const systemColorScheme = useColorScheme();
  const isDarkTheme = themeMode === "dark" || (themeMode === "system" && systemColorScheme === "dark");
  setThemeStyles(isDarkTheme);

  const saveScrollOffset = useCallback((targetTab: Tab, offset: number) => {
    scrollOffsets.current[targetTab] = offset;
  }, []);

  const requestConfirmation = useCallback((dialog: ConfirmDialogState) => {
    setConfirmDialog(dialog);
  }, []);
  const {
    selectedTransaction,
    setSelectedTransaction,
    draft,
    setDraft,
    recurrence,
    setRecurrence,
    editing,
    openCreate,
    openEdit,
    requestCloseEditor,
    saveDraft,
    removeTransaction
  } = useTransactionEditor({ refresh, notify, requestConfirmation, setBusy });

  useEffect(() => {
    if (!ready) return;
    Promise.all([getSetting("displayName"), getSetting("themeMode")])
      .then(([savedDisplayName, savedThemeMode]) => {
        setDisplayName(savedDisplayName ?? "");
        setThemeMode(isAppThemeMode(savedThemeMode) ? savedThemeMode : "system");
      })
      .catch((error) => {
        notify(error instanceof Error ? error.message : "Cannot load settings");
      });
  }, [notify, ready]);

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
      const result = await importNativeTransactions(parsed.rows);
      await refresh();
      notify(
        `IOMoney import: ${result.inserted}. Skipped older ${result.skippedDuplicates}. Invalid rows ${
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

  const exportIOMoneyCsv = async () => {
    setBusy(true);
    try {
      const rows = await allTransactionsForNativeExport();
      const csv = toIOMoneyCsv(rows);
      const filename = `iomoney-native-${new Date().toISOString().slice(0, 10)}.csv`;
      const output = new File(Paths.document, filename);
      output.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(output.uri, { mimeType: "text/csv", dialogTitle: "Export IOMoney CSV" });
      }
      notify(`Exported ${rows.length} native rows to ${filename}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "IOMoney export failed");
    } finally {
      setBusy(false);
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
      onConfirm: clearNotificationsNow
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
      {tab !== "categories" ? (
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
              onPress={() => setTab("notifications")}
              label="Notifications"
              style={styles.headerIconButton}
            />
            {notifications.length > 0 ? (
              <View style={styles.headerNotificationBadge}>
                <Text style={styles.headerNotificationBadgeText}>{Math.min(notifications.length, 9)}</Text>
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
          categorySummary={categorySummary}
          recent={recent}
          onOpenTransaction={setSelectedTransaction}
          onOpenTransactions={() => setTab("transactions")}
          onOpenCategories={() => setTab("categories")}
          scrollOffset={scrollOffsets.current.dashboard}
          onScrollOffsetChange={(offset) => saveScrollOffset("dashboard", offset)}
        />
      ) : null}

      {tab === "categories" ? (
        <CategoriesScreen
          period={dashboardPeriod}
          categories={fullCategorySummary}
          onBack={() => setTab("dashboard")}
          scrollOffset={scrollOffsets.current.categories}
          onScrollOffsetChange={(offset) => saveScrollOffset("categories", offset)}
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
          onImportMoneyLover={importMoneyLoverCsv}
          onExportMoneyLover={exportMoneyLoverCsv}
          onImportIOMoney={importIOMoneyCsv}
          onExportIOMoney={exportIOMoneyCsv}
          onClear={clearAll}
          categories={categories.length}
          months={months.length}
          scrollOffset={scrollOffsets.current.sync}
          onScrollOffsetChange={(offset) => saveScrollOffset("sync", offset)}
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
          scrollOffset={scrollOffsets.current.settings}
          onScrollOffsetChange={(offset) => saveScrollOffset("settings", offset)}
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

function isAppThemeMode(value: string | null): value is AppThemeMode {
  return value === "system" || value === "light" || value === "dark";
}
