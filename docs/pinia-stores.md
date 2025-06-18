# Pinia Store Documentation

## Overview

This document provides comprehensive documentation for all Pinia stores used in the D2 Nutrition Vibes application. Each store is designed to manage specific aspects of the application state using Vue 3's Composition API syntax.

## Store Architecture

The application uses a modular store architecture with clear separation of concerns:

```
stores/
├── useDataStore.js          # FAO dataset management
├── useUIStore.js           # UI state and preferences  
├── useVisualizationStore.js # Visualization configuration
└── index.js                # Store registry
```

## Store Conventions

All stores follow consistent patterns:

1. **Composition API syntax** using `defineStore()`
2. **TypeScript interfaces** for state and actions
3. **Computed getters** for derived state
4. **Async actions** with proper error handling
5. **State persistence** where appropriate
6. **Modular organization** by domain

## useDataStore

Manages FAO agricultural datasets, data loading, and caching.

### State

```typescript
interface DataState {
  // Raw datasets
  datasets: Dataset[]
  geoData: GeoData | null
  timeseriesData: TimeseriesData[]
  
  // Current selections
  selectedDataset: Dataset | null
  selectedCountries: string[]
  selectedTimeRange: [Date, Date] | null
  selectedMetrics: string[]
  
  // Loading states
  isLoading: boolean
  isProcessing: boolean
  loadingProgress: number
  
  // Cache management
  cache: Map<string, any>
  lastUpdated: Date | null
  
  // Error handling
  error: string | null
  retryCount: number
}
```

### Getters

```typescript
// Filtered and processed data
const filteredDatasets = computed(() => 
  datasets.value.filter(dataset => 
    selectedMetrics.value.includes(dataset.metric) &&
    isInTimeRange(dataset.data, selectedTimeRange.value)
  )
)

const aggregatedData = computed(() => 
  aggregateDataByRegion(filteredDatasets.value, selectedCountries.value)
)

const dataByCountry = computed(() => (countryCode: string) =>
  datasets.value
    .filter(d => d.countryCode === countryCode)
    .sort((a, b) => a.year - b.year)
)

// Statistics
const dataStats = computed(() => ({
  totalDatapoints: datasets.value.length,
  countriesCount: new Set(datasets.value.map(d => d.countryCode)).size,
  metricsCount: new Set(datasets.value.map(d => d.metric)).size,
  dateRange: getDataDateRange(datasets.value)
}))

// Cache statistics
const cacheStats = computed(() => ({
  size: cache.value.size,
  memoryUsage: estimateCacheSize(cache.value),
  hitRate: cacheHitRate.value
}))
```

### Actions

```typescript
// Data loading
const loadDatasets = async (options: LoadOptions = {}) => {
  const { forceRefresh = false, metrics = [], countries = [] } = options
  
  if (!forceRefresh && datasets.value.length > 0) {
    return datasets.value
  }
  
  isLoading.value = true
  error.value = null
  loadingProgress.value = 0
  
  try {
    const response = await dataService.fetchDatasets({
      metrics,
      countries,
      onProgress: (progress) => {
        loadingProgress.value = progress
      }
    })
    
    datasets.value = response.data
    lastUpdated.value = new Date()
    
    // Cache the results
    cacheDatasets(response.data)
    
    return response.data
  } catch (err) {
    error.value = err.message
    retryCount.value++
    throw err
  } finally {
    isLoading.value = false
    loadingProgress.value = 100
  }
}

const loadGeoData = async () => {
  if (geoData.value) return geoData.value
  
  try {
    const geo = await dataService.fetchGeoData()
    geoData.value = geo
    return geo
  } catch (err) {
    error.value = `Failed to load geographic data: ${err.message}`
    throw err
  }
}

// Data processing
const processTimeseriesData = async (metric: string, countries: string[]) => {
  isProcessing.value = true
  
  try {
    const cacheKey = `timeseries_${metric}_${countries.join(',')}`
    
    if (cache.value.has(cacheKey)) {
      return cache.value.get(cacheKey)
    }
    
    const processed = await dataService.processTimeseries(
      datasets.value,
      metric,
      countries
    )
    
    cache.value.set(cacheKey, processed)
    return processed
  } finally {
    isProcessing.value = false
  }
}

// Selections
const setSelectedDataset = (dataset: Dataset | null) => {
  selectedDataset.value = dataset
  
  if (dataset) {
    // Auto-select related data
    selectedMetrics.value = [dataset.metric]
    selectedCountries.value = [dataset.countryCode]
  }
}

const updateSelectedCountries = (countries: string[]) => {
  selectedCountries.value = countries
  
  // Trigger data refetch if needed
  if (countries.length > 0) {
    loadDatasets({ countries })
  }
}

const setTimeRange = (range: [Date, Date] | null) => {
  selectedTimeRange.value = range
}

// Cache management
const clearCache = () => {
  cache.value.clear()
  cacheHitRate.value = 0
}

const pruneCache = (maxAge: number = 30 * 60 * 1000) => {
  const now = Date.now()
  const expired = []
  
  cache.value.forEach((entry, key) => {
    if (now - entry.timestamp > maxAge) {
      expired.push(key)
    }
  })
  
  expired.forEach(key => cache.value.delete(key))
}

// Error handling
const retryLastOperation = async () => {
  if (retryCount.value >= 3) {
    throw new Error('Maximum retry attempts exceeded')
  }
  
  return loadDatasets({ forceRefresh: true })
}

const clearError = () => {
  error.value = null
  retryCount.value = 0
}
```

