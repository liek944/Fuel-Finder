/**
 * Map Configuration Constants
 * Default settings and configurations for map components
 */

export const MAP_CONFIG = {
  defaultCenter: [12.5966, 121.5258] as [number, number], // Oriental Mindoro center
  defaultZoom: 11,
  minZoom: 8,
  maxZoom: 18,
  tileLayer: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

export const BRAND_OPTIONS = [
  "Local",
  "Shell",
  "Petron",
  "Caltex",
  "Phoenix",
  "Unioil",
  "Seaoil",
];

export const SERVICE_OPTIONS = [
  "Air",
  "Water",
  "Restroom",
  "Convenience Store",
  "ATM",
  "Car Wash",
  "Oil Change",
  "Tire Service",
  "24/7",
  "Food",
  "Parking",
];

export const POI_TYPES = [
  { value: "gas", label: "Gas Station" },
  { value: "convenience", label: "Convenience Store" },
  { value: "repair", label: "Repair Shop" },
];

export const FUEL_TYPES = [
  { value: "Regular", label: "Regular", defaultPrice: "58.00" },
  { value: "Diesel", label: "Diesel", defaultPrice: "55.00" },
  { value: "Premium", label: "Premium", defaultPrice: "62.00" },
];

export const DEFAULT_OPERATING_HOURS = {
  open: "08:00",
  close: "20:00",
};
