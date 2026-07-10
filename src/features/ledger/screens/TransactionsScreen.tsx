import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FLOW_LABEL } from "../../../domain/category";
import { PeriodFilter, Transaction, TransactionFilter } from "../../../domain/types";
import { BottomSheetModal, DateField, FilterButton, SelectButton, TransactionRow } from "../../../shared/components";
import { currentMonthRange } from "../../../shared/date";
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
  const periodModeOptions: PeriodFilter["mode"][] = ["month", "range"];
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

  const setPeriod = (period: PeriodFilter) => setFilter({ ...filter, period });
  const toggleCategory = (category: string) =>
    setFilter({
      ...filter,
      categories: filter.categories.includes(category)
        ? filter.categories.filter((selected) => selected !== category)
        : [...filter.categories, category]
    });

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
          <SelectButton
            title="Period type"
            options={periodModeOptions}
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
