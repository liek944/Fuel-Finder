import { renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { useAdminStations } from "../admin/useAdminStations";
import { apiGet } from "../../utils/api";

// Mock the apiGet function
vi.mock("../../utils/api", () => ({
  apiGet: vi.fn(),
}));

describe("useAdminStations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch stations successfully", async () => {
    const mockStations = [{ id: 1, name: "Station 1" }];
    (apiGet as any).mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockStations),
    });

    const { result } = renderHook(() => useAdminStations());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stations).toEqual(mockStations);
    expect(result.current.error).toBeNull();
  });

  it("should handle fetch error", async () => {
    (apiGet as any).mockRejectedValue(new Error("Fetch failed"));

    const { result } = renderHook(() => useAdminStations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stations).toEqual([]);
    expect(result.current.error).toBe("Fetch failed");
  });
});
