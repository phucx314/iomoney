import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UndoItem } from "../../../domain/types";
import { SecondaryButton } from "../../../shared/components";
import { space, styles, theme } from "../../../shared/styles";

type UndoScreenProps = {
  items: UndoItem[];
  busy: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onUndo: (item: UndoItem) => void;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

export function UndoScreen({ items, busy, onBack, onRefresh, onUndo, scrollOffset, onScrollOffsetChange }: UndoScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  useEffect(() => {
    const timeout = setTimeout(() => scrollRef.current?.scrollTo({ y: scrollOffset, animated: false }), 0);
    return () => clearTimeout(timeout);
  }, [scrollOffset]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollOffsetChange(event.nativeEvent.contentOffset.y);
  };

  return (
    <View style={styles.content}>
      <View style={styles.secondaryHeader}>
        <Pressable style={styles.pageBackButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.secondaryHeaderTitle}>Undo history</Text>
        <View style={styles.secondaryHeaderSpacer} />
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.contentPad, { paddingBottom: space.pageBottom + insets.bottom }]}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        <Text style={[styles.sectionTitle, styles.sectionTitleBlock]}>Recent reversible actions</Text>
        <View style={[styles.panel, styles.listPanel]}>
          {items.length === 0 ? <Text style={[styles.empty, styles.listEmptyText]}>No undo items.</Text> : null}
          {items.map((item, index) => (
            <View key={item.id} style={[styles.txListItem, index === items.length - 1 && styles.txListItemLast]}>
              <View style={[styles.categoryIconBox, styles.undoIconBox]}>
                <Ionicons name={undoIcon(item.action)} size={18} color={theme.colors.accent} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {actionLabel(item.action)} / {targetLabel(item.targetType)} / {item.createdAt.slice(0, 19)}
                </Text>
              </View>
              <SecondaryButton icon="arrow-undo-outline" text="Undo" onPress={() => onUndo(item)} disabled={busy} />
            </View>
          ))}
        </View>
        <View style={[styles.buttonStack, styles.panelSpaced]}>
          <SecondaryButton icon="refresh" text="Refresh history" onPress={onRefresh} disabled={busy} />
        </View>
      </ScrollView>
    </View>
  );
}

function undoIcon(action: UndoItem["action"]) {
  if (action === "delete") return "trash-outline";
  if (action === "create") return "add-circle-outline";
  return "create-outline";
}

function actionLabel(action: UndoItem["action"]) {
  if (action === "delete") return "Delete";
  if (action === "create") return "Create";
  return "Update";
}

function targetLabel(targetType: UndoItem["targetType"]) {
  if (targetType === "debt") return "Debt";
  if (targetType === "debt_payment") return "Debt payment";
  if (targetType === "transaction_batch") return "Transactions";
  return "Transaction";
}
