import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as d3 from 'd3'

/**
 * Core D3.js lifecycle management composable
 * Provides reactive D3.js integration with Vue.js components
 */
export function useD3(containerRef, options = {}) {
  const {
    responsive = true,
    debounceResize = 250,
    cleanupSelectors = [],
    autoResize = true
  } = options

  // Reactive state
  const dimensions = ref({ width: 0, height: 0 })
  const isReady = ref(false)
  const isDestroyed = ref(false)

  // Internal state
  let resizeObserver = null
  let resizeTimeout = null
  const d3Selections = new Map()
  const eventListeners = new Map()

  /**
   * Initialize D3.js container and setup
   */
  const initialize = async () => {
    if (!containerRef.value || isDestroyed.value) return

    await nextTick()

    // Get initial dimensions
    updateDimensions()

    // Setup resize observer for responsive behavior
    if (responsive && autoResize) {
      setupResizeObserver()
    }

    isReady.value = true
  }

  /**
   * Update container dimensions
   */
  const updateDimensions = () => {
    if (!containerRef.value) return

    const rect = containerRef.value.getBoundingClientRect()
    dimensions.value = {
      width: rect.width,
      height: rect.height
    }
  }

  /**
   * Setup resize observer for responsive charts
   */
  const setupResizeObserver = () => {
    if (!window.ResizeObserver || !containerRef.value) return

    resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      
      resizeTimeout = setTimeout(() => {
        updateDimensions()
      }, debounceResize)
    })

    resizeObserver.observe(containerRef.value)
  }

  /**
   * Create and register a D3.js selection
   */
  const createSelection = (selector, key = null) => {
    if (!containerRef.value) return null

    const selection = d3.select(containerRef.value).select(selector)
    
    if (key) {
      d3Selections.set(key, selection)
    }

    return selection
  }

  /**
   * Get a registered D3.js selection
   */
  const getSelection = (key) => {
    return d3Selections.get(key)
  }

  /**
   * Create SVG element with proper setup
   */
  const createSVG = (options = {}) => {
    const {
      width = dimensions.value.width,
      height = dimensions.value.height,
      margin = { top: 20, right: 20, bottom: 20, left: 20 },
      className = 'chart-svg',
      preserveAspectRatio = 'xMidYMid meet'
    } = options

    if (!containerRef.value) {
      console.error('❌ useD3: No container reference available')
      return null
    }

    // Remove existing SVG
    const existingSvg = d3.select(containerRef.value).select('svg')
    existingSvg.remove()

    // Create new SVG
    const svg = d3.select(containerRef.value)
      .append('svg')
      .attr('class', className)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', preserveAspectRatio)

    // Create main group with margins
    const g = svg.append('g')
      .attr('class', 'chart-container')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)

    // Store selections
    d3Selections.set('svg', svg)
    d3Selections.set('container', g)

    return { svg, g, width, height, margin }
  }

  /**
   * Add event listener with cleanup tracking
   */
  const addEventListener = (element, event, handler, key = null) => {
    if (!element || typeof handler !== 'function') return

    element.addEventListener(event, handler)

    // Track for cleanup
    const listenerKey = key || `${event}_${Date.now()}`
    eventListeners.set(listenerKey, { element, event, handler })

    return listenerKey
  }

  /**
   * Remove tracked event listener
   */
  const removeEventListener = (key) => {
    const listener = eventListeners.get(key)
    if (listener) {
      listener.element.removeEventListener(listener.event, listener.handler)
      eventListeners.delete(key)
    }
  }

  /**
   * Create transition with consistent settings
   */
  const createTransition = (options = {}) => {
    const {
      duration = 750,
      ease = d3.easeQuadInOut,
      delay = 0
    } = options

    return d3.transition()
      .duration(duration)
      .ease(ease)
      .delay(delay)
  }

  /**
   * Cleanup all D3.js resources
   */
  const cleanup = () => {
    if (isDestroyed.value) return

    // Mark as destroyed
    isDestroyed.value = true
    isReady.value = false

    // Clear resize observer
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }

    // Clear resize timeout
    if (resizeTimeout) {
      clearTimeout(resizeTimeout)
      resizeTimeout = null
    }

    // Remove event listeners
    eventListeners.forEach((listener, key) => {
      removeEventListener(key)
    })
    eventListeners.clear()

    // Clean up D3 selections
    d3Selections.forEach((selection) => {
      try {
        selection.remove()
      } catch (error) {
        console.warn('Error removing D3 selection:', error)
      }
    })
    d3Selections.clear()

    // Clean up custom selectors
    if (containerRef.value) {
      cleanupSelectors.forEach(selector => {
        try {
          d3.select(containerRef.value).selectAll(selector).remove()
        } catch (error) {
          console.warn(`Error cleaning up selector ${selector}:`, error)
        }
      })

      // Remove all SVG elements
      d3.select(containerRef.value).selectAll('svg').remove()
    }
  }

  // Lifecycle hooks
  onMounted(() => {
    initialize()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // Reactive state
    dimensions,
    isReady,
    isDestroyed,

    // Core methods
    initialize,
    updateDimensions,
    cleanup,

    // D3 utilities
    createSelection,
    getSelection,
    createSVG,
    createTransition,

    // Event management
    addEventListener,
    removeEventListener,

    // D3 library access
    d3
  }
}

