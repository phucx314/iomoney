import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FLOW_LABEL } from "../../../domain/category";
import { Transaction, TransactionFilter } from "../../../domain/types";
import { BulkActionsToolbar } from "../components/BulkActionsToolbar";
import { LedgerList } from "../components/LedgerList";
import { TransactionFilterSheet } from "../components/TransactionFilterSheet";
import { FilterButton } from "../../../shared/components";
import { monthLabel } from "../../../shared/format";
import { styles, theme } from "../../../shared/styles";

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
  onUnmarkSelectedImportant: () => void;
  onDeleteSelected: () => void;
  busy: boolean;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
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
  onUnmarkSelectedImportant,
  onDeleteSelected,
  busy,
  scrollOffset,
  onScrollOffsetChange
}: TransactionsScreenProps) {
  const insets = useSafeAreaInsets();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchText, setSearchText] = useState(filter.query);
  const periodSummary =
    filter.period.mode === "month" ? monthLabel(filter.period.month) : `${filter.period.startDate} - ${filter.period.endDate}`;
  const categorySummary =
    filter.categories.length === 0
      ? "All categories"
      : filter.categories.length <= 2
        ? filter.categories.join(", ")
        : `${filter.categories.length} categories`;
  const filterSummary = [filter.flow === "all" ? "All flows" : FLOW_LABEL[filter.flow], periodSummary, categorySummary].join(" / ");

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
          <Ionicons name="search" size={18} color={theme.colors.muted} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search note, category, event"
            style={styles.searchInput}
            placeholderTextColor={theme.colors.placeholder}
          />
        </View>
        <FilterButton label="Filter" value={filterSummary} onPress={() => setFiltersOpen(true)} />
        <TransactionFilterSheet
          visible={filtersOpen}
          filter={filter}
          monthOptions={monthOptions}
          categoryOptions={categoryOptions}
          onClose={() => setFiltersOpen(false)}
          onApply={(nextFilter) => {
            setFilter({ ...nextFilter, query: searchText });
            setFiltersOpen(false);
          }}
        />
        <BulkActionsToolbar
          selectedCount={selectedIds.length}
          categoryOptions={categoryOptions}
          onClearSelection={onClearSelection}
          onMoveSelected={onMoveSelected}
          onMarkSelectedImportant={onMarkSelectedImportant}
          onUnmarkSelectedImportant={onUnmarkSelectedImportant}
          onDeleteSelected={onDeleteSelected}
        />
      </View>
      <LedgerList
        transactions={transactions}
        selectedIds={selectedIds}
        busy={busy}
        bottomInset={insets.bottom}
        scrollOffset={scrollOffset}
        onOpenTransaction={onOpenTransaction}
        onToggleSelection={onToggleSelection}
        onScrollOffsetChange={onScrollOffsetChange}
      />
    </View>
  );
}
