/**
 * Data Service for D2 Nutrition Vibes Vue.js Application
 * Handles loading and caching of FAO and geographic data with runtime validation
 */

import { 
  apiResponseSchema,
  faoTimeseriesSchema,
  geoJsonSchema,
  mlPredictionSchema,
  validateData,
  validateAsync
} from '@/schemas/validation'

class DataService {
  constructor() {
    this.cache = new Map()
    this.baseUrl = ''
    this.validationEnabled = true
  }

  /**
   * Generic data loading function with caching and validation
   */
  async loadData(url, cacheKey = null, schema = null, options = {}) {
    const key = cacheKey || url
    const { validateResponse = this.validationEnabled, throwOnValidationError = false } = options
    
    console.log(`🔄 DataService: Loading data from ${url} (cache key: ${key})`)
    
    if (this.cache.has(key)) {
      console.log(`📦 DataService: Cache hit for ${key}`)
      return this.cache.get(key)
    }

    try {
      console.log(`🌐 DataService: Fetching ${url}...`)
      const response = await fetch(url)
      console.log(`🌐 DataService: Response status: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      console.log(`📄 DataService: Parsing JSON...`)
      const data = await response.json()
      console.log(`✅ DataService: Data loaded successfully, size:`, Object.keys(data).length || data.length || 'unknown')
      
      // Runtime validation if schema is provided
      if (schema && validateResponse) {
        console.log(`🔍 DataService: Validating data with schema...`)
        const validation = await validateAsync(schema, data)
        if (!validation.success) {
          console.warn(`⚠️ DataService: Data validation failed for ${url}:`, validation.errors)
          
          if (throwOnValidationError) {
            throw new Error(`Data validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
          }
          
          // Add validation metadata to data
          data._validation = {
            valid: false,
            errors: validation.errors,
            timestamp: new Date().toISOString()
          }
        } else {
          data._validation = {
            valid: true,
            errors: null,
            timestamp: new Date().toISOString()
          }
        }
      }
      
      this.cache.set(key, data)
      return data
    } catch (error) {
      console.error(`Error loading data from ${url}:`, error)
      throw error
    }
  }

  /**
   * Validate cached data against schema
   */
  async validateCachedData(cacheKey, schema) {
    if (!this.cache.has(cacheKey)) {
      throw new Error(`No cached data found for key: ${cacheKey}`)
    }
    
    const data = this.cache.get(cacheKey)
    return await validateAsync(schema, data)
  }

  /**
   * Enable/disable validation
   */
  setValidationEnabled(enabled) {
    this.validationEnabled = enabled
  }

  /**
   * Load main data index
   */
  async loadDataIndex() {
    console.log('📂 DataService: loadDataIndex called')
    return this.loadData('/data/index.json', 'main-index')
  }

  /**
   * Load FAO data index
   */
  async loadFAOIndex() {
    return this.loadData('/data/fao/index.json', 'fao-index')
  }

  /**
   * Load FAO metadata
   */
  async loadFAOMetadata() {
    console.log('📊 DataService: loadFAOMetadata called')
    return this.loadData('/data/fao/metadata.json', 'fao-metadata')
  }

  /**
   * Load geographic data with GeoJSON validation
   */
  async loadGeoData(type = 'geo') {
    console.log(`🗺️ DataService: loadGeoData called with type: ${type}`)
    const geoFiles = {
      world: '/data/geo.json',
      world_simplified: '/data/geo.json',
      geo: '/data/geo.json'
    }
    
    const url = geoFiles[type] || geoFiles.geo
    console.log(`🗺️ DataService: Using URL: ${url}`)
    return this.loadData(url, `geo-${type}`, geoJsonSchema, { 
      throwOnValidationError: false 
    })
  }

  /**
   * Load production data for specific product and year
   */
  async loadProductionData(product, year) {
    console.log(`📊 DataService: loadProductionData called with product: ${product}, year: ${year}`)
    const filename = `${product}_production_${year}.json`
    const url = `/data/fao/geo/${filename}`
    console.log(`📊 DataService: Using production URL: ${url}`)
    return this.loadData(url, `production-${product}-${year}`)
  }

  /**
   * Load ML forecast data
   */
  async loadMLForecast(forecastKey) {
    const url = `/data/fao/ml/${forecastKey}.json`
    return this.loadData(url, `ml-${forecastKey}`)
  }

  /**
   * Load timeseries data with FAO schema validation
   */
  async loadTimeseriesData() {
    return this.loadData('/data/fao/timeseries.json', 'timeseries', faoTimeseriesSchema, {
      throwOnValidationError: false
    })
  }

  /**
   * Load production rankings
   */
  async loadProductionRankings() {
    return this.loadData('/data/fao/production_rankings.json', 'production-rankings')
  }

  /**
   * Load trade balance data
   */
  async loadTradeBalance() {
    return this.loadData('/data/fao/trade_balance.json', 'trade-balance')
  }

  /**
   * Load network analysis data
   */
  async loadNetworkData() {
    return this.loadData('/data/fao/network.json', 'network')
  }

  /**
   * Load summary statistics
   */
  async loadSummaryData() {
    return this.loadData('/data/fao/summary.json', 'summary')
  }

  /**
   * Load ML forecasts index
   */
  async loadMLIndex() {
    return this.loadData('/data/fao/ml/index.json', 'ml-index')
  }

  /**
   * Get available products from index
   */
  async getAvailableProducts() {
    const index = await this.loadDataIndex()
    return index.products || []
  }

  /**
   * Get available years from index
   */
  async getAvailableYears() {
    const index = await this.loadDataIndex()
    return index.years || []
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * Get cache stats for debugging
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Export singleton instance
export default new DataService()