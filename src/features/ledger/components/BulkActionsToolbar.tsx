import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { BottomSheetModal, IconButton, SelectButton } from "../../../shared/components";
import { styles, theme } from "../../../shared/styles";

type BulkActionsToolbarProps = {
  selectedCount: number;
  selectedTransactionCount?: number;
  categoryOptions: string[];
  onClearSelection: () => void;
  onMoveSelected: (category: string) => void;
  onMarkSelectedImportant: () => void;
  onUnmarkSelectedImportant: () => void;
  onDeleteSelected: () => void;
};

export function BulkActionsToolbar({
  selectedCount,
  selectedTransactionCount = selectedCount,
  categoryOptions,
  onClearSelection,
  onMoveSelected,
  onMarkSelectedImportant,
  onUnmarkSelectedImportant,
  onDeleteSelected
}: BulkActionsToolbarProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const moveCategories = categoryOptions.filter((category) => category !== "all");
  const hasSelectedTransactions = selectedTransactionCount > 0;

  if (selectedCount === 0) return null;

  return (
    <View style={styles.selectionToolbar}>
      <Text style={styles.bulkTitle}>{selectedCount} selected</Text>
      <Pressable style={styles.bulkCancelButton} onPress={onClearSelection}>
        <Text style={styles.bulkCancel}>Clear</Text>
      </Pressable>
      <IconButton icon="ellipsis-horizontal" onPress={() => setActionsOpen(true)} label="Bulk actions" />
      <BottomSheetModal visible={actionsOpen} title="Bulk actions" onClose={() => setActionsOpen(false)}>
        <ActionOption
          icon="folder-open"
          text="Move transaction category"
          trailing
          disabled={!hasSelectedTransactions}
          onPress={() => {
            setActionsOpen(false);
            setMoveOpen(true);
          }}
        />
        <ActionOption
          icon="star"
          text="Mark important"
          iconColor={theme.colors.warning}
          disabled={!hasSelectedTransactions}
          onPress={() => {
            setActionsOpen(false);
            onMarkSelectedImportant();
          }}
        />
        <ActionOption
          icon="star-outline"
          text="Remove important"
          iconColor={theme.colors.muted}
          disabled={!hasSelectedTransactions}
          onPress={() => {
            setActionsOpen(false);
            onUnmarkSelectedImportant();
          }}
        />
        <ActionOption
          icon="trash"
          text="Delete selected records"
          iconColor={theme.colors.expense}
          destructive
          onPress={() => {
            setActionsOpen(false);
            onDeleteSelected();
          }}
        />
      </BottomSheetModal>
      <BottomSheetModal visible={moveOpen} title="Move selected" onClose={() => setMoveOpen(false)}>
        <SelectButton
          title="Category"
          options={moveCategories}
          value={moveCategories[0] ?? ""}
          onChange={(category) => {
            onMoveSelected(category);
            setMoveOpen(false);
          }}
          label={(category) => category || "Choose category"}
        />
      </BottomSheetModal>
    </View>
  );
}

function ActionOption({
  icon,
  text,
  iconColor = theme.colors.text,
  trailing,
  destructive,
  disabled,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  iconColor?: string;
  trailing?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.actionOption, destructive && styles.actionOptionDanger, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <View style={styles.actionOptionLabel}>
        <Ionicons name={icon} size={20} color={iconColor} />
        <Text style={[styles.actionOptionText, destructive && styles.actionOptionTextDanger]}>{text}</Text>
      </View>
      {trailing ? <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} /> : null}
    </Pressable>
  );
}
