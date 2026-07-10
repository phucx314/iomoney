import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DangerButton, MiniStat, PrimaryButton, SecondaryButton } from "../../../shared/components";
import { space, styles } from "../../../shared/styles";

type SyncScreenProps = {
  busy: boolean;
  total: number;
  categories: number;
  months: number;
  onImport: () => void;
  onExport: () => void;
  onClear: () => void;
};

export function SyncScreen({
  busy,
  total,
  categories,
  months,
  onImport,
  onExport,
  onClear
}: SyncScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.content} contentContainerStyle={[styles.contentPad, { paddingBottom: space.pageBottom + insets.bottom }]}>
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
        {busy ? <ActivityIndicator color="#0F766E" /> : null}
      </View>
    </ScrollView>
  );
}
