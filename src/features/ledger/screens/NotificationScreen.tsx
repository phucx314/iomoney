import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppNotification } from "../../../domain/types";
import { AppIcon } from "../../../domain/category";
import { SecondaryButton } from "../../../shared/components";
import { space, styles, theme } from "../../../shared/styles";

type NotificationScreenProps = {
  notifications: AppNotification[];
  onClear: () => void;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

function notificationMeta(type: AppNotification["type"]): { icon: AppIcon; color: string; backgroundColor: string } {
  const colors = theme.colors;
  const meta: Record<AppNotification["type"], { icon: AppIcon; color: string; backgroundColor: string }> = {
    success: { icon: "checkmark-circle", color: colors.income, backgroundColor: colors.accentSoft },
    warning: { icon: "warning", color: colors.warning, backgroundColor: colors.warningSoft },
    danger: { icon: "trash", color: colors.danger, backgroundColor: colors.dangerSoft },
    sync: { icon: "swap-horizontal", color: colors.sync, backgroundColor: colors.syncSoft },
    system: { icon: "information-circle", color: colors.subtle, backgroundColor: colors.control }
  };
  return meta[type];
}

export function NotificationScreen({ notifications, onClear, scrollOffset, onScrollOffsetChange }: NotificationScreenProps) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<AppNotification>>(null);
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollOffsetChange(event.nativeEvent.contentOffset.y);
  };

  useEffect(() => {
    const timeout = setTimeout(() => listRef.current?.scrollToOffset({ offset: scrollOffset, animated: false }), 0);
    return () => clearTimeout(timeout);
  }, [scrollOffset]);

  return (
    <View style={styles.content}>
      <View style={styles.notificationHeader}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        {notifications.length ? <SecondaryButton icon="trash-outline" text="Clear" onPress={onClear} /> : null}
      </View>
      <FlatList
        ref={listRef}
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listPad, { paddingBottom: space.pageBottom + insets.bottom }]}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        renderItem={({ item, index }) => {
          const meta = notificationMeta(item.type);
          return (
            <View style={[styles.notificationItem, index === notifications.length - 1 && styles.listItemLast]}>
              <View style={[styles.notificationIcon, { backgroundColor: meta.backgroundColor }]}>
                <Ionicons name={meta.icon} size={20} color={meta.color} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.notificationMessage}>{item.message}</Text>
                <Text style={styles.notificationTime}>{item.createdAt}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No notifications.</Text>}
      />
    </View>
  );
}
