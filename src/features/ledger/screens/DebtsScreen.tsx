import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DebtPaymentDraft, DebtSummary } from "../../../domain/types";
import { BottomSheetModal, DateField, Field, PrimaryButton, SecondaryButton } from "../../../shared/components";
import { formatVnd } from "../../../shared/format";
import { space, styles, theme } from "../../../shared/styles";

type DebtsScreenProps = {
  debts: DebtSummary[];
  busy: boolean;
  paymentDraft: DebtPaymentDraft | null;
  onOpenDebtEditor: () => void;
  onEditDebt: (debt: DebtSummary) => void;
  onDeleteDebt: (debt: DebtSummary) => void;
  onOpenPayment: (debt: DebtSummary) => void;
  onPaymentChange: (draft: DebtPaymentDraft) => void;
  onClosePayment: () => void;
  onSavePayment: () => void;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

export function DebtsScreen({
  debts,
  busy,
  paymentDraft,
  onOpenDebtEditor,
  onEditDebt,
  onDeleteDebt,
  onOpenPayment,
  onPaymentChange,
  onClosePayment,
  onSavePayment,
  scrollOffset,
  onScrollOffsetChange
}: DebtsScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const visibleDebts = filter === "active" ? debts.filter((debt) => debt.status !== "settled") : debts;
  const totals = useMemo(
    () =>
      debts.reduce(
        (acc, debt) => {
          if (debt.direction === "lent") acc.owedToMe += debt.remainingAmount;
          else acc.iOwe += debt.remainingAmount;
          return acc;
        },
        { owedToMe: 0, iOwe: 0 }
      ),
    [debts]
  );
  const selectedPaymentDebt = paymentDraft ? debts.find((debt) => debt.id === paymentDraft.debtId) : null;
  const paymentAmountValue = paymentDraft?.amount ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(paymentDraft.amount) : "";

  useEffect(() => {
    const timeout = setTimeout(() => scrollRef.current?.scrollTo({ y: scrollOffset, animated: false }), 0);
    return () => clearTimeout(timeout);
  }, [scrollOffset]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollOffsetChange(event.nativeEvent.contentOffset.y);
  };

  return (
    <View style={styles.content}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.contentPad, { paddingBottom: space.pageBottom + insets.bottom }]}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        <View style={styles.pageTitleRow}>
          <Text style={[styles.sectionTitle, styles.flex]}>Debts</Text>
          <PrimaryButton icon="add" text="Add" onPress={onOpenDebtEditor} disabled={busy} />
        </View>

        <View style={styles.syncStats}>
          <View style={styles.miniStat}>
            <Text style={styles.miniValue}>{formatVnd(totals.owedToMe)}</Text>
            <Text style={styles.miniLabel}>People owe me</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={styles.miniValue}>{formatVnd(totals.iOwe)}</Text>
            <Text style={styles.miniLabel}>I owe</Text>
          </View>
        </View>

        <View style={styles.debtFilterRow}>
          <Pressable style={[styles.debtFilterChip, filter === "active" && styles.debtFilterChipActive]} onPress={() => setFilter("active")}>
            <Text style={[styles.debtFilterText, filter === "active" && styles.debtFilterTextActive]}>Active</Text>
          </Pressable>
          <Pressable style={[styles.debtFilterChip, filter === "all" && styles.debtFilterChipActive]} onPress={() => setFilter("all")}>
            <Text style={[styles.debtFilterText, filter === "all" && styles.debtFilterTextActive]}>All</Text>
          </Pressable>
        </View>

        <View style={[styles.panel, styles.listPanel]}>
          <View style={styles.listSpacer} />
          {visibleDebts.length === 0 ? <Text style={[styles.empty, styles.listEmptyText]}>No debts here.</Text> : null}
          {visibleDebts.map((debt, index) => (
            <DebtRow
              key={debt.id}
              debt={debt}
              last={index === visibleDebts.length - 1}
              onRecordPayment={() => onOpenPayment(debt)}
              onEdit={() => onEditDebt(debt)}
              onDelete={() => onDeleteDebt(debt)}
            />
          ))}
          <View style={styles.listSpacer} />
        </View>
      </ScrollView>

      <BottomSheetModal
        visible={Boolean(paymentDraft)}
        title="Record payment"
        onClose={onClosePayment}
        footer={
          <>
            <SecondaryButton icon="close-outline" text="Cancel" onPress={onClosePayment} />
            <PrimaryButton icon="checkmark" text="Save" onPress={onSavePayment} disabled={busy} />
          </>
        }
      >
        {paymentDraft && selectedPaymentDebt ? (
          <>
            <Text style={styles.syncText}>{selectedPaymentDebt.counterpartyName}</Text>
            <Text style={styles.syncHint}>
              {selectedPaymentDebt.direction === "lent" ? "They paid you back" : "You paid them back"} / Remaining {formatVnd(selectedPaymentDebt.remainingAmount)}
            </Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Amount</Text>
              <View style={styles.amountInputRow}>
                <View style={styles.amountSignButton}>
                  <Ionicons name={selectedPaymentDebt.direction === "lent" ? "arrow-down" : "arrow-up"} size={18} color={theme.colors.text} />
                </View>
                <TextInput
                  value={paymentAmountValue}
                  keyboardType="numeric"
                  onChangeText={(value) => onPaymentChange({ ...paymentDraft, amount: Number(value.replace(/\D/g, "")) })}
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={theme.colors.placeholder}
                />
              </View>
            </View>
            <DateField label="Date" value={paymentDraft.date} onChange={(date) => onPaymentChange({ ...paymentDraft, date })} />
            <Field label="Note" value={paymentDraft.note} onChangeText={(note) => onPaymentChange({ ...paymentDraft, note })} />
            <Field label="Account" value={paymentDraft.account} onChangeText={(account) => onPaymentChange({ ...paymentDraft, account })} />
          </>
        ) : null}
      </BottomSheetModal>
    </View>
  );
}

