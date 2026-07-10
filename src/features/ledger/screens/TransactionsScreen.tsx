import { Ionicons } from "@expo/vector-icons";
import { FlatList, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FLOW_LABEL } from "../../../domain/category";
import { Transaction, TransactionFilter } from "../../../domain/types";
import { SelectButton, TransactionRow } from "../../../shared/components";
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
  const selectionMode = selectedIds.length > 0;
  const moveCategories = categoryOptions.filter((category) => category !== "all");

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
        <View style={styles.filterGrid}>
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
        </View>
        {selectionMode ? (
          <View style={styles.bulkBar}>
            <Text style={styles.bulkTitle}>{selectedIds.length} selected</Text>
            <SelectButton
              title="Move to category"
              options={moveCategories}
              value={moveCategories[0] ?? ""}
              onChange={onMoveSelected}
              label={(category) => category || "Choose category"}
            />
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
