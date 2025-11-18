import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "../../utils/api";

interface UserStats {
  activeUsers: number;
  timestamp: number;
  deviceBreakdown: { [k: string]: number };
  locationBreakdown: { [region: string]: number };
  featureUsage: { [feature: string]: number };
  pageBreakdown: { [page: string]: number };
  sessionStats: {
    averageDurationMinutes: number;
    longestSessionMinutes: number;
  };
  recentSessions: Array<{
    sessionId: string;
    device: string;
    location: string;
    duration: string;
    pageViews: number;
    currentPage: string;
  }>;
}

interface ActiveUser {
  sessionId: string;
  device: string;
  location: {
    lat: number;
    lng: number;
    display: string;
  } | null;
  duration: number;
  pageViews: number;
  currentPage: string;
  lastActive: string;
}

export function useAdminAnalytics(adminApiKey: string, options?: { autoRefreshMs?: number }) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);

  const fetchStats = useCallback(async () => {
    const res = await apiGet("/api/admin/users/stats", adminApiKey);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(errText || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data?.success) {
      setStats(data.stats);
    } else {
      setStats(data);
    }
  }, [adminApiKey]);

  const fetchActiveUsers = useCallback(async () => {
    const res = await apiGet("/api/admin/users/active", adminApiKey);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(errText || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data?.success) {
      setActiveUsers(data.users);
    } else {
      setActiveUsers(Array.isArray(data) ? data : []);
    }
  }, [adminApiKey]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchStats(), fetchActiveUsers()]);
    } catch (e: any) {
      setError(e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [fetchStats, fetchActiveUsers]);

  useEffect(() => {
    if (!options?.autoRefreshMs) return;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      refresh();
    }, options.autoRefreshMs);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [options?.autoRefreshMs, refresh]);

  return { stats, activeUsers, loading, error, refresh, fetchStats, fetchActiveUsers };
}
