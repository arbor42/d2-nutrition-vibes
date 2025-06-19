import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import dataService from '@/services/dataService'

export const useDataStore = defineStore('data', () => {
  // State
  const geoData = ref(null)
  const productionData = ref(new Map())
  const forecastData = ref(new Map())
  const timeseriesData = ref(null)
  const networkData = ref(null)
  const summaryData = ref(null)
  const dataIndex = ref(null)
  const faoMetadata = ref(null)
  
  // ML-specific state
  const mlIndex = ref(null)
  const mlComprehensiveIndex = ref(null)
  const mlGlobalIndex = ref(null)
  const mlRegionalIndex = ref(null)
  const mlCountryIndex = ref(null)
  
  // Enhanced state for Phase 5
  const selectedProduct = ref('maize_and_products')
  const selectedRegion = ref('global')
  const selectedYears = ref({ start: 2018, end: 2023 })
  const dataFilters = ref({
    countries: [],
    elements: [],
    items: []
  })
  const currentData = ref([])
  const dataCache = ref(new Map())
  const lastUpdated = ref(null)
  
  // Loading states
  const loading = ref(false)
  const loadingStates = ref(new Map())
  const errors = ref(new Map())

  // Enhanced computed properties for Phase 5
  const isLoading = computed(() => loading.value)
  const hasGeoData = computed(() => geoData.value !== null)
  const hasData = computed(() => {
    return Object.keys(productionData.value).length > 0 || currentData.value.length > 0
  })
  const isDataLoaded = computed(() => hasData.value)
  
  const filteredData = computed(() => {
    if (!currentData.value.length) return []
    
    return currentData.value.filter(item => {
      // Filter by selected years
      if (item.Year < selectedYears.value.start || item.Year > selectedYears.value.end) {
        return false
      }
      
      // Filter by selected countries
      if (dataFilters.value.countries.length > 0 && 
          !dataFilters.value.countries.includes(item.Area)) {
        return false
      }
      
      // Filter by selected elements
      if (dataFilters.value.elements.length > 0 && 
          !dataFilters.value.elements.includes(item.Element)) {
        return false
      }
      
      // Filter by selected items
      if (dataFilters.value.items.length > 0 && 
          !dataFilters.value.items.includes(item.Item)) {
        return false
      }
      
      return true
    })
  })

  const dataByProduct = computed(() => {
    const grouped = {}
    filteredData.value.forEach(item => {
      if (!grouped[item.Item]) {
        grouped[item.Item] = []
      }
      grouped[item.Item].push(item)
    })
    return grouped
  })

  const dataByRegion = computed(() => {
    const grouped = {}
    filteredData.value.forEach(item => {
      if (!grouped[item.Area]) {
        grouped[item.Area] = []
      }
      grouped[item.Area].push(item)
    })
    return grouped
  })

  const availableProducts = computed(() => {
    // First try to get products from timeseries data
    if (timeseriesData.value && Object.keys(timeseriesData.value).length > 0) {
      return Object.keys(timeseriesData.value).sort()
    }
    
    // Then try FAO metadata
    if (faoMetadata.value?.data_summary?.food_items) {
      return faoMetadata.value.data_summary.food_items.sort()
    }
    
    // Fallback to current data or index
    const indexProducts = dataIndex.value?.products || []
    const currentProducts = [...new Set(currentData.value.map(item => item.Item))].sort()
    return currentProducts.length > 0 ? currentProducts : indexProducts
  })
  
  const availableRegions = computed(() => {
    return [...new Set(currentData.value.map(item => item.Area))].sort()
  })
  
  const availableYears = computed(() => {
    const indexYears = dataIndex.value?.years || []
    const currentYears = [...new Set(currentData.value.map(item => item.Year))].sort()
    return currentYears.length > 0 ? currentYears : indexYears
  })

  const dataStats = computed(() => {
    if (!filteredData.value.length) return null
    
    const values = filteredData.value
      .map(item => parseFloat(item.Value))
      .filter(val => !isNaN(val))
    
    if (!values.length) return null
    
    const sum = values.reduce((acc, val) => acc + val, 0)
    const avg = sum / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    
    return {
      count: values.length,
      sum,
      average: avg,
      min,
      max,
      median: values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
    }
  })

  // Helper function to set loading state
  const setLoading = (key, isLoading) => {
    loadingStates.value.set(key, isLoading)
    loading.value = Array.from(loadingStates.value.values()).some(Boolean)
  }

  // Helper function to set error
  const setError = (key, error) => {
    errors.value.set(key, error)
    console.error(`Data store error for ${key}:`, error)
  }

  // Actions
  const loadDataIndex = async () => {
    const key = 'data-index'
    console.log('📂 DataStore: Starting loadDataIndex...')
    setLoading(key, true)
    try {
      console.log('📂 DataStore: Calling dataService.loadDataIndex()...')
      const data = await dataService.loadDataIndex()
      console.log('📂 DataStore: DataIndex response:', data)
      dataIndex.value = data
      errors.value.delete(key)
      return data
    } catch (error) {
      console.error('❌ DataStore: Error loading data index:', error)
      setError(key, error.message)
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const loadFAOMetadata = async () => {
    const key = 'fao-metadata'
    setLoading(key, true)
    try {
      const data = await dataService.loadFAOMetadata()
      faoMetadata.value = data
      errors.value.delete(key)
      return data
    } catch (error) {
      setError(key, error.message)
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const loadGeoData = async (type = 'geo') => {
    const key = `geo-${type}`
    console.log(`🗺️ DataStore: Starting loadGeoData with type: ${type}`)
    setLoading(key, true)
    try {
      console.log(`🗺️ DataStore: Calling dataService.loadGeoData(${type})...`)
      const data = await dataService.loadGeoData(type)
      console.log('🗺️ DataStore: GeoData response:', data ? 'Success' : 'No data')
      console.log('🗺️ DataStore: GeoData features count:', data?.features?.length || 'N/A')
      geoData.value = data
      errors.value.delete(key)
      return data
    } catch (error) {
      console.error(`❌ DataStore: Error loading geo data (${type}):`, error)
      setError(key, error.message)
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const loadProductionData = async (product, year) => {
    const key = `production-${product}-${year}`
    console.log(`📊 DataStore: Starting loadProductionData for ${product} (${year})`)
    setLoading(key, true)
    try {
      console.log(`📊 DataStore: Calling dataService.loadProductionData(${product}, ${year})...`)
      const data = await dataService.loadProductionData(product, year)
      console.log('📊 DataStore: ProductionData response:', data ? 'Success' : 'No data')
      console.log('📊 DataStore: ProductionData items count:', data?.data?.length || data?.length || 'N/A')
      productionData.value.set(key, data)
      errors.value.delete(key)
      return data
    } catch (error) {
      console.error(`❌ DataStore: Error loading production data (${product}, ${year}):`, error)
      setError(key, error.message)
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const loadForecastData = async (forecastKey) => {
    const key = `forecast-${forecastKey}`
    console.log(`🔮 DataStore: Starting loadForecastData for ${forecastKey}`)
    setLoading(key, true)
    try {
      console.log(`🔮 DataStore: Calling dataService.loadMLForecast(${forecastKey})...`)
      const data = await dataService.loadMLForecast(forecastKey)
      console.log('🔮 DataStore: ForecastData response:', data ? 'Success' : 'No data')
      forecastData.value.set(key, data)
      errors.value.delete(key)
      return data
    } catch (error) {
      console.error(`❌ DataStore: Error loading forecast data (${forecastKey}):`, error)
      setError(key, error.message)
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  // Alias for compatibility
  const loadMLForecast = loadForecastData

  const loadTimeseriesData = async () => {
    const key = 'timeseries'
    console.log('📊 DataStore: Starting loadTimeseriesData...')
    setLoading(key, true)
    try {
      const data = await dataService.loadTimeseriesData()
      console.log('📊 DataStore: Raw timeseries data:', Array.isArray(data) ? `Array with ${data.length} entries` : typeof data)
      
      // Transform array structure to nested object structure
      // Expected: { product: { country: [yearData] } }
      const transformedData = {}
      
      if (Array.isArray(data)) {
        data.forEach(entry => {
          const { item: product, country, data: yearData } = entry
          
          if (!transformedData[product]) {
            transformedData[product] = {}
          }
          
          transformedData[product][country] = yearData
        })
        
        console.log('📊 DataStore: Transformed timeseries data structure:', {
          products: Object.keys(transformedData).length,
          sampleProduct: Object.keys(transformedData)[0],
          sampleCountries: transformedData[Object.keys(transformedData)[0]] ? 
            Object.keys(transformedData[Object.keys(transformedData)[0]]).slice(0, 3) : []
        })
      }
      
      timeseriesData.value = transformedData
      errors.value.delete(key)
      return transformedData
    } catch (error) {
      console.error('❌ DataStore: Error loading timeseries data:', error)
      setError(key, error.message)
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const loadNetworkData = async () => {
    const key = 'network'
    setLoading(key, true)
    try {
      const data = await dataService.loadNetworkData()
      networkData.value = data
      errors.value.delete(key)
      return data
    } catch (error) {
      setError(key, error.message)
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const loadSummaryData = async () => {
    const key = 'summary'
    setLoading(key, true)
    try {
      const data = await dataService.loadSummaryData()
      summaryData.value = data
      errors.value.delete(key)
      return data
    } catch (error) {
      setError(key, error.message)
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  // ML-specific actions
  const loadMLIndex = async () => {
    const key = 'ml-index'
    setLoading(key, true)
    try {
      const data = await dataService.loadMLIndex()
      mlIndex.value = data
      errors.value.delete(key)
      return data
    } catch (error) {
      setError(key, error.message)
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const loadMLComprehensiveIndex = async () => {
    const key = 'ml-comprehensive-index'
    setLoading(key, true)
    try {
      const data = await dataService.loadMLComprehensiveIndex()
      mlComprehensiveIndex.value = data
      errors.value.delete(key)
      return data
    } catch (error) {
      setError(key, error.message)
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const loadMLGlobalIndex = async () => {
    const key = 'ml-global-index'
    setLoading(key, true)
    try {
      const data = await dataService.loadMLGlobalIndex()
      mlGlobalIndex.value = data
      errors.value.delete(key)
      return data
    } catch (error) {
      setError(key, error.message)
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const loadMLRegionalIndex = async () => {
    const key = 'ml-regional-index'
    setLoading(key, true)
    try {
      const data = await dataService.loadMLRegionalIndex()
      mlRegionalIndex.value = data
      errors.value.delete(key)
      return data
    } catch (error) {
      setError(key, error.message)
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const loadMLCountryIndex = async () => {
    const key = 'ml-country-index'
    setLoading(key, true)
    try {
      const data = await dataService.loadMLCountryIndex()
      mlCountryIndex.value = data
      errors.value.delete(key)
      return data
    } catch (error) {
      setError(key, error.message)
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  // Get available ML forecasts by type
  const getAvailableMLForecasts = (type = 'all') => {
    switch (type) {
      case 'global':
        return mlGlobalIndex.value?.forecasts || []
      case 'regional':
        return mlRegionalIndex.value?.forecasts || []
      case 'country':
        return mlCountryIndex.value?.forecasts || []
      case 'all':
      default:
        return mlComprehensiveIndex.value?.forecast_categories || {}
    }
  }

  // Initialize critical data
  const initializeApp = async () => {
    console.log('🚀 DataStore: Starting app initialization...')
    try {
      console.log('📂 DataStore: Loading data index...')
      const indexResult = await loadDataIndex()
      console.log('✅ DataStore: Data index loaded:', indexResult)
      
      console.log('📊 DataStore: Loading FAO metadata...')
      const metadataResult = await loadFAOMetadata()
      console.log('✅ DataStore: FAO metadata loaded:', metadataResult)
      
      console.log('🗺️ DataStore: Loading geo data...')
      const geoResult = await loadGeoData('geo')
      console.log('✅ DataStore: Geo data loaded:', geoResult)
      
      console.log('📈 DataStore: Loading timeseries data...')
      const timeseriesResult = await loadTimeseriesData()
      console.log('✅ DataStore: Timeseries data loaded:', timeseriesResult ? 'Success' : 'Failed')
      
      console.log('🎉 DataStore: App initialization completed successfully!')
    } catch (error) {
      console.error('❌ DataStore: Failed to initialize app data:', error)
      console.error('❌ DataStore: Error details:', error.stack)
    }
  }

  // Get production data from cache
  const getProductionData = (product, year) => {
    const key = `production-${product}-${year}`
    return productionData.value.get(key)
  }

  // Get forecast data from cache
  const getForecastData = (forecastKey) => {
    const key = `forecast-${forecastKey}`
    return forecastData.value.get(key)
  }

  // Clear cache
  const clearCache = () => {
    productionData.value.clear()
    forecastData.value.clear()
    errors.value.clear()
    loadingStates.value.clear()
    dataService.clearCache()
  }

  // Get error for specific key
  const getError = (key) => {
    return errors.value.get(key)
  }

  // Enhanced actions for Phase 5
  const setSelectedProduct = (product) => {
    selectedProduct.value = product
  }

  const setSelectedRegion = (region) => {
    selectedRegion.value = region
  }

  const setSelectedYears = (years) => {
    selectedYears.value = { ...years }
  }

  const setDataFilters = (filters) => {
    dataFilters.value = { ...filters }
  }

  const addCountryFilter = (country) => {
    if (!dataFilters.value.countries.includes(country)) {
      dataFilters.value.countries.push(country)
    }
  }

  const removeCountryFilter = (country) => {
    const index = dataFilters.value.countries.indexOf(country)
    if (index > -1) {
      dataFilters.value.countries.splice(index, 1)
    }
  }

  const clearFilters = () => {
    dataFilters.value = {
      countries: [],
      elements: [],
      items: []
    }
  }

  const transformDataForVisualization = (type = 'timeseries') => {
    if (!filteredData.value.length) return []
    
    switch (type) {
      case 'timeseries':
        return filteredData.value.map(item => ({
          date: new Date(item.Year, 0, 1),
          value: parseFloat(item.Value) || 0,
          year: item.Year,
          country: item.Area,
          product: item.Item,
          element: item.Element
        }))
      
      case 'geographic':
        return filteredData.value.reduce((acc, item) => {
          const country = item.Area
          if (!acc[country]) {
            acc[country] = {
              country,
              total: 0,
              items: []
            }
          }
          acc[country].total += parseFloat(item.Value) || 0
          acc[country].items.push(item)
          return acc
        }, {})
      
      case 'comparative':
        return availableProducts.value.map(product => {
          const productData = dataByProduct.value[product] || []
          const total = productData.reduce((sum, item) => sum + (parseFloat(item.Value) || 0), 0)
          return {
            product,
            value: total,
            count: productData.length
          }
        })
      
      default:
        return filteredData.value
    }
  }

  const getDataForProduct = (product) => {
    return dataByProduct.value[product] || []
  }

  const getDataForRegion = (region) => {
    return dataByRegion.value[region] || []
  }

  const getTrendData = (product, region = null) => {
    let data = getDataForProduct(product)
    
    if (region) {
      data = data.filter(item => item.Area === region)
    }
    
    return data
      .sort((a, b) => a.Year - b.Year)
      .map(item => ({
        year: item.Year,
        value: parseFloat(item.Value) || 0
      }))
  }

  // Get data for a specific product from timeseries
  const getTimeseriesDataForProduct = (product, year = null) => {
    if (!timeseriesData.value || !timeseriesData.value[product]) {
      return null
    }
    
    const productData = timeseriesData.value[product]
    
    if (year) {
      // Return data for specific year across all countries
      const yearData = {}
      Object.entries(productData).forEach(([country, countryData]) => {
        const yearEntry = countryData.find(entry => entry.year === year)
        if (yearEntry) {
          yearData[country] = yearEntry
        }
      })
      return yearData
    }
    
    return productData
  }

  // Get available countries for a specific product
  const getAvailableCountriesForProduct = (product) => {
    if (!timeseriesData.value || !timeseriesData.value[product]) {
      return []
    }
    
    return Object.keys(timeseriesData.value[product]).sort()
  }

  // Get available years for a specific product
  const getAvailableYearsForProduct = (product) => {
    if (!timeseriesData.value || !timeseriesData.value[product]) {
      return []
    }
    
    const yearsSet = new Set()
    Object.values(timeseriesData.value[product]).forEach(countryData => {
      countryData.forEach(entry => yearsSet.add(entry.year))
    })
    
    return Array.from(yearsSet).sort((a, b) => a - b)
  }

  const syncCurrentData = (data) => {
    currentData.value = data
    lastUpdated.value = new Date()
  }

  // Check if specific data is loading
  const isLoadingData = (key) => {
    return loadingStates.value.get(key) || false
  }

  // Watchers for reactive updates
  watch([selectedProduct, selectedRegion], () => {
    if (isDataLoaded.value) {
      // Trigger data refresh when selection changes
      console.log('Selection changed, refreshing data')
    }
  })

  return {
    // State
    geoData,
    productionData,
    forecastData,
    timeseriesData,
    networkData,
    summaryData,
    dataIndex,
    faoMetadata,
    loading,
    errors,
    
    // ML state
    mlIndex,
    mlComprehensiveIndex,
    mlGlobalIndex,
    mlRegionalIndex,
    mlCountryIndex,
    
    // Enhanced state
    selectedProduct,
    selectedRegion,
    selectedYears,
    dataFilters,
    currentData,
    lastUpdated,

    // Computed
    isLoading,
    hasGeoData,
    hasData,
    isDataLoaded,
    filteredData,
    dataByProduct,
    dataByRegion,
    availableProducts,
    availableRegions,
    availableYears,
    dataStats,

    // Actions
    loadDataIndex,
    loadFAOMetadata,
    loadGeoData,
    loadProductionData,
    loadForecastData,
    loadMLForecast,
    loadTimeseriesData,
    loadNetworkData,
    loadSummaryData,
    initializeApp,
    getProductionData,
    getForecastData,
    clearCache,
    getError,
    isLoadingData,
    
    // ML actions
    loadMLIndex,
    loadMLComprehensiveIndex,
    loadMLGlobalIndex,
    loadMLRegionalIndex,
    loadMLCountryIndex,
    getAvailableMLForecasts,
    
    // Enhanced actions
    setSelectedProduct,
    setSelectedRegion,
    setSelectedYears,
    setDataFilters,
    addCountryFilter,
    removeCountryFilter,
    clearFilters,
    transformDataForVisualization,
    getDataForProduct,
    getDataForRegion,
    getTrendData,
    getTimeseriesDataForProduct,
    getAvailableCountriesForProduct,
    getAvailableYearsForProduct,
    syncCurrentData
  }
})