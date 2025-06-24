import { watch, ref, nextTick } from 'vue'

import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'
import { useVisualizationStore } from '@/stores/useVisualizationStore'
import { useUserPreferencesStore } from '@/stores/useUserPreferencesStore'

// Enhanced data synchronization composable for Phase 5
export function useDataSync() {
  const dataStore = useDataStore()
  const uiStore = useUIStore()
  const vizStore = useVisualizationStore()
  const preferencesStore = useUserPreferencesStore()

  // Synchronization state
  const syncState = ref({
    active: true,
    conflicts: [],
    lastSync: null,
    syncQueue: [],
    isProcessing: false
  })

  // Bidirectional synchronization helpers
  const createBidirectionalSync = (sourceStore, sourceKey, targetStore, targetKey, options = {}) => {
    const {
      transform = (value) => value,
      reverseTransform = (value) => value,
      debounce = 50,
      condition = () => true
    } = options

    let syncing = false
    let timeoutId = null

    const syncForward = (newValue) => {
      if (syncing || !condition()) return
      
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        syncing = true
        try {
          const transformedValue = transform(newValue)
          if (transformedValue !== targetStore[targetKey]) {
            targetStore[targetKey] = transformedValue
            recordSync('bidirectional', `${sourceKey} -> ${targetKey}`, newValue)
          }
        } catch (error) {
          console.error('Sync error (forward):', error)
          recordConflict(sourceKey, targetKey, newValue, error)
        } finally {
          syncing = false
        }
      }, debounce)
    }

    const syncBackward = (newValue) => {
      if (syncing || !condition()) return
      
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        syncing = true
        try {
          const transformedValue = reverseTransform(newValue)
          if (transformedValue !== sourceStore[sourceKey]) {
            sourceStore[sourceKey] = transformedValue
            recordSync('bidirectional', `${targetKey} -> ${sourceKey}`, newValue)
          }
        } catch (error) {
          console.error('Sync error (backward):', error)
          recordConflict(targetKey, sourceKey, newValue, error)
        } finally {
          syncing = false
        }
      }, debounce)
    }

    // Watch both directions
    const forwardWatcher = watch(
      () => sourceStore[sourceKey],
      syncForward,
      { immediate: false }
    )

    const backwardWatcher = watch(
      () => targetStore[targetKey],
      syncBackward,
      { immediate: false }
    )

    return {
      stop: () => {
        forwardWatcher()
        backwardWatcher()
        clearTimeout(timeoutId)
      },
      syncNow: () => {
        syncForward(sourceStore[sourceKey])
      }
    }
  }

  // Cascade synchronization for dependent updates
  const createCascadeSync = (trigger, targets, options = {}) => {
    const { debounce = 100, priority = 'normal' } = options

    let timeoutId = null

    const executeTargets = async () => {
      if (!syncState.value.active) return

      syncState.value.isProcessing = true
      
      try {
        // Sort targets by priority
        const sortedTargets = targets.sort((a, b) => {
          const priorityOrder = { high: 0, normal: 1, low: 2 }
          return priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal']
        })

        for (const target of sortedTargets) {
          try {
            await target.action()
            recordSync('cascade', target.name, trigger())
          } catch (error) {
            console.error(`Cascade sync error for ${target.name}:`, error)
            recordConflict('cascade', target.name, trigger(), error)
          }
        }
      } finally {
        syncState.value.isProcessing = false
      }
    }

    const triggerSync = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(executeTargets, debounce)
    }

    const watcher = watch(trigger, triggerSync, { deep: true })

    return {
      stop: () => {
        watcher()
        clearTimeout(timeoutId)
      },
      triggerNow: executeTargets
    }
  }

  // Record synchronization activity
  const recordSync = (type, description, value) => {
    syncState.value.lastSync = {
      type,
      description,
      value,
      timestamp: new Date()
    }
  }

  // Record synchronization conflicts
  const recordConflict = (source, target, value, error) => {
    syncState.value.conflicts.push({
      id: Date.now() + Math.random(),
      source,
      target,
      value,
      error: error.message,
      timestamp: new Date(),
      resolved: false
    })

    // Limit conflict history
    if (syncState.value.conflicts.length > 50) {
      syncState.value.conflicts = syncState.value.conflicts.slice(-30)
    }
  }

  // Resolve conflict
  const resolveConflict = (conflictId, resolution = 'ignore') => {
    const conflict = syncState.value.conflicts.find(c => c.id === conflictId)
    if (conflict) {
      conflict.resolved = true
      conflict.resolution = resolution
    }
  }

  // Setup core synchronizations
  const setupCoreSynchronizations = () => {
    const synchronizations = []

    // 1. Product selection synchronization
    synchronizations.push(
      createBidirectionalSync(
        dataStore, 'selectedProduct',
        uiStore, 'selectedProduct',
        {
          condition: () => syncState.value.active,
          debounce: 50
        }
      )
    )

    // 2. Region selection synchronization - DISABLED to fix unwanted country detail views
    // NOTE: This bidirectional sync was causing country details to appear automatically
    // when dataStore.selectedRegion changed during data loading operations
    /*
    synchronizations.push(
      createBidirectionalSync(
        dataStore, 'selectedRegion',
        uiStore, 'selectedCountry',
        {
          condition: () => syncState.value.active,
          debounce: 50
        }
      )
    )
    */

    // 3. Theme synchronization
    synchronizations.push(
      createBidirectionalSync(
        preferencesStore.preferences, 'theme',
        uiStore, 'theme',
        {
          condition: () => syncState.value.active,
          debounce: 100
        }
      )
    )

    // 4. Panel states synchronization with visualization states
    synchronizations.push(
      createCascadeSync(
        () => uiStore.panelStates,
        [
          {
            name: 'sync_visualization_states',
            priority: 'high',
            action: async () => {
              for (const [panelId, panelState] of Object.entries(uiStore.panelStates)) {
                if (panelState.visible && !vizStore.isVisualizationActive(panelId)) {
                  vizStore.activateVisualization(panelId)
                } else if (!panelState.visible && vizStore.isVisualizationActive(panelId)) {
                  vizStore.deactivateVisualization(panelId)
                }
              }
            }
          }
        ],
        { debounce: 200 }
      )
    )

    // 5. Data filter synchronization
    synchronizations.push(
      createCascadeSync(
        () => [dataStore.selectedProduct, dataStore.selectedRegion, dataStore.selectedYears],
        [
          {
            name: 'update_visualizations',
            priority: 'high',
            action: async () => {
              // Queue updates for all active visualizations
              const activeVizs = Array.from(vizStore.activeVisualizations)
              activeVizs.forEach(vizId => {
                vizStore.queueUpdate(vizId, async () => {
                  // Transform data for visualization
                  const transformedData = dataStore.transformDataForVisualization('timeseries')
                  vizStore.setVisualizationState(vizId, { 
                    data: transformedData,
                    needsUpdate: true 
                  })
                })
              })
            }
          },
          {
            name: 'update_preferences',
            priority: 'low',
            action: async () => {
              preferencesStore.setPreference('defaultProduct', dataStore.selectedProduct)
              preferencesStore.setPreference('defaultRegion', dataStore.selectedRegion)
              preferencesStore.setPreference('defaultYearRange', dataStore.selectedYears)
            }
          }
        ],
        { debounce: 300 }
      )
    )

    // 6. Responsive synchronization
    synchronizations.push(
      createCascadeSync(
        () => uiStore.viewport,
        [
          {
            name: 'adjust_visualizations',
            priority: 'high',
            action: async () => {
              const { width, height, isMobile, isTablet } = uiStore.viewport
              
              // Update visualization configs based on viewport
              Object.keys(vizStore.visualizationConfigs).forEach(vizType => {
                const currentConfig = vizStore.getVisualizationConfig(vizType)
                let newConfig = {}

                if (isMobile) {
                  newConfig = {
                    width: Math.min(400, width - 40),
                    height: 300,
                    margin: { top: 10, right: 10, bottom: 20, left: 30 }
                  }
                } else if (isTablet) {
                  newConfig = {
                    width: Math.min(600, width - 100),
                    height: 400,
                    margin: { top: 15, right: 20, bottom: 30, left: 40 }
                  }
                } else {
                  // Desktop - use defaults or calculate based on available space
                  newConfig = {
                    width: Math.min(800, width - 200),
                    height: Math.min(500, height - 200)
                  }
                }

                vizStore.updateVisualizationConfig(vizType, newConfig)
              })
            }
          },
          {
            name: 'adjust_ui_layout',
            priority: 'normal',
            action: async () => {
              const { isMobile } = uiStore.viewport
              
              if (isMobile && uiStore.sidebarOpen) {
                uiStore.setSidebarOpen(false)
              }
              
              uiStore.setCompactMode(isMobile)
            }
          }
        ],
        { debounce: 150 }
      )
    )

    // 7. Error state synchronization
    synchronizations.push(
      createCascadeSync(
        () => dataStore.error,
        [
          {
            name: 'show_error_notification',
            priority: 'high',
            action: async () => {
              if (dataStore.error) {
              }
            }
          }
        ]
      )
    )

    return synchronizations
  }

  // Quality control for synchronization
  const validateSyncIntegrity = () => {
    const issues = []

    // Check for sync loops
    if (syncState.value.conflicts.length > 10) {
      issues.push('High number of sync conflicts detected')
    }

    // Check for inconsistent states
    if (dataStore.selectedProduct !== uiStore.selectedProduct) {
      issues.push('Product selection out of sync')
    }

    if (dataStore.selectedRegion !== uiStore.selectedCountry) {
      issues.push('Region selection out of sync')
    }

    if (preferencesStore.preferences.theme !== uiStore.theme) {
      issues.push('Theme preference out of sync')
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }

  // Manual synchronization trigger
  const forceSynchronization = async () => {
    syncState.value.isProcessing = true
    
    try {
      // Force sync all core values
      uiStore.setSelectedProduct(dataStore.selectedProduct)
      uiStore.setSelectedCountry(dataStore.selectedRegion)
      uiStore.setTheme(preferencesStore.preferences.theme)
      
      // Update visualization states
      for (const [panelId, panelState] of Object.entries(uiStore.panelStates)) {
        if (panelState.visible) {
          vizStore.activateVisualization(panelId)
        }
      }
      
      await nextTick()
      recordSync('manual', 'force_synchronization', 'all')
    } catch (error) {
      console.error('Force synchronization failed:', error)
      recordConflict('manual', 'all', null, error)
    } finally {
      syncState.value.isProcessing = false
    }
  }

  // Pause/resume synchronization
  const pauseSync = () => {
    syncState.value.active = false
  }

  const resumeSync = () => {
    syncState.value.active = true
  }

  // Reset synchronization state
  const resetSyncState = () => {
    syncState.value.conflicts = []
    syncState.value.lastSync = null
    syncState.value.syncQueue = []
  }

  // Initialize synchronizations
  let activeSynchronizations = []
  
  const initializeSynchronizations = () => {
    // Clean up existing synchronizations
    activeSynchronizations.forEach(sync => sync.stop())
    
    // Setup new synchronizations
    activeSynchronizations = setupCoreSynchronizations()
    
    console.log('Data synchronization initialized with', activeSynchronizations.length, 'sync rules')
  }

  // Cleanup function
  const cleanup = () => {
    activeSynchronizations.forEach(sync => sync.stop())
    activeSynchronizations = []
    resetSyncState()
  }

  return {
    // State
    syncState,
    
    // Setup functions
    initializeSynchronizations,
    cleanup,
    
    // Sync utilities
    createBidirectionalSync,
    createCascadeSync,
    
    // Control functions
    pauseSync,
    resumeSync,
    forceSynchronization,
    
    // Quality control
    validateSyncIntegrity,
    resolveConflict,
    resetSyncState
  }
}