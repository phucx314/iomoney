import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Counterparty, CounterpartyType, DebtDirection, DebtDraft } from "../../../domain/types";
import { DateField, Field, IconButton, PrimaryButton, SecondaryButton, SegmentedControl } from "../../../shared/components";
import { formatVnd } from "../../../shared/format";
import { useKeyboardBuffer } from "../../../shared/keyboard";
import { space, styles, theme } from "../../../shared/styles";

type DebtEditorModalProps = {
  visible: boolean;
  draft: DebtDraft | null;
  counterparties: Counterparty[];
  busy: boolean;
  editing: boolean;
  onChange: (draft: DebtDraft) => void;
  onClose: () => void;
  onSave: () => void;
};

const DIRECTION_OPTIONS: DebtDirection[] = ["lent", "borrowed"];

export function DebtEditorModal({ visible, draft, counterparties, busy, editing, onChange, onClose, onSave }: DebtEditorModalProps) {
  const insets = useSafeAreaInsets();
  const keyboardBottomBuffer = useKeyboardBuffer();
  if (!draft) return null;
  const recentCounterparties = counterparties.slice(0, 5);
  const selectedCounterparty = draft.counterpartyId ? counterparties.find((item) => item.id === draft.counterpartyId) : null;
  const counterpartyQuery = selectedCounterparty?.name ?? draft.newCounterpartyName;
  const counterpartySuggestions = counterpartyQuery.trim()
    ? counterparties
        .filter((item) => item.id !== draft.counterpartyId && item.name.toLowerCase().includes(counterpartyQuery.trim().toLowerCase()))
        .slice(0, 5)
    : [];
  const amountValue = draft.amount ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(draft.amount) : "";
  const updateAmount = (value: string) => onChange({ ...draft, amount: Number(value.replace(/\D/g, "")) });
  const selectCounterparty = (counterparty: Counterparty) => {
    onChange({
      ...draft,
      counterpartyId: counterparty.id,
      newCounterpartyName: "",
      newCounterpartyType: counterparty.type
    });
  };
  const updateCounterpartyName = (newCounterpartyName: string) => {
    onChange({ ...draft, counterpartyId: null, newCounterpartyName });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.modalShell}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex} keyboardVerticalOffset={0}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing ? "Edit debt / loan" : "Debt / loan"}</Text>
            <IconButton icon="close" onPress={onClose} label="Close debt editor" />
          </View>
          <ScrollView
            contentContainerStyle={[styles.modalContent, { paddingBottom: space.modalBottom + insets.bottom + keyboardBottomBuffer }]}
            keyboardShouldPersistTaps="handled"
          >
            <SegmentedControl
              title="Type"
              options={DIRECTION_OPTIONS}
              value={draft.direction}
              onChange={(direction) => onChange({ ...draft, direction })}
              label={(direction) => (direction === "lent" ? "They owe me" : "I owe them")}
            />
            {recentCounterparties.length > 0 ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Recent counterparties</Text>
                <View style={styles.counterpartyChipWrap}>
                  {recentCounterparties.map((counterparty) => (
                    <Pressable
                      key={counterparty.id}
                      style={[styles.counterpartyChip, draft.counterpartyId === counterparty.id && styles.counterpartyChipActive]}
                      onPress={() => selectCounterparty(counterparty)}
                    >
                      <Text style={[styles.counterpartyChipText, draft.counterpartyId === counterparty.id && styles.counterpartyChipTextActive]} numberOfLines={1}>
                        {counterparty.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Counterparty name</Text>
              <View style={styles.counterpartyInputRow}>
                <TextInput
                  value={counterpartyQuery}
                  onChangeText={updateCounterpartyName}
                  style={styles.counterpartyInput}
                  placeholderTextColor={theme.colors.placeholder}
                />
                {!draft.counterpartyId ? (
                  <Pressable
                    style={styles.counterpartyTypeButton}
                    onPress={() => onChange({ ...draft, newCounterpartyType: draft.newCounterpartyType === "person" ? "organization" : "person" })}
                  >
                    <Ionicons name={draft.newCounterpartyType === "person" ? "person-outline" : "business-outline"} size={15} color={theme.colors.accent} />
                    <Text style={styles.counterpartyTypeButtonText}>{draft.newCounterpartyType === "person" ? "Person" : "Org"}</Text>
                  </Pressable>
                ) : null}
              </View>
              {counterpartySuggestions.length > 0 ? (
                <View style={styles.counterpartySuggestionWrap}>
                  {counterpartySuggestions.map((counterparty) => (
                    <Pressable key={counterparty.id} style={styles.suggestionChip} onPress={() => selectCounterparty(counterparty)}>
                      <Text style={styles.suggestionText} numberOfLines={1}>
                        {counterparty.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {draft.counterpartyId ? (
                <Text style={styles.hint}>Using existing {selectedCounterparty?.type === "organization" ? "organization" : "person"}.</Text>
              ) : null}
            </View>
            <View style={[styles.field, styles.debtAmountField]}>
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
                {draft.direction === "lent" ? `You lend money, cash out: ${formatVnd(-draft.amount)}` : `You borrow money, cash in: ${formatVnd(draft.amount)}`}
              </Text>
            </View>
            <DateField label="Start date" value={draft.date} onChange={(date) => onChange({ ...draft, date })} />
            <Pressable style={styles.checkboxRow} onPress={() => onChange({ ...draft, dueDate: draft.dueDate ? "" : draft.date })}>
              <Ionicons name={draft.dueDate ? "checkbox" : "square-outline"} size={22} color={theme.colors.accent} />
              <Text style={styles.checkboxLabel}>Has due date</Text>
            </Pressable>
            {draft.dueDate ? <DateField label="Due date" value={draft.dueDate} onChange={(dueDate) => onChange({ ...draft, dueDate })} /> : null}
            <Field label="Note" value={draft.note} onChangeText={(note) => onChange({ ...draft, note })} />
            <Field label="Account" value={draft.account} onChangeText={(account) => onChange({ ...draft, account })} />
            <Field label="Currency" value={draft.currency} onChangeText={(currency) => onChange({ ...draft, currency })} />
          </ScrollView>
          <View style={[styles.modalFooter, { paddingBottom: space.lg + insets.bottom + keyboardBottomBuffer }]}>
            <SecondaryButton text="Cancel" icon="close-outline" onPress={onClose} />
            <PrimaryButton text="Save" icon="save-outline" onPress={onSave} disabled={busy} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
