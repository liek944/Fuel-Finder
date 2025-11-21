const poiService = require('../../services/poiService');
const poiRepository = require('../../repositories/poiRepository');

// Mock dependencies
jest.mock('../../repositories/poiRepository');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('POI Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPois', () => {
    it('should return transformed POIs', async () => {
      const mockPois = [
        { id: 1, name: 'Restroom', type: 'restroom', lat: 10, lng: 20 },
      ];
      poiRepository.getAllPois.mockResolvedValue(mockPois);

      const result = await poiService.getAllPois();

      expect(poiRepository.getAllPois).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('name', 'Restroom');
    });
  });

  describe('createPoi', () => {
    it('should create and return a new POI', async () => {
      const poiData = {
        name: 'New POI',
        type: 'shop',
        location: { lat: 10, lng: 20 },
        address: '123 St',
      };
      const createdPoi = { ...poiData, id: 5, lat: 10, lng: 20 };

      poiRepository.addPoi.mockResolvedValue(createdPoi);

      const result = await poiService.createPoi(poiData);

      expect(poiRepository.addPoi).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New POI',
        lat: 10,
        lng: 20,
      }));
      expect(result).toHaveProperty('id', 5);
    });
  });

  describe('deletePoi', () => {
    it('should delete existing POI', async () => {
      poiRepository.getPoiById.mockResolvedValue({ id: 1, name: 'To Delete' });
      poiRepository.deletePoi.mockResolvedValue(true);

      const result = await poiService.deletePoi(1);

      expect(poiRepository.deletePoi).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty('name', 'To Delete');
    });

    it('should return null if POI not found', async () => {
      poiRepository.getPoiById.mockResolvedValue(null);
      const result = await poiService.deletePoi(999);
      expect(result).toBeNull();
      expect(poiRepository.deletePoi).not.toHaveBeenCalled();
    });
  });
});
