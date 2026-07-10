import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppNotification } from "../../../domain/types";
import { SecondaryButton } from "../../../shared/components";
import { space, styles } from "../../../shared/styles";

type NotificationScreenProps = {
  notifications: AppNotification[];
  onClear: () => void;
};

export function NotificationScreen({ notifications, onClear }: NotificationScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.content}>
      <View style={styles.notificationHeader}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        {notifications.length ? <SecondaryButton icon="trash-outline" text="Clear" onPress={onClear} /> : null}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listPad, { paddingBottom: space.pageBottom + insets.bottom }]}
        renderItem={({ item, index }) => (
          <View style={[styles.notificationItem, index === notifications.length - 1 && styles.listItemLast]}>
            <Text style={styles.notificationMessage}>{item.message}</Text>
            <Text style={styles.notificationTime}>{item.createdAt}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No notifications.</Text>}
      />
    </View>
  );
}
