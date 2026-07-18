import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  View,
  ViewStyle
} from "react-native";
import { categoryIcon, AppIcon, transactionFlowTone, type TransactionFlowTone } from "../domain/category";
import { isDebtPaymentReportGroup } from "../domain/reportGroup";
import { Tab, Transaction } from "../domain/types";
import { csvDateToPickerDate, pickerDateToCsvDate } from "./date";
import { categoryColor, formatSignedVnd } from "./format";
import { useKeyboardBuffer } from "./keyboard";
import { sizing, space, styles, theme } from "./styles";

type BottomSheetModalProps = {
  visible: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  headerAction?: ReactNode;
  onClose: () => void;
};

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  confirmIcon?: AppIcon;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText,
  cancelText = "Cancel",
  confirmIcon,
  destructive,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.confirmOverlay} onPress={onCancel}>
        <Pressable style={styles.confirmCard} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.confirmTitle}>{title}</Text>
          <Text style={styles.confirmMessage}>{message}</Text>
          <View style={styles.confirmActions}>
            <SecondaryButton icon="close-outline" text={cancelText} onPress={onCancel} />
            {destructive ? (
              <DangerButton icon={confirmIcon ?? "warning"} text={confirmText} onPress={onConfirm} />
            ) : (
              <PrimaryButton icon={confirmIcon ?? "checkmark"} text={confirmText} onPress={onConfirm} />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function BottomSheetModal({ visible, title, children, footer, headerAction, onClose }: BottomSheetModalProps) {
  const keyboardBottomBuffer = useKeyboardBuffer();
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 10 && gesture.dy > Math.abs(gesture.dx),
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy > 70) onClose();
        }
      }),
    [onClose]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingRoot}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.sheetOverlay} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()} {...panResponder.panHandlers}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <View style={styles.sheetHeaderActions}>
                {headerAction}
                <IconButton icon="close" onPress={onClose} label="Close sheet" />
              </View>
            </View>
            <ScrollView
              contentContainerStyle={styles.sheetBody}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
            {footer ? <View style={[styles.sheetFooter, { paddingBottom: space.lg + keyboardBottomBuffer }]}>{footer}</View> : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function TransactionListItem({
  tx,
  onPress,
  onLongPress,
  selected,
  disabled,
  selectionMode,
  last,
  style
}: {
  tx: Transaction;
  onPress: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  selectionMode?: boolean;
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const positive = tx.amount > 0;
  const amountTone = transactionFlowTone(tx);
  const showDebtCashFlowStack =
    tx.debtPaymentRecordCashFlow === true &&
    Boolean(tx.debtPaymentId) &&
    isDebtPaymentReportGroup(tx.reportGroup);
  return (
    <Pressable
      style={[styles.txListItem, selected && styles.txListItemSelected, disabled && styles.disabled, last && styles.txListItemLast, style]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
    >
      {selectionMode ? (
        <View style={[styles.listSelectionMark, selected && styles.listSelectionMarkActive]}>
          {selected ? <Ionicons name="checkmark" size={14} color={theme.colors.onAccent} /> : null}
        </View>
      ) : null}
      <CategoryIcon
        category={tx.category}
        flow={positive ? "income" : "expense"}
        flowTone={amountTone}
        cashFlowStacked={showDebtCashFlowStack}
      />
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {tx.note}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {tx.date} - {tx.category}
        </Text>
      </View>
      {tx.important ? <Ionicons name="star" size={16} color={theme.colors.warning} /> : null}
      <Text style={amountTextStyle(amountTone)}>{formatSignedVnd(tx.amount)}</Text>
    </Pressable>
  );
}

export function Metric({
  label,
  value,
  icon,
  tone,
  isCount,
  onPress
}: {
  label: string;
  value: number;
  icon: AppIcon;
  tone: "income" | "expense" | "neutral" | "warning" | "debtReceivable" | "debtPayable";
  isCount?: boolean;
  onPress?: () => void;
}) {
  const color =
    tone === "income"
      ? theme.colors.income
      : tone === "expense"
        ? theme.colors.expense
        : metricToneColor(tone);
  const Container = onPress ? Pressable : View;
  return (
    <Container style={styles.metric} onPress={onPress}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={18} color={color} style={styles.metricIconGlyph} />
        </View>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={[styles.metricValue, { color }]} numberOfLines={2}>
        {isCount ? value : formatSignedVnd(value)}
      </Text>
    </Container>
  );
}

function metricToneColor(tone: "neutral" | "warning" | "debtReceivable" | "debtPayable") {
  if (tone === "warning") return theme.colors.warning;
  if (tone === "debtReceivable") return theme.colors.debtReceivable;
  if (tone === "debtPayable") return theme.colors.debtPayable;
  return theme.colors.neutral;
}

export function CategoryIcon({
  category,
  flow,
  flowTone,
  cashFlowStacked,
  size = 38
}: {
  category: string;
  flow?: "income" | "expense";
  flowTone?: TransactionFlowTone;
  cashFlowStacked?: boolean;
  size?: number;
}) {
  const color = categoryColor(category || "Other");
  const badgeColor = flowBadgeColor(flow, flowTone);
  const iconSize = Math.max(18, Math.round(size * 0.48));
  return (
    <View style={[styles.categoryIconBox, { width: size, height: size, backgroundColor: `${color}18` }]}>
      <Ionicons
        name={categoryIcon(category)}
        size={iconSize}
        color={color}
        style={[styles.categoryIconGlyph, { width: size, height: size, lineHeight: size }]}
      />
      {flow ? (
        <View style={[styles.flowBadge, { backgroundColor: badgeColor }]}>
          <Ionicons name={flowBadgeIcon(flow, flowTone)} size={10} color={theme.colors.onSignal} style={styles.flowBadgeIcon} />
        </View>
      ) : null}
      {cashFlowStacked ? (
        <View style={[styles.cashFlowStackBadge, { backgroundColor: flow === "expense" ? theme.colors.expense : theme.colors.income }]}>
          <Ionicons name="remove" size={10} color={theme.colors.onSignal} style={styles.flowBadgeIcon} />
        </View>
      ) : null}
    </View>
  );
}

function amountTextStyle(tone: TransactionFlowTone) {
  if (tone === "debtReceivable") return styles.amountDebtReceivable;
  if (tone === "debtPayable") return styles.amountDebtPayable;
  if (tone === "debtPayment") return styles.amountDebtPayment;
  return tone === "income" ? styles.amountIncome : styles.amountExpense;
}

function flowBadgeColor(flow?: "income" | "expense", tone?: TransactionFlowTone) {
  if (tone === "debtReceivable") return theme.colors.debtReceivable;
  if (tone === "debtPayable") return theme.colors.debtPayable;
  if (tone === "debtPayment") return theme.colors.debtReceivable;
  return flow === "income" ? theme.colors.income : theme.colors.expense;
}

function flowBadgeIcon(flow: "income" | "expense", tone?: TransactionFlowTone): AppIcon {
  if (tone === "debtReceivable" || tone === "debtPayable" || tone === "debtPayment") return flow === "income" ? "arrow-down" : "arrow-up";
  return flow === "income" ? "add" : "remove";
}

export function SegmentedControl<T extends string>({
  title,
  options,
  value,
  onChange,
  label = (option: T) => option
}: {
  title: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
  label?: (value: T) => string;
}) {
  return (
    <View style={styles.segmentedWrap}>
      <Text style={styles.fieldLabel}>{title}</Text>
      <View style={styles.segmentedRow}>
        {options.map((option) => {
          const active = option === value;
          return (
            <Pressable
              key={option}
              style={[styles.segmentChip, active && styles.segmentChipActive]}
              onPress={() => onChange(option)}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                {label(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SelectButton<T extends string>({
  title,
  options,
  value,
  onChange,
  label = (option: T) => option
}: {
  title: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
  label?: (value: T) => string;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = label(value);
  return (
    <View style={styles.selectWrap}>
      <Text style={styles.fieldLabel}>{title}</Text>
      <Pressable style={styles.selectButton} onPress={() => setOpen(true)}>
        <Text style={styles.selectText} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.colors.subtle} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dropdownOverlay} onPress={() => setOpen(false)}>
          <View style={styles.dropdownSheet}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>{title}</Text>
              <IconButton icon="close" onPress={() => setOpen(false)} label="Close dropdown" />
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const active = item === value;
                return (
                  <Pressable
                    style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]} numberOfLines={1}>
                      {label(item)}
                    </Text>
                    {active ? <Ionicons name="checkmark" size={20} color={theme.colors.accent} /> : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>No options.</Text>}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function DateField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const pickerDate = csvDateToPickerDate(value);

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== "ios") setOpen(false);
    if (selected) onChange(pickerDateToCsvDate(selected));
  };

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.selectButton} onPress={() => setOpen(true)}>
        <Text style={styles.selectText}>{value}</Text>
        <Ionicons name="calendar-outline" size={18} color={theme.colors.subtle} />
      </Pressable>
      {open ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

export function FilterButton({
  label,
  value,
  onPress
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.filterButton} onPress={onPress}>
      <View style={styles.flex}>
        <Text style={styles.filterButtonLabel}>{label}</Text>
        <Text style={styles.filterButtonValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Ionicons name="filter" size={20} color={theme.colors.subtle} />
    </Pressable>
  );
}

export function TabBar({
  tab,
  setTab,
  bottomInset,
  onAdd,
  addOpen
}: {
  tab: Tab;
  setTab: (tab: Tab) => void;
  bottomInset: number;
  onAdd: () => void;
  addOpen?: boolean;
}) {
  const safeBottom = Math.max(space.md, bottomInset);
  return (
    <View style={[styles.tabBar, { paddingBottom: safeBottom, minHeight: sizing.tabBase + safeBottom + space.md }]}>
      <View style={styles.tabPill}>
        <TabButton tab="dashboard" current={tab} setTab={setTab} icon="grid-outline" label="Home" />
        <TabButton tab="transactions" current={tab} setTab={setTab} icon="list-outline" label="Ledger" />
        <TabButton tab="debts" current={tab} setTab={setTab} icon="people-outline" label="Debts" />
        <TabButton tab="settings" current={tab} setTab={setTab} icon="settings-outline" label="Settings" />
      </View>
      <Pressable accessibilityLabel={addOpen ? "Close add menu" : "Open add menu"} style={styles.tabAddButton} onPress={onAdd}>
        <TabAddIcon open={addOpen} />
      </Pressable>
    </View>
  );
}

function TabButton({
  tab,
  current,
  setTab,
  icon,
  label
}: {
  tab: Tab;
  current: Tab;
  setTab: (tab: Tab) => void;
  icon: AppIcon;
  label: string;
}) {
  const active = tab === current;
  return (
    <Pressable style={styles.tabButton} onPress={() => setTab(tab)}>
      <Ionicons name={icon} size={21} color={active ? theme.colors.accent : theme.colors.muted} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function TabAddIcon({ open }: { open?: boolean }) {
  const motion = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(motion, {
      toValue: open ? 1 : 0,
      damping: 18,
      stiffness: 260,
      mass: 0.7,
      useNativeDriver: true
    }).start();
  }, [motion, open]);

  return (
    <Animated.View
      style={{
        transform: [
          {
            rotate: motion.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "90deg"]
            })
          },
          {
            scale: motion.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.96]
            })
          }
        ]
      }}
    >
      <Ionicons name={open ? "close-outline" : "add"} size={open ? 25 : 26} color={theme.colors.onAccent} />
    </Animated.View>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  style
}: {
  icon: AppIcon;
  onPress: () => void;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable accessibilityLabel={label} style={[styles.iconButton, style]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={theme.colors.text} />
    </Pressable>
  );
}

export function PrimaryButton({ icon, text, onPress, disabled }: ButtonProps) {
  return <ButtonBase icon={icon} text={text} onPress={onPress} disabled={disabled} style={styles.primaryButton} textStyle={styles.primaryButtonText} />;
}

export function SecondaryButton({ icon, text, onPress, disabled }: ButtonProps) {
  return <ButtonBase icon={icon} text={text} onPress={onPress} disabled={disabled} style={styles.secondaryButton} textStyle={styles.secondaryButtonText} />;
}

export function DangerButton({ icon, text, onPress, disabled }: ButtonProps) {
  return <ButtonBase icon={icon} text={text} onPress={onPress} disabled={disabled} style={styles.dangerButton} textStyle={styles.dangerButtonText} />;
}

type ButtonProps = {
  icon: AppIcon;
  text: string;
  onPress: () => void;
  disabled?: boolean;
};

function ButtonBase({
  icon,
  text,
  onPress,
  disabled,
  style,
  textStyle
}: ButtonProps & { style: object; textStyle: object }) {
  return (
    <Pressable style={[style, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Ionicons name={icon} size={18} color={(textStyle as { color: string }).color} />
      <Text style={textStyle}>{text}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  hint
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={styles.input}
        placeholderTextColor={theme.colors.placeholder}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}