/**
 * Reactive data binding composable for D3.js
 * Handles Vue reactivity with D3.js data updates with performance optimizations
 */
export function useD3Data(data, options = {}) {
  const {
    key = 'd3-data',
    transform = null,
    debounce = 50,
    enableCaching = true,
    maxCacheSize = 100,
    enableVirtualization = false,
    virtualPageSize = 1000
  } = options

  const processedData = ref([])
  const isProcessing = ref(false)
  const dataCache = ref(new Map())
  const cacheHits = ref(0)
  const cacheMisses = ref(0)
  
  let debounceTimeout = null
  let lastDataHash = null

  /**
   * Generate hash for data caching
   */
  const generateDataHash = (data) => {
    if (!data) return 'empty'
    if (Array.isArray(data)) {
      return `array_${data.length}_${JSON.stringify(data.slice(0, 3))}`
    }
    return JSON.stringify(data).substring(0, 100)
  }

  /**
   * Get cached data or compute new result
   */
  const getCachedOrCompute = (data, transform) => {
    if (!enableCaching) {
      return transform ? transform(data) : data
    }

    const dataHash = generateDataHash(data)
    const transformHash = transform ? transform.toString() : 'none'
    const cacheKey = `${dataHash}_${transformHash}`

    // Check cache
    if (dataCache.value.has(cacheKey)) {
      cacheHits.value++
      return dataCache.value.get(cacheKey)
    }

    // Compute new result
    cacheMisses.value++
    const result = transform ? transform(data) : data

    // Store in cache (with size limit)
    if (dataCache.value.size >= maxCacheSize) {
      const firstKey = dataCache.value.keys().next().value
      dataCache.value.delete(firstKey)
    }
    dataCache.value.set(cacheKey, result)

    return result
  }

  /**
   * Apply virtualization to large datasets
   */
  const virtualizeData = (data, pageIndex = 0) => {
    if (!enableVirtualization || !Array.isArray(data)) {
      return data
    }

    if (data.length <= virtualPageSize) {
      return data
    }

    const startIndex = pageIndex * virtualPageSize
    const endIndex = Math.min(startIndex + virtualPageSize, data.length)
    
    return {
      data: data.slice(startIndex, endIndex),
      totalItems: data.length,
      pageIndex,
      pageSize: virtualPageSize,
      totalPages: Math.ceil(data.length / virtualPageSize),
      hasMore: endIndex < data.length
    }
  }

  /**
   * Process data with optional transformation and optimizations
   */
  const processData = (forceRefresh = false) => {
    if (debounceTimeout) clearTimeout(debounceTimeout)

    debounceTimeout = setTimeout(() => {
      isProcessing.value = true

      try {
        const currentData = data.value
        const currentHash = generateDataHash(currentData)

        // Skip processing if data hasn't changed (unless forced)
        if (!forceRefresh && currentHash === lastDataHash) {
          isProcessing.value = false
          return
        }

        lastDataHash = currentHash

        let result = Array.isArray(currentData) ? [...currentData] : currentData

        // Apply caching and transformation
        result = getCachedOrCompute(result, transform)

        // Apply virtualization if enabled
        if (enableVirtualization && Array.isArray(result)) {
          result = virtualizeData(result)
        }

        processedData.value = result

        // Emit performance metrics
        console.log(`D3 Data Processing: Cache hits: ${cacheHits.value}, misses: ${cacheMisses.value}`)
        
      } catch (error) {
        console.error('Error processing D3 data:', error)
        processedData.value = enableVirtualization ? { data: [], totalItems: 0 } : []
      } finally {
        isProcessing.value = false
      }
    }, debounce)
  }

  /**
   * Load next page for virtualized data
   */
  const loadNextPage = () => {
    if (!enableVirtualization || !processedData.value?.hasMore) return

    const currentPageIndex = processedData.value.pageIndex || 0
    const nextPageData = virtualizeData(data.value, currentPageIndex + 1)
    
    if (nextPageData.data.length > 0) {
      processedData.value = {
        ...nextPageData,
        data: [...processedData.value.data, ...nextPageData.data]
      }
    }
  }

  /**
   * Clear data cache
   */
  const clearCache = () => {
    dataCache.value.clear()
    cacheHits.value = 0
    cacheMisses.value = 0
  }

  /**
   * Get cache statistics
   */
  const getCacheStats = () => {
    return {
      size: dataCache.value.size,
      hits: cacheHits.value,
      misses: cacheMisses.value,
      hitRate: cacheHits.value / (cacheHits.value + cacheMisses.value) || 0
    }
  }

  // Watch for data changes with optimized comparison
  watch(() => data.value, () => processData(), { 
    immediate: true,
    deep: false // Use shallow watching for performance
  })

  onUnmounted(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }
    clearCache()
  })

  return {
    processedData,
    isProcessing,
    processData,
    loadNextPage,
    clearCache,
    getCacheStats,
    // Virtualization helpers
    isVirtualized: enableVirtualization,
    virtualPageSize
  }
}

