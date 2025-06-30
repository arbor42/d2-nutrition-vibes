import { Ref, ComputedRef } from 'vue'

export interface DataFilters {
  countries: string[]
  elements: string[]
  items: string[]
}

export interface SelectedYears {
  start: number
  end: number
}

export interface LoadingStates {
  [key: string]: boolean
}

export interface Errors {
  [key: string]: string | null
}

export interface DataStore {
  // State
  geoData: Ref<any>
  productionData: Ref<Map<string, any>>
  forecastData: Ref<Map<string, any>>
  timeseriesData: Ref<any>
  networkData: Ref<any>
  summaryData: Ref<any>
  dataIndex: Ref<any>
  faoMetadata: Ref<any>
  calorieData: Ref<any>
  
  // ML-specific state
  mlIndex: Ref<any>
  mlComprehensiveIndex: Ref<any>
  mlGlobalIndex: Ref<any>
  mlRegionalIndex: Ref<any>
  mlCountryIndex: Ref<any>
  
  // Enhanced state
  selectedProduct: Ref<string>
  selectedRegion: Ref<string>
  selectedYears: Ref<SelectedYears>
  dataFilters: Ref<DataFilters>
  currentData: Ref<any[]>
  dataCache: Ref<Map<string, any>>
  lastUpdated: Ref<Date | null>
  
  // Loading states
  loading: Ref<boolean>
  loadingStates: Ref<Map<string, boolean>>
  errors: Ref<Map<string, string | null>>
  
  // Computed properties
  isLoading: ComputedRef<boolean>
  hasGeoData: ComputedRef<boolean>
  hasData: ComputedRef<boolean>
  isDataLoaded: ComputedRef<boolean>
  
  // Actions (methods)
  loadGeoData(): Promise<void>
  loadProductionData(filters?: any): Promise<void>
  loadTimeseriesData(filters?: any): Promise<void>
  clearCache(): void
  getProductionData(country: string, product: string, year: number): any
  getTimeseriesData(filters: any): any[]
  updateFilters(filters: Partial<DataFilters>): void
  setSelectedProduct(product: string): void
  setSelectedRegion(region: string): void
  setSelectedYears(years: SelectedYears): void
  
  // Additional methods from actual implementation
  initializeApp(): Promise<void>
}

export declare const useDataStore: () => DataStore