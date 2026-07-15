import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DebtDirection, DebtPaymentDraft, DebtStatus, DebtSummary } from "../../../domain/types";
import {
  BottomSheetModal,
  DateField,
  Field,
  FilterButton,
  PrimaryButton,
  SecondaryButton,
  SegmentedControl
} from "../../../shared/components";
import { formatVnd } from "../../../shared/format";
import { space, styles, theme } from "../../../shared/styles";

type DebtStatusFilter = "active" | "completed" | "all";
type DebtDirectionFilter = "all" | DebtDirection;

type DebtFilters = {
  status: DebtStatusFilter;
  direction: DebtDirectionFilter;
};

type DebtsScreenProps = {
  debts: DebtSummary[];
  busy: boolean;
  paymentDraft: DebtPaymentDraft | null;
  onEditDebt: (debt: DebtSummary) => void;
  onDeleteDebts: (debts: DebtSummary[]) => void;
  onOpenPayment: (debt: DebtSummary) => void;
  onPaymentChange: (draft: DebtPaymentDraft) => void;
  onClosePayment: () => void;
  onSavePayment: () => void;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

const STATUS_OPTIONS: DebtStatusFilter[] = ["active", "completed", "all"];
const DIRECTION_OPTIONS: DebtDirectionFilter[] = ["all", "lent", "borrowed"];

export function DebtsScreen({
  debts,
  busy,
  paymentDraft,
  onEditDebt,
  onDeleteDebts,
  onOpenPayment,
  onPaymentChange,
  onClosePayment,
  onSavePayment,
  scrollOffset,
  onScrollOffsetChange
}: DebtsScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DebtFilters>({ status: "active", direction: "all" });
  const [draftFilters, setDraftFilters] = useState<DebtFilters>(filters);
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [selectedDebtIds, setSelectedDebtIds] = useState<number[]>([]);
  const selectedDebtSet = useMemo(() => new Set(selectedDebtIds), [selectedDebtIds]);
  const selectedDebts = useMemo(() => debts.filter((debt) => selectedDebtSet.has(debt.id)), [debts, selectedDebtSet]);
  const selectionMode = selectedDebtIds.length > 0;
  const selectedPaymentDebt = paymentDraft ? debts.find((debt) => debt.id === paymentDraft.debtId) : null;
  const paymentAmountValue = paymentDraft?.amount ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(paymentDraft.amount) : "";
  const filterSummary = [statusLabel(filters.status), directionLabel(filters.direction)].join(" / ");
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
  const visibleDebts = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return debts.filter((debt) => {
      const statusMatch =
        filters.status === "all" ||
        (filters.status === "active" && debt.status !== "settled") ||
        (filters.status === "completed" && debt.status === "settled");
      const directionMatch = filters.direction === "all" || debt.direction === filters.direction;
      const queryMatch =
        !cleanQuery ||
        debt.counterpartyName.toLowerCase().includes(cleanQuery) ||
        debt.note.toLowerCase().includes(cleanQuery) ||
        debt.status.toLowerCase().includes(cleanQuery);
      return statusMatch && directionMatch && queryMatch;
    });
  }, [debts, filters, query]);

  useEffect(() => {
    const timeout = setTimeout(() => setQuery(searchText), 350);
    return () => clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    const timeout = setTimeout(() => scrollRef.current?.scrollTo({ y: scrollOffset, animated: false }), 0);
    return () => clearTimeout(timeout);
  }, [scrollOffset]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollOffsetChange(event.nativeEvent.contentOffset.y);
  };

  const toggleDebtSelection = (debtId: number) => {
    setSelectedDebtIds((selected) =>
      selected.includes(debtId) ? selected.filter((selectedId) => selectedId !== debtId) : [...selected, debtId]
    );
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setSelectedDebtIds([]);
    setFiltersOpen(false);
  };

  const openFilters = () => {
    setDraftFilters(filters);
    setFiltersOpen(true);
  };

  return (
    <View style={styles.content}>
      <View style={styles.filterPanel}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.colors.muted} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search counterparty or note"
            style={styles.searchInput}
            placeholderTextColor={theme.colors.placeholder}
          />
        </View>
        <FilterButton label="Filter" value={filterSummary} onPress={openFilters} />
        {selectionMode ? (
          <View style={styles.selectionToolbar}>
            <Text style={styles.bulkTitle}>{selectedDebtIds.length} selected</Text>
            <Pressable style={styles.bulkCancelButton} onPress={() => setSelectedDebtIds([])}>
              <Text style={styles.bulkCancel}>Clear</Text>
            </Pressable>
            {selectedDebts.length === 1 ? (
              <Pressable
                style={styles.debtToolbarButton}
                onPress={() => {
                  setSelectedDebtIds([]);
                  onEditDebt(selectedDebts[0]);
                }}
              >
                <Ionicons name="create-outline" size={18} color={theme.colors.accent} />
              </Pressable>
            ) : null}
            <Pressable
              style={styles.debtToolbarButton}
              onPress={() => {
                onDeleteDebts(selectedDebts);
                setSelectedDebtIds([]);
              }}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.expense} />
            </Pressable>
          </View>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.contentPad, { paddingTop: space.lg, paddingBottom: space.pageBottom + insets.bottom }]}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        <Text style={styles.sectionTitle}>Debts</Text>

        <View style={[styles.ledgerSummaryRow, styles.debtSummaryRow]}>
          <View style={styles.ledgerSummaryItem}>
            <Text style={styles.ledgerSummaryLabel}>People owe me</Text>
            <Text style={[styles.amountExpense, { color: theme.colors.warning }]}>{formatVnd(totals.owedToMe)}</Text>
          </View>
          <View style={styles.ledgerSummaryItem}>
            <Text style={styles.ledgerSummaryLabel}>I owe them</Text>
            <Text style={styles.amountExpense}>{formatVnd(totals.iOwe)}</Text>
          </View>
        </View>

        <View style={[styles.panel, styles.listPanel]}>
          <View style={styles.listSpacer} />
          {visibleDebts.length === 0 ? <Text style={[styles.empty, styles.listEmptyText]}>No matching debts.</Text> : null}
          {visibleDebts.map((debt, index) => (
            <DebtRow
              key={debt.id}
              debt={debt}
              last={index === visibleDebts.length - 1}
              selected={selectedDebtSet.has(debt.id)}
              selectionMode={selectionMode}
              onLongPress={() => toggleDebtSelection(debt.id)}
              onPress={() => {
                if (selectionMode) toggleDebtSelection(debt.id);
                else onOpenPayment(debt);
              }}
            />
          ))}
          <View style={styles.listSpacer} />
        </View>
      </ScrollView>

      <DebtFilterSheet
        visible={filtersOpen}
        filters={draftFilters}
        onChange={setDraftFilters}
        onClose={() => setFiltersOpen(false)}
        onApply={applyFilters}
      />

      <BottomSheetModal
        visible={Boolean(paymentDraft)}
        title="Debt details"
        onClose={onClosePayment}
        footer={
          selectedPaymentDebt?.status === "settled" ? (
            <SecondaryButton icon="close-outline" text="Close" onPress={onClosePayment} />
          ) : (
            <>
              <SecondaryButton icon="close-outline" text="Cancel" onPress={onClosePayment} />
              <PrimaryButton icon="checkmark" text="Save payment" onPress={onSavePayment} disabled={busy || !paymentDraft?.amount} />
            </>
          )
        }
      >
        {paymentDraft && selectedPaymentDebt ? (
          <>
            <View style={styles.detailHero}>
              <View style={[styles.categoryIconBox, { width: 50, height: 50, backgroundColor: `${debtTone(selectedPaymentDebt)}18` }]}>
                <Ionicons name={selectedPaymentDebt.direction === "lent" ? "arrow-up" : "arrow-down"} size={22} color={debtTone(selectedPaymentDebt)} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.detailTitle}>{selectedPaymentDebt.counterpartyName}</Text>
                <Text style={styles.rowMeta}>{selectedPaymentDebt.direction === "lent" ? "They owe you" : "You owe them"}</Text>
              </View>
            </View>
            <DetailRow label="Principal" value={formatVnd(selectedPaymentDebt.principalAmount)} />
            <DetailRow label="Paid" value={formatVnd(selectedPaymentDebt.paidAmount)} />
            <DetailRow label="Remaining" value={formatVnd(selectedPaymentDebt.remainingAmount)} tone={selectedPaymentDebt.direction === "lent" ? "warning" : "expense"} />
            <DetailRow label="Status" value={statusLabelFromDebt(selectedPaymentDebt.status)} />
            <DetailRow label="Start date" value={selectedPaymentDebt.startDate} />
            <DetailRow label="Due date" value={selectedPaymentDebt.dueDate || "-"} />
            <DetailRow label="Note" value={selectedPaymentDebt.note || "-"} />
            {selectedPaymentDebt.status !== "settled" ? (
              <>
                <View style={[styles.field, styles.panelSpaced]}>
                  <Text style={styles.fieldLabel}>Payment amount</Text>
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
          </>
        ) : null}
      </BottomSheetModal>
    </View>
  );
}

