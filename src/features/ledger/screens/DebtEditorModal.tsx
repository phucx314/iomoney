import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Counterparty, CounterpartyType, DebtDirection, DebtDraft } from "../../../domain/types";
import { DateField, Field, IconButton, PrimaryButton, SecondaryButton, SegmentedControl, SelectButton } from "../../../shared/components";
import { formatVnd } from "../../../shared/format";
import { space, styles, theme } from "../../../shared/styles";

type DebtEditorModalProps = {
  visible: boolean;
  draft: DebtDraft | null;
  counterparties: Counterparty[];
  busy: boolean;
  onChange: (draft: DebtDraft) => void;
  onClose: () => void;
  onSave: () => void;
};

const DIRECTION_OPTIONS: DebtDirection[] = ["lent", "borrowed"];
const COUNTERPARTY_TYPE_OPTIONS: CounterpartyType[] = ["person", "organization"];

export function DebtEditorModal({ visible, draft, counterparties, busy, onChange, onClose, onSave }: DebtEditorModalProps) {
  const insets = useSafeAreaInsets();
  if (!draft) return null;
  const counterpartyOptions = ["new", ...counterparties.map((item) => String(item.id))];
  const selectedCounterparty = draft.counterpartyId ? String(draft.counterpartyId) : "new";
  const amountValue = draft.amount ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(draft.amount) : "";
  const updateAmount = (value: string) => onChange({ ...draft, amount: Number(value.replace(/\D/g, "")) });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.modalShell}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Debt / loan</Text>
          <IconButton icon="close" onPress={onClose} label="Close debt editor" />
        </View>
        <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: space.modalBottom + insets.bottom }]}>
          <SegmentedControl
            title="Type"
            options={DIRECTION_OPTIONS}
            value={draft.direction}
            onChange={(direction) => onChange({ ...draft, direction })}
            label={(direction) => (direction === "lent" ? "I lent" : "I borrowed")}
          />
          <SelectButton
            title="Counterparty"
            options={counterpartyOptions}
            value={selectedCounterparty}
            onChange={(value) => onChange({ ...draft, counterpartyId: value === "new" ? null : Number(value) })}
            label={(value) => (value === "new" ? "New counterparty" : counterparties.find((item) => item.id === Number(value))?.name ?? "Unknown")}
          />
          {!draft.counterpartyId ? (
            <View style={styles.debtNestedPanel}>
              <Field label="Name" value={draft.newCounterpartyName} onChangeText={(newCounterpartyName) => onChange({ ...draft, newCounterpartyName })} />
              <SegmentedControl
                title="Kind"
                options={COUNTERPARTY_TYPE_OPTIONS}
                value={draft.newCounterpartyType}
                onChange={(newCounterpartyType) => onChange({ ...draft, newCounterpartyType })}
                label={(type) => (type === "person" ? "Person" : "Organization")}
              />
            </View>
          ) : null}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Amount</Text>
            <View style={styles.amountInputRow}>
              <View style={styles.amountSignButton}>
                <Ionicons name={draft.direction === "lent" ? "arrow-up" : "arrow-down"} size={18} color={theme.colors.text} />
              </View>
              <TextInput
                value={amountValue}
                keyboardType="numeric"
                onChangeText={updateAmount}
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={theme.colors.placeholder}
              />
            </View>
            <Text style={styles.hint}>
              {draft.direction === "lent" ? `Cash out: ${formatVnd(-draft.amount)}` : `Cash in: ${formatVnd(draft.amount)}`}
            </Text>
          </View>
          <DateField label="Start date" value={draft.date} onChange={(date) => onChange({ ...draft, date })} />
          <DateField label="Due date" value={draft.dueDate || draft.date} onChange={(dueDate) => onChange({ ...draft, dueDate })} />
          <Field label="Note" value={draft.note} onChangeText={(note) => onChange({ ...draft, note })} />
          <Field label="Account" value={draft.account} onChangeText={(account) => onChange({ ...draft, account })} />
          <Field label="Currency" value={draft.currency} onChangeText={(currency) => onChange({ ...draft, currency })} />
        </ScrollView>
        <View style={[styles.modalFooter, { paddingBottom: space.lg + insets.bottom }]}>
          <SecondaryButton text="Cancel" icon="close-outline" onPress={onClose} />
          <PrimaryButton text="Save" icon="save-outline" onPress={onSave} disabled={busy} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
