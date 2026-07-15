import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { listNoteSuggestions } from "../../../data/db";
import { AppIcon, CATEGORY_ICON_CHOICES, categoryIcon } from "../../../domain/category";
import { INCOME_REPORT_GROUPS, REPORT_GROUP_LABEL, normalizeReportGroup } from "../../../domain/reportGroup";
import { CategoryMetadata, RecurrenceDraft, RecurrenceFrequency, ReportGroup, TransactionInput } from "../../../domain/types";
import {
  BottomSheetModal,
  CategoryIcon,
  DateField,
  Field,
  IconButton,
  PrimaryButton,
  SecondaryButton,
  SegmentedControl,
  SelectButton
} from "../../../shared/components";
import { space, styles, theme } from "../../../shared/styles";

type EditorModalProps = {
  visible: boolean;
  draft: TransactionInput | null;
  categories: string[];
  categoryMetadata: CategoryMetadata[];
  busy: boolean;
  editing: boolean;
  recurrence: RecurrenceDraft;
  onRecurrenceChange: (recurrence: RecurrenceDraft) => void;
  onChange: (draft: TransactionInput) => void;
  onCreateCategory: (name: string, icon: AppIcon, defaultReportGroup: ReportGroup) => Promise<void>;
  onClose: () => void;
  onSave: () => void;
};

