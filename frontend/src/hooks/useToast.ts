import { useState, useCallback, useRef } from 'react';
import { ToastType } from '../components/Toast';

export interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const recentToasts = useRef<Map<string, number>>(new Map());

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    // Deduplicate: prevent showing the same message within 1 second
    const key = `${type}:${message}`;
    const now = Date.now();
    const lastShown = recentToasts.current.get(key);
    
    if (lastShown && now - lastShown < 1000) {
      return; // Skip duplicate toast
    }
    
    recentToasts.current.set(key, now);
    
    // Clean up old entries after 2 seconds
    setTimeout(() => {
      recentToasts.current.delete(key);
    }, 2000);
    
    const id = toastId++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const hideToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  return {
    toasts,
    showToast,
    hideToast,
    success,
    error,
    warning,
    info,
  };
};
