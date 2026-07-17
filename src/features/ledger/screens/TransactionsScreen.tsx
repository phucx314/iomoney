import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { flowLabel, LEDGER_SCOPE_LABEL } from "../../../domain/category";
import { LedgerFilterSummary, Transaction, TransactionFilter } from "../../../domain/types";
import { BulkActionsToolbar } from "../components/BulkActionsToolbar";
import { LedgerScopeSwitch } from "../components/LedgerScopeSwitch";
import { LedgerList } from "../components/LedgerList";
import { TransactionFilterSheet } from "../components/TransactionFilterSheet";
import { FilterButton } from "../../../shared/components";
import { formatSignedVnd, monthLabel } from "../../../shared/format";
import { styles, theme } from "../../../shared/styles";

type TransactionsScreenProps = {
  filter: TransactionFilter;
  setFilter: (filter: TransactionFilter) => void;
  monthOptions: string[];
  categoryOptions: string[];
  transactions: Transaction[];
  ledgerSummary: LedgerFilterSummary;
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
  ledgerSummary,
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
  const debtScope = filter.scope === "debt";
  const outLabel = debtScope ? "Debt out" : "Cash out";
  const inLabel = debtScope ? "Debt in" : "Cash in";
  const outAmountStyle = debtScope ? styles.amountDebtPayment : styles.amountExpense;
  const inAmountStyle = debtScope ? styles.amountDebtPayable : styles.amountIncome;
  const filterSummary = [LEDGER_SCOPE_LABEL[filter.scope], flowLabel(filter.flow, filter.scope), periodSummary, categorySummary].join(" / ");

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
        <LedgerScopeSwitch value={filter.scope} onChange={(scope) => setFilter({ ...filter, scope })} />
        <FilterButton label="Filter" value={filterSummary} onPress={() => setFiltersOpen(true)} />
        <View style={styles.ledgerSummaryRow}>
          <View style={styles.ledgerSummaryItem}>
            <Text style={styles.ledgerSummaryLabel}>{outLabel}</Text>
            <Text style={outAmountStyle}>{formatSignedVnd(ledgerSummary.spent)}</Text>
          </View>
          <View style={styles.ledgerSummaryItem}>
            <Text style={styles.ledgerSummaryLabel}>{inLabel}</Text>
            <Text style={inAmountStyle}>{formatSignedVnd(ledgerSummary.earned)}</Text>
          </View>
        </View>
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
