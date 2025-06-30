import { Ref, ComputedRef } from 'vue'

export interface PanelState {
  visible: boolean
  minimized: boolean
  expanded: boolean
  loading: boolean
  error: string | null
}

export interface PanelStates {
  dashboard: PanelState
  timeseries: PanelState
  simulation: PanelState
  ml: PanelState
  [key: string]: PanelState
}

export interface UIStore {
  // Enhanced state
  theme: Ref<'light' | 'dark'>
  sidebarOpen: Ref<boolean>
  currentPanel: Ref<string>
  activePanel: Ref<string>
  selectedCountry: Ref<string>
  selectedProduct: Ref<string>
  selectedMetric: Ref<string>
  selectedYear: Ref<number>
  showAnalysisMenu: Ref<boolean>
  mapZoom: Ref<number>
  mapCenter: Ref<[number, number]>
  darkMode: Ref<boolean>
  loadingMessages: Ref<string[]>
  isUserInteraction: Ref<boolean>
  
  // URL state management
  currentTab: Ref<string>
  yearFrom: Ref<number | null>
  yearTo: Ref<number | null>
  viewMode: Ref<string>
  colorScheme: Ref<string>
  zoomLevel: Ref<number>
  zoomCenter: Ref<[number, number] | null>
  
  // Enhanced UI state
  loading: Ref<boolean>
  modals: Ref<Record<string, any>>
  tooltips: Ref<Record<string, any>>
  currentView: Ref<string>
  layoutMode: Ref<string>
  compactMode: Ref<boolean>
  showDebugInfo: Ref<boolean>
  
  // Navigation state
  navigationHistory: Ref<string[]>
  currentRoute: Ref<string>
  breadcrumbs: Ref<any[]>
  
  // Panel states
  panelStates: Ref<PanelStates>
  
  // Computed properties
  isDarkMode: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  currentPanelState: ComputedRef<PanelState>
  
  // Actions
  toggleTheme(): void
  toggleSidebar(): void
  setCurrentPanel(panel: string): void
  setSelectedCountry(country: string): void
  setSelectedProduct(product: string): void
  setSelectedMetric(metric: string): void
  setSelectedYear(year: number): void
  setMapZoom(zoom: number): void
  setMapCenter(center: [number, number]): void
  updatePanelState(panel: string, state: Partial<PanelState>): void
  showModal(id: string, data?: any): void
  hideModal(id: string): void
  addLoadingMessage(message: string): void
  removeLoadingMessage(message: string): void
  setUserInteraction(isUser: boolean): void
  
  // Additional methods from actual implementation
  initializeUI(): void
  clearLoadingMessages(): void
  savePreferences(): void
  toggleDarkMode(): void
  toggleAnalysisMenu(): void
  showPanel(panel: string): void
  resetUI(): void
  globalLoading: ComputedRef<boolean>
  loadingMessage: ComputedRef<string>
}

export declare const useUIStore: () => UIStore