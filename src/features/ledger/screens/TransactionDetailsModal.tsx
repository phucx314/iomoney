import { Text, View } from "react-native";
import { Transaction } from "../../../domain/types";
import { BottomSheetModal, CategoryIcon, PrimaryButton, SecondaryButton } from "../../../shared/components";
import { formatSignedVnd } from "../../../shared/format";
import { styles } from "../../../shared/styles";

type TransactionDetailsModalProps = {
  transaction: Transaction | null;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
};

export function TransactionDetailsModal({ transaction, onClose, onEdit }: TransactionDetailsModalProps) {
  if (!transaction) return null;

  return (
    <BottomSheetModal
      visible={Boolean(transaction)}
      title="Transaction details"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton icon="close-outline" text="Close" onPress={onClose} />
          <PrimaryButton icon="create-outline" text="Edit" onPress={() => onEdit(transaction)} />
        </>
      }
    >
      <View style={styles.detailHero}>
        <CategoryIcon category={transaction.category} flow={transaction.amount > 0 ? "income" : "expense"} size={50} />
        <View style={styles.flex}>
          <Text style={styles.detailTitle}>{transaction.note}</Text>
          <Text style={transaction.amount > 0 ? styles.amountIncome : styles.amountExpense}>
            {formatSignedVnd(transaction.amount)}
          </Text>
        </View>
      </View>
      <DetailRow label="Date" value={transaction.date} />
      <DetailRow label="Category" value={transaction.category} />
      <DetailRow label="Account" value={transaction.account} />
      <DetailRow label="Currency" value={transaction.currency} />
      <DetailRow label="Event" value={transaction.event || "-"} />
      <DetailRow label="Exclude report" value={transaction.excludeReport ? "Yes" : "No"} />
    </BottomSheetModal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}
