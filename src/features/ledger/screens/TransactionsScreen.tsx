import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FLOW_LABEL } from "../../../domain/category";
import { PeriodFilter, Transaction, TransactionFilter } from "../../../domain/types";
import {
  BottomSheetModal,
  DateField,
  FilterButton,
  IconButton,
  PrimaryButton,
  SegmentedControl,
  SelectButton,
  TransactionListItem as BaseTransactionListItem
} from "../../../shared/components";
import { currentMonthRange } from "../../../shared/date";
import { monthLabel } from "../../../shared/format";
import { space, styles } from "../../../shared/styles";

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
  onMarkSelectedImportant: () => void;
  onDeleteSelected: () => void;
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
  onMarkSelectedImportant,
  onDeleteSelected,
  busy
}: TransactionsScreenProps) {
  const insets = useSafeAreaInsets();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(TRANSACTION_PAGE_SIZE);
  const [searchText, setSearchText] = useState(filter.query);
  const [draftFilter, setDraftFilter] = useState<TransactionFilter>(filter);
  const selectionMode = selectedIds.length > 0;
  const moveCategories = useMemo(() => categoryOptions.filter((category) => category !== "all"), [categoryOptions]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const periodSummary =
    filter.period.mode === "month" ? monthLabel(filter.period.month) : `${filter.period.startDate} - ${filter.period.endDate}`;
  const draftRangePeriod = draftFilter.period.mode === "range" ? draftFilter.period : null;
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

  const openFilters = () => {
    setDraftFilter(filter);
    setFiltersOpen(true);
  };
  const applyFilters = () => {
    setFilter({ ...draftFilter, query: searchText });
    setFiltersOpen(false);
  };
  const setDraftPeriod = (period: PeriodFilter) => setDraftFilter({ ...draftFilter, period });
  const toggleDraftCategory = (category: string) =>
    setDraftFilter({
      ...draftFilter,
      categories: draftFilter.categories.includes(category)
        ? draftFilter.categories.filter((selected) => selected !== category)
        : [...draftFilter.categories, category]
    });
  const renderTransaction = useCallback(
    ({ item, index }: { item: Transaction; index: number }) => (
      <MemoTransactionListItem
        tx={item}
        selected={selectedIdSet.has(item.id)}
        disabled={busy}
        selectionMode={selectionMode}
        onOpenTransaction={onOpenTransaction}
        onToggleSelection={onToggleSelection}
        last={!canLoadMore && index === visibleTransactions.length - 1}
      />
    ),
    [busy, canLoadMore, onOpenTransaction, onToggleSelection, selectedIdSet, selectionMode, visibleTransactions.length]
  );
  const loadMoreTransactions = useCallback(() => {
    setVisibleLimit((current) => Math.min(current + TRANSACTION_PAGE_SIZE, transactions.length));
  }, [transactions.length]);

  useEffect(() => {
    setVisibleLimit(TRANSACTION_PAGE_SIZE);
  }, [filter, transactions.length]);

  useEffect(() => {
    setSearchText(filter.query);
  }, [filter.query]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchText !== filter.query) setFilter({ ...filter, query: searchText });
    }, 350);
    return () => clearTimeout(timeout);
  }, [filter, searchText, setFilter]);

  return (
    <View style={styles.content}>
      <View style={styles.filterPanel}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#64748B" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search note, category, event"
            style={styles.searchInput}
            placeholderTextColor="#94A3B8"
          />
        </View>
        <FilterButton label="Filter" value={filterSummary} onPress={openFilters} />
        <BottomSheetModal
          visible={filtersOpen}
          title="Transaction filters"
          onClose={() => setFiltersOpen(false)}
          footer={<PrimaryButton icon="checkmark" text="Apply filters" onPress={applyFilters} />}
        >
          <SegmentedControl
            title="Flow"
            options={FLOW_OPTIONS}
            value={draftFilter.flow}
            onChange={(flow) => setDraftFilter({ ...draftFilter, flow })}
            label={(flow) => FLOW_LABEL[flow]}
          />
          <SegmentedControl
            title="Period type"
            options={PERIOD_MODE_OPTIONS}
            value={draftFilter.period.mode}
            onChange={(mode) =>
              setDraftPeriod(
                mode === "month" ? { mode, month: "all" } : draftFilter.period.mode === "range" ? draftFilter.period : currentMonthRange()
              )
            }
            label={(mode) => (mode === "month" ? "Month" : "Date range")}
          />
          {draftFilter.period.mode === "month" ? (
            <SelectButton
              title="Period"
              options={monthOptions}
              value={draftFilter.period.month}
              onChange={(month) => setDraftPeriod({ mode: "month", month })}
              label={monthLabel}
            />
          ) : null}
          {draftRangePeriod ? (
            <View style={styles.rangeGrid}>
              <DateField
                label="From"
                value={draftRangePeriod.startDate}
                onChange={(startDate) => setDraftPeriod({ mode: "range", startDate, endDate: draftRangePeriod.endDate })}
              />
              <DateField
                label="To"
                value={draftRangePeriod.endDate}
                onChange={(endDate) => setDraftPeriod({ mode: "range", startDate: draftRangePeriod.startDate, endDate })}
              />
            </View>
          ) : null}
          <View style={styles.multiSelectWrap}>
            <Text style={styles.fieldLabel}>Categories</Text>
            <View style={styles.multiSelectPanel}>
              <Pressable
                style={[styles.multiOption, draftFilter.categories.length === 0 && styles.multiOptionActive]}
                onPress={() => setDraftFilter({ ...draftFilter, categories: [] })}
              >
                <Text
                  style={[styles.multiOptionText, draftFilter.categories.length === 0 && styles.dropdownOptionTextActive]}
                  numberOfLines={1}
                >
                  All categories
                </Text>
                <Ionicons
                  name={draftFilter.categories.length === 0 ? "checkbox" : "square-outline"}
                  size={22}
                  color={draftFilter.categories.length === 0 ? "#0F766E" : "#64748B"}
                />
              </Pressable>
              {moveCategories.map((category) => {
                const active = draftFilter.categories.includes(category);
                return (
                  <Pressable
                    key={category}
                    style={[styles.multiOption, active && styles.multiOptionActive]}
                    onPress={() => toggleDraftCategory(category)}
                  >
                    <Text style={[styles.multiOptionText, active && styles.dropdownOptionTextActive]} numberOfLines={1}>
                      {category}
                    </Text>
                    <Ionicons name={active ? "checkbox" : "square-outline"} size={22} color={active ? "#0F766E" : "#64748B"} />
                  </Pressable>
                );
              })}
              {moveCategories.length === 0 ? <Text style={styles.multiEmpty}>No categories yet.</Text> : null}
            </View>
          </View>
        </BottomSheetModal>
        {selectionMode ? (
          <View style={styles.selectionToolbar}>
            <Text style={styles.bulkTitle}>{selectedIds.length} selected</Text>
            <Pressable style={styles.bulkCancelButton} onPress={onClearSelection}>
              <Text style={styles.bulkCancel}>Clear</Text>
            </Pressable>
            <IconButton icon="ellipsis-horizontal" onPress={() => setBulkActionsOpen(true)} label="Bulk actions" />
            <BottomSheetModal visible={bulkActionsOpen} title="Bulk actions" onClose={() => setBulkActionsOpen(false)}>
              <Pressable
                style={styles.actionOption}
                onPress={() => {
                  setBulkActionsOpen(false);
                  setMoveOpen(true);
                }}
              >
                <View style={styles.actionOptionLabel}>
                  <Ionicons name="folder-open" size={20} color="#0F172A" />
                  <Text style={styles.actionOptionText}>Move to category</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </Pressable>
              <Pressable
                style={styles.actionOption}
                onPress={() => {
                  setBulkActionsOpen(false);
                  onMarkSelectedImportant();
                }}
              >
                <View style={styles.actionOptionLabel}>
                  <Ionicons name="star" size={20} color="#A16207" />
                  <Text style={styles.actionOptionText}>Mark important</Text>
                </View>
              </Pressable>
              <Pressable
                style={[styles.actionOption, styles.actionOptionDanger]}
                onPress={() => {
                  setBulkActionsOpen(false);
                  onDeleteSelected();
                }}
              >
                <View style={styles.actionOptionLabel}>
                  <Ionicons name="trash" size={20} color="#B91C1C" />
                  <Text style={[styles.actionOptionText, styles.actionOptionTextDanger]}>Delete selected</Text>
                </View>
              </Pressable>
            </BottomSheetModal>
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
          </View>
        ) : null}
      </View>
      <View style={[styles.transactionListShell, { paddingBottom: space.pageBottom + insets.bottom }]}>
        <View style={[styles.panel, styles.listPanel, styles.transactionListPanel]}>
          <FlatList
            data={visibleTransactions}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.transactionListContent}
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
      </View>
    </View>
  );
}

const MemoTransactionListItem = memo(function MemoTransactionListItem({
  tx,
  selected,
  disabled,
  selectionMode,
  onOpenTransaction,
  onToggleSelection,
  last
}: {
  tx: Transaction;
  selected: boolean;
  disabled: boolean;
  selectionMode: boolean;
  onOpenTransaction: (tx: Transaction) => void;
  onToggleSelection: (id: number) => void;
  last: boolean;
}) {
  const handlePress = useCallback(() => {
    if (selectionMode) onToggleSelection(tx.id);
    else onOpenTransaction(tx);
  }, [onOpenTransaction, onToggleSelection, selectionMode, tx]);
  const handleLongPress = useCallback(() => onToggleSelection(tx.id), [onToggleSelection, tx.id]);

  return (
    <BaseTransactionListItem
      tx={tx}
      selected={selected}
      disabled={disabled}
      selectionMode={selectionMode}
      last={last}
      onPress={handlePress}
      onLongPress={handleLongPress}
    />
  );
});
