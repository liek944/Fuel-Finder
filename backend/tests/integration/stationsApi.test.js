const request = require('supertest');
const app = require('../../app');
const stationRepository = require('../../repositories/stationRepository');
const priceRepository = require('../../repositories/priceRepository');

// Mock repositories
jest.mock('../../repositories/stationRepository');
jest.mock('../../repositories/priceRepository');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('Stations API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/stations/nearby', () => {
    it('should return nearby stations', async () => {
      const mockStations = [
        { id: 1, name: 'Test Station', lat: 10, lng: 20, distance: 500 }
      ];
      stationRepository.getNearbyStations.mockResolvedValue(mockStations);

      const res = await request(app)
        .get('/api/stations/nearby')
        .query({ lat: 10, lng: 20, radius: 1000 });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty('name', 'Test Station');
    });

    it('should handle errors gracefully', async () => {
      stationRepository.getNearbyStations.mockRejectedValue(new Error('DB Error'));

      const res = await request(app)
        .get('/api/stations/nearby')
        .query({ lat: 10, lng: 20 });

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/stations/:id/report-price', () => {
    it('should submit a price report', async () => {
      // Mock station existence check
      stationRepository.getStationById.mockResolvedValue({ id: 1, name: 'Station 1' });

      // Mock price submission
      priceRepository.submitPriceReport.mockResolvedValue({
        id: 101,
        station_id: 1,
        fuel_type: 'Diesel',
        price: 50,
        created_at: new Date()
      });

      const res = await request(app)
        .post('/api/stations/1/report-price')
        .send({ fuel_type: 'Diesel', price: 50, notes: 'Test' });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.report).toHaveProperty('id', 101);
    });
  });
});
