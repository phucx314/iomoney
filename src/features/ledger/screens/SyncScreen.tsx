import { useEffect, useRef } from "react";
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DangerButton, MiniStat, PrimaryButton, SecondaryButton } from "../../../shared/components";
import { space, styles, theme } from "../../../shared/styles";

type SyncScreenProps = {
  busy: boolean;
  total: number;
  categories: number;
  months: number;
  onImportMoneyLover: () => void;
  onExportMoneyLover: () => void;
  onImportIOMoney: () => void;
  onExportIOMoney: () => void;
  onClear: () => void;
  onBack: () => void;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

export function SyncScreen({
  busy,
  total,
  categories,
  months,
  onImportMoneyLover,
  onExportMoneyLover,
  onImportIOMoney,
  onExportIOMoney,
  onClear,
  onBack,
  scrollOffset,
  onScrollOffsetChange
}: SyncScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollOffsetChange(event.nativeEvent.contentOffset.y);
  };

  useEffect(() => {
    const timeout = setTimeout(() => scrollRef.current?.scrollTo({ y: scrollOffset, animated: false }), 0);
    return () => clearTimeout(timeout);
  }, [scrollOffset]);

  return (
    <View style={styles.content}>
      <View style={styles.secondaryHeader}>
        <Pressable accessibilityLabel="Back" style={styles.pageBackButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.secondaryHeaderTitle}>CSV sync</Text>
        <View style={styles.secondaryHeaderSpacer} />
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.contentPad, { paddingBottom: space.pageBottom + insets.bottom }]}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        <View style={styles.panel}>
          <Text style={styles.syncText}>IOMoney native schema</Text>
          <Text style={styles.syncHint}>Full-fidelity backup with uid, report group, category icons, debts, counterparties, timestamps, and deleted rows.</Text>
          <View style={styles.syncStats}>
            <MiniStat label="Current filter records" value={String(total)} />
            <MiniStat label="Categories" value={String(categories)} />
            <MiniStat label="Months" value={String(months)} />
          </View>
          <View style={styles.buttonStack}>
            <PrimaryButton icon="cloud-upload-outline" text="Import IOMoney CSV" onPress={onImportIOMoney} disabled={busy} />
            <SecondaryButton icon="download-outline" text="Export IOMoney CSV" onPress={onExportIOMoney} disabled={busy} />
          </View>
        </View>
        <View style={[styles.panel, styles.panelSpaced]}>
          <Text style={styles.syncText}>Money Lover compatible schema</Text>
          <Text style={styles.syncHint}>ID, Note, Amount, Category, Account, Currency, Date, Event, Exclude Report</Text>
          <View style={[styles.buttonStack, styles.syncActionStack]}>
            <PrimaryButton icon="cloud-upload-outline" text="Import Money Lover CSV" onPress={onImportMoneyLover} disabled={busy} />
            <SecondaryButton icon="download-outline" text="Export Money Lover CSV" onPress={onExportMoneyLover} disabled={busy} />
          </View>
        </View>
        <View style={[styles.panel, styles.panelSpaced]}>
          <Text style={styles.syncText}>Local database</Text>
          <Text style={styles.syncHint}>Clear app data stored on this device. Your exported CSV files are not touched.</Text>
          <View style={[styles.buttonStack, styles.syncActionStack]}>
            <DangerButton icon="trash-outline" text="Clear local database" onPress={onClear} disabled={busy} />
          </View>
          {busy ? <ActivityIndicator color={theme.colors.accent} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}
