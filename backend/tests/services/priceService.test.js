const priceService = require('../../services/priceService');
const priceRepository = require('../../repositories/priceRepository');
const stationRepository = require('../../repositories/stationRepository');
const { pool } = require('../../config/database');

// Mock dependencies
jest.mock('../../repositories/priceRepository');
jest.mock('../../repositories/stationRepository');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));
jest.mock('../../config/database', () => ({
  pool: {
    connect: jest.fn(),
  },
}));

describe('Price Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitPriceReport', () => {
    it('should submit a price report if station exists', async () => {
      const stationId = 1;
      const reportData = { fuel_type: 'Diesel', price: 50, notes: 'Cheap' };
      const reporterIp = '127.0.0.1';

      stationRepository.getStationById.mockResolvedValue({ id: stationId });
      priceRepository.submitPriceReport.mockResolvedValue({
        id: 101,
        station_id: stationId,
        fuel_type: 'Diesel',
        price: 50,
        created_at: new Date(),
      });

      const result = await priceService.submitPriceReport(stationId, reportData, reporterIp);

      expect(stationRepository.getStationById).toHaveBeenCalledWith(stationId);
      expect(priceRepository.submitPriceReport).toHaveBeenCalledWith(expect.objectContaining({
        station_id: stationId,
        fuel_type: 'Diesel',
        price: 50,
        reporter_contact: reporterIp,
      }));
      expect(result).toHaveProperty('id', 101);
    });

    it('should return null if station does not exist', async () => {
      stationRepository.getStationById.mockResolvedValue(null);
      const result = await priceService.submitPriceReport(999, {}, '1.1.1.1');
      expect(result).toBeNull();
      expect(priceRepository.submitPriceReport).not.toHaveBeenCalled();
    });
  });

  describe('verifyPriceReport', () => {
    it('should verify a price report and update station price', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);

      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // Mock finding the report
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1, station_id: 10, fuel_type: 'Diesel', price: 55, station_name: 'Test Station' }],
      });
      // Mock update report
      mockClient.query.mockResolvedValueOnce({});
      // Mock insert/update fuel price
      mockClient.query.mockResolvedValueOnce({});
      // Mock commit
      mockClient.query.mockResolvedValueOnce({});

      const result = await priceService.verifyPriceReport(1, 'Admin', 1, 'Verified');

      expect(pool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toHaveProperty('report_id', 1);
    });

    it('should rollback on error', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);

      mockClient.query.mockRejectedValueOnce(new Error('DB Error'));

      await expect(priceService.verifyPriceReport(1, 'Admin', 1)).rejects.toThrow('DB Error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
