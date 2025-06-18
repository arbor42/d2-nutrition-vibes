/**
 * TypeScript type definitions for Pinia stores
 */

import { Ref } from 'vue'
import { 
  GeoCollection, 
  ProductionDataset, 
  ForecastDataset, 
  TimeseriesData,
  NetworkData,
  SummaryData,
  DataIndex,
  FAOMetadata
} from './data'

// Data Store Types
export interface DataStoreState {
  geoData: Ref<GeoCollection | null>
  productionData: Ref<Map<string, ProductionDataset>>
  forecastData: Ref<Map<string, ForecastDataset>>
  timeseriesData: Ref<TimeseriesData[] | null>
  networkData: Ref<NetworkData | null>
  summaryData: Ref<SummaryData | null>
  dataIndex: Ref<DataIndex | null>
  faoMetadata: Ref<FAOMetadata | null>
  selectedProduct: Ref<string>
  selectedRegion: Ref<string>
  selectedYears: Ref<{ start: number; end: number }>
  dataFilters: Ref<DataFilters>
  loadingStates: Ref<Record<string, boolean>>
  errorStates: Ref<Record<string, string | null>>
  cacheTimestamps: Ref<Record<string, number>>
}

export interface DataFilters {
  countries: string[]
  products: string[]
  metrics: string[]
  regions: string[]
  yearRange: { start: number; end: number }
  dataQuality: 'all' | 'high' | 'verified'
  includeEstimates: boolean
  minConfidence: number
}

// UI Store Types
export interface UIStoreState {
  sidebarOpen: Ref<boolean>
  activePanel: Ref<string>
  theme: Ref<'light' | 'dark' | 'auto'>
  language: Ref<string>
  notifications: Ref<Notification[]>
  modals: Ref<Modal[]>
  loading: Ref<boolean>
  globalError: Ref<string | null>
  viewSettings: Ref<ViewSettings>
  panelStates: Ref<Record<string, PanelState>>
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  actions?: NotificationAction[]
  timestamp: Date
  read: boolean
}

export interface NotificationAction {
  text: string
  action: () => void
  style?: 'primary' | 'secondary' | 'danger'
}

export interface Modal {
  id: string
  component: string
  props?: Record<string, any>
  persistent?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export interface ViewSettings {
  mapZoom: number
  mapCenter: [number, number]
  chartAnimations: boolean
  tooltips: boolean
  gridLines: boolean
  colorScheme: string
  dataPoints: boolean
  legends: boolean
}

export interface PanelState {
  minimized: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  data: Record<string, any>
}

// Visualization Store Types
export interface VisualizationStoreState {
  activeVisualizations: Ref<string[]>
  visualizationStates: Ref<Record<string, VisualizationState>>
  sharedScale: Ref<boolean>
  colorScheme: Ref<string>
  animationSpeed: Ref<number>
  interactionMode: Ref<'select' | 'brush' | 'zoom' | 'pan'>
  selections: Ref<Record<string, Selection>>
  brushes: Ref<Record<string, Brush>>
  zooms: Ref<Record<string, ZoomTransform>>
}

export interface VisualizationState {
  type: 'map' | 'chart' | 'table' | 'network'
  config: VisualizationConfig
  data: any
  loading: boolean
  error: string | null
  lastUpdate: Date
}

export interface VisualizationConfig {
  title?: string
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
  responsive: boolean
  interactive: boolean
  exportable: boolean
  [key: string]: any
}

export interface Selection {
  type: 'single' | 'multiple' | 'range'
  items: string[]
  data: any[]
}

export interface Brush {
  x0: number
  y0: number
  x1: number
  y1: number
  active: boolean
}

export interface ZoomTransform {
  k: number // scale
  x: number // translate x
  y: number // translate y
}

// User Preferences Store Types
export interface UserPreferencesState {
  theme: Ref<'light' | 'dark' | 'auto'>
  language: Ref<string>
  defaultView: Ref<string>
  chartSettings: Ref<ChartSettings>
  dataSettings: Ref<DataSettings>
  exportSettings: Ref<ExportSettings>
  accessibility: Ref<AccessibilitySettings>
  performance: Ref<PerformanceSettings>
}

export interface ChartSettings {
  animationDuration: number
  showTooltips: boolean
  showLegend: boolean
  colorScheme: string
  fontSize: number
  strokeWidth: number
  opacity: number
}

export interface DataSettings {
  cacheDuration: number
  autoRefresh: boolean
  downloadQuality: 'low' | 'medium' | 'high'
  compressionLevel: number
  offlineMode: boolean
  syncSettings: boolean
}

export interface ExportSettings {
  defaultFormat: 'csv' | 'json' | 'xlsx' | 'png' | 'svg'
  imageResolution: number
  csvDelimiter: string
  includeMetadata: boolean
  compressionEnabled: boolean
}

export interface AccessibilitySettings {
  reducedMotion: boolean
  highContrast: boolean
  screenReaderOptimized: boolean
  keyboardNavigation: boolean
  focusIndicators: boolean
}

export interface PerformanceSettings {
  virtualization: boolean
  lazyLoading: boolean
  debounceMs: number
  maxCacheSize: number
  webWorkers: boolean
}

// Store Action Types
export interface DataStoreActions {
  loadGeoData: (type?: string) => Promise<GeoCollection>
  loadProductionData: (product: string, year: number) => Promise<ProductionDataset>
  loadForecastData: (key: string) => Promise<ForecastDataset>
  loadTimeseriesData: () => Promise<TimeseriesData[]>
  clearCache: (pattern?: string) => void
  setFilters: (filters: Partial<DataFilters>) => void
  selectProduct: (product: string) => void
  selectRegion: (region: string) => void
  setYearRange: (start: number, end: number) => void
}

export interface UIStoreActions {
  toggleSidebar: () => void
  setActivePanel: (panel: string) => void
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  removeNotification: (id: string) => void
  openModal: (id: string, component: string, props?: Record<string, any>) => void
  closeModal: (id: string) => void
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  setLanguage: (language: string) => void
}

export interface VisualizationStoreActions {
  addVisualization: (id: string, type: string, config: VisualizationConfig) => void
  removeVisualization: (id: string) => void
  updateVisualizationData: (id: string, data: any) => void
  setSelection: (id: string, selection: Selection) => void
  setBrush: (id: string, brush: Brush) => void
  setZoom: (id: string, transform: ZoomTransform) => void
  resetVisualization: (id: string) => void
}

// Computed Properties Types
export interface DataStoreGetters {
  availableProducts: Ref<string[]>
  availableYears: Ref<number[]>
  availableCountries: Ref<string[]>
  filteredData: Ref<any>
  isLoading: Ref<boolean>
  hasErrors: Ref<boolean>
  dataCompleteness: Ref<number>
}

export interface UIStoreGetters {
  unreadNotifications: Ref<Notification[]>
  activeModals: Ref<Modal[]>
  currentTheme: Ref<string>
  isDarkMode: Ref<boolean>
  isLightMode: Ref<boolean>
}

export interface VisualizationStoreGetters {
  activeVisualizationConfigs: Ref<Record<string, VisualizationConfig>>
  hasSelections: Ref<boolean>
  selectedData: Ref<any[]>
  visualizationCount: Ref<number>
}