import { useEffect, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SecondaryButton, SegmentedControl } from "../../../shared/components";
import { AppThemeMode, space, styles, theme } from "../../../shared/styles";

const THEME_OPTIONS: AppThemeMode[] = ["system", "light", "dark"];

type SettingsScreenProps = {
  displayName: string;
  total: number;
  categories: number;
  months: number;
  themeMode: AppThemeMode;
  onEditProfile: () => void;
  onThemeModeChange: (mode: AppThemeMode) => void;
  onOpenSync: () => void;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

export function SettingsScreen({
  displayName,
  total,
  categories,
  months,
  themeMode,
  onEditProfile,
  onThemeModeChange,
  onOpenSync,
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

      <Text style={[styles.sectionTitle, styles.sectionTitleBlock, styles.sectionTitleSpaced]}>Appearance</Text>
      <View style={styles.panel}>
        <SegmentedControl
          title="Theme"
          options={THEME_OPTIONS}
          value={themeMode}
          onChange={onThemeModeChange}
          label={(mode) => (mode === "system" ? "System" : mode === "light" ? "Light" : "Dark")}
        />
      </View>

      <Text style={[styles.sectionTitle, styles.sectionTitleBlock, styles.sectionTitleSpaced]}>Local data</Text>
      <View style={styles.panel}>
        <Pressable style={styles.settingsNavRow} onPress={onOpenSync}>
          <View style={styles.settingsNavIcon}>
            <Ionicons name="swap-horizontal-outline" size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>CSV sync</Text>
            <Text style={styles.rowMeta}>Import, export, backup, clear local data</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.subtle} />
        </Pressable>
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