/**
 * D3.js chart composable with common chart patterns
 * Provides reusable chart setup and update patterns
 */
export function useD3Chart(containerRef, options = {}) {
  const {
    margin = { top: 20, right: 20, bottom: 30, left: 40 },
    responsive = true,
    autoResize = true
  } = options

  const d3Instance = useD3(containerRef, { responsive, autoResize })
  const chartState = ref({
    scales: {},
    axes: {},
    elements: {}
  })

  /**
   * Setup chart with scales and axes
   */
  const setupChart = (config = {}) => {
    const {
      xScale = null,
      yScale = null,
      colorScale = null,
      xAxis = null,
      yAxis = null
    } = config

    if (!d3Instance.isReady.value) return

    const { width, height } = d3Instance.dimensions.value
    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    // Create SVG if not exists
    const { svg, g } = d3Instance.createSVG({ margin, width, height })

    // Setup scales
    if (xScale) {
      chartState.value.scales.x = xScale.range([0, chartWidth])
    }
    if (yScale) {
      chartState.value.scales.y = yScale.range([chartHeight, 0])
    }
    if (colorScale) {
      chartState.value.scales.color = colorScale
    }

    // Setup axes
    if (xAxis && chartState.value.scales.x) {
      const xAxisGroup = g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xAxis.scale(chartState.value.scales.x))

      chartState.value.axes.x = xAxisGroup
    }

    if (yAxis && chartState.value.scales.y) {
      const yAxisGroup = g.append('g')
        .attr('class', 'y-axis')
        .call(yAxis.scale(chartState.value.scales.y))

      chartState.value.axes.y = yAxisGroup
    }

    return { svg, g, chartWidth, chartHeight }
  }

  /**
   * Update chart with new data
   */
  const updateChart = (data, updateFn) => {
    if (!d3Instance.isReady.value || typeof updateFn !== 'function') return

    const container = d3Instance.getSelection('container')
    if (container) {
      updateFn(container, data, chartState.value)
    }
  }

  /**
   * Resize chart
   */
  const resizeChart = () => {
    if (!d3Instance.isReady.value) return

    const { width, height } = d3Instance.dimensions.value
    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    // Update SVG dimensions
    const svg = d3Instance.getSelection('svg')
    if (svg) {
      svg.attr('width', width)
         .attr('height', height)
         .attr('viewBox', `0 0 ${width} ${height}`)
    }

    // Update scales ranges
    if (chartState.value.scales.x) {
      chartState.value.scales.x.range([0, chartWidth])
    }
    if (chartState.value.scales.y) {
      chartState.value.scales.y.range([chartHeight, 0])
    }

    // Update axes
    if (chartState.value.axes.x && chartState.value.scales.x) {
      chartState.value.axes.x
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(chartState.value.scales.x))
    }
    if (chartState.value.axes.y && chartState.value.scales.y) {
      chartState.value.axes.y.call(d3.axisLeft(chartState.value.scales.y))
    }
  }

  // Watch for dimension changes
  watch(() => d3Instance.dimensions.value, resizeChart, { deep: true })

  return {
    ...d3Instance,
    chartState,
    setupChart,
    updateChart,
    resizeChart,
    margin
  }
}