### Usage Example

```vue
<script setup>
import { useDataStore } from '@/stores/useDataStore'
import { storeToRefs } from 'pinia'

const dataStore = useDataStore()
const { 
  datasets, 
  selectedCountries, 
  isLoading, 
  filteredDatasets 
} = storeToRefs(dataStore)

// Load data on component mount
onMounted(() => {
  dataStore.loadDatasets()
})

// Watch for country selection changes
watch(selectedCountries, (countries) => {
  if (countries.length > 0) {
    dataStore.loadDatasets({ countries })
  }
})
</script>
```

## useUIStore

Manages user interface state, preferences, and application settings.

### State

```typescript
interface UIState {
  // Theme and appearance
  theme: 'light' | 'dark' | 'auto'
  colorScheme: string
  fontSize: 'sm' | 'md' | 'lg'
  
  // Layout
  sidebarCollapsed: boolean
  activePanelId: string
  panelSizes: Record<string, number>
  
  // User preferences
  preferences: {
    defaultMetric: string
    defaultCountries: string[]
    autoRefresh: boolean
    animationsEnabled: boolean
    soundEnabled: boolean
  }
  
  // Modal and overlay state
  modals: {
    settings: boolean
    export: boolean
    help: boolean
  }
  notifications: Notification[]
  
  // Performance settings
  performanceMode: 'high' | 'balanced' | 'power-saver'
  maxDataPoints: number
  
  // Accessibility
  reduceMotion: boolean
  highContrast: boolean
  screenReader: boolean
}
```

### Getters

```typescript
const isDarkMode = computed(() => {
  if (theme.value === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return theme.value === 'dark'
})

const effectiveColorScheme = computed(() => 
  isDarkMode.value ? 'dark' : colorScheme.value
)

const isAnyModalOpen = computed(() => 
  Object.values(modals.value).some(isOpen => isOpen)
)

const unreadNotifications = computed(() => 
  notifications.value.filter(n => !n.read)
)

const currentPanelConfig = computed(() => 
  panelConfigs.find(p => p.id === activePanelId.value)
)
```

### Actions

