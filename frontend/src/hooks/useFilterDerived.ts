import { useMemo } from "react";
import { useFilterContext } from "../contexts/FilterContext";

interface FilterableStationBase {
  brand: string;
  fuel_price: number;
  fuel_prices?: Array<{ price: number | string }>;
  name?: string;
  address?: string;
}

export function useFilterDerived<TStation extends FilterableStationBase>(stations: TStation[]) {
  const { selectedBrand, maxPrice, searchQuery } = useFilterContext();

  const filteredStations = useMemo(
    () =>
      stations.filter((station) => {
        const matchesBrand = selectedBrand === "All" || station.brand === selectedBrand;

        const matchesPrice =
          station.fuel_prices && station.fuel_prices.length > 0
            ? station.fuel_prices.some((fp) => Number(fp.price) <= maxPrice)
            : Number(station.fuel_price) <= maxPrice;

        const matchesSearch =
          searchQuery === "" ||
          (station.name && station.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (station.brand && station.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (station.address && station.address.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesBrand && matchesPrice && matchesSearch;
      }),
    [stations, selectedBrand, maxPrice, searchQuery],
  );

  const uniqueBrands = useMemo(
    () => Array.from(new Set(stations.map((station) => station.brand))).sort(),
    [stations],
  );

  return { filteredStations, uniqueBrands } as const;
}
