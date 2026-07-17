import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { flowFilterTitle, flowLabel } from "../../../domain/category";
import { PeriodFilter, TransactionFilter } from "../../../domain/types";
import { BottomSheetModal, DateField, PrimaryButton, SegmentedControl, SelectButton } from "../../../shared/components";
import { currentMonthRange } from "../../../shared/date";
import { monthLabel } from "../../../shared/format";
import { styles, theme } from "../../../shared/styles";

const FLOW_OPTIONS: TransactionFilter["flow"][] = ["all", "expense", "income"];
const PERIOD_MODE_OPTIONS: PeriodFilter["mode"][] = ["month", "range"];

type TransactionFilterSheetProps = {
  visible: boolean;
  filter: TransactionFilter;
  monthOptions: string[];
  categoryOptions: string[];
  onApply: (filter: TransactionFilter) => void;
  onClose: () => void;
};

export function TransactionFilterSheet({
  visible,
  filter,
  monthOptions,
  categoryOptions,
  onApply,
  onClose
}: TransactionFilterSheetProps) {
  const [draftFilter, setDraftFilter] = useState<TransactionFilter>(filter);
  const selectableCategories = categoryOptions.filter((category) => category !== "all");
  const draftRangePeriod = draftFilter.period.mode === "range" ? draftFilter.period : null;
  const setDraftPeriod = (period: PeriodFilter) => setDraftFilter({ ...draftFilter, period });
  const toggleDraftCategory = (category: string) =>
    setDraftFilter({
      ...draftFilter,
      categories: draftFilter.categories.includes(category)
        ? draftFilter.categories.filter((selected) => selected !== category)
        : [...draftFilter.categories, category]
    });

  useEffect(() => {
    if (visible) setDraftFilter(filter);
  }, [filter, visible]);

  return (
    <BottomSheetModal
      visible={visible}
      title="Transaction filters"
      onClose={onClose}
      footer={<PrimaryButton icon="checkmark" text="Apply filters" onPress={() => onApply(draftFilter)} />}
    >
      <SegmentedControl
        title={flowFilterTitle(draftFilter.scope)}
        options={FLOW_OPTIONS}
        value={draftFilter.flow}
        onChange={(flow) => setDraftFilter({ ...draftFilter, flow })}
        label={(flow) => flowLabel(flow, draftFilter.scope)}
      />
      <SegmentedControl
        title="Period type"
        options={PERIOD_MODE_OPTIONS}
        value={draftFilter.period.mode}
        onChange={(mode) =>
          setDraftPeriod(
            mode === "month" ? { mode, month: "all" } : draftFilter.period.mode === "range" ? draftFilter.period : currentMonthRange()
          )
        }
        label={(mode) => (mode === "month" ? "Month" : "Date range")}
      />
      {draftFilter.period.mode === "month" ? (
        <SelectButton
          title="Period"
          options={monthOptions}
          value={draftFilter.period.month}
          onChange={(month) => setDraftPeriod({ mode: "month", month })}
          label={monthLabel}
        />
      ) : null}
      {draftRangePeriod ? (
        <View style={styles.rangeGrid}>
          <DateField
            label="From"
            value={draftRangePeriod.startDate}
            onChange={(startDate) => setDraftPeriod({ mode: "range", startDate, endDate: draftRangePeriod.endDate })}
          />
          <DateField
            label="To"
            value={draftRangePeriod.endDate}
            onChange={(endDate) => setDraftPeriod({ mode: "range", startDate: draftRangePeriod.startDate, endDate })}
          />
        </View>
      ) : null}
      <View style={styles.multiSelectWrap}>
        <Text style={styles.fieldLabel}>Categories</Text>
        <View style={styles.multiSelectPanel}>
          <Pressable
            style={[styles.multiOption, draftFilter.categories.length === 0 && styles.multiOptionActive]}
            onPress={() => setDraftFilter({ ...draftFilter, categories: [] })}
          >
            <Text
              style={[styles.multiOptionText, draftFilter.categories.length === 0 && styles.dropdownOptionTextActive]}
              numberOfLines={1}
            >
              All categories
            </Text>
            <Ionicons
              name={draftFilter.categories.length === 0 ? "checkbox" : "square-outline"}
              size={22}
              color={draftFilter.categories.length === 0 ? theme.colors.accent : theme.colors.muted}
            />
          </Pressable>
          {selectableCategories.map((category) => {
            const active = draftFilter.categories.includes(category);
            return (
              <Pressable
                key={category}
                style={[styles.multiOption, active && styles.multiOptionActive]}
                onPress={() => toggleDraftCategory(category)}
              >
                <Text style={[styles.multiOptionText, active && styles.dropdownOptionTextActive]} numberOfLines={1}>
                  {category}
                </Text>
                <Ionicons name={active ? "checkbox" : "square-outline"} size={22} color={active ? theme.colors.accent : theme.colors.muted} />
              </Pressable>
            );
          })}
          {selectableCategories.length === 0 ? <Text style={styles.multiEmpty}>No categories yet.</Text> : null}
        </View>
      </View>
    </BottomSheetModal>
  );
}
