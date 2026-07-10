import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FLOW_LABEL } from "../../../domain/category";
import { PeriodFilter, Transaction, TransactionFilter } from "../../../domain/types";
import { BottomSheetModal, DateField, FilterButton, SegmentedControl, SelectButton, TransactionRow } from "../../../shared/components";
import { currentMonthRange } from "../../../shared/date";
import { monthLabel } from "../../../shared/format";
import { styles } from "../../../shared/styles";

const FLOW_OPTIONS: TransactionFilter["flow"][] = ["all", "expense", "income"];
const PERIOD_MODE_OPTIONS: PeriodFilter["mode"][] = ["month", "range"];
const TRANSACTION_PAGE_SIZE = 80;

type TransactionsScreenProps = {
  filter: TransactionFilter;
  setFilter: (filter: TransactionFilter) => void;
  monthOptions: string[];
  categoryOptions: string[];
  transactions: Transaction[];
  onOpenTransaction: (tx: Transaction) => void;
  selectedIds: number[];
  onToggleSelection: (id: number) => void;
  onClearSelection: () => void;
  onMoveSelected: (category: string) => void;
  busy: boolean;
};

export function TransactionsScreen({
  filter,
  setFilter,
  monthOptions,
  categoryOptions,
  transactions,
  onOpenTransaction,
  selectedIds,
  onToggleSelection,
  onClearSelection,
  onMoveSelected,
  busy
}: TransactionsScreenProps) {
  const insets = useSafeAreaInsets();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(TRANSACTION_PAGE_SIZE);
  const selectionMode = selectedIds.length > 0;
  const moveCategories = useMemo(() => categoryOptions.filter((category) => category !== "all"), [categoryOptions]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const periodSummary =
    filter.period.mode === "month" ? monthLabel(filter.period.month) : `${filter.period.startDate} - ${filter.period.endDate}`;
  const rangePeriod = filter.period.mode === "range" ? filter.period : null;
  const categorySummary =
    filter.categories.length === 0
      ? "All categories"
      : filter.categories.length <= 2
        ? filter.categories.join(", ")
        : `${filter.categories.length} categories`;
  const filterSummary = [
    filter.flow === "all" ? "All flows" : FLOW_LABEL[filter.flow],
    periodSummary,
    categorySummary
  ].join(" / ");
  const visibleTransactions = useMemo(() => transactions.slice(0, visibleLimit), [transactions, visibleLimit]);
  const canLoadMore = visibleLimit < transactions.length;

  const setPeriod = (period: PeriodFilter) => setFilter({ ...filter, period });
  const toggleCategory = (category: string) =>
    setFilter({
      ...filter,
      categories: filter.categories.includes(category)
        ? filter.categories.filter((selected) => selected !== category)
        : [...filter.categories, category]
    });
  const renderTransaction = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionListItem
        tx={item}
        selected={selectedIdSet.has(item.id)}
        disabled={busy}
        selectionMode={selectionMode}
        onOpenTransaction={onOpenTransaction}
        onToggleSelection={onToggleSelection}
      />
    ),
    [busy, onOpenTransaction, onToggleSelection, selectedIdSet, selectionMode]
  );
  const loadMoreTransactions = useCallback(() => {
    setVisibleLimit((current) => Math.min(current + TRANSACTION_PAGE_SIZE, transactions.length));
  }, [transactions.length]);

  useEffect(() => {
    setVisibleLimit(TRANSACTION_PAGE_SIZE);
  }, [filter, transactions.length]);

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
        <FilterButton label="Filter" value={filterSummary} onPress={() => setFiltersOpen(true)} />
        <BottomSheetModal visible={filtersOpen} title="Transaction filters" onClose={() => setFiltersOpen(false)}>
          <SegmentedControl
            title="Flow"
            options={FLOW_OPTIONS}
            value={filter.flow}
            onChange={(flow) => setFilter({ ...filter, flow })}
            label={(flow) => FLOW_LABEL[flow]}
          />
          <SegmentedControl
            title="Period type"
            options={PERIOD_MODE_OPTIONS}
            value={filter.period.mode}
            onChange={(mode) =>
              setPeriod(mode === "month" ? { mode, month: "all" } : filter.period.mode === "range" ? filter.period : currentMonthRange())
            }
            label={(mode) => (mode === "month" ? "Month" : "Date range")}
          />
          {filter.period.mode === "month" ? (
            <SelectButton
              title="Period"
              options={monthOptions}
              value={filter.period.month}
              onChange={(month) => setPeriod({ mode: "month", month })}
              label={monthLabel}
            />
          ) : null}
          {rangePeriod ? (
            <View style={styles.rangeGrid}>
              <DateField
                label="From"
                value={rangePeriod.startDate}
                onChange={(startDate) => setPeriod({ mode: "range", startDate, endDate: rangePeriod.endDate })}
              />
              <DateField
                label="To"
                value={rangePeriod.endDate}
                onChange={(endDate) => setPeriod({ mode: "range", startDate: rangePeriod.startDate, endDate })}
              />
            </View>
          ) : null}
          <View style={styles.multiSelectPanel}>
            <View style={styles.multiSelectHeader}>
              <Text style={styles.fieldLabel}>Categories</Text>
              <Text style={styles.bulkCancel} onPress={() => setFilter({ ...filter, categories: [] })}>
                All
              </Text>
            </View>
            {moveCategories.map((category) => {
              const active = filter.categories.includes(category);
              return (
                <Pressable
                  key={category}
                  style={[styles.multiOption, active && styles.multiOptionActive]}
                  onPress={() => toggleCategory(category)}
                >
                  <Text style={[styles.multiOptionText, active && styles.dropdownOptionTextActive]} numberOfLines={1}>
                    {category}
                  </Text>
                  <Ionicons name={active ? "checkbox" : "square-outline"} size={22} color={active ? "#0F766E" : "#64748B"} />
                </Pressable>
              );
            })}
            {moveCategories.length === 0 ? <Text style={styles.muted}>No categories yet.</Text> : null}
          </View>
        </BottomSheetModal>
        {selectionMode ? (
          <View style={styles.bulkBar}>
            <Text style={styles.bulkTitle}>{selectedIds.length} selected</Text>
            <FilterButton label="Bulk action" value="Move to category" onPress={() => setMoveOpen(true)} />
            <BottomSheetModal visible={moveOpen} title="Move selected" onClose={() => setMoveOpen(false)}>
              <SelectButton
                title="Category"
                options={moveCategories}
                value={moveCategories[0] ?? ""}
                onChange={(category) => {
                  onMoveSelected(category);
                  setMoveOpen(false);
                }}
                label={(category) => category || "Choose category"}
              />
            </BottomSheetModal>
            <Text style={styles.bulkCancel} onPress={onClearSelection}>
              Clear selection
            </Text>
          </View>
        ) : null}
      </View>
      <FlatList
        data={visibleTransactions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listPad, { paddingBottom: 104 + insets.bottom }]}
        renderItem={renderTransaction}
        initialNumToRender={14}
        maxToRenderPerBatch={12}
        updateCellsBatchingPeriod={50}
        windowSize={9}
        removeClippedSubviews
        onEndReached={canLoadMore ? loadMoreTransactions : undefined}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={<Text style={styles.empty}>No matching transactions.</Text>}
        ListFooterComponent={
          canLoadMore ? (
            <Text style={styles.listFooter}>
              Showing {visibleTransactions.length} of {transactions.length}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const TransactionListItem = memo(function TransactionListItem({
  tx,
  selected,
  disabled,
  selectionMode,
  onOpenTransaction,
  onToggleSelection
}: {
  tx: Transaction;
  selected: boolean;
  disabled: boolean;
  selectionMode: boolean;
  onOpenTransaction: (tx: Transaction) => void;
  onToggleSelection: (id: number) => void;
}) {
  const handlePress = useCallback(() => {
    if (selectionMode) onToggleSelection(tx.id);
    else onOpenTransaction(tx);
  }, [onOpenTransaction, onToggleSelection, selectionMode, tx]);
  const handleLongPress = useCallback(() => onToggleSelection(tx.id), [onToggleSelection, tx.id]);

  return <TransactionRow tx={tx} selected={selected} disabled={disabled} onPress={handlePress} onLongPress={handleLongPress} />;
});
