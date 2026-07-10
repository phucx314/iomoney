import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { RecurrenceDraft, RecurrenceFrequency, TransactionInput } from "../../../domain/types";
import {
  CategoryIcon,
  DateField,
  Field,
  IconButton,
  PrimaryButton,
  SecondaryButton,
  SelectButton
} from "../../../shared/components";
import { space, styles, theme } from "../../../shared/styles";

type EditorModalProps = {
  visible: boolean;
  draft: TransactionInput | null;
  categories: string[];
  busy: boolean;
  editing: boolean;
  recurrence: RecurrenceDraft;
  onRecurrenceChange: (recurrence: RecurrenceDraft) => void;
  onChange: (draft: TransactionInput) => void;
  onClose: () => void;
  onSave: () => void;
};

export function EditorModal({
  visible,
  draft,
  categories,
  busy,
  editing,
  recurrence,
  onRecurrenceChange,
  onChange,
  onClose,
  onSave
}: EditorModalProps) {
  const insets = useSafeAreaInsets();

  if (!draft) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.modalShell}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Transaction</Text>
            <IconButton icon="close" onPress={onClose} label="Close editor" />
          </View>
          <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: space.modalBottom + insets.bottom }]}>
            <Field label="Note" value={draft.note} onChangeText={(note) => onChange({ ...draft, note })} />
            <Field
              label="Amount"
              value={String(draft.amount || "")}
              keyboardType="numeric"
              onChangeText={(amount) => onChange({ ...draft, amount: Number(amount.replace(/[^\d-]/g, "")) })}
              hint="Expense is negative, income is positive"
            />
            <DateField label="Date" value={draft.date} onChange={(date) => onChange({ ...draft, date })} />
            <View style={styles.categoryEditorHeader}>
              <CategoryIcon category={draft.category} size={38} />
              <View style={styles.flex}>
                <Text style={styles.fieldLabel}>Category</Text>
                <Text style={styles.categoryPreview}>{draft.category || "New category"}</Text>
              </View>
            </View>
            {categories.length ? (
              <SelectButton title="Existing categories" options={categories} value={draft.category} onChange={(category) => onChange({ ...draft, category })} />
            ) : null}
            <Field label="New / selected category" value={draft.category} onChangeText={(category) => onChange({ ...draft, category })} />
            <Field label="Account" value={draft.account} onChangeText={(account) => onChange({ ...draft, account })} />
            <Field label="Currency" value={draft.currency} onChangeText={(currency) => onChange({ ...draft, currency })} />
            <Field label="Event" value={draft.event} onChangeText={(event) => onChange({ ...draft, event })} />
            {!editing ? (
              <View style={styles.recurrencePanel}>
                <Pressable style={styles.checkboxRow} onPress={() => onRecurrenceChange({ ...recurrence, enabled: !recurrence.enabled })}>
                  <Ionicons name={recurrence.enabled ? "checkbox" : "square-outline"} size={22} color={theme.colors.accent} />
                  <Text style={styles.checkboxLabel}>Repeat this transaction</Text>
                </Pressable>
                {recurrence.enabled ? (
                  <>
                    <SelectButton
                      title="Cycle"
                      options={["weekly", "monthly", "yearly"]}
                      value={recurrence.frequency}
                      onChange={(frequency) => onRecurrenceChange({ ...recurrence, frequency: frequency as RecurrenceFrequency })}
                      label={(frequency) => (frequency === "weekly" ? "Weekly" : frequency === "monthly" ? "Monthly" : "Yearly")}
                    />
                    <Field
                      label="Times"
                      value={String(recurrence.count)}
                      keyboardType="numeric"
                      onChangeText={(count) => onRecurrenceChange({ ...recurrence, count: Number(count.replace(/\D/g, "")) })}
                      hint="Total rows to create, including the first one"
                    />
                  </>
                ) : null}
              </View>
            ) : null}
            <Pressable style={styles.checkboxRow} onPress={() => onChange({ ...draft, excludeReport: !draft.excludeReport })}>
              <Ionicons name={draft.excludeReport ? "checkbox" : "square-outline"} size={22} color={theme.colors.accent} />
              <Text style={styles.checkboxLabel}>Exclude from report</Text>
            </Pressable>
            <Pressable style={styles.checkboxRow} onPress={() => onChange({ ...draft, important: !draft.important })}>
              <Ionicons name={draft.important ? "checkbox" : "square-outline"} size={22} color={theme.colors.accent} />
              <Text style={styles.checkboxLabel}>Important</Text>
            </Pressable>
          </ScrollView>
          <View style={[styles.modalFooter, { paddingBottom: space.lg + insets.bottom }]}>
            <SecondaryButton text="Cancel" icon="close-outline" onPress={onClose} />
            <PrimaryButton text="Save" icon="save-outline" onPress={onSave} disabled={busy} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
