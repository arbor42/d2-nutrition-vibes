import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dataService } from '@/services/dataService'

// Mock fetch
global.fetch = vi.fn()

describe('dataService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loadCountryData', () => {
    it('should load and validate country data', async () => {
      const mockData = [
        { iso3: 'DEU', name: 'Germany', region: 'Europe' },
        { iso3: 'USA', name: 'United States', region: 'Americas' }
      ]

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      const result = await dataService.loadCountryData()
      
      expect(result).toEqual(mockData)
      expect(fetch).toHaveBeenCalledWith('/data/countries.json')
    })

    it('should handle fetch errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(dataService.loadCountryData()).rejects.toThrow('Network error')
    })

    it('should handle invalid JSON response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON') }
      })

      await expect(dataService.loadCountryData()).rejects.toThrow('Invalid JSON')
    })
  })

  describe('loadFAOTimeseries', () => {
    it('should load and process timeseries data', async () => {
      const mockTimeseries = {
        data: [
          { year: 2020, value: 100, country: 'Germany' },
          { year: 2021, value: 105, country: 'Germany' },
          { year: 2022, value: 110, country: 'Germany' }
        ],
        metadata: {
          source: 'FAO',
          product: 'wheat',
          unit: 'tonnes'
        }
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTimeseries
      })

      const result = await dataService.loadFAOTimeseries('wheat', 'Germany')
      
      expect(result.data).toHaveLength(3)
      expect(result.metadata.product).toBe('wheat')
      expect(fetch).toHaveBeenCalledWith('/data/fao_data/timeseries/wheat_Germany.json')
    })

    it('should validate data structure', async () => {
      const invalidData = { wrong: 'format' }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidData
      })

      await expect(dataService.loadFAOTimeseries('wheat', 'Germany'))
        .rejects.toThrow('Invalid data structure')
    })
  })

  describe('loadGeoJsonData', () => {
    it('should load and validate GeoJSON', async () => {
      const mockGeoJson = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { NAME: 'Germany', ISO_A3: 'DEU' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[10, 50], [15, 50], [15, 55], [10, 55], [10, 50]]]
            }
          }
        ]
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeoJson
      })

      const result = await dataService.loadGeoJsonData()
      
      expect(result.type).toBe('FeatureCollection')
      expect(result.features).toHaveLength(1)
      expect(result.features[0].properties.NAME).toBe('Germany')
    })

    it('should validate GeoJSON structure', async () => {
      const invalidGeoJson = {
        type: 'Invalid',
        features: 'not an array'
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidGeoJson
      })

      await expect(dataService.loadGeoJsonData())
        .rejects.toThrow('Invalid GeoJSON structure')
    })
  })

  describe('processDataForVisualization', () => {
    it('should aggregate data by country', () => {
      const rawData = [
        { country: 'Germany', year: 2020, value: 100 },
        { country: 'Germany', year: 2021, value: 105 },
        { country: 'France', year: 2020, value: 80 },
        { country: 'France', year: 2021, value: 85 }
      ]

      const result = dataService.processDataForVisualization(rawData, 'byCountry')
      
      expect(result).toHaveProperty('Germany')
      expect(result).toHaveProperty('France')
      expect(result.Germany).toHaveLength(2)
      expect(result.France).toHaveLength(2)
    })

    it('should aggregate data by year', () => {
      const rawData = [
        { country: 'Germany', year: 2020, value: 100 },
        { country: 'France', year: 2020, value: 80 },
        { country: 'Germany', year: 2021, value: 105 },
        { country: 'France', year: 2021, value: 85 }
      ]

      const result = dataService.processDataForVisualization(rawData, 'byYear')
      
      expect(result).toHaveProperty('2020')
      expect(result).toHaveProperty('2021')
      expect(result['2020']).toHaveLength(2)
      expect(result['2021']).toHaveLength(2)
    })

    it('should calculate statistics', () => {
      const rawData = [
        { value: 100 },
        { value: 200 },
        { value: 150 },
        { value: 300 }
      ]

      const result = dataService.calculateStatistics(rawData, 'value')
      
      expect(result.mean).toBe(187.5)
      expect(result.median).toBe(175)
      expect(result.min).toBe(100)
      expect(result.max).toBe(300)
      expect(result.stdDev).toBeCloseTo(81.65, 1)
    })
  })

  describe('caching', () => {
    it('should cache API responses', async () => {
      const mockData = { test: 'data' }

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockData
      })

      // First call
      const result1 = await dataService.loadCountryData()
      
      // Second call should use cache
      const result2 = await dataService.loadCountryData()
      
      expect(result1).toEqual(result2)
      expect(fetch).toHaveBeenCalledTimes(1) // Only called once due to caching
    })

    it('should clear cache when requested', async () => {
      const mockData = { test: 'data' }

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockData
      })

      // First call
      await dataService.loadCountryData()
      
      // Clear cache
      dataService.clearCache()
      
      // Second call should make new request
      await dataService.loadCountryData()
      
      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('error handling', () => {
    it('should retry failed requests', async () => {
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })

      const result = await dataService.loadCountryData({ maxRetries: 3 })
      
      expect(result).toEqual({ success: true })
      expect(fetch).toHaveBeenCalledTimes(3)
    })

    it('should fail after max retries', async () => {
      fetch.mockRejectedValue(new Error('Persistent network error'))

      await expect(dataService.loadCountryData({ maxRetries: 2 }))
        .rejects.toThrow('Persistent network error')
        
      expect(fetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })
})