import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useUserPreferencesStore = defineStore('userPreferences', () => {
  // State
  const preferences = ref({
    // Language and localization
    language: 'de',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
    numberFormat: 'de-DE',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    
    // Theme and appearance
    theme: 'light',
    colorScheme: 'default',
    fontSize: 'medium',
    density: 'comfortable',
    animations: true,
    reducedMotion: false,
    highContrast: false,
    
    // Dashboard and layout
    defaultView: 'dashboard',
    sidebarCollapsed: false,
    compactMode: false,
    showTooltips: true,
    showDebugInfo: false,
    
    // Data visualization
    defaultChartType: 'timeseries',
    colorPalette: 'production',
    showDataLabels: true,
    enableInteractions: true,
    exportFormat: 'png',
    
    // Notifications
    enableNotifications: true,
    notificationSound: false,
    notificationPosition: 'top-right',
    autoHideNotifications: true,
    notificationDuration: 5000,
    
    // Data and filters
    defaultProduct: 'maize_and_products',
    defaultRegion: 'global',
    defaultYearRange: { start: 2018, end: 2023 },
    autoRefreshData: false,
    refreshInterval: 300000, // 5 minutes
    
    // Privacy and data
    allowAnalytics: true,
    allowCookies: true,
    shareUsageData: false,
    
    // Advanced settings
    cacheSize: 50,
    maxHistoryEntries: 100,
    enableExperimentalFeatures: false,
    debugMode: false
  })
  
  const savedPreferences = ref({})
  const hasUnsavedChanges = ref(false)
  
  // Computed properties
  const currentTheme = computed(() => preferences.value.theme)
  const currentLanguage = computed(() => preferences.value.language)
  const isHighContrast = computed(() => preferences.value.highContrast)
  const areAnimationsEnabled = computed(() => preferences.value.animations && !preferences.value.reducedMotion)
  const notificationSettings = computed(() => ({
    enabled: preferences.value.enableNotifications,
    sound: preferences.value.notificationSound,
    position: preferences.value.notificationPosition,
    autoHide: preferences.value.autoHideNotifications,
    duration: preferences.value.notificationDuration
  }))
  
  const dataSettings = computed(() => ({
    product: preferences.value.defaultProduct,
    region: preferences.value.defaultRegion,
    yearRange: preferences.value.defaultYearRange,
    autoRefresh: preferences.value.autoRefreshData,
    refreshInterval: preferences.value.refreshInterval
  }))
  
  const visualizationSettings = computed(() => ({
    chartType: preferences.value.defaultChartType,
    colorPalette: preferences.value.colorPalette,
    showLabels: preferences.value.showDataLabels,
    interactions: preferences.value.enableInteractions,
    exportFormat: preferences.value.exportFormat
  }))
  
  const accessibilitySettings = computed(() => ({
    reducedMotion: preferences.value.reducedMotion,
    highContrast: preferences.value.highContrast,
    fontSize: preferences.value.fontSize,
    showTooltips: preferences.value.showTooltips
  }))
  
  const privacySettings = computed(() => ({
    analytics: preferences.value.allowAnalytics,
    cookies: preferences.value.allowCookies,
    shareUsage: preferences.value.shareUsageData
  }))

  // Actions
  const setPreference = (key, value) => {
    if (preferences.value.hasOwnProperty(key)) {
      preferences.value[key] = value
      hasUnsavedChanges.value = true
    }
  }
  
  const setPreferences = (newPreferences) => {
    Object.keys(newPreferences).forEach(key => {
      if (preferences.value.hasOwnProperty(key)) {
        preferences.value[key] = newPreferences[key]
      }
    })
    hasUnsavedChanges.value = true
  }
  
  const getPreference = (key, defaultValue = null) => {
    return preferences.value[key] ?? defaultValue
  }
  
  const resetPreference = (key) => {
    const defaultPreferences = {
      language: 'de',
      dateFormat: 'DD.MM.YYYY',
      timeFormat: '24h',
      numberFormat: 'de-DE',
      currency: 'EUR',
      timezone: 'Europe/Berlin',
      theme: 'light',
      colorScheme: 'default',
      fontSize: 'medium',
      density: 'comfortable',
      animations: true,
      reducedMotion: false,
      highContrast: false,
      defaultView: 'dashboard',
      sidebarCollapsed: false,
      compactMode: false,
      showTooltips: true,
      showDebugInfo: false,
      defaultChartType: 'timeseries',
      colorPalette: 'production',
      showDataLabels: true,
      enableInteractions: true,
      exportFormat: 'png',
      enableNotifications: true,
      notificationSound: false,
      notificationPosition: 'top-right',
      autoHideNotifications: true,
      notificationDuration: 5000,
      defaultProduct: 'maize_and_products',
      defaultRegion: 'global',
      defaultYearRange: { start: 2018, end: 2023 },
      autoRefreshData: false,
      refreshInterval: 300000,
      allowAnalytics: true,
      allowCookies: true,
      shareUsageData: false,
      cacheSize: 50,
      maxHistoryEntries: 100,
      enableExperimentalFeatures: false,
      debugMode: false
    }
    
    if (defaultPreferences.hasOwnProperty(key)) {
      preferences.value[key] = defaultPreferences[key]
      hasUnsavedChanges.value = true
    }
  }
  
  const resetAllPreferences = () => {
    preferences.value = {
      language: 'de',
      dateFormat: 'DD.MM.YYYY',
      timeFormat: '24h',
      numberFormat: 'de-DE',
      currency: 'EUR',
      timezone: 'Europe/Berlin',
      theme: 'light',
      colorScheme: 'default',
      fontSize: 'medium',
      density: 'comfortable',
      animations: true,
      reducedMotion: false,
      highContrast: false,
      defaultView: 'dashboard',
      sidebarCollapsed: false,
      compactMode: false,
      showTooltips: true,
      showDebugInfo: false,
      defaultChartType: 'timeseries',
      colorPalette: 'production',
      showDataLabels: true,
      enableInteractions: true,
      exportFormat: 'png',
      enableNotifications: true,
      notificationSound: false,
      notificationPosition: 'top-right',
      autoHideNotifications: true,
      notificationDuration: 5000,
      defaultProduct: 'maize_and_products',
      defaultRegion: 'global',
      defaultYearRange: { start: 2018, end: 2023 },
      autoRefreshData: false,
      refreshInterval: 300000,
      allowAnalytics: true,
      allowCookies: true,
      shareUsageData: false,
      cacheSize: 50,
      maxHistoryEntries: 100,
      enableExperimentalFeatures: false,
      debugMode: false
    }
    hasUnsavedChanges.value = true
  }
  
  const savePreferences = async () => {
    try {
      const preferencesToSave = JSON.stringify(preferences.value)
      
      // Save to localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('d2-nutrition-vibes-preferences', preferencesToSave)
      }
      
      // Save to IndexedDB for larger storage if available
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        await saveToIndexedDB(preferences.value)
      }
      
      savedPreferences.value = { ...preferences.value }
      hasUnsavedChanges.value = false
      
      return true
    } catch (error) {
      console.error('Failed to save preferences:', error)
      return false
    }
  }
  
  const loadPreferences = async () => {
    try {
      let loadedPreferences = null
      
      // Try loading from IndexedDB first
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        loadedPreferences = await loadFromIndexedDB()
      }
      
      // Fallback to localStorage
      if (!loadedPreferences && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('d2-nutrition-vibes-preferences')
        if (stored) {
          loadedPreferences = JSON.parse(stored)
        }
      }
      
      if (loadedPreferences) {
        // Merge with current preferences to handle new preference keys
        preferences.value = {
          ...preferences.value,
          ...loadedPreferences
        }
        savedPreferences.value = { ...preferences.value }
        hasUnsavedChanges.value = false
      }
      
      return true
    } catch (error) {
      console.error('Failed to load preferences:', error)
      return false
    }
  }
  
  const exportPreferences = () => {
    try {
      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        preferences: preferences.value
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `d2-nutrition-vibes-preferences-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      return true
    } catch (error) {
      console.error('Failed to export preferences:', error)
      return false
    }
  }
  
  const importPreferences = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        try {
          const importData = JSON.parse(event.target.result)
          
          if (importData.preferences) {
            preferences.value = {
              ...preferences.value,
              ...importData.preferences
            }
            hasUnsavedChanges.value = true
            resolve(true)
          } else {
            reject(new Error('Invalid preferences file format'))
          }
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }
  
  // IndexedDB utilities
  const saveToIndexedDB = (data) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('D2NutritionVibesDB', 1)
      
      request.onerror = () => reject(request.error)
      
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['preferences'], 'readwrite')
        const store = transaction.objectStore('preferences')
        
        const saveRequest = store.put({ id: 'user-preferences', data })
        
        saveRequest.onsuccess = () => resolve(true)
        saveRequest.onerror = () => reject(saveRequest.error)
      }
      
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'id' })
        }
      }
    })
  }
  
  const loadFromIndexedDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('D2NutritionVibesDB', 1)
      
      request.onerror = () => reject(request.error)
      
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['preferences'], 'readonly')
        const store = transaction.objectStore('preferences')
        
        const getRequest = store.get('user-preferences')
        
        getRequest.onsuccess = () => {
          const result = getRequest.result
          resolve(result ? result.data : null)
        }
        
        getRequest.onerror = () => reject(getRequest.error)
      }
      
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'id' })
        }
      }
    })
  }
  
  // Auto-save when preferences change
  let saveTimeout = null
  watch(preferences, () => {
    hasUnsavedChanges.value = true
    
    // Debounce auto-save
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    
    saveTimeout = setTimeout(() => {
      savePreferences()
    }, 2000) // Auto-save after 2 seconds of inactivity
  }, { deep: true })
  
  // Load preferences on store creation
  loadPreferences()

  return {
    // State
    preferences,
    savedPreferences,
    hasUnsavedChanges,
    
    // Computed
    currentTheme,
    currentLanguage,
    isHighContrast,
    areAnimationsEnabled,
    notificationSettings,
    dataSettings,
    visualizationSettings,
    accessibilitySettings,
    privacySettings,
    
    // Actions
    setPreference,
    setPreferences,
    getPreference,
    resetPreference,
    resetAllPreferences,
    savePreferences,
    loadPreferences,
    exportPreferences,
    importPreferences
  }
})