import { useCallback, useState } from "react";
import { clearNotificationsSoft, createNotification, listNotifications, markNotificationsRead } from "../../data/db";
import { AppNotification, AppNotificationTargetType } from "../../domain/types";

type NotifyOptions = {
  targetType?: AppNotificationTargetType;
  targetId?: number;
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  const refreshNotifications = useCallback(async () => {
    setNotifications(dedupeNotifications(await listNotifications()));
  }, []);

  const notify = useCallback((message: string, options: NotifyOptions = {}) => {
    createNotification({
      type: notificationTypeForMessage(message),
      message,
      targetType: options.targetType,
      targetId: options.targetId
    })
      .then((created) => setNotifications((current) => dedupeNotifications([created, ...current]).slice(0, 150)))
      .catch(() => {
        const now = new Date().toISOString();
        setNotifications((current) =>
          dedupeNotifications([
            {
              id: Date.now(),
              type: notificationTypeForMessage(message),
              message,
              targetType: options.targetType ?? null,
              targetId: options.targetId ?? null,
              readAt: null,
              createdAt: now,
              deletedAt: null
            },
            ...current
          ]).slice(0, 150)
        );
      });
  }, []);

  const markAllRead = useCallback(async () => {
    await markNotificationsRead();
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
  }, []);

  const clearNotifications = useCallback(async () => {
    await clearNotificationsSoft();
    setNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount,
    notify,
    refreshNotifications,
    markAllRead,
    clearNotifications
  };
}

function dedupeNotifications(notifications: AppNotification[]) {
  const seen = new Set<number>();
  return notifications.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function notificationTypeForMessage(message: string): AppNotification["type"] {
  const normalized = message.toLowerCase();
  if (normalized.includes("deleted") || normalized.includes("clear")) return "danger";
  if (normalized.includes("failed") || normalized.includes("blocked") || normalized.includes("required") || normalized.includes("must")) return "warning";
  if (normalized.includes("import") || normalized.includes("export")) return "sync";
  if (normalized.includes("added") || normalized.includes("updated") || normalized.includes("moved") || normalized.includes("marked")) return "success";
  return "system";
}
