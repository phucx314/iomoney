import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FLOW_LABEL } from "../../../domain/category";
import { Transaction, TransactionFilter } from "../../../domain/types";
import { BottomSheetModal, FilterButton, SelectButton, TransactionRow } from "../../../shared/components";
import { monthLabel } from "../../../shared/format";
import { styles } from "../../../shared/styles";

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
  const selectionMode = selectedIds.length > 0;
  const moveCategories = categoryOptions.filter((category) => category !== "all");
  const filterSummary = [
    filter.flow === "all" ? "All flows" : FLOW_LABEL[filter.flow],
    monthLabel(filter.month),
    filter.category === "all" ? "All categories" : filter.category
  ].join(" / ");

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
          <SelectButton
            title="Flow"
            options={["all", "expense", "income"]}
            value={filter.flow}
            onChange={(flow) => setFilter({ ...filter, flow: flow as TransactionFilter["flow"] })}
            label={(flow) => FLOW_LABEL[flow as TransactionFilter["flow"]]}
          />
          <SelectButton title="Month" options={monthOptions} value={filter.month} onChange={(month) => setFilter({ ...filter, month })} label={monthLabel} />
          <SelectButton
            title="Category"
            options={categoryOptions}
            value={filter.category}
            onChange={(category) => setFilter({ ...filter, category })}
            label={(category) => (category === "all" ? "All categories" : category)}
          />
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
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listPad, { paddingBottom: 104 + insets.bottom }]}
        renderItem={({ item }) => (
          <TransactionRow
            tx={item}
            selected={selectedIds.includes(item.id)}
            disabled={busy}
            onPress={() => (selectionMode ? onToggleSelection(item.id) : onOpenTransaction(item))}
            onLongPress={() => onToggleSelection(item.id)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No matching transactions.</Text>}
      />
    </View>
  );
}
