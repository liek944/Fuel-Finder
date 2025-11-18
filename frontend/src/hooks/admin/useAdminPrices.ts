import { useCallback, useState } from "react";
import { apiGet, apiPost, apiDelete } from "../../utils/api";
import type { PriceReport } from "../../types/price.types";

interface PriceReportStats {
  total_reports: number;
  verified_reports: number;
  pending_reports: number;
  reports_today: number;
  unique_stations_reported: number;
  avg_price_all: string | null;
  most_reported_station: string | null;
  most_reported_station_count: number;
  last_report_date: string | null;
  verification_rate: string;
}

interface FetchAllOptions {
  page?: number;
  pageSize?: number;
  verified?: boolean;
  stationName?: string;
  startDate?: Date;
  endDate?: Date;
}

export function useAdminPrices(adminApiKey: string) {
  const [reports, setReports] = useState<PriceReport[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [stats, setStats] = useState<PriceReportStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async (page: number = 1, pageSize: number = 20) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * pageSize;
      const res = await apiGet(`/api/admin/price-reports/pending?limit=${pageSize}&offset=${offset}`, adminApiKey);
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : data.reports || []);
        if (data?.pagination?.total !== undefined) setTotal(data.pagination.total);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err?.message || "Failed to fetch pending price reports");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to fetch pending price reports");
    } finally {
      setLoading(false);
    }
  }, [adminApiKey]);

  const fetchAll = useCallback(async (opts: FetchAllOptions = {}) => {
    const { page = 1, pageSize = 20, verified, stationName, startDate, endDate } = opts;
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * pageSize;
      const params: string[] = [
        `limit=${pageSize}`,
        `offset=${offset}`,
      ];
      if (typeof verified === "boolean") params.push(`verified=${verified ? "true" : "false"}`);
      if (stationName) params.push(`station_name=${encodeURIComponent(stationName)}`);
      if (startDate) params.push(`start_date=${startDate.toISOString()}`);
      if (endDate) {
        const adjusted = new Date(endDate);
        adjusted.setHours(23, 59, 59, 999);
        params.push(`end_date=${adjusted.toISOString()}`);
      }
      const url = `/api/admin/price-reports?${params.join("&")}`;
      const res = await apiGet(url, adminApiKey);
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : data.reports || []);
        if (data?.pagination?.total !== undefined) setTotal(data.pagination.total);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err?.message || "Failed to fetch price reports");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to fetch price reports");
    } finally {
      setLoading(false);
    }
  }, [adminApiKey]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet(`/api/admin/price-reports/stats`, adminApiKey);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err?.message || "Failed to fetch price report stats");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to fetch price report stats");
    } finally {
      setLoading(false);
    }
  }, [adminApiKey]);

  const verifyReport = useCallback(async (reportId: number, verifiedBy: string = "admin") => {
    const res = await apiPost(`/api/admin/price-reports/${reportId}/verify`, { verified_by: verifiedBy }, adminApiKey);
    return res.ok;
  }, [adminApiKey]);

  const deleteReport = useCallback(async (reportId: number) => {
    const res = await apiDelete(`/api/admin/price-reports/${reportId}`, adminApiKey);
    return res.ok;
  }, [adminApiKey]);

  return {
    reports,
    total,
    stats,
    loading,
    error,
    fetchPending,
    fetchAll,
    fetchStats,
    verifyReport,
    deleteReport,
    setReports,
  };
}
