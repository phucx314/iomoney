import { useEffect, useRef } from "react";
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DangerButton, MiniStat, PrimaryButton, SecondaryButton } from "../../../shared/components";
import { space, styles, theme } from "../../../shared/styles";

type SyncScreenProps = {
  busy: boolean;
  total: number;
  categories: number;
  months: number;
  onImport: () => void;
  onExport: () => void;
  onClear: () => void;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

export function SyncScreen({
  busy,
  total,
  categories,
  months,
  onImport,
  onExport,
  onClear,
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
    <ScrollView
      ref={scrollRef}
      style={styles.content}
      contentContainerStyle={[styles.contentPad, { paddingBottom: space.pageBottom + insets.bottom }]}
      onScroll={handleScroll}
      scrollEventThrottle={100}
    >
      <Text style={[styles.sectionTitle, styles.sectionTitleBlock]}>CSV sync</Text>
      <View style={styles.panel}>
        <Text style={styles.syncText}>Money Lover compatible schema</Text>
        <Text style={styles.syncHint}>ID, Note, Amount, Category, Account, Currency, Date, Event, Exclude Report</Text>
        <View style={styles.syncStats}>
          <MiniStat label="Current filter rows" value={String(total)} />
          <MiniStat label="Categories" value={String(categories)} />
          <MiniStat label="Months" value={String(months)} />
        </View>
        <View style={styles.buttonStack}>
          <PrimaryButton icon="cloud-upload-outline" text="Import CSV" onPress={onImport} disabled={busy} />
          <SecondaryButton icon="download-outline" text="Export CSV" onPress={onExport} disabled={busy} />
          <DangerButton icon="trash-outline" text="Clear local database" onPress={onClear} disabled={busy} />
        </View>
        {busy ? <ActivityIndicator color={theme.colors.accent} /> : null}
      </View>
    </ScrollView>
  );
}
