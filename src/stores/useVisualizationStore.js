import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as d3 from 'd3'

export const useVisualizationStore = defineStore('visualization', () => {
  // Enhanced state for Phase 5
  const mapInstance = ref(null)
  const chartInstances = ref(new Map())
  const activeVisualizations = ref(new Set())
  const visualizationStates = ref(new Map())
  const interactionHistory = ref([])
  const selectedElements = ref(new Map())
  const filters = ref(new Map())
  const brushSelections = ref(new Map())
  const zoomStates = ref(new Map())
  
  const visualizationConfigs = ref({
    worldMap: {
      width: 800,
      height: 500,
      projection: 'geoNaturalEarth1',
      colorScheme: 'viridis',
      showLegend: true,
      showTooltips: true
    },
    timeseries: {
      width: 600,
      height: 400,
      margin: { top: 20, right: 30, bottom: 40, left: 40 },
      lineColor: '#3b82f6',
      showPoints: true,
      showGrid: true
    },
    barChart: {
      width: 500,
      height: 300,
      margin: { top: 20, right: 30, bottom: 40, left: 60 },
      colorScheme: 'category10',
      orientation: 'vertical'
    },
    scatterPlot: {
      width: 500,
      height: 400,
      margin: { top: 20, right: 30, bottom: 40, left: 40 },
      pointSize: 4,
      pointOpacity: 0.7
    },
    networkGraph: {
      width: 700,
      height: 500,
      linkDistance: 100,
      nodeRadius: 8,
      charge: -300,
      showLabels: true
    },
    ml: {
      width: 800,
      height: 500,
      margin: { top: 20, right: 120, bottom: 40, left: 60 },
      historicalColor: '#3b82f6',
      predictionColor: '#ef4444',
      confidenceColor: '#f59e0b'
    },
    simulation: {
      width: 800,
      height: 500,
      margin: { top: 20, right: 30, bottom: 40, left: 60 },
      baselineColor: '#6b7280',
      scenarioColor: '#ef4444'
    },
  })

  // Animation settings
  const animationSettings = ref({
    duration: 750,
    ease: 'd3.easeQuadInOut',
    enabled: true
  })

  // Enhanced color scales and themes for Phase 5
  const colorSchemes = ref({
    production: ['#f7fcf0', '#e0f3db', '#ccebc5', '#a8ddb5', '#7bccc4', '#4eb3d3', '#2b8cbe', '#0868ac', '#084081'],
    forecast: ['#fff7ec', '#fee8c8', '#fdd49e', '#fdbb84', '#fc8d59', '#ef6548', '#d7301f', '#b30000', '#7f0000'],
    trade: ['#f7fcfd', '#e0ecf4', '#bfd3e6', '#9ebcda', '#8c96c6', '#8c6bb1', '#88419d', '#810f7c', '#4d004b'],
    regions: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
    analysis: ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16'],
    simulation: ['#6b7280', '#ef4444', '#f59e0b', '#10b981'],
    ml: ['#3b82f6', '#ef4444', '#f59e0b']
  })

  // Data transformation cache
  const transformationCache = ref(new Map())
  const updateQueue = ref([])
  const isUpdating = ref(false)

  // Enhanced computed properties for Phase 5
  const getVisualizationConfig = computed(() => (type) => {
    return visualizationConfigs.value[type] || {}
  })

  const getColorScheme = computed(() => (type) => {
    return colorSchemes.value[type] || colorSchemes.value.production
  })

  const isAnimationEnabled = computed(() => animationSettings.value.enabled)
  
  const getVisualizationState = computed(() => (vizId) => {
    return visualizationStates.value.get(vizId) || {
      initialized: false,
      data: null,
      error: null,
      lastUpdate: null
    }
  })
  
  const getSelectedElements = computed(() => (vizId) => {
    return selectedElements.value.get(vizId) || []
  })
  
  const getFilters = computed(() => (vizId) => {
    return filters.value.get(vizId) || {}
  })
  
  const getBrushSelection = computed(() => (vizId) => {
    return brushSelections.value.get(vizId) || null
  })
  
  const getZoomState = computed(() => (vizId) => {
    return zoomStates.value.get(vizId) || { k: 1, x: 0, y: 0 }
  })
  
  const isVisualizationActive = computed(() => (vizId) => {
    return activeVisualizations.value.has(vizId)
  })
  
  const hasActiveFilters = computed(() => (vizId) => {
    const vizFilters = filters.value.get(vizId) || {}
    return Object.keys(vizFilters).length > 0
  })
  
  const getInteractionHistory = computed(() => {
    return interactionHistory.value.slice(-100) // Keep last 100 interactions
  })

  // Actions
  const setMapInstance = (instance) => {
    mapInstance.value = instance
  }

  const getMapInstance = () => {
    return mapInstance.value
  }

  const setChartInstance = (chartId, instance) => {
    chartInstances.value.set(chartId, instance)
  }

  const getChartInstance = (chartId) => {
    return chartInstances.value.get(chartId)
  }

  const removeChartInstance = (chartId) => {
    const instance = chartInstances.value.get(chartId)
    if (instance && typeof instance.destroy === 'function') {
      instance.destroy()
    }
    chartInstances.value.delete(chartId)
  }

  const updateVisualizationConfig = (type, config) => {
    if (visualizationConfigs.value[type]) {
      visualizationConfigs.value[type] = {
        ...visualizationConfigs.value[type],
        ...config
      }
    }
  }

  const setAnimationSettings = (settings) => {
    animationSettings.value = {
      ...animationSettings.value,
      ...settings
    }
  }

  const toggleAnimation = () => {
    animationSettings.value.enabled = !animationSettings.value.enabled
  }

  // Map-specific actions
  const updateMapConfig = (config) => {
    updateVisualizationConfig('worldMap', config)
  }

  const setMapProjection = (projection) => {
    updateVisualizationConfig('worldMap', { projection })
  }

  const setMapColorScheme = (colorScheme) => {
    updateVisualizationConfig('worldMap', { colorScheme })
  }

  const setMapDimensions = (width, height) => {
    updateVisualizationConfig('worldMap', { width, height })
  }

  // Chart-specific actions
  const updateChartConfig = (chartType, config) => {
    updateVisualizationConfig(chartType, config)
  }

  const setChartDimensions = (chartType, width, height) => {
    updateVisualizationConfig(chartType, { width, height })
  }

  const setChartMargin = (chartType, margin) => {
    updateVisualizationConfig(chartType, { margin })
  }

  // Utility actions
  const getResponsiveDimensions = (containerEl, aspectRatio = 1.6) => {
    if (!containerEl) return { width: 800, height: 500 }
    
    const containerWidth = containerEl.clientWidth
    const width = Math.max(300, containerWidth - 40) // Min width with padding
    const height = Math.max(200, width / aspectRatio) // Maintain aspect ratio
    
    return { width, height }
  }

  const updateResponsiveConfig = (chartType, containerEl, aspectRatio) => {
    const { width, height } = getResponsiveDimensions(containerEl, aspectRatio)
    setChartDimensions(chartType, width, height)
    return { width, height }
  }

  // D3 utility functions
  const createColorScale = (domain, schemeType = 'production') => {
    const colors = getColorScheme.value(schemeType)
    const scale = d3.scaleQuantize()
      .domain(domain)
      .range(colors)
    return scale
  }

  const createLinearScale = (domain, range) => {
    return d3.scaleLinear()
      .domain(domain)
      .range(range)
  }

  const createTimeScale = (domain, range) => {
    return d3.scaleTime()
      .domain(domain)
      .range(range)
  }

  const formatValue = (value, type = 'number') => {
    if (value === null || value === undefined) return 'N/A'
    
    switch (type) {
      case 'number':
        return d3.format(',.0f')(value)
      case 'percentage':
        return d3.format('.1%')(value)
      case 'currency':
        return d3.format('$,.0f')(value)
      case 'compact':
        return d3.format('.2s')(value)
      default:
        return value.toString()
    }
  }

  // Export/Save functionality
  const exportVisualization = (chartId, format = 'png') => {
    const instance = getChartInstance(chartId)
    if (!instance) return null

    const svgElement = instance.node ? instance.node() : instance
    if (!svgElement) return null

    switch (format) {
      case 'png':
        return exportToPNG(svgElement)
      case 'svg':
        return exportToSVG(svgElement)
      case 'pdf':
        return exportToPDF(svgElement)
      default:
        return null
    }
  }

  const exportToPNG = (svgElement) => {
    // Implementation for PNG export
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const data = new XMLSerializer().serializeToString(svgElement)
    const img = new Image()
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = `data:image/svg+xml;base64,${  btoa(data)}`
    })
  }

  const exportToSVG = (svgElement) => {
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svgElement)
    return `data:image/svg+xml;charset=utf-8,${  encodeURIComponent(svgString)}`
  }

  const exportToPDF = (svgElement) => {
    // PDF export not implemented yet - fallback to PNG
    console.warn('PDF export not implemented, falling back to PNG')
    return exportToPNG(svgElement)
  }

  // Cleanup function
  const cleanup = () => {
    // Clean up all chart instances
    chartInstances.value.forEach((instance, chartId) => {
      removeChartInstance(chartId)
    })
    
    // Reset map instance
    mapInstance.value = null
  }

  // Reset to defaults
  // Enhanced actions for Phase 5
  const setVisualizationState = (vizId, state) => {
    visualizationStates.value.set(vizId, {
      ...getVisualizationState.value(vizId),
      ...state,
      lastUpdate: new Date()
    })
  }
  
  const activateVisualization = (vizId) => {
    activeVisualizations.value.add(vizId)
  }
  
  const deactivateVisualization = (vizId) => {
    activeVisualizations.value.delete(vizId)
  }
  
  const setSelectedElements = (vizId, elements) => {
    selectedElements.value.set(vizId, elements)
    recordInteraction(vizId, 'selection', { elements })
  }
  
  const addSelectedElement = (vizId, element) => {
    const current = getSelectedElements.value(vizId)
    setSelectedElements(vizId, [...current, element])
  }
  
  const removeSelectedElement = (vizId, element) => {
    const current = getSelectedElements.value(vizId)
    setSelectedElements(vizId, current.filter(el => el !== element))
  }
  
  const clearSelection = (vizId) => {
    selectedElements.value.set(vizId, [])
    recordInteraction(vizId, 'clear_selection')
  }
  
  const setFilter = (vizId, filterKey, filterValue) => {
    const currentFilters = getFilters.value(vizId)
    filters.value.set(vizId, {
      ...currentFilters,
      [filterKey]: filterValue
    })
    recordInteraction(vizId, 'filter', { key: filterKey, value: filterValue })
  }
  
  const removeFilter = (vizId, filterKey) => {
    const currentFilters = getFilters.value(vizId)
    const { [filterKey]: removed, ...remaining } = currentFilters
    filters.value.set(vizId, remaining)
    recordInteraction(vizId, 'remove_filter', { key: filterKey })
  }
  
  const clearFilters = (vizId) => {
    filters.value.set(vizId, {})
    recordInteraction(vizId, 'clear_filters')
  }
  
  const setBrushSelection = (vizId, selection) => {
    brushSelections.value.set(vizId, selection)
    recordInteraction(vizId, 'brush', { selection })
  }
  
  const setZoomState = (vizId, zoomState) => {
    zoomStates.value.set(vizId, zoomState)
    recordInteraction(vizId, 'zoom', { state: zoomState })
  }
  
  const recordInteraction = (vizId, type, data = {}) => {
    interactionHistory.value.push({
      id: Date.now() + Math.random(),
      vizId,
      type,
      data,
      timestamp: new Date()
    })
    
    // Keep only last 100 interactions
    if (interactionHistory.value.length > 100) {
      interactionHistory.value = interactionHistory.value.slice(-100)
    }
  }
  
  const queueUpdate = (vizId, updateFn, priority = 'normal') => {
    updateQueue.value.push({
      vizId,
      updateFn,
      priority,
      timestamp: Date.now()
    })
    
    processUpdateQueue()
  }
  
  const processUpdateQueue = async () => {
    if (isUpdating.value || updateQueue.value.length === 0) return
    
    isUpdating.value = true
    
    // Sort by priority: high, normal, low
    updateQueue.value.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
    
    while (updateQueue.value.length > 0) {
      const update = updateQueue.value.shift()
      try {
        await update.updateFn()
      } catch (error) {
        console.error('Visualization update error:', error)
        setVisualizationState(update.vizId, { error: error.message })
      }
    }
    
    isUpdating.value = false
  }
  
  const cacheTransformation = (key, data) => {
    transformationCache.value.set(key, {
      data,
      timestamp: Date.now()
    })
    
    // Limit cache size
    if (transformationCache.value.size > 100) {
      const entries = Array.from(transformationCache.value.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      const toRemove = entries.slice(0, 20)
      toRemove.forEach(([key]) => transformationCache.value.delete(key))
    }
  }
  
  const getCachedTransformation = (key) => {
    const cached = transformationCache.value.get(key)
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
      return cached.data
    }
    return null
  }
  
  const clearCache = () => {
    transformationCache.value.clear()
  }

  const resetToDefaults = () => {
    cleanup()
    
    // Reset enhanced state
    activeVisualizations.value.clear()
    visualizationStates.value.clear()
    selectedElements.value.clear()
    filters.value.clear()
    brushSelections.value.clear()
    zoomStates.value.clear()
    interactionHistory.value = []
    transformationCache.value.clear()
    updateQueue.value = []
    
    visualizationConfigs.value = {
      worldMap: {
        width: 800,
        height: 500,
        projection: 'geoNaturalEarth1',
        colorScheme: 'viridis',
        showLegend: true,
        showTooltips: true
      },
      timeseries: {
        width: 600,
        height: 400,
        margin: { top: 20, right: 30, bottom: 40, left: 40 },
        lineColor: '#3b82f6',
        showPoints: true,
        showGrid: true
      },
      barChart: {
        width: 500,
        height: 300,
        margin: { top: 20, right: 30, bottom: 40, left: 60 },
        colorScheme: 'category10',
        orientation: 'vertical'
      },
      scatterPlot: {
        width: 500,
        height: 400,
        margin: { top: 20, right: 30, bottom: 40, left: 40 },
        pointSize: 4,
        pointOpacity: 0.7
      },
      networkGraph: {
        width: 700,
        height: 500,
        linkDistance: 100,
        nodeRadius: 8,
        charge: -300,
        showLabels: true
      },
      ml: {
        width: 800,
        height: 500,
        margin: { top: 20, right: 120, bottom: 40, left: 60 },
        historicalColor: '#3b82f6',
        predictionColor: '#ef4444',
        confidenceColor: '#f59e0b'
      },
      simulation: {
        width: 800,
        height: 500,
        margin: { top: 20, right: 30, bottom: 40, left: 60 },
        baselineColor: '#6b7280',
        scenarioColor: '#ef4444'
      },
    }

    animationSettings.value = {
      duration: 750,
      ease: 'd3.easeQuadInOut',
      enabled: true
    }
  }

  return {
    // State
    mapInstance,
    chartInstances,
    visualizationConfigs,
    animationSettings,
    colorSchemes,
    activeVisualizations,
    visualizationStates,
    selectedElements,
    filters,
    brushSelections,
    zoomStates,
    interactionHistory,
    transformationCache,
    updateQueue,
    isUpdating,

    // Computed
    getVisualizationConfig,
    getColorScheme,
    isAnimationEnabled,
    getVisualizationState,
    getSelectedElements,
    getFilters,
    getBrushSelection,
    getZoomState,
    isVisualizationActive,
    hasActiveFilters,
    getInteractionHistory,

    // Actions
    setMapInstance,
    getMapInstance,
    setChartInstance,
    getChartInstance,
    removeChartInstance,
    updateVisualizationConfig,
    setAnimationSettings,
    toggleAnimation,
    updateMapConfig,
    setMapProjection,
    setMapColorScheme,
    setMapDimensions,
    updateChartConfig,
    setChartDimensions,
    setChartMargin,
    getResponsiveDimensions,
    updateResponsiveConfig,
    createColorScale,
    createLinearScale,
    createTimeScale,
    formatValue,
    exportVisualization,
    exportToPNG,
    exportToSVG,
    cleanup,
    resetToDefaults,
    
    // Enhanced actions
    setVisualizationState,
    activateVisualization,
    deactivateVisualization,
    setSelectedElements,
    addSelectedElement,
    removeSelectedElement,
    clearSelection,
    setFilter,
    removeFilter,
    clearFilters,
    setBrushSelection,
    setZoomState,
    recordInteraction,
    queueUpdate,
    processUpdateQueue,
    cacheTransformation,
    getCachedTransformation,
    clearCache
  }
})