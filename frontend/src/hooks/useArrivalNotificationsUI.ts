import { useCallback, useEffect, useRef, useState } from "react";
import { arrivalNotifications } from "../utils/arrivalNotifications";
import type { VisualAlertData } from "../components/VisualAlert";
import { useSettings } from "../contexts/SettingsContext";

export function useArrivalNotificationsUI() {
  const { notificationsEnabled } = useSettings();
  const [alerts, setAlerts] = useState<VisualAlertData[]>([]);
  const prevNotifRef = useRef<boolean>(notificationsEnabled);

  // Register visual alert callback
  useEffect(() => {
    const handleVisualAlert = (title: string, message: string, icon: string) => {
      const alert: VisualAlertData = {
        id: Date.now().toString(),
        title,
        message,
        icon,
        duration: 5000,
      };
      setAlerts((prev) => [...prev, alert]);
    };

    arrivalNotifications.setVisualAlertCallback(handleVisualAlert);
    return () => {
      arrivalNotifications.setVisualAlertCallback(null);
    };
  }, []);

  // Show confirmation when visual notifications become enabled
  useEffect(() => {
    if (!prevNotifRef.current && notificationsEnabled) {
      setAlerts((prev) => [
        ...prev,
        {
          id: "visual-enabled-" + Date.now(),
          title: "✅ Visual notifications enabled",
          message: "You will see alerts when approaching destinations",
          icon: "🔔",
          duration: 3000,
        },
      ]);
    }
    prevNotifRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  const dismiss = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { alerts, dismiss } as const;
}