export function EditorModal({
  visible,
  draft,
  categories,
  categoryMetadata,
  busy,
  editing,
  recurrence,
  onRecurrenceChange,
  onChange,
  onCreateCategory,
  onClose,
  onSave
}: EditorModalProps) {
  const insets = useSafeAreaInsets();
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<AppIcon>("pricetag");
  const [noteSuggestions, setNoteSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!draft) {
      setNoteSuggestions([]);
      setCategorySheetOpen(false);
      setAddingCategory(false);
      return;
    }
    const query = draft.note.trim();
    if (query.length < 2) {
      setNoteSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      listNoteSuggestions(query)
        .then((items) => setNoteSuggestions(items.filter((item) => item !== draft.note)))
        .catch(() => setNoteSuggestions([]));
    }, 180);
    return () => clearTimeout(timeout);
  }, [draft?.note]);

  if (!draft) return null;
  const amountIsExpense = draft.amount < 0 || draft.reportGroup === "expense";
  const amountValue = formatAmountInput(Math.abs(draft.amount));
  const categoryDefaultGroup = (category: string, amount: number, fallback?: ReportGroup | null) => {
    const metadata = categoryMetadata.find((item) => item.name.toLowerCase() === category.toLowerCase());
    return normalizeReportGroup(amount, category, metadata?.defaultReportGroup ?? fallback);
  };
  const editableReportGroup = draft.reportGroup === "expense" ? categoryDefaultGroup(draft.category, 1, null) : draft.reportGroup;
  const updateAmount = (value: string, nextIsExpense = amountIsExpense) => {
    const absAmount = Number(value.replace(/\D/g, ""));
    const amount = nextIsExpense ? -absAmount : absAmount;
    const fallback = draft.reportGroup === "expense" ? null : draft.reportGroup;
    const reportGroup = nextIsExpense ? "expense" : categoryDefaultGroup(draft.category, amount, fallback);
    onChange({ ...draft, amount, reportGroup });
  };
  const toggleAmountSign = () => {
    const nextIsExpense = !amountIsExpense;
    updateAmount(String(Math.abs(draft.amount)), nextIsExpense);
  };
  const updateCategory = (category: string) => {
    onChange({ ...draft, category, reportGroup: categoryDefaultGroup(category, draft.amount, draft.reportGroup) });
  };
  const updateReportGroup = (reportGroup: ReportGroup) => {
    onChange({ ...draft, reportGroup: normalizeReportGroup(draft.amount, draft.category, reportGroup) });
  };
  const startAddCategory = () => {
    setNewCategoryName("");
    setNewCategoryIcon(categoryIcon(draft.category || "Other"));
    setAddingCategory(true);
  };
  const closeCategorySheet = () => {
    setCategorySheetOpen(false);
    setAddingCategory(false);
  };
  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const iconGroup = reportGroupFromIcon(newCategoryIcon);
    const defaultReportGroup =
      draft.amount < 0 ? "expense" : normalizeReportGroup(draft.amount, name, iconGroup ?? draft.reportGroup);
    await onCreateCategory(name, newCategoryIcon, defaultReportGroup);
    onChange({ ...draft, category: name, reportGroup: defaultReportGroup });
    closeCategorySheet();
  };

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
            {noteSuggestions.length > 0 ? (
              <View style={styles.suggestionWrap}>
                {noteSuggestions.map((note) => (
                  <Pressable key={note} style={styles.suggestionChip} onPress={() => onChange({ ...draft, note })}>
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {note}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Amount</Text>
              <View style={styles.amountInputRow}>
                <Pressable style={[styles.amountSignButton, amountIsExpense ? styles.amountSignExpense : styles.amountSignIncome]} onPress={toggleAmountSign}>
                  <Text style={styles.amountSignText}>{amountIsExpense ? "-" : "+"}</Text>
                </Pressable>
                <TextInput
                  value={amountValue}
                  keyboardType="numeric"
                  onChangeText={updateAmount}
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={theme.colors.placeholder}
                />
              </View>
              <Text style={styles.hint}>Use the sign button for outcome/income. Zero is allowed for notes.</Text>
            </View>
            <DateField label="Date" value={draft.date} onChange={(date) => onChange({ ...draft, date })} />
            <View style={styles.categoryEditorHeader}>
              <CategoryIcon category={draft.category} size={38} />
              <View style={styles.flex}>
                <Text style={styles.fieldLabel}>Category</Text>
                <Text style={styles.categoryPreview}>{draft.category || "New category"}</Text>
              </View>
            </View>
            <Pressable style={[styles.selectButton, styles.categorySelectButton]} onPress={() => setCategorySheetOpen(true)}>
              <Text style={styles.selectText} numberOfLines={1}>
                {draft.category || "Choose category"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.colors.subtle} />
            </Pressable>
            <BottomSheetModal visible={categorySheetOpen} title="Category" onClose={closeCategorySheet}>
              <Pressable style={styles.actionOption} onPress={startAddCategory}>
                <View style={styles.actionOptionLabel}>
                  <Ionicons name="add-circle-outline" size={22} color={theme.colors.accent} />
                  <Text style={styles.actionOptionText}>Add category</Text>
                </View>
              </Pressable>
              {addingCategory ? (
                <View style={styles.categoryCreatePanel}>
                  <Field label="Category name" value={newCategoryName} onChangeText={setNewCategoryName} />
                  <Text style={styles.fieldLabel}>Icon</Text>
                  <View style={styles.categoryIconGrid}>
                    {CATEGORY_ICON_CHOICES.map((icon) => (
                      <Pressable
                        key={icon}
                        style={[styles.categoryIconChoice, newCategoryIcon === icon && styles.categoryIconChoiceActive]}
                        onPress={() => setNewCategoryIcon(icon)}
                      >
                        <Ionicons name={icon} size={20} color={newCategoryIcon === icon ? theme.colors.onAccent : theme.colors.text} />
                      </Pressable>
                    ))}
                  </View>
                  <PrimaryButton icon="checkmark" text="Add category" onPress={createCategory} disabled={!newCategoryName.trim()} />
                </View>
              ) : null}
              {categories.map((category) => (
                <Pressable
                  key={category}
                  style={[styles.actionOption, category === draft.category && styles.multiOptionActive]}
                  onPress={() => {
                    updateCategory(category);
                    closeCategorySheet();
                  }}
                >
                  <View style={styles.actionOptionLabel}>
                    <CategoryIcon category={category} size={32} />
                    <Text style={styles.actionOptionText}>{category}</Text>
                  </View>
                  {category === draft.category ? <Ionicons name="checkmark" size={20} color={theme.colors.accent} /> : null}
                </Pressable>
              ))}
            </BottomSheetModal>
            {amountIsExpense ? (
              <View style={styles.reportGroupLocked}>
                <Text style={styles.fieldLabel}>Report group</Text>
                <View style={styles.reportGroupLockedValue}>
                  <Ionicons name="lock-closed-outline" size={16} color={theme.colors.subtle} />
                  <Text style={styles.reportGroupLockedText}>Expense</Text>
                </View>
                <Text style={styles.hint}>Expense is controlled by the minus sign.</Text>
              </View>
            ) : (
              <SegmentedControl
                title="Report group"
                options={INCOME_REPORT_GROUPS}
                value={editableReportGroup}
                onChange={updateReportGroup}
                label={reportGroupChipLabel}
              />
            )}
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

function formatAmountInput(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function reportGroupFromIcon(icon: AppIcon): ReportGroup | null {
  if (icon === "gift") return "gift";
  if (icon === "refresh-circle") return "refund";
  return null;
}

function reportGroupChipLabel(reportGroup: ReportGroup) {
  if (reportGroup === "income") return "Earned";
  if (reportGroup === "gift") return "Gift";
  return REPORT_GROUP_LABEL[reportGroup];
}
