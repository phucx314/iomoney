import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AccountBalance,
  BackupSnapshot,
  BudgetStatus,
  DebtReminder,
  RecurringRule
} from "../../../domain/types";
import {
  BottomSheetModal,
  Field,
  PrimaryButton,
  SelectButton
} from "../../../shared/components";
import { compactVnd, formatSignedVnd, formatVnd, monthLabel } from "../../../shared/format";
import { space, styles, theme } from "../../../shared/styles";

type PlanningScreenProps = {
  budgets: BudgetStatus[];
  accounts: AccountBalance[];
  recurringRules: RecurringRule[];
  backups: BackupSnapshot[];
  reminders: DebtReminder[];
  monthOptions: string[];
  categoryOptions: string[];
  busy: boolean;
  onBack: () => void;
  onSaveBudget: (category: string, month: string, limitAmount: number) => void;
  onDeleteBudget: (budget: BudgetStatus) => void;
  onSaveAccount: (name: string, openingBalance: number) => void;
  onDeleteAccount: (account: AccountBalance) => void;
  onToggleRecurring: (rule: RecurringRule) => void;
  onDeleteRecurring: (rule: RecurringRule) => void;
  onCreateBackup: () => void;
  onShareBackup: (backup: BackupSnapshot) => void;
  onDeleteBackup: (backup: BackupSnapshot) => void;
  onGenerateDebtReminders: () => void;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

export function PlanningScreen({
  budgets,
  accounts,
  recurringRules,
  backups,
  reminders,
  monthOptions,
  categoryOptions,
  busy,
  onBack,
  onSaveBudget,
  onDeleteBudget,
  onSaveAccount,
  onDeleteAccount,
  onToggleRecurring,
  onDeleteRecurring,
  onCreateBackup,
  onShareBackup,
  onDeleteBackup,
  onGenerateDebtReminders,
  scrollOffset,
  onScrollOffsetChange
}: PlanningScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState(categoryOptions.find((item) => item !== "all") ?? "");
  const [budgetMonth, setBudgetMonth] = useState(monthOptions.find((item) => item !== "all") ?? "");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const budgetAmountValue = formatNumberInput(budgetAmount);
  const selectableCategories = categoryOptions.filter((item) => item !== "all");
  const selectableMonths = monthOptions.filter((item) => item !== "all");
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollOffsetChange(event.nativeEvent.contentOffset.y);
  };

  useEffect(() => {
    const timeout = setTimeout(() => scrollRef.current?.scrollTo({ y: scrollOffset, animated: false }), 0);
    return () => clearTimeout(timeout);
  }, [scrollOffset]);

  const saveBudget = () => {
    onSaveBudget(budgetCategory, budgetMonth, Number(budgetAmount.replace(/\D/g, "")));
    setBudgetOpen(false);
    setBudgetAmount("");
  };
  const saveAccount = () => {
    onSaveAccount(accountName, Number(openingBalance.replace(/[^\d-]/g, "")));
    setAccountOpen(false);
    setAccountName("");
    setOpeningBalance("");
  };

  return (
    <View style={styles.content}>
      <View style={styles.secondaryHeader}>
        <Pressable style={styles.pageBackButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.secondaryHeaderTitle} numberOfLines={1}>
          Planning
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
        <SectionTitle title="Budgets" action="Add" onPress={() => setBudgetOpen(true)} first />
        <View style={styles.planningPanel}>
          {budgets.length === 0 ? <Text style={styles.muted}>No budget limits for this month.</Text> : null}
          {budgets.map((budget, index) => (
            <View key={budget.id} style={[styles.planningRow, index === budgets.length - 1 && styles.planningRowLast]}>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{budget.category}</Text>
                <Text style={styles.rowMeta}>
                  {monthLabel(budget.month)} / {compactVnd(budget.spentAmount)} of {compactVnd(budget.limitAmount)}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: budget.usageRatio >= 1 ? theme.colors.expense : theme.colors.accent,
                        width: `${Math.min(100, Math.round(budget.usageRatio * 100))}%`
                      }
                    ]}
                  />
                </View>
              </View>
              <Text style={budget.remainingAmount >= 0 ? styles.amountIncome : styles.amountExpense}>{compactVnd(budget.remainingAmount)}</Text>
              <Pressable style={styles.debtExpandButton} onPress={() => onDeleteBudget(budget)}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.expense} />
              </Pressable>
            </View>
          ))}
        </View>

        <SectionTitle title="Accounts" action="Add" onPress={() => setAccountOpen(true)} />
        <View style={[styles.planningPanel, styles.planningPanelAccount]}>
          {accounts.length === 0 ? <Text style={styles.muted}>No accounts yet.</Text> : null}
          {accounts.map((account, index) => (
            <View key={account.id} style={[styles.planningRow, index === accounts.length - 1 && styles.planningRowLast]}>
              <View style={styles.settingsNavIcon}>
                <Ionicons name="wallet-outline" size={20} color={theme.colors.accent} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{account.name}</Text>
                <Text style={styles.rowMeta}>
                  Opening {compactVnd(account.openingBalance)} / {account.transactionCount} records
                </Text>
              </View>
              <Text style={account.currentBalance >= 0 ? styles.amountIncome : styles.amountExpense}>{formatSignedVnd(account.currentBalance)}</Text>
              <Pressable style={styles.debtExpandButton} onPress={() => onDeleteAccount(account)}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.expense} />
              </Pressable>
            </View>
          ))}
        </View>

        <SectionTitle title="Recurring rules" />
        <View style={styles.planningPanel}>
          {recurringRules.length === 0 ? <Text style={styles.muted}>Create a repeated transaction to save a rule here.</Text> : null}
          {recurringRules.map((rule, index) => (
            <View key={rule.id} style={[styles.planningRow, index === recurringRules.length - 1 && styles.planningRowLast]}>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{rule.note}</Text>
                <Text style={styles.rowMeta}>
                  {rule.frequency} / next {rule.nextDate} / {rule.account}
                </Text>
              </View>
              <Text style={rule.amount >= 0 ? styles.amountIncome : styles.amountExpense}>{formatSignedVnd(rule.amount)}</Text>
              <Pressable style={styles.debtExpandButton} onPress={() => onToggleRecurring(rule)}>
                <Ionicons name={rule.active ? "pause-outline" : "play-outline"} size={18} color={theme.colors.accent} />
              </Pressable>
              <Pressable style={styles.debtExpandButton} onPress={() => onDeleteRecurring(rule)}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.expense} />
              </Pressable>
            </View>
          ))}
        </View>

        <SectionTitle title="Debt reminders" action="Notify" onPress={onGenerateDebtReminders} />
        <View style={styles.planningPanel}>
          {reminders.length === 0 ? <Text style={styles.muted}>No overdue or upcoming debts in the next 7 days.</Text> : null}
          {reminders.map((reminder, index) => (
            <View key={reminder.debtId} style={[styles.planningRow, index === reminders.length - 1 && styles.planningRowLast]}>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{reminder.counterpartyName}</Text>
                <Text style={styles.rowMeta}>
                  {reminder.daysUntilDue < 0 ? `${Math.abs(reminder.daysUntilDue)} days overdue` : `Due in ${reminder.daysUntilDue} days`} / {reminder.dueDate}
                </Text>
              </View>
              <Text style={reminder.direction === "lent" ? styles.amountDebtReceivable : styles.amountDebtPayable}>{formatVnd(reminder.remainingAmount)}</Text>
            </View>
          ))}
        </View>

        <SectionTitle title="Backup snapshots" action="Backup now" onPress={onCreateBackup} />
        <View style={styles.planningPanel}>
          {backups.length === 0 ? <Text style={styles.muted}>No local snapshots yet.</Text> : null}
          {backups.map((backup, index) => (
            <View key={backup.id} style={[styles.planningRow, index === backups.length - 1 && styles.planningRowLast]}>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{backup.filename}</Text>
                <Text style={styles.rowMeta}>
                  {backup.recordCount} records / {new Date(backup.createdAt).toLocaleString()}
                </Text>
              </View>
              <Pressable style={styles.debtExpandButton} onPress={() => onShareBackup(backup)}>
                <Ionicons name="share-outline" size={18} color={theme.colors.accent} />
              </Pressable>
              <Pressable style={styles.debtExpandButton} onPress={() => onDeleteBackup(backup)}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.expense} />
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomSheetModal
        visible={budgetOpen}
        title="Budget limit"
        onClose={() => setBudgetOpen(false)}
        footer={<PrimaryButton icon="save-outline" text="Save budget" onPress={saveBudget} disabled={busy || !budgetCategory || !budgetMonth} />}
      >
        <SelectButton title="Month" options={selectableMonths} value={budgetMonth} onChange={setBudgetMonth} label={monthLabel} />
        <SelectButton title="Category" options={selectableCategories} value={budgetCategory} onChange={setBudgetCategory} label={(category) => category} />
        <Field label="Limit amount" value={budgetAmountValue} onChangeText={(value) => setBudgetAmount(value.replace(/\D/g, ""))} keyboardType="numeric" />
      </BottomSheetModal>

      <BottomSheetModal
        visible={accountOpen}
        title="Account"
        onClose={() => setAccountOpen(false)}
        footer={<PrimaryButton icon="save-outline" text="Save account" onPress={saveAccount} disabled={busy || !accountName.trim()} />}
      >
        <Field label="Name" value={accountName} onChangeText={setAccountName} />
        <Field
          label="Opening balance"
          value={openingBalance}
          onChangeText={(value) => setOpeningBalance(value.replace(/[^\d-]/g, ""))}
          keyboardType="numeric"
        />
      </BottomSheetModal>
    </View>
  );
}

function formatNumberInput(value: string) {
  const amount = Number(value.replace(/\D/g, ""));
  return amount ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount) : "";
}

function SectionTitle({ title, action, onPress, first }: { title: string; action?: string; onPress?: () => void; first?: boolean }) {
  return (
    <View style={[styles.planningSectionHeader, first && styles.planningSectionHeaderFirst]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onPress ? (
        <Pressable style={styles.planningSectionAction} onPress={onPress}>
          <Ionicons name="add" size={16} color={theme.colors.accent} />
          <Text style={styles.planningSectionActionText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
