import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppNotification } from "../../../domain/types";
import { AppIcon } from "../../../domain/category";
import { SecondaryButton } from "../../../shared/components";
import { space, styles } from "../../../shared/styles";

type NotificationScreenProps = {
  notifications: AppNotification[];
  onClear: () => void;
  scrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
};

const NOTIFICATION_META: Record<AppNotification["type"], { icon: AppIcon; color: string; backgroundColor: string }> = {
  success: { icon: "checkmark-circle", color: "#047857", backgroundColor: "#D1FAE5" },
  warning: { icon: "warning", color: "#A16207", backgroundColor: "#FEF3C7" },
  danger: { icon: "trash", color: "#B91C1C", backgroundColor: "#FEE2E2" },
  sync: { icon: "swap-horizontal", color: "#0369A1", backgroundColor: "#E0F2FE" },
  system: { icon: "information-circle", color: "#475569", backgroundColor: "#E2E8F0" }
};

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
          const meta = NOTIFICATION_META[item.type];
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
