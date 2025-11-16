import type { Station } from './station.types';

export interface DashboardStats {
  owner_name: string;
  domain: string;
  total_stations: number;
  verified_reports: number;
  pending_reports: number;
  total_actions: number;
  last_activity: string | null;
}

export type OwnerStation = Station;
