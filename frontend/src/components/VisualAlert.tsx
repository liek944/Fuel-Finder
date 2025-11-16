import React, { useEffect, useState } from "react";
import "../styles/VisualAlert.css";

export interface VisualAlertData {
  id: string;
  title: string;
  message: string;
  icon?: string;
  duration?: number;
}

interface VisualAlertProps {
  alerts: VisualAlertData[];
  onDismiss: (id: string) => void;
}

const VisualAlert: React.FC<VisualAlertProps> = ({ alerts, onDismiss }) => {
  return (
    <div className="visual-alerts-container">
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

interface AlertItemProps {
  alert: VisualAlertData;
  onDismiss: (id: string) => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss after duration
    const duration = alert.duration || 5000;
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [alert]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(alert.id);
    }, 300); // Match CSS animation duration
  };

  return (
    <div
      className={`visual-alert ${isVisible ? "visible" : ""} ${isExiting ? "exiting" : ""}`}
      onClick={handleDismiss}
    >
      <div className="visual-alert-content">
        <div className="visual-alert-icon">{alert.icon || "📍"}</div>
        <div className="visual-alert-text">
          <div className="visual-alert-title">{alert.title}</div>
          <div className="visual-alert-message">{alert.message}</div>
        </div>
        <button
          className="visual-alert-close"
          onClick={handleDismiss}
          aria-label="Dismiss alert"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default VisualAlert;
