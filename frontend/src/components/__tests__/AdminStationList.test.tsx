import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import AdminStationList from "../admin/stations/AdminStationList";
import { Station } from "../../types/station.types";

// Mock react-leaflet
vi.mock("react-leaflet", () => ({
  Marker: ({ children }: { children: React.ReactNode }) => <div>Marker {children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>Popup {children}</div>,
}));

// Mock ImageSlideshow
vi.mock("../../common/ImageSlideshow", () => ({
  default: () => <div>ImageSlideshow</div>,
}));

// Mock AdminStationForm
vi.mock("../admin/stations/AdminStationForm", () => ({
  default: () => <div>AdminStationForm</div>,
}));

describe("AdminStationList", () => {
  const mockStations: Station[] = [
    {
      id: 1,
      name: "Station 1",
      brand: "Brand A",
      fuel_price: 1.5,
      services: ["Air"],
      location: { lat: 10, lng: 20 },
      address: "123 St",
      phone: "123-456",
      operating_hours: { open: "08:00", close: "22:00" },
      images: [],
      fuel_prices: [],
    },
  ];

  const defaultProps = {
    stations: mockStations,
    isAdminEnabled: true,
    editingStationId: null,
    editFormData: {},
    setEditFormData: vi.fn(),
    editSubmitting: false,
    startEditStation: vi.fn(),
    cancelEdit: vi.fn(),
    submitEditStation: vi.fn(),
    onDeleteStation: vi.fn(),
    stationImageUploadUrls: {},
    stationImageUploads: {},
    uploadingStationImages: {},
    handleStationImageSelect: vi.fn(),
    uploadStationImages: vi.fn(),
    clearStationImageUploads: vi.fn(),
    createFuelStationIcon: vi.fn(),
    editPrevOpenRef: { current: "" },
    editPrevCloseRef: { current: "" },
  };

  it("should render stations", () => {
    render(<AdminStationList {...defaultProps} />);
    expect(screen.getByText("⛽ Station 1")).toBeInTheDocument();
    expect(screen.getByText("Brand A")).toBeInTheDocument();
  });

  it("should show edit and delete buttons when admin is enabled", () => {
    render(<AdminStationList {...defaultProps} />);
    expect(screen.getByText("✏️ Edit Station")).toBeInTheDocument();
    expect(screen.getByText("🗑️ Delete Station")).toBeInTheDocument();
  });

  it("should call startEditStation when edit button is clicked", () => {
    render(<AdminStationList {...defaultProps} />);
    fireEvent.click(screen.getByText("✏️ Edit Station"));
    expect(defaultProps.startEditStation).toHaveBeenCalledWith(mockStations[0]);
  });

  it("should call onDeleteStation when delete button is clicked", () => {
    render(<AdminStationList {...defaultProps} />);
    fireEvent.click(screen.getByText("🗑️ Delete Station"));
    expect(defaultProps.onDeleteStation).toHaveBeenCalledWith(mockStations[0]);
  });

  it("should render AdminStationForm when editing", () => {
    render(<AdminStationList {...defaultProps} editingStationId={1} />);
    expect(screen.getByText("AdminStationForm")).toBeInTheDocument();
  });
});
