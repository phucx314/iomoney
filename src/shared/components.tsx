import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ReactNode, useMemo, useState } from "react";
import { FlatList, Modal, PanResponder, Platform, Pressable, ScrollView, StyleProp, Text, TextInput, View, ViewStyle } from "react-native";
import { categoryIcon, AppIcon } from "../domain/category";
import { Tab, Transaction } from "../domain/types";
import { csvDateToPickerDate, pickerDateToCsvDate } from "./date";
import { categoryColor, formatSignedVnd } from "./format";
import { sizing, space, styles } from "./styles";

type BottomSheetModalProps = {
  visible: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

export function BottomSheetModal({ visible, title, children, footer, onClose }: BottomSheetModalProps) {
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
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()} {...panResponder.panHandlers}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <IconButton icon="close" onPress={onClose} label="Close sheet" />
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </Pressable>
      </Pressable>
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
  return (
    <Pressable
      style={[styles.txListItem, selected && styles.txListItemSelected, disabled && styles.disabled, last && styles.txListItemLast, style]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
    >
      {selectionMode ? (
        <View style={[styles.listSelectionMark, selected && styles.listSelectionMarkActive]}>
          {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
        </View>
      ) : null}
      <CategoryIcon category={tx.category} flow={positive ? "income" : "expense"} />
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {tx.note}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {tx.date} - {tx.category}
        </Text>
      </View>
      <Text style={positive ? styles.amountIncome : styles.amountExpense}>{formatSignedVnd(tx.amount)}</Text>
    </Pressable>
  );
}

export function Metric({
  label,
  value,
  icon,
  tone,
  isCount
}: {
  label: string;
  value: number;
  icon: AppIcon;
  tone: "income" | "expense" | "neutral";
  isCount?: boolean;
}) {
  const color = tone === "income" ? "#047857" : tone === "expense" ? "#B91C1C" : "#334155";
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} style={styles.metricIconGlyph} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]} numberOfLines={2}>
        {isCount ? value : formatSignedVnd(value)}
      </Text>
    </View>
  );
}

export function CategoryIcon({
  category,
  flow,
  size = 38
}: {
  category: string;
  flow?: "income" | "expense";
  size?: number;
}) {
  const color = categoryColor(category || "Other");
  const badgeColor = flow === "income" ? "#047857" : "#B91C1C";
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
          <Ionicons name={flow === "income" ? "arrow-down" : "arrow-up"} size={10} color="#FFFFFF" style={styles.flowBadgeIcon} />
        </View>
      ) : null}
    </View>
  );
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
        <Ionicons name="chevron-down" size={18} color="#475569" />
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
                    {active ? <Ionicons name="checkmark" size={20} color="#0F766E" /> : null}
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
        <Ionicons name="calendar-outline" size={18} color="#475569" />
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
      <Ionicons name="filter" size={20} color="#475569" />
    </Pressable>
  );
}

export function TabBar({ tab, setTab, bottomInset }: { tab: Tab; setTab: (tab: Tab) => void; bottomInset: number }) {
  return (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: Math.max(space.md, bottomInset), minHeight: sizing.tabBase + Math.max(space.md, bottomInset) }
      ]}
    >
      <TabButton tab="dashboard" current={tab} setTab={setTab} icon="grid-outline" label="Dashboard" />
      <TabButton tab="transactions" current={tab} setTab={setTab} icon="list-outline" label="Transactions" />
      <TabButton tab="sync" current={tab} setTab={setTab} icon="swap-horizontal-outline" label="Sync" />
      <TabButton tab="notifications" current={tab} setTab={setTab} icon="notifications-outline" label="Alerts" />
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
      <Ionicons name={icon} size={21} color={active ? "#0F766E" : "#64748B"} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label }: { icon: AppIcon; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityLabel={label} style={styles.iconButton} onPress={onPress}>
      <Ionicons name={icon} size={22} color="#0F172A" />
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
        placeholderTextColor="#94A3B8"
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
