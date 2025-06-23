/**
 * Enhanced Vue.js composable for optimized data loading with Phase 5 improvements
 * Provides reactive data loading with caching, error handling, retry logic, and store integration
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'
import dataService from '@/services/dataService'

export function useDataLoader(options = {}) {
  const {
    initialLoad = true,
    cache = true,
    retryAttempts = 3,
    retryDelay = 1000,
    timeout = 30000,
    autoRefresh = false,
    refreshInterval = 300000 // 5 minutes
  } = options

  const dataStore = useDataStore()
  const uiStore = useUIStore()

  // Enhanced reactive state
  const loading = ref(false)
  const error = ref(null)
  const data = ref(null)
  const loadingProgress = ref(0)
  const cache_storage = ref(new Map())
  const cache_timestamps = ref(new Map())
  const currentRequest = ref(null)
  const retryCount = ref(0)
  const lastLoadTime = ref(null)

  // Computed loading state
  const isLoading = computed(() => loading.value)
  const hasError = computed(() => error.value !== null)
  const hasData = computed(() => data.value !== null)
  const canRetry = computed(() => hasError.value && retryCount.value < retryAttempts)
  const cacheSize = computed(() => cache_storage.value.size)

  /**
   * Generic async data loader with caching
   */
  const loadData = async (loadFn, cacheKey = null, options = {}) => {
    const {
      useCache = true,
      timeout = 30000,
      retries = 3
    } = options

    // Check cache first
    if (useCache && cacheKey && cache.value.has(cacheKey)) {
      return cache.value.get(cacheKey)
    }

    loading.value = true
    error.value = null

    let attempt = 0
    while (attempt < retries) {
      try {
        // Set timeout for the request
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        })

        const dataPromise = loadFn()
        const data = await Promise.race([dataPromise, timeoutPromise])

        // Cache the result
        if (useCache && cacheKey) {
          cache.value.set(cacheKey, data)
        }

        loading.value = false
        return data

      } catch (err) {
        attempt++
        if (attempt >= retries) {
          error.value = err.message || 'Failed to load data'
          loading.value = false
          throw err
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  /**
   * Load geographic data with optimization
   */
  const loadGeoData = async (type = 'world_simplified', options = {}) => {
    return loadData(
      () => dataService.loadGeoData(type),
      `geo-${type}`,
      options
    )
  }

  /**
   * Load production data with batching
   */
  const loadProductionData = async (product, year, options = {}) => {
    return loadData(
      () => dataService.loadProductionData(product, year),
      `production-${product}-${year}`,
      options
    )
  }

  /**
   * Load multiple years of production data efficiently
   */
  const loadProductionDataRange = async (product, years, options = {}) => {
    const { batchSize = 3 } = options
    const results = new Map()
    
    // Process in batches to avoid overwhelming the server
    for (let i = 0; i < years.length; i += batchSize) {
      const batch = years.slice(i, i + batchSize)
      const batchPromises = batch.map(year => 
        loadProductionData(product, year, options)
          .then(data => ({ year, data }))
          .catch(err => ({ year, error: err }))
      )
      
      const batchResults = await Promise.all(batchPromises)
      batchResults.forEach(({ year, data, error }) => {
        if (error) {
          console.warn(`Failed to load data for ${product} ${year}:`, error)
        } else {
          results.set(year, data)
        }
      })
    }
    
    return results
  }

  /**
   * Preload critical data for faster initial render
   */
  const preloadCriticalData = async () => {
    const criticalData = [
      { fn: () => dataService.loadDataIndex(), key: 'main-index' },
      { fn: () => dataService.loadGeoData('world_simplified'), key: 'geo-simplified' },
      { fn: () => dataService.loadFAOMetadata(), key: 'fao-metadata' }
    ]

    const promises = criticalData.map(({ fn, key }) => 
      loadData(fn, key, { retries: 2, timeout: 15000 })
        .catch(err => {
          console.warn(`Failed to preload ${key}:`, err)
          return null
        })
    )

    await Promise.all(promises)
  }

  /**
   * Smart cache management
   */
  const manageCache = () => {
    const maxCacheSize = 50
    const maxAge = 5 * 60 * 1000 // 5 minutes

    // Clean up old entries
    const now = Date.now()
    for (const [key, value] of cache.value.entries()) {
      if (value.timestamp && (now - value.timestamp) > maxAge) {
        cache.value.delete(key)
      }
    }

    // Limit cache size
    if (cache.value.size > maxCacheSize) {
      const keys = Array.from(cache.value.keys())
      const toDelete = keys.slice(0, keys.length - maxCacheSize)
      toDelete.forEach(key => cache.value.delete(key))
    }
  }

  /**
   * Progressive data loading for large datasets
   */
  const loadProgressively = async (loadFunctions, onProgress = null) => {
    const results = []
    const total = loadFunctions.length
    
    for (let i = 0; i < loadFunctions.length; i++) {
      try {
        const result = await loadFunctions[i]()
        results.push(result)
        
        if (onProgress) {
          onProgress({
            completed: i + 1,
            total,
            percentage: Math.round(((i + 1) / total) * 100),
            current: result
          })
        }
      } catch (err) {
        console.warn(`Progressive loading failed at step ${i + 1}:`, err)
        results.push(null)
      }
    }
    
    return results
  }

  /**
   * Load process mining results from the generated data
   */
  const loadProcessMiningResults = async () => {
    try {
      const response = await fetch('/data/fao_data/process_mining_results.json')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      
      // Validate and transform the data structure
      return {
        ...data,
        process_flows: data.process_flows || [],
        process_statistics: data.process_statistics || {},
        conformance_analysis: data.conformance_analysis || {},
        enhancement_opportunities: data.enhancement_opportunities || [],
        network_analysis: data.network_analysis || { nodes: [], links: [] }
      }
    } catch (err) {
      throw new Error(`Failed to load process mining results: ${err.message}`)
    }
  }

  /**
   * Load process flows with optional filtering
   */
  const loadProcessFlows = async (filters = {}) => {
    const data = await loadProcessMiningResults()
    let flows = data.process_flows || []
    
    // Apply filters
    if (filters.processType) {
      flows = flows.filter(flow => 
        flow.process_id.toLowerCase().includes(filters.processType.toLowerCase())
      )
    }
    
    if (filters.minValue) {
      flows = flows.filter(flow => flow.total_value >= filters.minValue)
    }
    
    if (filters.country) {
      flows = flows.filter(flow => 
        flow.process_id.includes(filters.country)
      )
    }
    
    return {
      flows,
      total: flows.length,
      filtered: flows.length !== data.process_flows.length
    }
  }

  /**
   * Load conformance checking data
   */
  const loadConformanceData = async (referenceModel = 'iso_standard') => {
    const data = await loadProcessMiningResults()
    
    // In a real implementation, this would perform conformance checking
    // against the specified reference model
    return {
      referenceModel,
      ...data.conformance_analysis,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Load process enhancement opportunities
   */
  const loadEnhancementData = async (optimizationType = 'loss_reduction') => {
    const data = await loadProcessMiningResults()
    let opportunities = data.enhancement_opportunities || []
    
    // Filter by optimization type
    if (optimizationType !== 'all') {
      opportunities = opportunities.filter(opp => 
        opp.type.toLowerCase().includes(optimizationType.toLowerCase().replace('_', ' '))
      )
    }
    
    return {
      optimizationType,
      opportunities,
      total: opportunities.length
    }
  }

  /**
   * Load process network data
   */
  const loadProcessNetworkData = async () => {
    try {
      const response = await fetch('/data/fao_data/process_network.json')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      
      return {
        nodes: data.nodes || [],
        links: data.links || [],
        metadata: {
          nodeCount: data.nodes?.length || 0,
          linkCount: data.links?.length || 0,
          lastUpdated: new Date().toISOString()
        }
      }
    } catch (err) {
      throw new Error(`Failed to load process network data: ${err.message}`)
    }
  }

  /**
   * Export process mining results to various formats
   */
  const exportProcessMiningData = async (format = 'json', filters = {}) => {
    const data = await loadProcessFlows(filters)
    
    let exportData
    let mimeType
    let filename
    
    switch (format.toLowerCase()) {
      case 'json':
        exportData = JSON.stringify(data, null, 2)
        mimeType = 'application/json'
        filename = `process-mining-${new Date().toISOString().split('T')[0]}.json`
        break
        
      case 'csv':
        // Convert process flows to CSV format
        const csvRows = []
        csvRows.push(['Process ID', 'Trace ID', 'Activity Name', 'Stage', 'Value', 'Unit', 'Timestamp'])
        
        data.flows.forEach(flow => {
          flow.activities.forEach(activity => {
            csvRows.push([
              flow.process_id,
              flow.trace_id,
              activity.name,
              activity.stage,
              activity.value,
              activity.unit,
              activity.timestamp
            ])
          })
        })
        
        exportData = csvRows.map(row => row.join(',')).join('\n')
        mimeType = 'text/csv'
        filename = `process-mining-${new Date().toISOString().split('T')[0]}.csv`
        break
        
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
    
    // Create and trigger download
    const blob = new Blob([exportData], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    return { filename, size: blob.size }
  }

  /**
   * Clear cache and reset state
   */
  const reset = () => {
    cache.value.clear()
    error.value = null
    loading.value = false
  }

  /**
   * Get cache statistics
   */
  const getCacheStats = () => {
    return {
      size: cache.value.size,
      keys: Array.from(cache.value.keys()),
      memoryUsage: JSON.stringify(Array.from(cache.value.values())).length
    }
  }

  // Periodic cache cleanup
  const cleanupInterval = setInterval(manageCache, 2 * 60 * 1000) // Every 2 minutes

  // Cleanup on unmount
  const cleanup = () => {
    clearInterval(cleanupInterval)
    cache.value.clear()
  }

  // Enhanced cache management with TTL
  const cache_ttl = 5 * 60 * 1000 // 5 minutes
  
  const isCacheValid = (key) => {
    if (!cache_storage.value.has(key)) return false
    const timestamp = cache_timestamps.value.get(key)
    return Date.now() - timestamp < cache_ttl
  }
  
  const setCache = (key, value) => {
    if (cache) {
      cache_storage.value.set(key, value)
      cache_timestamps.value.set(key, Date.now())
    }
  }
  
  const getCache = (key) => {
    return cache && isCacheValid(key) ? cache_storage.value.get(key) : null
  }
  
  const clearCache = (key = null) => {
    if (key) {
      cache_storage.value.delete(key)
      cache_timestamps.value.delete(key)
    } else {
      cache_storage.value.clear()
      cache_timestamps.value.clear()
    }
  }

  // Enhanced data loading with store integration
  const loadWithStoreIntegration = async (endpoint, params = {}, options = {}) => {
    const {
      useCache = cache,
      silent = false,
      updateStore = true
    } = options

    const cacheKey = `${endpoint}_${JSON.stringify(params)}`
    
    // Check cache first
    if (useCache) {
      const cachedData = getCache(cacheKey)
      if (cachedData) {
        data.value = cachedData
        if (updateStore) {
          dataStore.syncCurrentData(cachedData)
        }
        return cachedData
      }
    }

    // Start loading
    if (!silent) {
      loading.value = true
      loadingProgress.value = 0
      uiStore.setGlobalLoading(true)
    }
    error.value = null
    retryCount.value = 0

    try {
      const result = await executeLoadWithRetry(endpoint, params)
      
      data.value = result
      lastLoadTime.value = Date.now()
      
      if (useCache) {
        setCache(cacheKey, result)
      }
      
      if (updateStore) {
        dataStore.syncCurrentData(result)
      }
      
      return result
    } catch (err) {
      error.value = err.message || 'Failed to load data'
      uiStore.addNotification({
        type: 'error',
        title: 'Data Loading Error',
        message: err.message,
        duration: 5000
      })
      throw err
    } finally {
      loading.value = false
      loadingProgress.value = 100
      uiStore.setGlobalLoading(false)
      currentRequest.value = null
    }
  }

  const executeLoadWithRetry = async (endpoint, params) => {
    let attempt = 0
    
    while (attempt < retryAttempts) {
      try {
        return await executeLoad(endpoint, params)
      } catch (err) {
        attempt++
        retryCount.value = attempt
        
        if (attempt >= retryAttempts) {
          throw err
        }
        
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  const executeLoad = async (endpoint, params) => {
    const controller = new AbortController()
    currentRequest.value = controller

    const timeoutId = setTimeout(() => {
      controller.abort()
    }, timeout)

    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        if (loadingProgress.value < 90) {
          loadingProgress.value += Math.random() * 10
        }
      }, 100)

      let result
      
      // Route to appropriate service method
      switch (endpoint) {
        case 'production':
          result = await dataService.loadProductionData(params.product, params.year)
          break
        case 'geo':
          result = await dataService.loadGeoData(params.type)
          break
        case 'fao':
          // Handle different FAO dataset types
          switch (params.dataset) {
            case 'timeseries':
              result = await dataService.loadTimeseriesData()
              break
            case 'metadata':
              result = await dataService.loadFAOMetadata()
              break
            case 'index':
              result = await dataService.loadFAOIndex()
              break
            case 'summary':
              result = await dataService.loadSummaryData()
              break
            case 'network':
              result = await dataService.loadNetworkData()
              break
            default:
              throw new Error(`Unknown FAO dataset type: ${params.dataset}`)
          }
          break
        case 'timeseries':
          result = await dataService.loadTimeseriesData()
          break
        case 'network':
          result = await dataService.loadNetworkData()
          break
        case 'summary':
          result = await dataService.loadSummaryData()
          break
        case 'forecast':
          result = await dataService.loadMLForecast(params.key)
          break
        case 'process_mining':
          // Handle process mining data loading
          switch (params.type) {
            case 'results':
              result = await loadProcessMiningResults()
              break
            case 'flows':
              result = await loadProcessFlows(params.filters)
              break
            case 'conformance':
              result = await loadConformanceData(params.referenceModel)
              break
            case 'enhancement':
              result = await loadEnhancementData(params.optimizationType)
              break
            case 'network':
              result = await loadProcessNetworkData()
              break
            default:
              throw new Error(`Unknown process mining type: ${params.type}`)
          }
          break
        default:
          throw new Error(`Unknown endpoint: ${endpoint}`)
      }

      clearInterval(progressInterval)
      clearTimeout(timeoutId)
      loadingProgress.value = 100

      return result
    } catch (err) {
      clearTimeout(timeoutId)
      
      if (controller.signal.aborted) {
        throw new Error('Request timeout')
      }
      
      throw err
    }
  }

  const retryLoad = async () => {
    if (!canRetry.value) {
      throw new Error('Cannot retry: maximum attempts reached or no error to retry')
    }
    
    return executeLoadWithRetry(lastLoadedEndpoint.value, lastLoadedParams.value)
  }

  const cancelLoad = () => {
    if (currentRequest.value) {
      currentRequest.value.abort()
      currentRequest.value = null
      loading.value = false
      uiStore.setGlobalLoading(false)
    }
  }

  // Auto-refresh functionality
  let refreshIntervalId = null
  const lastLoadedEndpoint = ref(null)
  const lastLoadedParams = ref(null)
  
  const startAutoRefresh = () => {
    if (autoRefresh && !refreshIntervalId) {
      refreshIntervalId = setInterval(() => {
        if (!loading.value && lastLoadedEndpoint.value) {
          loadWithStoreIntegration(lastLoadedEndpoint.value, lastLoadedParams.value, {
            silent: true,
            useCache: false
          })
        }
      }, refreshInterval)
    }
  }
  
  const stopAutoRefresh = () => {
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId)
      refreshIntervalId = null
    }
  }

  // Store watchers for reactive loading
  watch([
    () => dataStore.selectedProduct,
    () => dataStore.selectedRegion
  ], ([product, region]) => {
    if (product && region) {
      lastLoadedEndpoint.value = 'production'
      lastLoadedParams.value = { product, region }
      loadWithStoreIntegration('production', { product, region })
    }
  })

  // Lifecycle
  onMounted(() => {
    if (initialLoad) {
      preloadCriticalData()
    }
    if (autoRefresh) {
      startAutoRefresh()
    }
  })

  onUnmounted(() => {
    cancelLoad()
    stopAutoRefresh()
    cleanup()
  })

  return {
    // State
    loading: isLoading,
    error,
    data,
    loadingProgress,
    hasError,
    hasData,
    canRetry,
    cacheSize,
    retryCount,
    lastLoadTime,
    
    // Enhanced methods
    loadData: loadWithStoreIntegration,
    retryLoad,
    cancelLoad,
    
    // Process mining specific methods
    loadProcessMiningResults,
    loadProcessFlows,
    loadConformanceData,
    loadEnhancementData,
    loadProcessNetworkData,
    exportProcessMiningData,
    
    // Original methods (enhanced)
    loadGeoData,
    loadProductionData,
    loadProductionDataRange,
    preloadCriticalData,
    loadProgressively,
    reset,
    cleanup,
    getCacheStats,
    
    // Cache management
    manageCache,
    clearCache,
    setCache,
    getCache,
    
    // Auto-refresh
    startAutoRefresh,
    stopAutoRefresh
  }
}