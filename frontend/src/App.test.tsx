import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

import { SettingsProvider } from "./contexts/SettingsContext";
import { MapSelectionProvider } from "./contexts/MapSelectionContext";
import { FilterProvider } from "./contexts/FilterContext";
import { vi } from "vitest";

// Mock geolocation
Object.defineProperty(global.navigator, 'geolocation', {
  value: {
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
    getCurrentPosition: vi.fn(),
  },
  writable: true,
});

test('renders learn react link', () => {
  render(
    <SettingsProvider>
      <FilterProvider>
        <MapSelectionProvider>
          <App />
        </MapSelectionProvider>
      </FilterProvider>
    </SettingsProvider>
  );
  const linkElement = screen.getByText(/About/i); // Changed to match actual text in footer
  expect(linkElement).toBeInTheDocument();
});
