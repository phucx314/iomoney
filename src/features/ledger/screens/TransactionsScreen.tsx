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
  onDelete: (tx: Transaction) => void;
};

export function TransactionsScreen({
  filter,
  setFilter,
  monthOptions,
  categoryOptions,
  transactions,
  onOpenTransaction,
  onDelete
}: TransactionsScreenProps) {
  const insets = useSafeAreaInsets();

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
      </View>
      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listPad, { paddingBottom: 104 + insets.bottom }]}
        renderItem={({ item }) => (
          <TransactionRow tx={item} onPress={() => onOpenTransaction(item)} onLongPress={() => onDelete(item)} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No matching transactions.</Text>}
      />
    </View>
  );
}