function DebtRow({
  debt,
  last,
  onRecordPayment,
  onEdit,
  onDelete
}: {
  debt: DebtSummary;
  last: boolean;
  onRecordPayment: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tone = debt.direction === "lent" ? theme.colors.income : theme.colors.expense;
  const progress = debt.principalAmount > 0 ? Math.min(1, debt.paidAmount / debt.principalAmount) : 0;
  return (
    <View style={[styles.debtRow, last && styles.txListItemLast]}>
      <View style={[styles.categoryIconBox, { width: 40, height: 40, backgroundColor: `${tone}18` }]}>
        <Ionicons name={debt.direction === "lent" ? "arrow-up" : "arrow-down"} size={18} color={tone} />
      </View>
      <View style={styles.flex}>
        <View style={styles.debtRowHeader}>
          <Text style={styles.rowTitle} numberOfLines={1}>{debt.counterpartyName}</Text>
          <Text style={[debt.direction === "lent" ? styles.amountIncome : styles.amountExpense]}>{formatVnd(debt.remainingAmount)}</Text>
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {debt.direction === "lent" ? "Owes me" : "I owe"} / {debt.status} / {debt.dueDate || "No due date"}
        </Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: tone }]} />
        </View>
      </View>
      <View style={styles.debtRowActions}>
        <Pressable style={styles.debtPaymentButton} onPress={onEdit}>
          <Ionicons name="create-outline" size={18} color={theme.colors.accent} />
        </Pressable>
        {debt.status !== "settled" ? (
          <Pressable style={styles.debtPaymentButton} onPress={onRecordPayment}>
            <Ionicons name="cash-outline" size={18} color={theme.colors.accent} />
          </Pressable>
        ) : null}
        <Pressable style={styles.debtPaymentButton} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color={theme.colors.expense} />
        </Pressable>
      </View>
    </View>
  );
}
