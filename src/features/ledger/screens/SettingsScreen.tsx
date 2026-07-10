import { useEffect, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SecondaryButton } from "../../../shared/components";
import { space, styles } from "../../../shared/styles";

type SettingsScreenProps = {
  displayName: string;
  total: number;
  categories: number;
  months: number;
  onEditProfile: () => void;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

export function SettingsScreen({
  displayName,
  total,
  categories,
  months,
  onEditProfile,
  scrollOffset,
  onScrollOffsetChange
}: SettingsScreenProps) {
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
      <Text style={[styles.sectionTitle, styles.sectionTitleBlock]}>Settings</Text>
      <View style={styles.panel}>
        <View style={styles.settingsProfileRow}>
          <View style={styles.settingsAvatar}>
            <Text style={styles.settingsAvatarText}>{(displayName.trim()[0] || "I").toUpperCase()}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>{displayName.trim() || "No name set"}</Text>
            <Text style={styles.rowMeta}>Personal profile</Text>
          </View>
          <SecondaryButton icon="create-outline" text="Edit" onPress={onEditProfile} />
        </View>
      </View>

      <Text style={[styles.sectionTitle, styles.sectionTitleBlock, styles.sectionTitleSpaced]}>Local data</Text>
      <View style={styles.panel}>
        <View style={styles.syncStats}>
          <View style={styles.miniStat}>
            <Text style={styles.miniValue}>{total}</Text>
            <Text style={styles.miniLabel}>Rows</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={styles.miniValue}>{categories}</Text>
            <Text style={styles.miniLabel}>Categories</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={styles.miniValue}>{months}</Text>
            <Text style={styles.miniLabel}>Months</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
