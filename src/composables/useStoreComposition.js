import { computed, watch, ref } from 'vue'
import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'
import { useVisualizationStore } from '@/stores/useVisualizationStore'
import { useUserPreferencesStore } from '@/stores/useUserPreferencesStore'

// Centralized store composition patterns for cross-store functionality
export function useStoreComposition() {
  const dataStore = useDataStore()
  const uiStore = useUIStore()
  const vizStore = useVisualizationStore()
  const preferencesStore = useUserPreferencesStore()

  // Synchronized state
  const isGlobalLoading = computed(() => 
    dataStore.isLoading || uiStore.isLoading || vizStore.isUpdating
  )
  
  const currentTheme = computed(() => 
    preferencesStore.currentTheme || uiStore.theme
  )
  
  const activePanel = computed(() => 
    uiStore.activePanel || uiStore.currentPanel
  )
  
  const selectedFilters = computed(() => ({
    product: dataStore.selectedProduct || uiStore.selectedProduct,
    region: dataStore.selectedRegion || uiStore.selectedCountry,
    years: dataStore.selectedYears,
    filters: dataStore.dataFilters
  }))

  // Cross-store actions
  const updateGlobalTheme = (theme) => {
    preferencesStore.setPreference('theme', theme)
    uiStore.setTheme(theme)
    
    // Apply theme-specific visualization colors
    const colorScheme = theme === 'dark' ? 'dark' : 'default'
    vizStore.updateVisualizationConfig('worldMap', { colorScheme })
  }
  
  const synchronizeProductSelection = (product) => {
    dataStore.setSelectedProduct(product)
    uiStore.setSelectedProduct(product)
    preferencesStore.setPreference('defaultProduct', product)
    
    // Update active visualizations
    if (vizStore.isVisualizationActive('worldMap')) {
      vizStore.queueUpdate('worldMap', () => {
        // Trigger map update with new product
        console.log('Updating map with new product:', product)
      })
    }
  }
  
  const synchronizeRegionSelection = (region) => {
    dataStore.setSelectedRegion(region)
    uiStore.setSelectedCountry(region)
    preferencesStore.setPreference('defaultRegion', region)
  }
  
  const synchronizePanelState = (panel, state) => {
    uiStore.setActivePanel(panel)
    
    if (state.expanded !== undefined) {
      uiStore.expandPanel(panel)
    }
    
    if (state.loading !== undefined) {
      uiStore.setPanelLoading(panel, state.loading)
    }
    
    if (state.error !== undefined) {
      uiStore.setPanelError(panel, state.error)
    }
    
    // Update visualization state
    if (state.data !== undefined) {
      vizStore.setVisualizationState(panel, { data: state.data })
    }
  }
  
  const resetAllStores = () => {
    dataStore.clearData()
    uiStore.resetUI()
    vizStore.resetToDefaults()
    // Note: Don't reset user preferences as they should persist
  }

  // Cross-store watchers for synchronization
  watch(() => preferencesStore.preferences.theme, (newTheme) => {
    if (newTheme !== uiStore.theme) {
      uiStore.setTheme(newTheme)
    }
  })
  
  watch(() => preferencesStore.preferences.defaultProduct, (newProduct) => {
    if (newProduct !== dataStore.selectedProduct) {
      dataStore.setSelectedProduct(newProduct)
      uiStore.setSelectedProduct(newProduct)
    }
  })
  
  watch(() => preferencesStore.preferences.defaultRegion, (newRegion) => {
    if (newRegion !== dataStore.selectedRegion) {
      dataStore.setSelectedRegion(newRegion)
      uiStore.setSelectedCountry(newRegion)
    }
  })
  
  watch(() => dataStore.selectedProduct, (newProduct) => {
    if (newProduct !== uiStore.selectedProduct) {
      uiStore.setSelectedProduct(newProduct)
    }
  })
  
  watch(() => dataStore.selectedRegion, (newRegion) => {
    if (newRegion !== uiStore.selectedCountry) {
      uiStore.setSelectedCountry(newRegion)
    }
  })

  return {
    // Stores
    dataStore,
    uiStore,
    vizStore,
    preferencesStore,
    
    // Computed
    isGlobalLoading,
    currentTheme,
    activePanel,
    selectedFilters,
    
    // Actions
    updateGlobalTheme,
    synchronizeProductSelection,
    synchronizeRegionSelection,
    synchronizePanelState,
    resetAllStores
  }
}