```typescript
// Theme management
const setTheme = (newTheme: 'light' | 'dark' | 'auto') => {
  theme.value = newTheme
  persistPreferences()
  applyThemeToDOM()
}

const toggleTheme = () => {
  const themes = ['light', 'dark', 'auto']
  const currentIndex = themes.indexOf(theme.value)
  const nextIndex = (currentIndex + 1) % themes.length
  setTheme(themes[nextIndex])
}

// Layout management
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const setActivePanel = (panelId: string) => {
  if (panelConfigs.some(p => p.id === panelId)) {
    activePanelId.value = panelId
    router.push(`/panel/${panelId}`)
  }
}

const updatePanelSize = (panelId: string, size: number) => {
  panelSizes.value[panelId] = size
}

// Modal management
const openModal = (modalName: keyof typeof modals.value) => {
  modals.value[modalName] = true
}

const closeModal = (modalName: keyof typeof modals.value) => {
  modals.value[modalName] = false
}

const closeAllModals = () => {
  Object.keys(modals.value).forEach(key => {
    modals.value[key] = false
  })
}

// Notifications
const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
  const id = crypto.randomUUID()
  notifications.value.push({
    ...notification,
    id,
    timestamp: new Date(),
    read: false
  })
  
  // Auto-remove after delay for non-persistent notifications
  if (!notification.persistent) {
    setTimeout(() => {
      removeNotification(id)
    }, notification.duration || 5000)
  }
}

const removeNotification = (id: string) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

const markNotificationRead = (id: string) => {
  const notification = notifications.value.find(n => n.id === id)
  if (notification) {
    notification.read = true
  }
}

// Preferences
const updatePreferences = (updates: Partial<UIState['preferences']>) => {
  preferences.value = { ...preferences.value, ...updates }
  persistPreferences()
}

const resetPreferences = () => {
  preferences.value = getDefaultPreferences()
  persistPreferences()
}

// Performance
const setPerformanceMode = (mode: 'high' | 'balanced' | 'power-saver') => {
  performanceMode.value = mode
  
  // Update related settings based on performance mode
  switch (mode) {
    case 'high':
      maxDataPoints.value = 50000
      preferences.value.animationsEnabled = true
      break
    case 'balanced':
      maxDataPoints.value = 25000
      preferences.value.animationsEnabled = true
      break
    case 'power-saver':
      maxDataPoints.value = 10000
      preferences.value.animationsEnabled = false
      break
  }
}

// Accessibility
const updateAccessibilitySettings = (settings: {
  reduceMotion?: boolean
  highContrast?: boolean
  screenReader?: boolean
}) => {
  Object.assign({
    reduceMotion: reduceMotion.value,
    highContrast: highContrast.value,
    screenReader: screenReader.value
  }, settings)
  
  applyAccessibilitySettings()
}
```

## useVisualizationStore

Manages visualization configurations, chart settings, and rendering options.

### State

```typescript
interface VisualizationState {
  // Chart configurations
  chartConfigs: Record<string, ChartConfig>
  globalChartSettings: GlobalChartSettings
  
  // Rendering options
  renderingEngine: 'svg' | 'canvas' | 'webgl'
  enableTransitions: boolean
  transitionDuration: number
  
  // Color schemes and scales
  colorSchemes: ColorScheme[]
  activeColorScheme: string
  customColors: Record<string, string>
  
  // Interaction settings
  enableZoom: boolean
  enablePan: boolean
  enableBrush: boolean
  enableTooltips: boolean
  
  // Performance settings
  maxDataPointsPerChart: number
  enableVirtualization: boolean
  renderingOptimizations: string[]
  
  // Export settings
  exportFormats: ExportFormat[]
  exportQuality: 'low' | 'medium' | 'high'
  exportDimensions: { width: number; height: number }
}
```

### Getters

```typescript
const getChartConfig = computed(() => (chartId: string) =>
  chartConfigs.value[chartId] || getDefaultChartConfig()
)

const activeColorPalette = computed(() => 
  colorSchemes.value.find(scheme => scheme.id === activeColorScheme.value)
)

const isHighPerformanceMode = computed(() => 
  renderingEngine.value === 'canvas' || renderingEngine.value === 'webgl'
)

const optimizedRenderingSettings = computed(() => ({
  useCanvas: isHighPerformanceMode.value,
  enableTransitions: enableTransitions.value && !uiStore.reduceMotion,
  maxDataPoints: Math.min(
    maxDataPointsPerChart.value,
    uiStore.performanceMode === 'power-saver' ? 5000 : 25000
  )
}))
```

### Actions

