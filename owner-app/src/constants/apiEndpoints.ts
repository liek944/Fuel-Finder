export const apiEndpoints = {
  owner: {
    // Public
    domains: () => `/api/owner/domains`,
    info: () => `/api/owner/info`,
    // Auth
    requestMagicLink: () => `/api/owner/auth/request-link`,
    verifyMagicLink: (token: string) => `/api/owner/auth/verify/${token}`,
    magicLinkStatus: (sessionToken: string) => `/api/owner/auth/status/${sessionToken}`,
    // Dashboard
    dashboard: () => `/api/owner/dashboard`,
    stations: () => `/api/owner/stations`,
    pendingReports: () => `/api/owner/price-reports/pending`,
    verifyReport: (reportId: number) => `/api/owner/price-reports/${reportId}/verify`,
    rejectReport: (reportId: number) => `/api/owner/price-reports/${reportId}/reject`,
    reviews: () => `/api/owner/reviews`,
    updateReview: (reviewId: number) => `/api/owner/reviews/${reviewId}`,
    marketInsights: () => `/api/owner/market-insights`,
    updateStation: (stationId: number) => `/api/owner/stations/${stationId}`,
    updateFuelPrice: (stationId: number) => `/api/owner/stations/${stationId}/fuel-price`,
    deleteFuelPrice: (stationId: number, fuelType: string) =>
      `/api/owner/stations/${stationId}/fuel-price/${encodeURIComponent(fuelType)}`,
  },
};