// Specialized composition for data flow management
export function useDataFlow() {
  const { dataStore, uiStore, vizStore } = useStoreComposition()
  
  // Data pipeline for visualizations
  const createDataPipeline = (sourceStore, transformFn, targetViz) => {
    const pipeline = {
      source: sourceStore,
      transform: transformFn,
      target: targetViz,
      active: true
    }
    
    // Watch source data changes
    watch(() => sourceStore, (newData) => {
      if (pipeline.active && newData) {
        const transformedData = pipeline.transform(newData)
        vizStore.setVisualizationState(pipeline.target, {
          data: transformedData,
          lastUpdate: new Date()
        })
      }
    }, { deep: true })
    
    return {
      activate: () => { pipeline.active = true },
      deactivate: () => { pipeline.active = false },
      updateTransform: (newTransformFn) => { pipeline.transform = newTransformFn }
    }
  }
  
  // Bidirectional data sync
  const createBidirectionalSync = (storeA, keyA, storeB, keyB) => {
    let syncing = false
    
    watch(() => storeA[keyA], (newValue) => {
      if (!syncing && newValue !== storeB[keyB]) {
        syncing = true
        storeB[keyB] = newValue
        syncing = false
      }
    })
    
    watch(() => storeB[keyB], (newValue) => {
      if (!syncing && newValue !== storeA[keyA]) {
        syncing = true
        storeA[keyA] = newValue
        syncing = false
      }
    })
  }
  
  // Event-driven data updates
  const createEventDrivenUpdate = (eventName, updateFn) => {
    const listeners = ref([])
    
    const emit = (data) => {
      listeners.value.forEach(listener => listener(data))
    }
    
    const on = (callback) => {
      listeners.value.push(callback)
      return () => {
        const index = listeners.value.indexOf(callback)
        if (index > -1) {
          listeners.value.splice(index, 1)
        }
      }
    }
    
    return { emit, on }
  }

  return {
    createDataPipeline,
    createBidirectionalSync,
    createEventDrivenUpdate
  }
}

// Specialized composition for UI coordination
export function useUICoordination() {
  const { uiStore, vizStore, preferencesStore } = useStoreComposition()
  
  // Panel management
  const managePanelLifecycle = (panelId) => {
    const activate = () => {
      uiStore.setActivePanel(panelId)
      uiStore.expandPanel(panelId)
      vizStore.activateVisualization(panelId)
    }
    
    const deactivate = () => {
      vizStore.deactivateVisualization(panelId)
      uiStore.collapsePanel(panelId)
    }
    
    const setLoading = (isLoading) => {
      uiStore.setPanelLoading(panelId, isLoading)
    }
    
    const setError = (error) => {
      uiStore.setPanelError(panelId, error)
      if (error) {
        uiStore.addNotification({
          type: 'error',
          title: `${panelId} Panel Error`,
          message: error,
          duration: 10000
        })
      }
    }
    
    return {
      activate,
      deactivate,
      setLoading,
      setError
    }
  }
  
  // Responsive behavior coordination
  const coordinateResponsiveBehavior = () => {
    watch(() => uiStore.viewport.width, (newWidth) => {
      // Auto-adjust panel states based on screen size
      if (newWidth < 768) { // Mobile
        uiStore.setSidebarOpen(false)
        uiStore.setCompactMode(true)
        
        // Update visualization configs for mobile
        Object.keys(vizStore.visualizationConfigs).forEach(vizType => {
          vizStore.updateVisualizationConfig(vizType, {
            width: Math.min(400, newWidth - 40),
            height: 300
          })
        })
      } else if (newWidth < 1024) { // Tablet
        uiStore.setCompactMode(false)
        
        // Update visualization configs for tablet
        Object.keys(vizStore.visualizationConfigs).forEach(vizType => {
          vizStore.updateVisualizationConfig(vizType, {
            width: Math.min(600, newWidth - 100),
            height: 400
          })
        })
      } else { // Desktop
        uiStore.setSidebarOpen(true)
        uiStore.setCompactMode(false)
        
        // Restore default visualization configs
        vizStore.resetToDefaults()
      }
    })
  }
  
  // Accessibility coordination
  const coordinateAccessibility = () => {
    watch(() => preferencesStore.accessibilitySettings, (settings) => {
      // Update animation settings
      vizStore.setAnimationSettings({
        enabled: settings.animations && !settings.reducedMotion,
        duration: settings.reducedMotion ? 0 : 750
      })
      
      // Update UI for high contrast
      if (settings.highContrast) {
        uiStore.setTheme('high-contrast')
      }
      
      // Update font sizes and density
      uiStore.setPreference('fontSize', settings.fontSize)
    }, { deep: true })
  }

  return {
    managePanelLifecycle,
    coordinateResponsiveBehavior,
    coordinateAccessibility
  }
}

// Global composition hook that combines all patterns
export function useGlobalStoreComposition() {
  const storeComposition = useStoreComposition()
  const dataFlow = useDataFlow()
  const uiCoordination = useUICoordination()
  
  // Initialize all coordination patterns
  const initialize = () => {
    uiCoordination.coordinateResponsiveBehavior()
    uiCoordination.coordinateAccessibility()
  }
  
  // Cleanup function
  const cleanup = () => {
    // Clean up watchers and listeners
    console.log('Cleaning up store composition')
  }
  
  return {
    ...storeComposition,
    ...dataFlow,
    ...uiCoordination,
    initialize,
    cleanup
  }
}