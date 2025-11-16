export interface PriceReport {
  id: number;
  station_id: number;
  fuel_type: string;
  price: number | string;
  notes?: string | null;
  reporter_name: string;
  reporter_ip: string;
  is_verified: boolean;
  created_at: string;
}

export interface PriceReportListResponse {
  count?: number;
  reports: PriceReport[];
}
