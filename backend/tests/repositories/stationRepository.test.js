const stationRepository = require('../../repositories/stationRepository');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('Station Repository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNearbyStations', () => {
    it('should return nearby stations', async () => {
      const mockStations = [
        { id: 1, name: 'Station 1', distance_meters: 500 },
        { id: 2, name: 'Station 2', distance_meters: 1000 },
      ];
      pool.query.mockResolvedValue({ rows: mockStations });

      const result = await stationRepository.getNearbyStations(10, 20, 3000);

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockStations);
      expect(pool.query.mock.calls[0][0]).toContain('ST_DWithin');
    });

    it('should filter by owner if provided', async () => {
      const mockStations = [{ id: 1, name: 'Station 1' }];
      pool.query.mockResolvedValue({ rows: mockStations });

      await stationRepository.getNearbyStations(10, 20, 3000, 'owner-123');

      expect(pool.query.mock.calls[0][0]).toContain('s.owner_id = $4');
      expect(pool.query.mock.calls[0][1]).toHaveLength(4);
      expect(pool.query.mock.calls[0][1][3]).toBe('owner-123');
    });
  });

  describe('getStationById', () => {
    it('should return a station by id', async () => {
      const mockStation = { id: 1, name: 'Station 1' };
      pool.query.mockResolvedValue({ rows: [mockStation] });

      const result = await stationRepository.getStationById(1);

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE s.id = $1'), [1]);
      expect(result).toEqual(mockStation);
    });

    it('should return undefined if station not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await stationRepository.getStationById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('addStation', () => {
    it('should add a new station', async () => {
      const newStation = {
        name: 'New Station',
        brand: 'Brand X',
        fuel_price: 1.5,
        services: ['Air'],
        address: '123 Main St',
        phone: '555-1234',
        operating_hours: '24/7',
        lat: 10,
        lng: 20,
      };
      const createdStation = { ...newStation, id: 1 };
      pool.query.mockResolvedValue({ rows: [createdStation] });

      const result = await stationRepository.addStation(newStation);

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO stations'), expect.any(Array));
      expect(result).toEqual(createdStation);
    });
  });

  describe('searchStations', () => {
    it('should search stations by query', async () => {
      const mockStations = [{ id: 1, name: 'Shell Station' }];
      pool.query.mockResolvedValue({ rows: mockStations });

      const result = await stationRepository.searchStations('Shell');

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('ILIKE $1'), ['%Shell%']);
      expect(result).toEqual(mockStations);
    });
  });
});
