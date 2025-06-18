import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDataStore } from '@/stores/useDataStore'

// Mock fetch
global.fetch = vi.fn()

describe('useDataStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const store = useDataStore()
    
    expect(store.countries).toEqual([])
    expect(store.selectedCountry).toBe('World')
    expect(store.isLoading).toBe(false)
    expect(store.error).toBe(null)
  })

  it('should load countries data successfully', async () => {
    const mockCountries = [
      { id: 'DEU', name: 'Germany' },
      { id: 'FRA', name: 'France' },
    ]
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCountries,
    })
    
    const store = useDataStore()
    await store.loadCountries()
    
    expect(store.countries).toEqual(mockCountries)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBe(null)
  })

  it('should handle loading states correctly', async () => {
    const store = useDataStore()
    
    // Mock a delayed response
    fetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => [],
      }), 100))
    )
    
    const loadPromise = store.loadCountries()
    
    // Should be loading immediately
    expect(store.isLoading).toBe(true)
    
    await loadPromise
    
    // Should not be loading after completion
    expect(store.isLoading).toBe(false)
  })

  it('should handle API errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))
    
    const store = useDataStore()
    await store.loadCountries()
    
    expect(store.error).toContain('Network error')
    expect(store.isLoading).toBe(false)
    expect(store.countries).toEqual([])
  })

  it('should filter countries correctly', () => {
    const store = useDataStore()
    store.countries = [
      { id: 'DEU', name: 'Germany' },
      { id: 'FRA', name: 'France' },
      { id: 'ITA', name: 'Italy' },
    ]
    
    const filtered = store.filteredCountries('Ger')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('Germany')
  })

  it('should load FAO data by key', async () => {
    const mockData = { 
      data: [{ year: 2020, value: 100 }],
      metadata: { source: 'FAO' }
    }
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    })
    
    const store = useDataStore()
    const result = await store.loadFAOData('wheat_production')
    
    expect(result).toEqual(mockData)
    expect(fetch).toHaveBeenCalledWith('/data/fao_data/wheat_production.json')
  })

  it('should load ML forecast data', async () => {
    const mockForecast = {
      predictions: [
        { year: 2024, value: 105 },
        { year: 2025, value: 110 },
      ],
      model: 'LSTM'
    }
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockForecast,
    })
    
    const store = useDataStore()
    const result = await store.loadMLForecast('global_wheat_forecast')
    
    expect(result).toEqual(mockForecast)
    expect(fetch).toHaveBeenCalledWith('/data/fao_data/ml/global_wheat_forecast.json')
  })

  it('should load GeoJSON data', async () => {
    const mockGeoData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { NAME: 'Germany' },
          geometry: { type: 'Polygon', coordinates: [] }
        }
      ]
    }
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGeoData,
    })
    
    const store = useDataStore()
    const result = await store.loadGeoData()
    
    expect(result).toEqual(mockGeoData)
    expect(fetch).toHaveBeenCalledWith('/data/geo/world.geojson')
  })

  it('should update selected country', () => {
    const store = useDataStore()
    
    store.setSelectedCountry('Germany')
    expect(store.selectedCountry).toBe('Germany')
  })

  it('should clear error state', () => {
    const store = useDataStore()
    store.error = 'Some error'
    
    store.clearError()
    expect(store.error).toBe(null)
  })

  it('should get available products', () => {
    const store = useDataStore()
    const products = store.availableProducts
    
    expect(Array.isArray(products)).toBe(true)
    expect(products.length).toBeGreaterThan(0)
    expect(products[0]).toHaveProperty('value')
    expect(products[0]).toHaveProperty('label')
  })
})