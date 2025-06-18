/**
 * TypeScript type definitions for D2 Nutrition Vibes data structures
 */

// Geographic data types
export interface GeoFeature {
  type: 'Feature'
  properties: {
    name: string
    iso_a3: string
    iso_n3: string
    [key: string]: any
  }
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][] | number[][][]
  }
}

export interface GeoCollection {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

// FAO Production data types
export interface ProductionData {
  country: string
  countryCode: string
  product: string
  year: number
  value: number
  unit: string
  flag?: string
}

export interface ProductionDataset {
  metadata: {
    product: string
    year: number
    unit: string
    source: string
  }
  data: ProductionData[]
}

// ML Forecast data types
export interface ForecastData {
  region: string
  product: string
  year: number
  predicted_value: number
  confidence_interval_lower: number
  confidence_interval_upper: number
  model_used: string
}

export interface ForecastDataset {
  metadata: {
    region: string
    product: string
    model: string
    forecast_years: number[]
    created_at: string
  }
  forecasts: ForecastData[]
}

// Timeseries data types
export interface TimeseriesPoint {
  year: number
  value: number
  country: string
  product: string
}

export interface TimeseriesData {
  country: string
  product: string
  data: TimeseriesPoint[]
}

// Index data types
export interface DataIndex {
  version: string
  lastUpdated: string
  description: string
  datasets: {
    geo: {
      path: string
      description: string
      files: Record<string, string>
    }
    fao: {
      path: string
      description: string
      index: string
      metadata: string
      [key: string]: string
    }
  }
  products: string[]
  years: number[]
  metrics: string[]
}

export interface FAOIndex {
  products: string[]
  years: number[]
  countries: string[]
  metrics: string[]
  files: Record<string, string[]>
}

export interface FAOMetadata {
  description: string
  source: string
  license: string
  lastUpdated: string
  products: Record<string, {
    name: string
    description: string
    unit: string
  }>
  countries: Record<string, {
    name: string
    iso_a3: string
    iso_n3: string
    region: string
  }>
}

// Network analysis types
export interface NetworkNode {
  id: string
  name: string
  type: 'country' | 'product' | 'region'
  value: number
  group: string
}

export interface NetworkLink {
  source: string
  target: string
  value: number
  type: 'trade' | 'production' | 'dependency'
}

export interface NetworkData {
  nodes: NetworkNode[]
  links: NetworkLink[]
  metadata: {
    description: string
    year: number
    type: string
  }
}

// Summary statistics types
export interface SummaryStats {
  product: string
  year: number
  total_production: number
  top_producers: Array<{
    country: string
    value: number
    percentage: number
  }>
  regions: Record<string, {
    total: number
    percentage: number
    countries: number
  }>
}

export interface SummaryData {
  global: SummaryStats[]
  by_product: Record<string, SummaryStats[]>
  by_region: Record<string, SummaryStats[]>
}

// Trade balance types
export interface TradeBalance {
  country: string
  product: string
  year: number
  imports: number
  exports: number
  balance: number
  self_sufficiency_ratio: number
}

export interface TradeBalanceData {
  metadata: {
    description: string
    unit: string
    years: number[]
  }
  data: TradeBalance[]
}

// Vue.js specific types for reactive data
export interface DataState {
  loading: boolean
  error: string | null
  geoData: GeoCollection | null
  productionData: ProductionDataset | null
  forecastData: ForecastDataset | null
  timeseriesData: TimeseriesData[] | null
  networkData: NetworkData | null
  summaryData: SummaryData | null
  tradeBalance: TradeBalanceData | null
}

// API response types
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

// Component prop types
export interface MapProps {
  width: number
  height: number
  geoData: GeoCollection
  productionData?: ProductionDataset
  selectedYear: number
  selectedProduct: string
  selectedMetric: string
}

export interface ChartProps {
  data: any[]
  width: number
  height: number
  margin?: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

// Export utility types
export type DataLoadingState = 'idle' | 'loading' | 'success' | 'error'

export type ProductCode = 
  | 'cassava_and_products'
  | 'fruits_-_excluding_wine'
  | 'maize_and_products'
  | 'milk_-_excluding_butter'
  | 'nuts_and_products'
  | 'potatoes_and_products'
  | 'pulses'
  | 'rice_and_products'
  | 'sugar_and_sweeteners'
  | 'vegetables'
  | 'wheat_and_products'

export type MetricType = 'production' | 'imports' | 'exports' | 'balance'

export type YearRange = 2010 | 2011 | 2012 | 2013 | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022