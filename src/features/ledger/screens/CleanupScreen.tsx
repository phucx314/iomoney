import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CleanupItem } from "../../../domain/types";
import { DangerButton, SecondaryButton } from "../../../shared/components";
import { space, styles, theme } from "../../../shared/styles";

type CleanupScreenProps = {
  items: CleanupItem[];
  busy: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onPurge: (items: CleanupItem[]) => void;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

export function CleanupScreen({ items, busy, onBack, onRefresh, onPurge, scrollOffset, onScrollOffsetChange }: CleanupScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const selectedItems = useMemo(() => items.filter((item) => selectedKeys.includes(item.key)), [items, selectedKeys]);

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

  const toggle = (key: string) => {
    setSelectedKeys((selected) => (selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]));
  };

  return (
    <View style={styles.content}>
      <View style={styles.secondaryHeader}>
        <Pressable style={styles.pageBackButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.secondaryHeaderTitle}>Deleted items</Text>
        <View style={styles.secondaryHeaderSpacer} />
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.contentPad, { paddingBottom: space.pageBottom + insets.bottom }]}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        <Text style={[styles.sectionTitle, styles.sectionTitleBlock]}>Soft-deleted records</Text>
        <View style={[styles.panel, styles.listPanel]}>
          {items.length === 0 ? <Text style={[styles.empty, styles.listEmptyText]}>No deleted items.</Text> : null}
          {items.map((item, index) => {
            const selected = selectedKeys.includes(item.key);
            return (
              <Pressable
                key={item.key}
                style={[styles.txListItem, selected && styles.txListItemSelected, index === items.length - 1 && styles.txListItemLast]}
                onPress={() => toggle(item.key)}
              >
                <View style={[styles.listSelectionMark, selected && styles.listSelectionMarkActive]}>
                  {selected ? <Ionicons name="checkmark" size={14} color={theme.colors.onAccent} /> : null}
                </View>
                <View style={styles.flex}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {recordTypeLabel(item.type)} / {item.subtitle}
                  </Text>
                </View>
                <Text style={styles.rowMeta}>{shortTime(item.deletedAt)}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.buttonStack, styles.panelSpaced]}>
          <SecondaryButton icon="refresh" text="Refresh preview" onPress={onRefresh} disabled={busy} />
          <DangerButton icon="trash-outline" text={`Purge selected (${selectedItems.length})`} onPress={() => onPurge(selectedItems)} disabled={busy || selectedItems.length === 0} />
        </View>
      </ScrollView>
    </View>
  );
}

function recordTypeLabel(type: CleanupItem["type"]) {
  if (type === "debt") return "Debt";
  if (type === "counterparty") return "Counterparty";
  return "Transaction";
}

function shortTime(value: string) {
  return value ? value.slice(0, 10) : "";
}
