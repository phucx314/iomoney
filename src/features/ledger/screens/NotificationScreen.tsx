import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, SectionList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppNotification } from "../../../domain/types";
import { AppIcon } from "../../../domain/category";
import { SecondaryButton } from "../../../shared/components";
import { space, styles, theme } from "../../../shared/styles";

type NotificationScreenProps = {
  notifications: AppNotification[];
  onClear: () => void;
  onOpenNotification: (notification: AppNotification) => void;
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

export function NotificationScreen({ notifications, onClear, onOpenNotification, scrollOffset, onScrollOffsetChange }: NotificationScreenProps) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<SectionList<AppNotification>>(null);
  const sections = notificationSections(notifications);
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollOffsetChange(event.nativeEvent.contentOffset.y);
  };

  useEffect(() => {
    if (sections.length === 0) return;
    const timeout = setTimeout(() => listRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, viewOffset: -scrollOffset, animated: false }), 0);
    return () => clearTimeout(timeout);
  }, [scrollOffset, sections.length]);

  return (
    <View style={styles.content}>
      <View style={styles.notificationHeader}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        {notifications.length ? <SecondaryButton icon="trash-outline" text="Clear" onPress={onClear} /> : null}
      </View>
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(item, index) => `${item.id}:${item.createdAt}:${index}`}
        contentContainerStyle={[styles.listPad, { paddingBottom: space.pageBottom + insets.bottom }]}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        renderSectionHeader={({ section }) => <Text style={styles.notificationSectionTitle}>{section.title}</Text>}
        renderItem={({ item }) => {
          const meta = notificationMeta(item.type);
          return (
            <Pressable style={[styles.notificationItem, !item.readAt && styles.notificationUnread]} onPress={() => item.targetType && onOpenNotification(item)}>
              <View style={[styles.notificationIcon, { backgroundColor: meta.backgroundColor }]}>
                <Ionicons name={meta.icon} size={20} color={meta.color} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.notificationMessage}>{item.message}</Text>
                <Text style={styles.notificationTime}>{formatNotificationTime(item.createdAt)}</Text>
              </View>
              {item.targetType ? (
                <Pressable style={styles.notificationCta} onPress={() => onOpenNotification(item)}>
                  <Ionicons name="open-outline" size={14} color={theme.colors.accent} />
                  <Text style={styles.notificationCtaText}>Open</Text>
                </Pressable>
              ) : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No notifications.</Text>}
      />
    </View>
  );
}

function notificationSections(notifications: AppNotification[]) {
  const buckets = [
    { title: "Today", data: [] as AppNotification[] },
    { title: "This week", data: [] as AppNotification[] },
    { title: "This month", data: [] as AppNotification[] },
    { title: "Older", data: [] as AppNotification[] }
  ];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - now.getDay() * 24 * 60 * 60 * 1000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  for (const notification of notifications) {
    const time = new Date(notification.createdAt).getTime();
    if (time >= startOfToday) buckets[0].data.push(notification);
    else if (time >= startOfWeek) buckets[1].data.push(notification);
    else if (time >= startOfMonth) buckets[2].data.push(notification);
    else buckets[3].data.push(notification);
  }
  return buckets.filter((bucket) => bucket.data.length > 0);
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