function DebtRow({
  debt,
  last,
  selected,
  selectionMode,
  onLongPress,
  onPress
}: {
  debt: DebtSummary;
  last: boolean;
  selected: boolean;
  selectionMode: boolean;
  onLongPress: () => void;
  onPress: () => void;
}) {
  const tone = debtTone(debt);
  const progress = debt.principalAmount > 0 ? Math.min(1, debt.paidAmount / debt.principalAmount) : 0;
  const metaParts = [
    debt.note || null,
    debt.direction === "lent" ? "Owes me" : "I owe them",
    statusLabelFromDebt(debt.status),
    debt.dueDate || "No due date"
  ].filter(Boolean);
  return (
    <Pressable
      style={[styles.debtRow, selected && styles.txListItemSelected, last && styles.txListItemLast]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {selectionMode ? (
        <View style={[styles.listSelectionMark, selected && styles.listSelectionMarkActive]}>
          {selected ? <Ionicons name="checkmark" size={14} color={theme.colors.onAccent} /> : null}
        </View>
      ) : null}
      <View style={[styles.categoryIconBox, { width: 40, height: 40, backgroundColor: `${tone}18` }]}>
        <Ionicons name={debt.direction === "lent" ? "arrow-up" : "arrow-down"} size={18} color={tone} />
      </View>
      <View style={styles.flex}>
        <View style={styles.debtRowHeader}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {debt.counterpartyName}
          </Text>
          <Text style={[styles.amountExpense, { color: tone }]}>{formatVnd(debt.remainingAmount)}</Text>
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {metaParts.join(" / ")}
        </Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: tone }]} />
        </View>
      </View>
    </Pressable>
  );
}

