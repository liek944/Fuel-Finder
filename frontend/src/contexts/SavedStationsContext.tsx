/**
 * Saved Stations Context
 * Provides global state for user's saved/favorite stations
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { savedStationsApi, type SavedStation } from '../api/savedStationsApi';

interface SavedStationsContextType {
  /** Set of saved station IDs for quick lookup */
  savedIds: Set<number>;
  /** Full saved station data (loaded on demand) */
  savedStations: SavedStation[];
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Check if a station is saved */
  isSaved: (stationId: number) => boolean;
  /** Toggle save state for a station */
  toggleSave: (stationId: number) => Promise<void>;
  /** Save a station */
  saveStation: (stationId: number, notes?: string) => Promise<void>;
  /** Unsave a station */
  unsaveStation: (stationId: number) => Promise<void>;
  /** Refresh saved stations list */
  refresh: () => Promise<void>;
  /** Load full saved stations data */
  loadFullData: () => Promise<void>;
}

const SavedStationsContext = createContext<SavedStationsContextType | undefined>(undefined);

export const SavedStationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [savedStations, setSavedStations] = useState<SavedStation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved station IDs when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      loadIds();
    } else {
      // Clear saved stations when logged out
      setSavedIds(new Set());
      setSavedStations([]);
    }
  }, [isAuthenticated]);

  const loadIds = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      const ids = await savedStationsApi.getIds();
      setSavedIds(new Set(ids));
    } catch (error) {
      console.error('[SavedStations] Failed to load saved IDs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const loadFullData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      const stations = await savedStationsApi.list();
      setSavedStations(stations);
      setSavedIds(new Set(stations.map(s => s.stationId)));
    } catch (error) {
      console.error('[SavedStations] Failed to load saved stations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const isSaved = useCallback((stationId: number): boolean => {
    return savedIds.has(stationId);
  }, [savedIds]);

  const saveStation = useCallback(async (stationId: number, notes?: string) => {
    if (!isAuthenticated) {
      throw new Error('Must be logged in to save stations');
    }

    try {
      await savedStationsApi.save(stationId, notes);
      setSavedIds(prev => new Set([...prev, stationId]));
    } catch (error) {
      console.error('[SavedStations] Failed to save station:', error);
      throw error;
    }
  }, [isAuthenticated]);

  const unsaveStation = useCallback(async (stationId: number) => {
    if (!isAuthenticated) {
      throw new Error('Must be logged in to unsave stations');
    }

    try {
      await savedStationsApi.unsave(stationId);
      setSavedIds(prev => {
        const next = new Set(prev);
        next.delete(stationId);
        return next;
      });
      setSavedStations(prev => prev.filter(s => s.stationId !== stationId));
    } catch (error) {
      console.error('[SavedStations] Failed to unsave station:', error);
      throw error;
    }
  }, [isAuthenticated]);

  const toggleSave = useCallback(async (stationId: number) => {
    if (isSaved(stationId)) {
      await unsaveStation(stationId);
    } else {
      await saveStation(stationId);
    }
  }, [isSaved, saveStation, unsaveStation]);

  const refresh = useCallback(async () => {
    await loadIds();
  }, [loadIds]);

  const value: SavedStationsContextType = {
    savedIds,
    savedStations,
    isLoading,
    isSaved,
    toggleSave,
    saveStation,
    unsaveStation,
    refresh,
    loadFullData,
  };

  return (
    <SavedStationsContext.Provider value={value}>
      {children}
    </SavedStationsContext.Provider>
  );
};

/**
 * Hook to access saved stations context
 * Must be used within a SavedStationsProvider
 */
export const useSavedStations = (): SavedStationsContextType => {
  const context = useContext(SavedStationsContext);
  if (context === undefined) {
    throw new Error('useSavedStations must be used within a SavedStationsProvider');
  }
  return context;
};
