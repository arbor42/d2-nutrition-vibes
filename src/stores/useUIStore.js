import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // Enhanced state for Phase 5
  const theme = ref('light')
  const sidebarOpen = ref(false)
  const currentPanel = ref('dashboard')
  const activePanel = ref('dashboard')
  const selectedCountry = ref('')
  const selectedProduct = ref('Wheat and products')
  const selectedMetric = ref('production')
  const selectedYear = ref(2022)
  const showAnalysisMenu = ref(false)
  const mapZoom = ref(1)
  const mapCenter = ref([0, 0])
  const darkMode = ref(false)
  const loadingMessages = ref([])
  
  // Enhanced UI state
  const loading = ref(false)
  const modals = ref({})
  const tooltips = ref({})
  const currentView = ref('overview')
  const layoutMode = ref('default')
  const compactMode = ref(false)
  const showDebugInfo = ref(false)
  
  // Navigation state
  const navigationHistory = ref([])
  const currentRoute = ref('/')
  const breadcrumbs = ref([])
  
  // Enhanced panel states
  const panelStates = ref({
    dashboard: { visible: true, minimized: false, expanded: true, loading: false, error: null },
    timeseries: { visible: false, minimized: false, expanded: true, loading: false, error: null },
    simulation: { visible: false, minimized: false, expanded: false, loading: false, error: null },
    ml: { visible: false, minimized: false, expanded: false, loading: false, error: null },
  })
  
  // UI preferences
  const preferences = ref({
    language: 'de',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: 'de-DE',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    animationsEnabled: true,
    soundEnabled: false,
    highContrast: false,
    reducedMotion: false
  })
  
  // Responsive breakpoints
  const breakpoints = ref({
    xs: 480,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    xxl: 1536
  })
  
  const viewport = ref({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    isMobile: false,
    isTablet: false,
    isDesktop: true
  })

  // Enhanced computed properties for Phase 5
  const getCurrentPanel = computed(() => currentPanel.value)
  const getSelectedFilters = computed(() => ({
    country: selectedCountry.value,
    product: selectedProduct.value,
    metric: selectedMetric.value,
    year: selectedYear.value
  }))
  
  const isDarkMode = computed(() => theme.value === 'dark' || darkMode.value)
  const isMobile = computed(() => viewport.value.width < breakpoints.value.md)
  const isTablet = computed(() => 
    viewport.value.width >= breakpoints.value.md && 
    viewport.value.width < breakpoints.value.lg
  )
  const isDesktop = computed(() => viewport.value.width >= breakpoints.value.lg)
  
  const availablePanels = computed(() => Object.keys(panelStates.value))
  const visiblePanels = computed(() => 
    Object.entries(panelStates.value)
      .filter(([_, state]) => state.visible)
      .map(([panel]) => panel)
  )
  const expandedPanels = computed(() => 
    Object.entries(panelStates.value)
      .filter(([_, state]) => state.expanded)
      .map(([panel]) => panel)
  )
  
  const isPanelVisible = computed(() => (panelName) => {
    return panelStates.value[panelName]?.visible || false
  })
  const isPanelMinimized = computed(() => (panelName) => {
    return panelStates.value[panelName]?.minimized || false
  })
  const isPanelExpanded = computed(() => (panelName) => {
    return panelStates.value[panelName]?.expanded || false
  })
  const isPanelLoading = computed(() => (panelName) => {
    return panelStates.value[panelName]?.loading || false
  })
  const getPanelError = computed(() => (panelName) => {
    return panelStates.value[panelName]?.error || null
  })
  
  const isLoading = computed(() => 
    loading.value || 
    loadingMessages.value.length > 0 || 
    Object.values(panelStates.value).some(state => state.loading)
  )
  const hasErrors = computed(() => 
    Object.values(panelStates.value).some(state => state.error)
  )

  // Actions
  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }

  const setSidebarOpen = (open) => {
    sidebarOpen.value = open
  }

  const setCurrentPanel = (panel) => {
    currentPanel.value = panel
    // Show the selected panel
    if (panelStates.value[panel]) {
      panelStates.value[panel].visible = true
      panelStates.value[panel].minimized = false
    }
  }

  const toggleAnalysisMenu = () => {
    showAnalysisMenu.value = !showAnalysisMenu.value
  }

  const setSelectedCountry = (country) => {
    selectedCountry.value = country
  }

  const setSelectedProduct = (product) => {
    selectedProduct.value = product
  }

  const setSelectedMetric = (metric) => {
    selectedMetric.value = metric
  }

  const setSelectedYear = (year) => {
    selectedYear.value = year
  }

  const setMapView = (zoom, center) => {
    mapZoom.value = zoom
    mapCenter.value = center
  }

  const toggleDarkMode = () => {
    darkMode.value = !darkMode.value
    // Apply dark mode class to document
    if (darkMode.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const showPanel = (panelName) => {
    if (panelStates.value[panelName]) {
      panelStates.value[panelName].visible = true
      panelStates.value[panelName].minimized = false
      currentPanel.value = panelName
    }
  }

  const hidePanel = (panelName) => {
    if (panelStates.value[panelName]) {
      panelStates.value[panelName].visible = false
    }
  }

  const togglePanel = (panelName) => {
    if (panelStates.value[panelName]) {
      panelStates.value[panelName].visible = !panelStates.value[panelName].visible
    }
  }

  const minimizePanel = (panelName) => {
    if (panelStates.value[panelName]) {
      panelStates.value[panelName].minimized = true
    }
  }

  const maximizePanel = (panelName) => {
    if (panelStates.value[panelName]) {
      panelStates.value[panelName].minimized = false
    }
  }


  const addLoadingMessage = (message) => {
    const id = Date.now() + Math.random()
    loadingMessages.value.push({ id, message })
    return id
  }

  const removeLoadingMessage = (id) => {
    const index = loadingMessages.value.findIndex(m => m.id === id)
    if (index > -1) {
      loadingMessages.value.splice(index, 1)
    }
  }

  const clearLoadingMessages = () => {
    loadingMessages.value = []
  }

  // Batch update filters
  const updateFilters = (filters) => {
    if (filters.country !== undefined) selectedCountry.value = filters.country
    if (filters.product !== undefined) selectedProduct.value = filters.product
    if (filters.metric !== undefined) selectedMetric.value = filters.metric
    if (filters.year !== undefined) selectedYear.value = filters.year
  }

  // Reset UI state
  const resetUI = () => {
    currentPanel.value = 'dashboard'
    selectedCountry.value = ''
    selectedProduct.value = 'Wheat and products'
    selectedMetric.value = 'production'
    selectedYear.value = 2022
    showAnalysisMenu.value = false
    mapZoom.value = 1
    mapCenter.value = [0, 0]
    loadingMessages.value = []
    
    // Reset panel states
    Object.keys(panelStates.value).forEach(key => {
      panelStates.value[key] = { visible: key === 'dashboard', minimized: false }
    })
  }

  // Initialize UI with saved preferences
  const initializeUI = () => {
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode')
    if (savedDarkMode === 'true') {
      darkMode.value = true
      document.documentElement.classList.add('dark')
    }

    // Load other preferences from localStorage
    const savedFilters = localStorage.getItem('uiFilters')
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters)
        updateFilters(filters)
      } catch (error) {
        console.warn('Failed to load UI filters from localStorage:', error)
      }
    }

  }

  // Save preferences to localStorage
  const savePreferences = () => {
    localStorage.setItem('darkMode', darkMode.value.toString())
    localStorage.setItem('theme', theme.value)
    localStorage.setItem('uiFilters', JSON.stringify(getSelectedFilters.value))
    localStorage.setItem('uiPreferences', JSON.stringify(preferences.value))
  }

  // Enhanced actions for Phase 5
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    darkMode.value = theme.value === 'dark'
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDarkMode.value)
    }
  }
  
  const setTheme = (newTheme) => {
    theme.value = newTheme
    darkMode.value = newTheme === 'dark'
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDarkMode.value)
    }
  }
  
  const setActivePanel = (panel) => {
    if (availablePanels.value.includes(panel)) {
      activePanel.value = panel
      currentPanel.value = panel
      // Add to navigation history
      navigationHistory.value.push({
        panel,
        timestamp: new Date(),
        path: currentRoute.value
      })
      
      // Limit history size
      if (navigationHistory.value.length > 50) {
        navigationHistory.value = navigationHistory.value.slice(-50)
      }
    }
  }
  
  const expandPanel = (panel) => {
    if (panelStates.value[panel]) {
      panelStates.value[panel].expanded = true
    }
  }
  
  const collapsePanel = (panel) => {
    if (panelStates.value[panel]) {
      panelStates.value[panel].expanded = false
    }
  }
  
  const setPanelLoading = (panel, isLoading) => {
    if (panelStates.value[panel]) {
      panelStates.value[panel].loading = isLoading
    }
  }
  
  const setPanelError = (panel, error) => {
    if (panelStates.value[panel]) {
      panelStates.value[panel].error = error
    }
  }
  
  const clearPanelError = (panel) => {
    if (panelStates.value[panel]) {
      panelStates.value[panel].error = null
    }
  }
  
  const openModal = (modalId, config = {}) => {
    modals.value[modalId] = {
      open: true,
      config,
      timestamp: new Date()
    }
  }
  
  const closeModal = (modalId) => {
    if (modals.value[modalId]) {
      modals.value[modalId].open = false
    }
  }
  
  const isModalOpen = (modalId) => {
    return modals.value[modalId]?.open || false
  }
  
  const showTooltip = (tooltipId, config) => {
    tooltips.value[tooltipId] = {
      visible: true,
      config,
      timestamp: new Date()
    }
  }
  
  const hideTooltip = (tooltipId) => {
    if (tooltips.value[tooltipId]) {
      tooltips.value[tooltipId].visible = false
    }
  }
  
  const setCurrentView = (view) => {
    currentView.value = view
  }
  
  const setLayoutMode = (mode) => {
    layoutMode.value = mode
  }
  
  const setCompactMode = (isCompact) => {
    compactMode.value = isCompact
  }
  
  const updateViewport = () => {
    if (typeof window !== 'undefined') {
      viewport.value = {
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth < breakpoints.value.md,
        isTablet: window.innerWidth >= breakpoints.value.md && window.innerWidth < breakpoints.value.lg,
        isDesktop: window.innerWidth >= breakpoints.value.lg
      }
      
      // Auto-close sidebar on mobile
      if (viewport.value.isMobile && sidebarOpen.value) {
        sidebarOpen.value = false
      }
    }
  }
  
  const setPreference = (key, value) => {
    if (preferences.value.hasOwnProperty(key)) {
      preferences.value[key] = value
    }
  }
  
  const updateBreadcrumbs = (crumbs) => {
    breadcrumbs.value = crumbs
  }
  
  const setGlobalLoading = (isLoading) => {
    loading.value = isLoading
  }


  // Initialize viewport on client side
  if (typeof window !== 'undefined') {
    updateViewport()
    window.addEventListener('resize', updateViewport)
  }

  return {
    // State
    theme,
    sidebarOpen,
    currentPanel,
    activePanel,
    selectedCountry,
    selectedProduct,
    selectedMetric,
    selectedYear,
    showAnalysisMenu,
    mapZoom,
    mapCenter,
    darkMode,
    loadingMessages,
    panelStates,
    loading,
    modals,
    tooltips,
    currentView,
    layoutMode,
    compactMode,
    showDebugInfo,
    navigationHistory,
    currentRoute,
    breadcrumbs,
    preferences,
    viewport,
    breakpoints,

    // Computed
    getCurrentPanel,
    getSelectedFilters,
    isDarkMode,
    isMobile,
    isTablet,
    isDesktop,
    availablePanels,
    visiblePanels,
    expandedPanels,
    isPanelVisible,
    isPanelMinimized,
    isPanelExpanded,
    isPanelLoading,
    getPanelError,
    isLoading,
    hasErrors,

    // Actions
    toggleSidebar,
    setSidebarOpen,
    setCurrentPanel,
    setActivePanel,
    toggleAnalysisMenu,
    setSelectedCountry,
    setSelectedProduct,
    setSelectedMetric,
    setSelectedYear,
    setMapView,
    toggleDarkMode,
    toggleTheme,
    setTheme,
    showPanel,
    hidePanel,
    togglePanel,
    minimizePanel,
    maximizePanel,
    expandPanel,
    collapsePanel,
    setPanelLoading,
    setPanelError,
    clearPanelError,
    addLoadingMessage,
    removeLoadingMessage,
    clearLoadingMessages,
    updateFilters,
    resetUI,
    initializeUI,
    savePreferences,
    openModal,
    closeModal,
    isModalOpen,
    showTooltip,
    hideTooltip,
    setCurrentView,
    setLayoutMode,
    setCompactMode,
    updateViewport,
    setPreference,
    updateBreadcrumbs,
    setGlobalLoading
  }
})