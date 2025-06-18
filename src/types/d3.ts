/**
 * TypeScript type definitions for D3.js integrations
 */

import * as d3 from 'd3'
import { Ref } from 'vue'

// D3 Selection Types for Vue integration
export type D3Selection = d3.Selection<any, any, any, any>
export type D3Transition = d3.Transition<any, any, any, any>
export type D3Scale = d3.ScaleLinear<any, any> | d3.ScaleOrdinal<any, any> | d3.ScaleTime<any, any>

// Chart Configuration Types
export interface ChartConfig {
  width: number
  height: number
  margin: {
    top: number
    right: number
    bottom: number
    left: number
  }
  responsive: boolean
  animated: boolean
  interactive: boolean
}

export interface ChartData {
  [key: string]: any
}

// Map Visualization Types
export interface MapConfig extends ChartConfig {
  projection: 'mercator' | 'naturalEarth1' | 'orthographic' | 'robinson'
  zoomExtent: [number, number]
  enableZoom: boolean
  enablePan: boolean
  showGraticule: boolean
}

export interface MapFeatureStyle {
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
}

export interface MapTooltipData {
  name: string
  value: number
  unit: string
  additional?: Record<string, any>
}

// Chart Visualization Types
export interface LineChartConfig extends ChartConfig {
  showPoints: boolean
  pointRadius: number
  curveType: 'linear' | 'cardinal' | 'basis' | 'monotone'
  showGrid: boolean
  xAxisFormat: string
  yAxisFormat: string
}

export interface BarChartConfig extends ChartConfig {
  orientation: 'horizontal' | 'vertical'
  barPadding: number
  showValues: boolean
  groupPadding: number
}

export interface ScatterPlotConfig extends ChartConfig {
  pointRadius: number
  enableBrush: boolean
  enableZoom: boolean
  regressionLine: boolean
}

// Network Visualization Types
export interface NetworkConfig extends ChartConfig {
  linkDistance: number
  linkStrength: number
  chargeStrength: number
  enableDrag: boolean
  enableSimulation: boolean
  nodeRadius: d3.ScaleLinear<number, number> | number
}

export interface NetworkNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  group: string
  value: number
  type: string
}

export interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  value: number
  type: string
}

// Composable Types for D3 Integration
export interface D3ChartComposable {
  svgRef: Ref<SVGSVGElement | null>
  containerRef: Ref<HTMLDivElement | null>
  dimensions: Ref<{ width: number; height: number }>
  scales: Ref<Record<string, D3Scale>>
  selections: Ref<Record<string, D3Selection>>
  
  initChart: () => void
  updateChart: (data: ChartData[]) => void
  resizeChart: () => void
  destroyChart: () => void
}

export interface D3MapComposable extends D3ChartComposable {
  projection: Ref<d3.GeoProjection>
  path: Ref<d3.GeoPath>
  zoom: Ref<d3.ZoomBehavior<any, any>>
  
  updateProjection: () => void
  updateData: (geoData: any, valueData: any) => void
  handleZoom: (event: any) => void
  resetZoom: () => void
}

export interface D3NetworkComposable extends D3ChartComposable {
  simulation: Ref<d3.Simulation<NetworkNode, NetworkLink>>
  nodes: Ref<NetworkNode[]>
  links: Ref<NetworkLink[]>
  
  startSimulation: () => void
  stopSimulation: () => void
  restartSimulation: () => void
  updateForces: () => void
}

// Animation and Transition Types
export interface AnimationConfig {
  duration: number
  delay: number
  ease: d3.EasingFunction
  stagger: number
}

export interface TransitionConfig {
  enter: AnimationConfig
  update: AnimationConfig
  exit: AnimationConfig
}

// Color and Style Types
export interface ColorScheme {
  name: string
  type: 'sequential' | 'diverging' | 'categorical'
  colors: string[]
  domain?: [number, number]
}

export interface StyleConfig {
  colors: ColorScheme
  fonts: {
    family: string
    sizes: Record<string, number>
    weights: Record<string, string>
  }
  spacing: Record<string, number>
  borderRadius: number
}

// Interaction Types
export interface BrushConfig {
  enabled: boolean
  mode: 'x' | 'y' | 'xy'
  onBrush: (selection: any) => void
  onEnd: (selection: any) => void
}

export interface ZoomConfig {
  enabled: boolean
  scaleExtent: [number, number]
  translateExtent: [[number, number], [number, number]]
  onZoom: (transform: d3.ZoomTransform) => void
}

export interface TooltipConfig {
  enabled: boolean
  followMouse: boolean
  offset: [number, number]
  className: string
  format: (data: any) => string
}

// Event Types
export interface ChartEvent {
  type: 'click' | 'mouseover' | 'mouseout' | 'brush' | 'zoom'
  data: any
  element: Element
  coordinates: [number, number]
}

export interface ChartEventHandlers {
  onClick?: (event: ChartEvent) => void
  onMouseOver?: (event: ChartEvent) => void
  onMouseOut?: (event: ChartEvent) => void
  onBrush?: (selection: any) => void
  onZoom?: (transform: d3.ZoomTransform) => void
}

// Data Processing Types
export interface DataProcessor<T> {
  process: (data: T[]) => T[]
  filter: (data: T[], criteria: any) => T[]
  sort: (data: T[], key: string, order: 'asc' | 'desc') => T[]
  group: (data: T[], key: string) => Record<string, T[]>
  aggregate: (data: T[], groupKey: string, valueKey: string, method: 'sum' | 'mean' | 'count') => any[]
}

// Utility Types
export interface Bounds {
  x: [number, number]
  y: [number, number]
}

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

// Export types for specific visualization components
export interface WorldMapProps {
  geoData: any
  valueData: any[]
  config: MapConfig
  colorScheme: ColorScheme
  onFeatureClick?: (feature: any) => void
  onFeatureHover?: (feature: any) => void
}

export interface TimeseriesChartProps {
  data: any[]
  config: LineChartConfig
  xKey: string
  yKey: string
  colorKey?: string
  onPointClick?: (point: any) => void
}

export interface NetworkGraphProps {
  nodes: NetworkNode[]
  links: NetworkLink[]
  config: NetworkConfig
  onNodeClick?: (node: NetworkNode) => void
  onLinkClick?: (link: NetworkLink) => void
}

// Legend Types
export interface LegendConfig {
  type: 'continuous' | 'discrete'
  position: 'top' | 'right' | 'bottom' | 'left'
  title?: string
  format?: string
  tickCount?: number
  width?: number
  height?: number
}

export interface LegendItem {
  color: string
  label: string
  value?: number
}