```typescript
// Chart configuration
const updateChartConfig = (chartId: string, config: Partial<ChartConfig>) => {
  if (!chartConfigs.value[chartId]) {
    chartConfigs.value[chartId] = getDefaultChartConfig()
  }
  
  chartConfigs.value[chartId] = {
    ...chartConfigs.value[chartId],
    ...config
  }
}

const resetChartConfig = (chartId: string) => {
  chartConfigs.value[chartId] = getDefaultChartConfig()
}

// Color management
const setActiveColorScheme = (schemeId: string) => {
  const scheme = colorSchemes.value.find(s => s.id === schemeId)
  if (scheme) {
    activeColorScheme.value = schemeId
  }
}

const addCustomColorScheme = (scheme: ColorScheme) => {
  colorSchemes.value.push(scheme)
  activeColorScheme.value = scheme.id
}

// Rendering settings
const setRenderingEngine = (engine: 'svg' | 'canvas' | 'webgl') => {
  renderingEngine.value = engine
  
  // Adjust other settings based on rendering engine
  if (engine === 'canvas' || engine === 'webgl') {
    enableVirtualization.value = true
    maxDataPointsPerChart.value = 50000
  }
}

const updateRenderingSettings = (settings: Partial<{
  enableTransitions: boolean
  transitionDuration: number
  enableVirtualization: boolean
}>) => {
  Object.assign({
    enableTransitions: enableTransitions.value,
    transitionDuration: transitionDuration.value,
    enableVirtualization: enableVirtualization.value
  }, settings)
}

// Export functionality
const updateExportSettings = (settings: Partial<{
  format: string
  quality: 'low' | 'medium' | 'high'
  dimensions: { width: number; height: number }
}>) => {
  if (settings.quality) exportQuality.value = settings.quality
  if (settings.dimensions) exportDimensions.value = settings.dimensions
}
```

## Store Composition

Stores can be composed together for complex functionality:

```typescript
// composables/useStoreComposition.ts
export function useAppState() {
  const dataStore = useDataStore()
  const uiStore = useUIStore()
  const vizStore = useVisualizationStore()
  
  // Combined computed properties
  const isAppReady = computed(() => 
    !dataStore.isLoading && 
    dataStore.datasets.length > 0 &&
    !uiStore.isAnyModalOpen
  )
  
  const optimizedSettings = computed(() => ({
    ...vizStore.optimizedRenderingSettings,
    reducedMotion: uiStore.reduceMotion,
    performanceMode: uiStore.performanceMode
  }))
  
  // Combined actions
  const initializeApp = async () => {
    uiStore.addNotification({
      type: 'info',
      message: 'Loading agricultural data...'
    })
    
    try {
      await dataStore.loadDatasets()
      await dataStore.loadGeoData()
      
      uiStore.addNotification({
        type: 'success',
        message: 'Data loaded successfully'
      })
    } catch (error) {
      uiStore.addNotification({
        type: 'error',
        message: `Failed to load data: ${error.message}`
      })
    }
  }
  
  return {
    // State
    isAppReady,
    optimizedSettings,
    
    // Actions
    initializeApp,
    
    // Store instances
    dataStore,
    uiStore,
    vizStore
  }
}
```

## Testing Stores

Stores are tested using Vitest with proper setup and teardown:

```typescript
// tests/stores/useDataStore.test.ts
import { setActivePinia, createPinia } from 'pinia'
import { useDataStore } from '@/stores/useDataStore'
import { vi } from 'vitest'

describe('useDataStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should load datasets successfully', async () => {
    const store = useDataStore()
    const mockData = [{ id: '1', metric: 'production', value: 100 }]
    
    vi.mocked(dataService.fetchDatasets).mockResolvedValue({
      data: mockData
    })
    
    await store.loadDatasets()
    
    expect(store.datasets).toEqual(mockData)
    expect(store.isLoading).toBe(false)
  })
  
  it('should handle loading errors', async () => {
    const store = useDataStore()
    const error = new Error('Network error')
    
    vi.mocked(dataService.fetchDatasets).mockRejectedValue(error)
    
    await expect(store.loadDatasets()).rejects.toThrow('Network error')
    expect(store.error).toBe('Network error')
  })
})
```

## Best Practices

1. **State Normalization** - Keep state flat and normalized
2. **Computed Properties** - Use getters for derived state
3. **Error Handling** - Implement comprehensive error handling
4. **Caching** - Cache expensive computations and API responses
5. **Persistence** - Persist user preferences and settings
6. **Type Safety** - Use TypeScript for all store definitions
7. **Testing** - Write comprehensive tests for all store functionality
8. **Performance** - Optimize for large datasets and frequent updates

This documentation provides a complete guide to the Pinia store architecture used in the D2 Nutrition Vibes application.