function DebtFilterSheet({
  visible,
  filters,
  onChange,
  onApply,
  onClose
}: {
  visible: boolean;
  filters: DebtFilters;
  onChange: (filters: DebtFilters) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheetModal
      visible={visible}
      title="Debt filters"
      onClose={onClose}
      footer={<PrimaryButton icon="checkmark" text="Apply filters" onPress={onApply} />}
    >
      <SegmentedControl
        title="Status"
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(status) => onChange({ ...filters, status })}
        label={statusLabel}
      />
      <SegmentedControl
        title="Direction"
        options={DIRECTION_OPTIONS}
        value={filters.direction}
        onChange={(direction) => onChange({ ...filters, direction })}
        label={directionLabel}
      />
    </BottomSheetModal>
  );
}

function DetailRow({ label, value, tone }: { label: string; value: string; tone?: "warning" | "expense" }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, tone === "warning" && { color: theme.colors.warning }, tone === "expense" && styles.amountExpense]}>
        {value}
      </Text>
    </View>
  );
}

function debtTone(debt: DebtSummary) {
  return debt.direction === "lent" ? theme.colors.warning : theme.colors.expense;
}

function statusLabel(status: DebtStatusFilter) {
  if (status === "active") return "Active";
  if (status === "completed") return "Completed";
  return "All";
}

function statusLabelFromDebt(status: DebtStatus) {
  if (status === "settled") return "Completed";
  if (status === "partial") return "Partial";
  return "Open";
}

function directionLabel(direction: DebtDirectionFilter) {
  if (direction === "lent") return "People owe me";
  if (direction === "borrowed") return "I owe them";
  return "All directions";
}
