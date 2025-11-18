import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { arrivalNotifications } from "../utils/arrivalNotifications";

interface SettingsContextValue {
  voiceEnabled: boolean;
  notificationsEnabled: boolean;
  keepScreenOn: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setKeepScreenOn: (enabled: boolean) => void;
  toggleVoice: () => void;
  toggleNotifications: () => void;
  toggleKeepScreenOn: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [voiceEnabled, setVoiceEnabledState] = useState<boolean>(true);
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(false);
  const [keepScreenOn, setKeepScreenOnState] = useState<boolean>(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ff_settings");
      if (saved) {
        const s = JSON.parse(saved);
        if (typeof s.voiceEnabled === "boolean") setVoiceEnabledState(s.voiceEnabled);
        if (typeof s.notificationsEnabled === "boolean") setNotificationsEnabledState(s.notificationsEnabled);
        if (typeof s.keepScreenOn === "boolean") setKeepScreenOnState(s.keepScreenOn);
      }
    } catch {}
  }, []);

  // Persist on changes
  useEffect(() => {
    try {
      localStorage.setItem(
        "ff_settings",
        JSON.stringify({ voiceEnabled, notificationsEnabled, keepScreenOn })
      );
    } catch {}
  }, [voiceEnabled, notificationsEnabled, keepScreenOn]);

  // Apply settings to arrivalNotifications
  useEffect(() => {
    arrivalNotifications.setVoiceEnabled(voiceEnabled);
  }, [voiceEnabled]);

  useEffect(() => {
    arrivalNotifications.setNotificationsEnabled(notificationsEnabled);
  }, [notificationsEnabled]);

  useEffect(() => {
    arrivalNotifications.setKeepScreenOn(keepScreenOn);
  }, [keepScreenOn]);

  const setVoiceEnabled = useCallback((enabled: boolean) => {
    setVoiceEnabledState(enabled);
  }, []);

  const setNotificationsEnabled = useCallback((enabled: boolean) => {
    setNotificationsEnabledState(enabled);
  }, []);

  const setKeepScreenOn = useCallback((enabled: boolean) => {
    setKeepScreenOnState(enabled);
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabledState((prev) => {
      const next = !prev;
      if (next) {
        // Optional: Give immediate feedback when enabling
        try { arrivalNotifications.testVoice("Voice announcements enabled"); } catch {}
      }
      return next;
    });
  }, []);

  const toggleNotifications = useCallback(() => {
    setNotificationsEnabledState((prev) => !prev);
  }, []);

  const toggleKeepScreenOn = useCallback(() => {
    setKeepScreenOnState((prev) => !prev);
  }, []);

  const value = useMemo<SettingsContextValue>(() => ({
    voiceEnabled,
    notificationsEnabled,
    keepScreenOn,
    setVoiceEnabled,
    setNotificationsEnabled,
    setKeepScreenOn,
    toggleVoice,
    toggleNotifications,
    toggleKeepScreenOn,
  }), [voiceEnabled, notificationsEnabled, keepScreenOn, setVoiceEnabled, setNotificationsEnabled, setKeepScreenOn, toggleVoice, toggleNotifications, toggleKeepScreenOn]);

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
};

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
