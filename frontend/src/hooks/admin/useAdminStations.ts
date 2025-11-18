import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../../utils/api";
import type { Station } from "../../types/station.types";

export function useAdminStations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/api/stations");
      const json = await res.json();
      setStations(Array.isArray(json) ? json : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load stations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stations, loading, error, refresh, setStations };
}
