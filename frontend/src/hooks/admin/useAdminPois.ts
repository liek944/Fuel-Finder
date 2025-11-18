import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../../utils/api";
import type { POI } from "../../types/station.types";

export function useAdminPois() {
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/api/pois");
      const json = await res.json();
      setPois(Array.isArray(json) ? json : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load POIs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { pois, loading, error, refresh, setPois };
}
