import React, { useState, useEffect, useRef } from "react";

interface SettingsButtonProps {
  voiceEnabled: boolean;
  onToggleVoice: (enabled: boolean) => void;
  notificationsEnabled: boolean;
  onToggleNotifications: (enabled: boolean) => void;
  keepScreenOn: boolean;
  onToggleKeepScreenOn: (enabled: boolean) => void;
}

const SettingsButton: React.FC<SettingsButtonProps> = ({
  voiceEnabled,
  onToggleVoice,
  notificationsEnabled,
  onToggleNotifications,
  keepScreenOn,
  onToggleKeepScreenOn,
}) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const Toggle: React.FC<{ on: boolean; onClick: () => void; label: string }>
    = ({ on, onClick, label }) => (
      <button
        onClick={onClick}
        aria-label={label}
        role="switch"
        aria-checked={on}
        style={{
          background: on ? "#4CAF50" : "#9e9e9e",
          color: "white",
          border: "none",
          padding: "4px 10px",
          borderRadius: 12,
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          minWidth: 44,
        }}
      >
        {on ? "ON" : "OFF"}
      </button>
    );

  return (
    <div style={{ position: "relative", zIndex: 1100 }} ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        title="Settings"
        aria-label="Open settings"
        style={{
          width: 50,
          height: 50,
          borderRadius: "50%",
          background: "#455A64",
          color: "white",
          border: "3px solid white",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          cursor: "pointer",
          fontSize: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.background = "#37474F";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.background = "#455A64";
        }}
      >
        ⚙️
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 0,
            background: "#ffffff",
            border: "1px solid #e0e0e0",
            borderRadius: 12,
            boxShadow: "0 8px 22px rgba(0,0,0,0.18)",
            width: 260,
            padding: 12,
          }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Settings</div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close settings"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, color: "#333", fontWeight: 600 }}>🔊 Voice announcements</div>
              <Toggle on={voiceEnabled} onClick={() => onToggleVoice(!voiceEnabled)} label="Toggle voice announcements" />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, color: "#333", fontWeight: 600 }}>🔔 Visual alerts</div>
              <Toggle on={notificationsEnabled} onClick={() => onToggleNotifications(!notificationsEnabled)} label="Toggle visual alerts" />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, color: "#333", fontWeight: 600 }}>📱 Keep screen on</div>
              <Toggle on={keepScreenOn} onClick={() => onToggleKeepScreenOn(!keepScreenOn)} label="Toggle keep screen on" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsButton;
