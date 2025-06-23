import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'

// Create Pinia instance
const pinia = createPinia()

// Add persistence plugin
pinia.use(createPersistedState({
  storage: localStorage,
  key: 'd2-nutrition-vibes',
  beforeRestore: (context) => {
    console.log('Restoring store:', context.store.$id)
  },
  afterRestore: (context) => {
    console.log('Restored store:', context.store.$id)
  },
  serializer: {
    serialize: JSON.stringify,
    deserialize: JSON.parse,
  },
}))

// Store persistence configuration
const persistenceConfig = {
  // Data store - persist selected filters and preferences
  data: {
    include: [
      'selectedProduct',
      'selectedRegion',
      'selectedYears',
      'dataFilters'
    ]
  },
  
  // UI store - persist theme and layout preferences
  ui: {
    include: [
      'theme',
      'sidebarOpen',
      'preferences',
      'panelStates'
    ]
  },
  
  // Visualization store - persist visualization configs
  visualization: {
    include: [
      'visualizationConfigs',
      'animationSettings',
      'colorSchemes'
    ]
  },
  
  // User preferences store - persist all preferences
  userPreferences: {
    include: ['preferences']
  }
}

// Enhanced persistence with IndexedDB for larger data
const createIndexedDBPersistence = () => {
  const dbName = 'D2NutritionVibesDB'
  const dbVersion = 1
  
  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        // Create object stores for different data types
        if (!db.objectStoreNames.contains('stores')) {
          db.createObjectStore('stores', { keyPath: 'id' })
        }
        
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' })
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'id' })
        }
      }
    })
  }
  
  const saveToIndexedDB = async (storeId, data) => {
    try {
      const db = await openDB()
      const transaction = db.transaction(['stores'], 'readwrite')
      const store = transaction.objectStore('stores')
      
      await new Promise((resolve, reject) => {
        const request = store.put({
          id: storeId,
          data,
          timestamp: Date.now()
        })
        
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
      
      return true
    } catch (error) {
      console.error('Failed to save to IndexedDB:', error)
      return false
    }
  }
  
  const loadFromIndexedDB = async (storeId) => {
    try {
      const db = await openDB()
      const transaction = db.transaction(['stores'], 'readonly')
      const store = transaction.objectStore('stores')
      
      const result = await new Promise((resolve, reject) => {
        const request = store.get(storeId)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      
      return result ? result.data : null
    } catch (error) {
      console.error('Failed to load from IndexedDB:', error)
      return null
    }
  }
  
  return {
    save: saveToIndexedDB,
    load: loadFromIndexedDB
  }
}

// Initialize IndexedDB persistence
const indexedDBPersistence = createIndexedDBPersistence()

// Export persistence utilities
export const storePersistence = {
  // Save store state
  saveStore: async (storeId, data) => {
    // Save to localStorage first (smaller, faster)
    try {
      const config = persistenceConfig[storeId]
      if (config?.include) {
        const filteredData = {}
        config.include.forEach(key => {
          if (data[key] !== undefined) {
            filteredData[key] = data[key]
          }
        })
        localStorage.setItem(`d2-store-${storeId}`, JSON.stringify(filteredData))
      } else {
        localStorage.setItem(`d2-store-${storeId}`, JSON.stringify(data))
      }
    } catch (error) {
      console.warn('localStorage save failed, trying IndexedDB:', error)
    }
    
    // Save to IndexedDB for backup
    await indexedDBPersistence.save(storeId, data)
  },
  
  // Load store state
  loadStore: async (storeId) => {
    // Try localStorage first
    try {
      const stored = localStorage.getItem(`d2-store-${storeId}`)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn('localStorage load failed, trying IndexedDB:', error)
    }
    
    // Fallback to IndexedDB
    return await indexedDBPersistence.load(storeId)
  },
  
  // Clear store state
  clearStore: (storeId) => {
    try {
      localStorage.removeItem(`d2-store-${storeId}`)
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  },
  
  // Clear all stores
  clearAllStores: () => {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('d2-store-') || key.startsWith('d2-nutrition-vibes')) {
        localStorage.removeItem(key)
      }
    })
  }
}

// Auto-save functionality
const createAutoSave = (store, interval = 30000) => {
  let saveTimeout = null
  let lastState = null
  
  const saveState = () => {
    const currentState = store.$state
    if (JSON.stringify(currentState) !== JSON.stringify(lastState)) {
      storePersistence.saveStore(store.$id, currentState)
      lastState = JSON.parse(JSON.stringify(currentState))
    }
  }
  
  // Debounced save
  const debouncedSave = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    saveTimeout = setTimeout(saveState, 2000)
  }
  
  // Periodic save
  const periodicSave = setInterval(saveState, interval)
  
  // Watch for changes
  store.$subscribe(debouncedSave)
  
  return {
    stop: () => {
      if (saveTimeout) clearTimeout(saveTimeout)
      clearInterval(periodicSave)
    },
    saveNow: saveState
  }
}

// Store auto-save instances
const autoSaveInstances = new Map()

// Enhanced store factory with persistence
export const createPersistedStore = (storeId, storeFactory) => {
  return defineStore(storeId, () => {
    const store = storeFactory()
    
    // Setup auto-save
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const autoSave = createAutoSave(store)
        autoSaveInstances.set(storeId, autoSave)
      }, 100)
    }
    
    return store
  })
}

// Cleanup function
export const cleanupPersistence = () => {
  autoSaveInstances.forEach(autoSave => autoSave.stop())
  autoSaveInstances.clear()
}

// Initialize persistence when stores are ready
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Save all stores before page unload
    autoSaveInstances.forEach(autoSave => autoSave.saveNow())
  })
}

export default pinia