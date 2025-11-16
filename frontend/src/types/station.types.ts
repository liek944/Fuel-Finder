/**
 * Station Type Definitions
 * Shared types for fuel stations and related data
 */

export interface FuelPrice {
  fuel_type: string;
  price: number | string;
  price_updated_at?: string;
  price_updated_by?: string;
}

export interface Location {
  lat: number;
  lng: number;
}

export interface Image {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  width: number;
  height: number;
  display_order: number;
  alt_text?: string;
  is_primary: boolean;
  url: string;
  thumbnailUrl: string;
  created_at: string;
  updated_at: string;
}

export interface Station {
  id: number;
  name: string;
  brand: string;
  fuel_price: number; // Legacy field - kept for backward compatibility
  fuel_prices?: FuelPrice[]; // New field for multiple fuel types
  services: string[];
  address: string;
  phone?: string;
  operating_hours?: any;
  location: Location;
  distance_meters?: number;
  images?: Image[];
  primaryImage?: Image | null;
}

export interface POI {
  id: number;
  name: string;
  type: string;
  address?: string;
  phone?: string;
  operating_hours?: any;
  location: Location;
  distance_meters?: number;
  images?: Image[];
  primaryImage?: Image | null;
}

export interface CustomMarker {
  id: number;
  name: string;
  type: string;
  lat: number;
  lng: number;
}
