import { useCallback, useState } from "react";
import { AppNotification } from "../../domain/types";

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const notify = useCallback((message: string) => {
    setNotifications((current) => [
      {
        id: `${Date.now()}-${current.length}`,
        type: notificationTypeForMessage(message),
        message,
        createdAt: new Date().toLocaleString()
      },
      ...current
    ]);
  }, []);

  return {
    notifications,
    notify,
    clearNotifications: () => setNotifications([])
  };
}

function notificationTypeForMessage(message: string): AppNotification["type"] {
  const normalized = message.toLowerCase();
  if (normalized.includes("deleted") || normalized.includes("clear")) return "danger";
  if (normalized.includes("failed") || normalized.includes("blocked") || normalized.includes("required") || normalized.includes("must")) return "warning";
  if (normalized.includes("import") || normalized.includes("export")) return "sync";
  if (normalized.includes("added") || normalized.includes("updated") || normalized.includes("moved") || normalized.includes("marked")) return "success";
  return "system";
}
