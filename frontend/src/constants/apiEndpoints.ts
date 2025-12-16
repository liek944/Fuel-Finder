export const apiEndpoints = {
  stations: {
    nearby: (lat: number, lng: number, radiusMeters: number) =>
      `/api/stations/nearby?lat=${lat}&lng=${lng}&radiusMeters=${radiusMeters}`,
    byId: (id: number) => `/api/stations/${id}`,
    averagePrice: (id: number) => `/api/stations/${id}/average-price`,
  },
  pois: {
    nearby: (lat: number, lng: number, radiusMeters: number) =>
      `/api/pois/nearby?lat=${lat}&lng=${lng}&radiusMeters=${radiusMeters}`,
    byId: (id: number) => `/api/pois/${id}`,
  },
  routing: {
    route: (startLat: number, startLng: number, endLat: number, endLng: number) =>
      `/api/route?start=${startLat},${startLng}&end=${endLat},${endLng}`,
  },
  donations: {
    stats: () => `/api/donations/stats`,
    recent: (limit = 5) => `/api/donations/recent?limit=${limit}`,
    create: () => `/api/donations/create`,
  },
  reviews: {
    summary: (targetType: 'station' | 'poi', targetId: number) =>
      `/api/reviews/summary?targetType=${targetType}&targetId=${targetId}`,
    list: (targetType: 'station' | 'poi', targetId: number, pageSize = 10) =>
      `/api/reviews?targetType=${targetType}&targetId=${targetId}&pageSize=${pageSize}&sortBy=created_at&sortOrder=DESC`,
    create: () => `/api/reviews`,
  },
  user: {
    heartbeat: () => `/api/user/heartbeat`,
    count: () => `/api/user/count`,
  },
  owner: {
    info: () => `/api/owner/info`,
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
  admin: {
    reviews: () => `/api/admin/reviews`,
    reviewById: (reviewId: number) => `/api/admin/reviews/${reviewId}`,
    usersStats: () => `/api/admin/users/stats`,
    usersActive: () => `/api/admin/users/active`,
  },
};
