<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onUnmounted, nextTick, watchEffect } from 'vue'
// Removed unused composables
import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'
import { useVisualizationStore } from '@/stores/useVisualizationStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { createD3AxisFormatter, createD3TooltipFormatter, getAxisUnitLabel, formatAgricultureValue } from '@/utils/formatters'

interface Props {
  width?: number
  height?: number
  selectedProduct?: string
  selectedYear?: number
  selectedMetric?: string
  colorFilter?: {
    selectedIndices: number[]
    selectedColors: string[]
  }
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 600,
  selectedProduct: 'Wheat and products',
  selectedYear: 2022,
  selectedMetric: 'production',
  colorFilter: () => ({ selectedIndices: [], selectedColors: [] })
})

const emit = defineEmits<{
  countryClick: [country: string]
  countryHover: [country: string | null]
  legendUpdate: [legendData: { legendScale: any, legendDomain: [number, number], legendUnit: string }]
}>()

// Stores
const dataStore = useDataStore()
const uiStore = useUIStore()
const vizStore = useVisualizationStore()

// Refs
const containerRef = ref<HTMLDivElement>()
const svgContainerRef = ref<HTMLDivElement>()

// State with proper Vue reactivity
const isLoading = ref(false)
const error = ref<string | null>(null)
const geoDataStatic = shallowRef(null) // Use shallowRef for large objects
const productionDataStatic = shallowRef([]) // Use shallowRef for arrays
const isInitialized = ref(false)
const infoExpanded = ref(false) // State for collapsible info panel
const countryDetailVisible = ref(false) // State for country detail panel
const selectedCountryDetail = ref(null) // Selected country data for detail view

// Click debouncing to prevent unwanted country detail views
let lastClickTime = 0

// Legend state
const legendScale = ref(null)
const legendDomain = ref([0, 100000000]) // Static domain across years
const legendUnit = ref('1000 t') // Unit for legend display

// Computed legend data for Vue template
const legendData = computed(() => {
  if (!legendDomain.value || !legendUnit.value || !legendScale.value) return null
  
  const domain = legendDomain.value
  const numColors = greenColorScheme.length
  
  // Create legend items with percentile-based value ranges for each color
  const items = []
  
  // Check if we have percentile data from the color scale
  const percentiles = legendScale.value.percentiles ? legendScale.value.percentiles() : null
  
  for (let i = 0; i < numColors; i++) {
    let rangeStart, rangeEnd
    
    if (percentiles) {
      // Use percentile-based ranges
      rangeStart = i === 0 ? domain[0] : percentiles[i - 1]
      rangeEnd = i === numColors - 1 ? domain[1] : percentiles[i]
    } else {
      // Fallback to equal intervals if percentiles not available
      const stepSize = (domain[1] - domain[0]) / numColors
      rangeStart = domain[0] + (stepSize * i)
      rangeEnd = domain[0] + (stepSize * (i + 1))
    }
    
    // Use centralized formatting for start and end values
    const formattedStart = formatAgricultureValue(rangeStart, { 
      unit: legendUnit.value, 
      showUnit: true,
      longForm: false
    })
    const formattedEnd = formatAgricultureValue(rangeEnd, { 
      unit: legendUnit.value, 
      showUnit: true,
      longForm: false
    })
    
    // For display purposes, also get versions without units for compact display
    const formattedStartNoUnit = formatAgricultureValue(rangeStart, { 
      unit: legendUnit.value, 
      showUnit: false,
      longForm: false
    })
    const formattedEndNoUnit = formatAgricultureValue(rangeEnd, { 
      unit: legendUnit.value, 
      showUnit: false,
      longForm: false
    })
    
    items.push({
      color: greenColorScheme[i],
      rangeStart: rangeStart,
      rangeEnd: rangeEnd,
      formattedStart: formattedStart,
      formattedEnd: formattedEnd,
      formattedStartNoUnit: formattedStartNoUnit,
      formattedEndNoUnit: formattedEndNoUnit,
      rangeDisplay: `${formattedStart} - ${formattedEnd}`,
      percentile: percentiles ? `${(i * 10)}-${((i + 1) * 10)}%` : null,
      isLast: i === numColors - 1
    })
  }
  
  return {
    items,
    title: getLegendTitle(),
    min: domain[0],
    max: domain[1],
    unit: legendUnit.value,
    formattedMin: formatAgricultureValue(domain[0], { unit: legendUnit.value, showUnit: true, longForm: false }),
    formattedMax: formatAgricultureValue(domain[1], { unit: legendUnit.value, showUnit: true, longForm: false }),
    isPercentileBased: !!percentiles
  }
})

// Get legend title based on selected metric
const getLegendTitle = () => {
  const metricLabels = {
    'production': 'Produktion',
    'import_quantity': 'Import',
    'export_quantity': 'Export',
    'domestic_supply': 'Versorgung'
  }
  return metricLabels[props.selectedMetric] || 'Wert'
}

// Emit legend data when it changes
watchEffect(() => {
  if (legendScale.value && legendDomain.value && legendUnit.value) {
    emit('legendUpdate', {
      legendScale: legendScale.value,
      legendDomain: legendDomain.value,
      legendUnit: legendUnit.value
    })
  }
})

// Tooltip implementation with D3
let tooltipDiv = null

const tooltip = {
  element: null,
  
  init: () => {
    // Create tooltip div if it doesn't exist
    if (!tooltipDiv) {
      tooltipDiv = d3.select('body')
        .append('div')
        .attr('class', 'worldmap-tooltip')
        .style('position', 'absolute')
        .style('padding', '10px')
        .style('background', 'rgba(0, 0, 0, 0.9)')
        .style('color', 'white')
        .style('border-radius', '4px')
        .style('pointer-events', 'none')
        .style('font-size', '14px')
        .style('box-shadow', '0 2px 4px rgba(0,0,0,0.2)')
        .style('z-index', '9999')
        .style('opacity', 0)
        .style('transition', 'opacity 0.2s')
    }
    tooltip.element = tooltipDiv
  },
  
  show: (event, data, formatter) => {
    if (!tooltipDiv) tooltip.init()
    
    // Get content from formatter or use default
    const content = formatter ? formatter() : 'No data'
    
    // Get mouse position (dynamic positioning)
    const mouseX = event.pageX || event.clientX
    const mouseY = event.pageY || event.clientY
    
    tooltipDiv
      .html(content)
      .style('opacity', 1)
      .style('left', (mouseX + 10) + 'px')
      .style('top', (mouseY - 28) + 'px')
  },
  
  hide: () => {
    if (tooltipDiv) {
      tooltipDiv.style('opacity', 0)
    }
  },
  
  destroy: () => {
    if (tooltipDiv) {
      tooltipDiv.remove()
      tooltipDiv = null
    }
  }
}

// Processed production data (non-reactive)
const getProcessedProductionData = () => {
  if (!Array.isArray(productionDataStatic.value)) return []
  return productionDataStatic.value.filter(d => d.value > 0)
}

// Map elements
let projection: d3.GeoProjection
let path: d3.GeoPath
let colorScale: d3.ScaleQuantize<string>
let zoom: d3.ZoomBehavior<SVGElement, unknown>

// Viridis color scheme for production data (10 steps)
const greenColorScheme = [
  '#440154',  // Dark purple (lowest values)
  '#482878',  // Purple
  '#3E4A89',  // Blue
  '#32608D',  // Blue
  '#25818E',  // Teal
  '#20978C',  // Teal-green
  '#2AB07E',  // Green
  '#5DC863',  // Light green
  '#7DD151',  // Yellow-green
  '#FDE725'   // Yellow (highest values)
]

// Helper functions for color filtering
const getColorIndexForValue = (value: number, colorScale: any): number => {
  if (!colorScale || !colorScale.percentiles) return 0
  
  try {
    const percentiles = colorScale.percentiles()
    const domain = colorScale.domain()
    
    if (value <= domain[0]) return 0
    if (value >= domain[1]) return greenColorScheme.length - 1
    
    for (let i = 0; i < percentiles.length; i++) {
      if (value <= percentiles[i]) {
        return i + 1
      }
    }
    
    return greenColorScheme.length - 1
  } catch (error) {
    console.warn('🎨 Error getting color index:', error)
    return 0
  }
}

const getDimmedColor = (color: string): string => {
  try {
    // Create a more muted/grayed version of the color
    const d3Color = d3.color(color)
    if (d3Color) {
      return d3Color.copy({ opacity: 0.3 }).toString()
    }
    return color
  } catch (error) {
    console.warn('🎨 Error dimming color:', error)
    return color
  }
}

// Computed properties
const mapConfig = computed(() => ({
  projection: 'naturalEarth1',
  colorScheme: greenColorScheme,
  ...vizStore.getVisualizationConfig('worldMap')
}))

// Reactive country detail data
const reactiveCountryDetail = computed(() => {
  if (!selectedCountryDetail.value) return null
  
  const countryName = selectedCountryDetail.value.name
  const countryCode = selectedCountryDetail.value.code
  const normalizedName = normalizeCountryName(countryName || '')
  
  // Get fresh data based on current props
  const processedData = getProcessedProductionData()
  const countryData = processedData.find(
    item => item.countryCode === countryCode || 
             item.country.toLowerCase() === countryName?.toLowerCase() ||
             item.country.toLowerCase() === normalizedName?.toLowerCase()
  )
  
  return {
    name: countryName,
    code: countryCode,
    data: countryData,
    product: props.selectedProduct,
    year: props.selectedYear,
    metric: props.selectedMetric
  }
})

// Initialize map
const initializeMap = async () => {
  console.log('🚀 WorldMap: initializeMap called')
  console.log('🔍 WorldMap: Props:', {
    selectedProduct: props.selectedProduct,
    selectedYear: props.selectedYear,
    selectedMetric: props.selectedMetric
  })
  console.log('🔍 WorldMap: Store values:', {
    uiStoreProduct: uiStore.selectedProduct,
    uiStoreYear: uiStore.selectedYear,
    uiStoreMetric: uiStore.selectedMetric
  })
  console.log('🔍 WorldMap: containerRef.value:', containerRef.value)
  console.log('🔍 WorldMap: svgContainerRef.value:', svgContainerRef.value)
  console.log('🔍 WorldMap: isInitialized:', isInitialized.value)
  
  if (!containerRef.value || !svgContainerRef.value) {
    console.warn('⚠️ WorldMap: Container not ready')
    return
  }
  
  if (isInitialized.value) {
    console.warn('⚠️ WorldMap: Already initialized')
    return
  }
  
  isInitialized.value = true

  try {
    console.log('🔄 WorldMap: Starting map initialization...')
    isLoading.value = true
    error.value = null

    // Load geographic data
    console.log('📡 WorldMap: Loading geo data...')
    const loadedGeoData = await dataStore.loadGeoData('geo')
    console.log('✅ WorldMap: Geo data loaded:', loadedGeoData ? 'Success' : 'Failed')
    console.log('📊 WorldMap: Features count:', loadedGeoData?.features?.length || 'N/A')
    geoDataStatic.value = loadedGeoData

    // Initialize tooltip
    tooltip.init()
    
    // Initialize map with direct D3 approach (working solution)
    console.log('🚀 WorldMap: Creating map directly...')
    await createMapDirect(loadedGeoData)

  } catch (err) {
    error.value = 'Fehler beim Laden der Karte'
    console.error('❌ WorldMap: Map initialization error:', err)
    console.error('❌ WorldMap: Error stack:', err.stack)
  } finally {
    // Use requestAnimationFrame to avoid Vue reactivity issues
    requestAnimationFrame(() => {
      isLoading.value = false
      console.log('🏁 WorldMap: initializeMap finished')
    })
  }
}

// Create map directly (working approach from WorldMapSimple)
const createMapDirect = async (data) => {
  console.log('🎨 WorldMap: createMapDirect called')
  
  if (!svgContainerRef.value) {
    console.error('❌ WorldMap: No SVG container ref available')
    return
  }
  
  if (!data?.features || !Array.isArray(data.features)) {
    console.error('❌ WorldMap: Invalid geo data')
    return
  }

  // Store DOM element reference to avoid Vue reactivity
  const containerElement = svgContainerRef.value
  const container = d3.select(containerElement)
  
  // Clear existing content safely
  const existingSvg = container.select('svg')
  if (!existingSvg.empty()) {
    existingSvg.remove()
  }
  
  // Get dimensions with better fallbacks
  const containerRect = svgContainerRef.value.getBoundingClientRect()
  let width = containerRect.width
  let height = containerRect.height
  
  console.log('📐 WorldMap: SVG Container rect:', containerRect)
  console.log('📐 WorldMap: Main Container rect:', containerRef.value?.getBoundingClientRect())
  console.log('📐 WorldMap: Parent element rect:', svgContainerRef.value.parentElement?.getBoundingClientRect())
  
  // If container has no size, try parent elements
  if (width < 10 || height < 10) {
    // Try main container
    const mainRect = containerRef.value?.getBoundingClientRect()
    if (mainRect && mainRect.width > 10 && mainRect.height > 10) {
      width = mainRect.width
      height = mainRect.height
      console.log('📐 WorldMap: Using main container dimensions')
    } else if (svgContainerRef.value.parentElement) {
      // Try parent element
      const parentRect = svgContainerRef.value.parentElement.getBoundingClientRect()
      width = parentRect.width || props.width
      height = parentRect.height || props.height
      console.log('📐 WorldMap: Using parent element dimensions')
    }
  }
  
  // Final fallback to props
  if (width < 100) width = props.width
  if (height < 100) height = props.height
  
  console.log('📐 WorldMap: Final dimensions:', { width, height })
  
  if (width === 0 || height === 0) {
    console.error('❌ WorldMap: Invalid dimensions, using defaults')
    width = props.width
    height = props.height
  }

  // Create SVG with explicit sizing
  const svg = container
    .append('svg')
    .attr('class', 'world-map-svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('width', '100%')
    .style('height', '100%')
    .style('display', 'block')
    .style('background-color', 'transparent')

  console.log('✅ WorldMap: SVG created')

  // Setup projection with better scale for visibility
  projection = d3.geoNaturalEarth1()
    .scale(width / 5.5)
    .translate([width / 2, height / 2.2])

  path = d3.geoPath().projection(projection)
  
  console.log('✅ WorldMap: Projection created')

  // Setup zoom behavior
  zoom = d3.zoom()
    .scaleExtent([0.8, 8])
    .on('zoom', (event) => {
      svg.select('.map-container').attr('transform', event.transform)
    })

  svg.call(zoom)
  console.log('✅ WorldMap: Zoom behavior set up')

  // Create main group
  const g = svg.append('g')
    .attr('class', 'map-container')

  // Draw countries directly
  drawCountriesDirect(g, data.features)

  // Simulate exact manual product selection flow
  console.log('🔄 WorldMap: === STARTING MANUAL PRODUCT SELECTION SIMULATION ===')
  console.log('🔄 WorldMap: Current state before simulation:', {
    selectedProduct: props.selectedProduct,
    selectedYear: props.selectedYear,
    uiStoreProduct: uiStore.selectedProduct,
    uiStoreYear: uiStore.selectedYear,
    hasTimeseriesData: !!dataStore.timeseriesData,
    productionDataLength: productionDataStatic.value?.length || 0
  })
  
  // Simulate the exact handleProductChange flow from ProductSelector
  const selectedProduct = props.selectedProduct
  const selectedYear = props.selectedYear
  
  if (selectedProduct && selectedYear) {
    console.log('🔄 WorldMap: Setting selected product in store...')
    // This is exactly what handleProductChange does
    uiStore.setSelectedProduct(selectedProduct)
    
    console.log('🔄 WorldMap: Waiting for Vue reactivity...')
    // Force Vue reactivity to update
    await nextTick()
    
    console.log('🔄 WorldMap: Store values after setting:', {
      uiStoreProduct: uiStore.selectedProduct,
      uiStoreYear: uiStore.selectedYear
    })
    
    // Simulate the ProductSelector watcher logic
    try {
      // Wait for timeseries data to be available
      console.log('🔄 WorldMap: Checking for timeseries data...')
      let retries = 0
      while (!dataStore.timeseriesData && retries < 10) {
        console.log(`🔄 WorldMap: Waiting for timeseries data (attempt ${retries + 1})...`)
        await new Promise(resolve => setTimeout(resolve, 200))
        retries++
      }
      
      if (dataStore.timeseriesData && dataStore.timeseriesData[selectedProduct]) {
        console.log(`🔄 WorldMap: Found timeseries data for ${selectedProduct}`)
        // Timeseries data is available, no need to load production data
      } else if (dataStore.timeseriesData) {
        console.log('🔄 WorldMap: Timeseries available but no data for product, using fallback...')
        // Try to load production data as fallback
        try {
          await dataStore.loadProductionData(selectedProduct, selectedYear)
          console.log('🔄 WorldMap: DataStore loading completed')
        } catch (error) {
          console.warn('🔄 WorldMap: Production data loading failed, will use timeseries fallback')
        }
      } else {
        console.warn('🔄 WorldMap: No timeseries data available after waiting')
      }
      
      // Force another Vue update cycle
      console.log('🔄 WorldMap: Second Vue reactivity wait...')
      await nextTick()
      
      // Now force map update immediately
      console.log('🔄 WorldMap: Forcing immediate local data load...')
      await loadProductionData()
      
      console.log('🔄 WorldMap: Production data after load:', {
        productionDataLength: productionDataStatic.value?.length || 0,
        sampleData: productionDataStatic.value?.slice(0, 3)
      })
      
      // Force map color update
      console.log('🔄 WorldMap: Looking for map container...')
      const container = d3.select(svgContainerRef.value).select('.map-container')
      if (!container.empty()) {
        console.log('🔄 WorldMap: Found container, forcing direct update...')
        updateMapWithProductionDataDirect(container)
      } else {
        console.warn('🔄 WorldMap: No map container found!')
      }
      
    } catch (error) {
      console.error('🔄 WorldMap: Error during init simulation:', error)
    }
  } else {
    console.warn('🔄 WorldMap: Missing selectedProduct or selectedYear')
  }
  
  console.log('🔄 WorldMap: === MANUAL PRODUCT SELECTION SIMULATION COMPLETE ===')
  
  // Update with production data if available
  const processedData = getProcessedProductionData()
  if (processedData.length > 0) {
    console.log('📊 WorldMap: Production data available, updating map colors')
    updateMapWithProductionDataDirect(g)
  } else {
    console.log('⚠️ WorldMap: No production data available yet')
  }
  
  // Don't create legend here - wait for production data
  
  console.log('🎉 WorldMap: Map creation completed successfully!')
}

// Direct country drawing (working approach)
const drawCountriesDirect = (container, features) => {
  console.log('🌍 WorldMap: Drawing countries directly...')
  
  // Get theme colors
  const isDarkMode = document.documentElement.classList.contains('dark')
  const defaultFill = isDarkMode ? '#4B5563' : '#e5e7eb' // gray-600 : gray-200
  const defaultStroke = isDarkMode ? '#4B5563' : '#ffffff' // gray-600 : white
  
  const countries = container.selectAll('.country')
    .data(features, d => d.properties.iso_a3 || d.properties.adm0_a3 || d.properties.name)
  
  // Remove old countries
  countries.exit().remove()
  
  // Add new countries
  const enterCountries = countries.enter()
    .append('path')
    .attr('class', 'country')
    .attr('d', path)
    .attr('fill', defaultFill)
    .attr('stroke', defaultStroke)
    .attr('stroke-width', 0.5)
    .style('cursor', 'pointer')
    .on('click', handleCountryClick)
    .on('mouseover', handleCountryMouseover)
    .on('mouseout', handleCountryMouseout)
  
  // Update existing countries
  countries.merge(enterCountries)
    .attr('d', path)
    .attr('fill', defaultFill)
    .attr('stroke', defaultStroke)
  
  const totalCountries = container.selectAll('.country').size()
  console.log('✅ WorldMap: Countries drawn, total:', totalCountries)
}

// Create legend (now just a stub - legend moved to Vue template)
const createLegend = (svg) => {
  console.log('🎨 WorldMap: Legend creation moved to Vue template')
  // Remove any existing SVG legend
  svg.select('.legend-group').remove()
}

// Setup map with D3.js (keeping original for compatibility)
const setupMap = (container, data) => {
  console.log('🎨 WorldMap: setupMap called')
  console.log('🎨 WorldMap: Container:', container)
  console.log('🎨 WorldMap: Data type:', typeof data)
  console.log('🎨 WorldMap: Data keys:', data ? Object.keys(data) : 'No data')
  console.log('🎨 WorldMap: Features available:', data?.features ? 'Yes' : 'No')
  console.log('🎨 WorldMap: Features count:', data?.features?.length || 'N/A')
  
  if (!data?.features || !Array.isArray(data.features)) {
    console.error('❌ WorldMap: Invalid geo data provided to setupMap:', data)
    console.error('❌ WorldMap: Expected data.features to be an array, got:', typeof data?.features)
    return
  }

  // Legacy function - dimensions handled in createMapDirect
  console.log('⚠️ WorldMap: setupMap is deprecated - use createMapDirect instead')
  return

  // Create SVG directly
  console.log('🖼️ WorldMap: Creating SVG directly...')
  
  // Remove existing SVG
  container.select('svg').remove()
  
  // Create new SVG
  const svg = container
    .append('svg')
    .attr('class', 'world-map-svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')

  // Create main group
  const g = svg.append('g')
    .attr('class', 'map-container')
    .attr('transform', 'translate(0, 0)')
  
  console.log('✅ WorldMap: SVG created successfully')
  console.log('🖼️ WorldMap: SVG node:', svg.node())
  console.log('🖼️ WorldMap: Container group:', g.node())

  // Setup projection
  console.log('🌍 WorldMap: Setting up projection...')
  projection = d3.geoNaturalEarth1()
    .scale(width / 6.5)
    .translate([width / 2, height / 2])

  path = d3.geoPath().projection(projection)
  
  console.log('✅ WorldMap: Projection created')
  console.log('🌍 WorldMap: Projection scale:', projection.scale())
  console.log('🌍 WorldMap: Projection translate:', projection.translate())
  console.log('🌍 WorldMap: Path generator created')

  // Setup zoom behavior
  console.log('🔍 WorldMap: Setting up zoom behavior...')
  zoom = d3.zoom()
    .scaleExtent([0.5, 8])
    .on('zoom', (event) => {
      console.log('🔍 WorldMap: Zoom event:', event.transform)
      g.attr('transform', event.transform)
    })

  svg.call(zoom)
  console.log('✅ WorldMap: Zoom behavior set up')

  // Draw countries using data join pattern
  console.log('🌍 WorldMap: Drawing countries...')
  drawCountries(g, data.features)
  console.log('✅ WorldMap: Countries drawn')

  // Update with production data if available
  const processedData = getProcessedProductionData()
  if (processedData.length > 0) {
    console.log('📊 WorldMap: Production data available, updating map colors')
    updateMapWithProductionData()
  } else {
    console.log('⚠️ WorldMap: No production data available yet')
  }
  
  console.log('🎉 WorldMap: setupMap completed successfully!')
}

// Draw countries using modern data join pattern
const drawCountries = (container, features) => {
  console.log('🗺️ WorldMap: Drawing countries, features count:', features?.length)
  
  if (!features || !Array.isArray(features) || features.length === 0) {
    console.error('🗺️ WorldMap: No valid features provided to drawCountries')
    return
  }

  // Legacy function - use drawCountriesDirect instead
  console.log('⚠️ WorldMap: drawCountries is deprecated - use drawCountriesDirect instead')
  return
  
  console.log('🗺️ WorldMap: Countries drawn successfully')
}

// Load production data
const loadProductionData = async () => {
  console.log('🗺️ WorldMap: loadProductionData called')
  console.log('🗺️ WorldMap: Props check:', {
    selectedProduct: props.selectedProduct,
    selectedYear: props.selectedYear,
    selectedMetric: props.selectedMetric
  })
  
  if (!props.selectedProduct || !props.selectedYear) {
    console.warn('🗺️ WorldMap: Missing required props, returning early')
    return
  }

  try {
    console.log(`🗺️ WorldMap: Loading data for ${props.selectedProduct} ${props.selectedYear} - Metric: ${props.selectedMetric}`)
    console.log('🔍 WorldMap: Checking if timeseries data exists for this product...')
    console.log('🔍 WorldMap: Available timeseries products:', dataStore.timeseriesData ? Object.keys(dataStore.timeseriesData).slice(0, 10) : 'No timeseries data')
    
    let productionData = null
    
    // Special handling for "All" products - show aggregated data across all countries
    if (props.selectedProduct === 'All') {
      console.log('🗺️ WorldMap: Special handling for "All" products - aggregating all data')
      if (dataStore.timeseriesData && dataStore.timeseriesData['All']) {
        const allProductsData = dataStore.getTimeseriesDataForProduct('All', props.selectedYear)
        
        if (allProductsData && allProductsData['All']) {
          const aggregatedData = allProductsData['All']
          const metricKey = props.selectedMetric === 'production' ? 'production' :
                           props.selectedMetric === 'import_quantity' ? 'imports' :
                           props.selectedMetric === 'export_quantity' ? 'exports' :
                           props.selectedMetric === 'domestic_supply_quantity' ? 'domestic_supply' :
                           props.selectedMetric === 'feed' ? 'feed' :
                           props.selectedMetric === 'food_supply_kcal' ? 'food_supply_kcal' :
                           'production'
          
          const totalValue = aggregatedData[metricKey] || 0
          let unit = aggregatedData.unit || '1000 t'
          
          // Override unit for specific metrics
          if (props.selectedMetric === 'food_supply_kcal') {
            unit = 'kcal/capita/day'
          }
          
          // Calculate each country's total across all products for normal color scaling
          if (dataStore.timeseriesData) {
            const allCountries = new Set()
            Object.keys(dataStore.timeseriesData).forEach(product => {
              if (product !== 'All') {
                Object.keys(dataStore.timeseriesData[product]).forEach(country => {
                  if (country !== 'All') {
                    allCountries.add(country)
                  }
                })
              }
            })
            
            // Calculate each country's contribution across all products
            productionData = Array.from(allCountries).map(country => {
              let countryTotal = 0
              
              // Sum this country's contribution across all products
              Object.keys(dataStore.timeseriesData).forEach(product => {
                if (product !== 'All' && dataStore.timeseriesData[product][country]) {
                  const countryData = dataStore.timeseriesData[product][country]
                  const yearData = countryData.find(entry => entry.year === props.selectedYear)
                  if (yearData && yearData[metricKey]) {
                    countryTotal += yearData[metricKey] || 0
                  }
                }
              })
              
              return {
                country: country,
                countryCode: getCountryCode(country),
                value: countryTotal,
                unit: unit,
                year: props.selectedYear,
                element: props.selectedMetric
              }
            }).filter(item => item.value > 0)
            
            console.log('🗺️ WorldMap: "All" products - created data for', productionData.length, 'countries')
            console.log('🗺️ WorldMap: "All" products - sample data:', productionData.slice(0, 5))
          }
        }
      }
    }
    // Check if we have timeseries data for this product (individual products)
    else if (dataStore.timeseriesData && dataStore.timeseriesData[props.selectedProduct]) {
      console.log('🗺️ WorldMap: Using timeseries data for individual product')
      console.log('🔍 WorldMap: Found product in timeseries:', props.selectedProduct)
      const timeseriesData = dataStore.getTimeseriesDataForProduct(props.selectedProduct, props.selectedYear)
      
      if (timeseriesData) {
        productionData = Object.entries(timeseriesData).map(([country, data]) => {
          const metricKey = props.selectedMetric === 'production' ? 'production' :
                           props.selectedMetric === 'import_quantity' ? 'imports' :
                           props.selectedMetric === 'export_quantity' ? 'exports' :
                           props.selectedMetric === 'domestic_supply_quantity' ? 'domestic_supply' :
                           props.selectedMetric === 'feed' ? 'feed' :
                           props.selectedMetric === 'food_supply_kcal' ? 'food_supply_kcal' :
                           'production'
          
          const value = data[metricKey] || 0
          let unit = data.unit || 't'
          
          // Override unit for specific metrics
          if (props.selectedMetric === 'food_supply_kcal') {
            unit = 'kcal/capita/day'
          }
          
          return {
            country: country,
            countryCode: getCountryCode(country),
            value: value,
            unit: unit,
            year: props.selectedYear,
            element: props.selectedMetric
          }
        }).filter(item => item.value > 0)
      }
    } else {
      // Fallback to production data for grouped products
      console.log('🗺️ WorldMap: Using production data for grouped product')
      
      // For feed and calorie metrics, only try to load if we're sure the product doesn't exist in timeseries
      if (props.selectedMetric === 'feed' || props.selectedMetric === 'food_supply_kcal') {
        console.warn('🗺️ WorldMap: Feed/Calorie metric selected but product not found in timeseries data')
        console.warn('🗺️ WorldMap: This suggests the product should have individual data. Setting empty array.')
        productionData = []
      } else {
        productionData = await dataStore.loadProductionData(
          props.selectedProduct, 
          props.selectedYear
        )
      }
    }
    
    console.log('🗺️ WorldMap: Raw production data:', productionData)
    console.log('🗺️ WorldMap: Data type:', typeof productionData)

    if (productionData) {
      let transformedData = []
      
      // Check if it's already an array
      if (Array.isArray(productionData)) {
        transformedData = productionData.map(item => ({
          country: item.country || item.Area || '',
          countryCode: item.countryCode || item.iso3 || getCountryCode(item.country || item.Area || ''),
          value: item.value || item.Value || 0,
          unit: item.unit || item.Unit || 't',
          year: item.year || item.Year || props.selectedYear,
          element: item.element || item.Element || props.selectedMetric
        }))
      } else if (productionData.data && Array.isArray(productionData.data)) {
        // Handle wrapped data
        transformedData = productionData.data.map(item => ({
          country: item.country || item.Area || '',
          countryCode: item.countryCode || item.iso3 || getCountryCode(item.country || item.Area || ''),
          value: item.value || item.Value || 0,
          unit: item.unit || item.Unit || 't',
          year: item.year || item.Year || props.selectedYear,
          element: item.element || item.Element || props.selectedMetric
        }))
      } else if (typeof productionData === 'object') {
        // Transform the object structure to array format
        transformedData = Object.entries(productionData).map(([countryName, data]) => ({
          country: countryName,
          countryCode: getCountryCode(countryName),
          value: data.value || data.Value || 0,
          unit: data.unit || data.Unit || 't',
          year: data.year || data.Year || props.selectedYear,
          element: data.element || data.Element || props.selectedMetric
        }))
      }
      
      console.log('🗺️ WorldMap: Transformed data:', transformedData)
      productionDataStatic.value = transformedData
      
      // Update map if already initialized
      updateMapWithProductionDataStatic()
    }
  } catch (err) {
    console.warn('Failed to load production data:', err)
    productionDataStatic.value = []
  }
}

// Helper function to get country code - comprehensive mapping
const getCountryCode = (countryName) => {
  const mapping = {
    'China': 'CHN',
    'China, mainland': 'CHN',
    'United States': 'USA', 
    'United States of America': 'USA',
    'Brazil': 'BRA',
    'Argentina': 'ARG',
    'Ukraine': 'UKR',
    'India': 'IND',
    'Mexico': 'MEX',
    'Indonesia': 'IDN',
    'France': 'FRA',
    'Romania': 'ROU',
    'Germany': 'DEU',
    'Turkey': 'TUR',
    'Russian Federation': 'RUS',
    'Russia': 'RUS',
    'Philippines': 'PHL',
    'Nigeria': 'NGA',
    'Iran': 'IRN',
    'Iran (Islamic Republic of)': 'IRN',
    'Pakistan': 'PAK',
    'Italy': 'ITA',
    'Canada': 'CAN',
    'Thailand': 'THA',
    'South Africa': 'ZAF',
    'Egypt': 'EGY',
    'Morocco': 'MAR',
    'Kenya': 'KEN',
    'Ethiopia': 'ETH',
    'Ghana': 'GHA',
    'Tanzania': 'TZA',
    'Uganda': 'UGA',
    'Madagascar': 'MDG',
    'Mozambique': 'MOZ',
    'Cameroon': 'CMR',
    'Mali': 'MLI',
    'Burkina Faso': 'BFA',
    'Niger': 'NER',
    'Senegal': 'SEN',
    'Guinea': 'GIN',
    'Benin': 'BEN',
    'Burundi': 'BDI',
    'Rwanda': 'RWA',
    'Chad': 'TCD',
    'Central African Republic': 'CAF',
    'Democratic Republic of the Congo': 'COD',
    'Congo': 'COG',
    'Gabon': 'GAB',
    'Equatorial Guinea': 'GNQ',
    'Sao Tome and Principe': 'STP',
    'Cape Verde': 'CPV',
    'Gambia': 'GMB',
    'Guinea-Bissau': 'GNB',
    'Liberia': 'LBR',
    'Sierra Leone': 'SLE',
    'Côte d\'Ivoire': 'CIV',
    'Togo': 'TGO',
    'Comoros': 'COM',
    'Mauritius': 'MUS',
    'Seychelles': 'SYC',
    'Djibouti': 'DJI',
    'Eritrea': 'ERI',
    'Somalia': 'SOM',
    'Sudan': 'SDN',
    'South Sudan': 'SSD',
    'Libya': 'LBY',
    'Tunisia': 'TUN',
    'Algeria': 'DZA',
    'Spain': 'ESP',
    'Portugal': 'PRT',
    'United Kingdom': 'GBR',
    'Ireland': 'IRL',
    'Netherlands': 'NLD',
    'Belgium': 'BEL',
    'Luxembourg': 'LUX',
    'Switzerland': 'CHE',
    'Austria': 'AUT',
    'Poland': 'POL',
    'Czech Republic': 'CZE',
    'Slovakia': 'SVK',
    'Hungary': 'HUN',
    'Slovenia': 'SVN',
    'Croatia': 'HRV',
    'Bosnia and Herzegovina': 'BIH',
    'Serbia': 'SRB',
    'Montenegro': 'MNE',
    'North Macedonia': 'MKD',
    'Albania': 'ALB',
    'Greece': 'GRC',
    'Bulgaria': 'BGR',
    'Moldova': 'MDA',
    'Belarus': 'BLR',
    'Lithuania': 'LTU',
    'Latvia': 'LVA',
    'Estonia': 'EST',
    'Finland': 'FIN',
    'Sweden': 'SWE',
    'Norway': 'NOR',
    'Denmark': 'DNK',
    'Iceland': 'ISL',
    'Japan': 'JPN',
    'South Korea': 'KOR',
    'North Korea': 'PRK',
    'Mongolia': 'MNG',
    'Kazakhstan': 'KAZ',
    'Kyrgyzstan': 'KGZ',
    'Tajikistan': 'TJK',
    'Turkmenistan': 'TKM',
    'Uzbekistan': 'UZB',
    'Afghanistan': 'AFG',
    'Bangladesh': 'BGD',
    'Bhutan': 'BTN',
    'Nepal': 'NPL',
    'Sri Lanka': 'LKA',
    'Maldives': 'MDV',
    'Myanmar': 'MMR',
    'Laos': 'LAO',
    'Vietnam': 'VNM',
    'Cambodia': 'KHM',
    'Malaysia': 'MYS',
    'Singapore': 'SGP',
    'Brunei': 'BRN',
    'East Timor': 'TLS',
    'Papua New Guinea': 'PNG',
    'Australia': 'AUS',
    'New Zealand': 'NZL',
    'Fiji': 'FJI',
    'Solomon Islands': 'SLB',
    'Vanuatu': 'VUT',
    'New Caledonia': 'NCL',
    'French Polynesia': 'PYF',
    'Samoa': 'WSM',
    'Tonga': 'TON',
    'Kiribati': 'KIR',
    'Tuvalu': 'TUV',
    'Nauru': 'NRU',
    'Palau': 'PLW',
    'Marshall Islands': 'MHL',
    'Micronesia': 'FSM',
    'Czechia': 'CZE',
    'Türkiye': 'TUR',
    'Turkey': 'TUR',
    'Viet Nam': 'VNM',
    'United Kingdom of Great Britain and Northern Ireland': 'GBR',
    'Bolivia (Plurinational State of)': 'BOL',
    'Venezuela (Bolivarian Republic of)': 'VEN',
    'Iran (Islamic Republic of)': 'IRN',
    'Korea, Republic of': 'KOR',
    'Democratic People\'s Republic of Korea': 'PRK',
    'Lao People\'s Democratic Republic': 'LAO',
    'Timor-Leste': 'TLS',
    'Côte d\'Ivoire': 'CIV',
    'United Republic of Tanzania': 'TZA',
    'Syrian Arab Republic': 'SYR'
  }
  return mapping[countryName] || countryName.substring(0, 3).toUpperCase()
}

// Enhanced country name mapping for better matching
const normalizeCountryName = (name) => {
  if (!name) return ''
  
  const nameMapping = {
    'United States': 'United States of America',
    'USA': 'United States of America', 
    'US': 'United States of America',
    'UK': 'United Kingdom',
    'Britain': 'United Kingdom',
    'South Korea': 'Republic of Korea',
    'North Korea': 'Democratic People\'s Republic of Korea',
    'Russia': 'Russian Federation',
    'Iran': 'Iran (Islamic Republic of)',
    'Syria': 'Syrian Arab Republic',
    'Venezuela': 'Venezuela (Bolivarian Republic of)',
    'Bolivia': 'Bolivia (Plurinational State of)',
    'Tanzania': 'United Republic of Tanzania',
    'Congo': 'Republic of the Congo',
    'Democratic Republic of the Congo': 'Democratic Republic of the Congo',
    'DRC': 'Democratic Republic of the Congo',
    'Czech Republic': 'Czechia',
    'Macedonia': 'North Macedonia',
    'Burma': 'Myanmar',
    'East Timor': 'Timor-Leste',
    'Cape Verde': 'Cabo Verde',
    'Ivory Coast': 'Côte d\'Ivoire',
    'Swaziland': 'Eswatini'
  }
  
  return nameMapping[name] || name
}

// Direct production data update (working approach)
const updateMapWithProductionDataDirect = (container) => {
  const processedData = getProcessedProductionData()
  if (!processedData.length) return
  
  console.log('🎨 WorldMap: Updating production data directly...')
  applyProductionDataDirect(container, processedData)
  
  // Create/update legend after data is applied
  const svg = d3.select(svgContainerRef.value).select('svg')
  if (!svg.empty() && legendScale.value) {
    createLegend(svg)
  }
}

// Static version for non-reactive updates
const updateMapWithProductionDataStatic = () => {
  console.log('🎨 WorldMap: updateMapWithProductionDataStatic called')
  const containerElement = svgContainerRef.value
  if (!containerElement) {
    console.warn('🎨 WorldMap: No container element available')
    return
  }
  
  const container = d3.select(containerElement).select('.map-container')
  if (!container.empty()) {
    console.log('🎨 WorldMap: Found map container, updating...')
    updateMapWithProductionDataDirect(container)
  } else {
    console.warn('🎨 WorldMap: Map container not found')
  }
}

// Apply production data directly
const applyProductionDataDirect = (container, data) => {
  if (!data || !Array.isArray(data)) return

  console.log('📊 WorldMap: Applying production data:', data.length, 'entries')
  console.log('📊 WorldMap: Sample data:', data.slice(0, 5))
  
  // Debug: Show the actual values we're working with
  const debugValues = data.filter(d => d.value > 0).map(d => ({ 
    country: d.country, 
    value: d.value,
    unit: d.unit 
  }))
  console.log('🔍 WorldMap: Top 5 values:', debugValues.sort((a, b) => b.value - a.value).slice(0, 5))
  
  // Check for aggregate regions that might skew the data
  const aggregateRegions = ['World', 'Europe', 'Asia', 'Africa', 'Americas', 'Oceania', 'European Union']
  const suspiciousEntries = data.filter(d => 
    aggregateRegions.some(region => d.country.toLowerCase().includes(region.toLowerCase()))
  )
  if (suspiciousEntries.length > 0) {
    console.warn('⚠️ WorldMap: Found aggregate regions in data:', suspiciousEntries)
  }

  // Create data lookup
  const dataByCountry = new Map()
  const dataByCountryCode = new Map()
  const dataByNormalizedName = new Map()
  
  data.forEach(d => {
    if (d.value > 0) {
      dataByCountry.set(d.country.toLowerCase(), d.value)
      if (d.countryCode) {
        dataByCountryCode.set(d.countryCode, d.value)
      }
      // Also store by normalized name
      const normalized = normalizeCountryName(d.country).toLowerCase()
      dataByNormalizedName.set(normalized, d.value)
    }
  })
  
  console.log('🗺️ WorldMap: Data maps created - Countries:', dataByCountry.size, 'Codes:', dataByCountryCode.size)
  
  // Extract unit from data (use first valid entry)
  const unitFromData = data.find(d => d.unit)?.unit || '1000 t'
  legendUnit.value = unitFromData

  // Create adaptive color scale based on data distribution
  // Filter out aggregate regions to get accurate country-level min/max
  const countryData = data.filter(d => 
    d.value > 0 && 
    !aggregateRegions.some(region => d.country.toLowerCase().includes(region.toLowerCase()))
  )
  const values = countryData.map(d => d.value)
  if (values.length > 0) {
    // Sort values for analysis
    const sortedValues = values.sort((a, b) => a - b)
    const minValue = sortedValues[0]
    const maxValue = sortedValues[sortedValues.length - 1]
    
    console.log('🎨 WorldMap: Value range:', minValue, 'to', maxValue)
    console.log('🎨 WorldMap: All values:', sortedValues)
    
    // Analyze data distribution for optimal scale selection
    const range = maxValue - minValue
    const median = d3.median(sortedValues)
    const q1 = d3.quantile(sortedValues, 0.25)
    const q3 = d3.quantile(sortedValues, 0.75)
    const iqr = q3 - q1
    
    // Detect skewness - highly skewed if max is much larger than median
    const isHighlySkewed = (maxValue - median) > 3 * iqr
    
    console.log('🎨 WorldMap: Data analysis:', {
      count: values.length, range, median, q1, q3, iqr, isHighlySkewed
    })
    
    // Use 10-step percentile-based scale where top 10% get yellow, etc.
    console.log('🎨 WorldMap: Using 10-step percentile-based color scale')
    
    // Calculate percentile thresholds (10% intervals)
    const percentiles = []
    for (let i = 1; i < greenColorScheme.length; i++) {
      const percentile = i / greenColorScheme.length
      const threshold = d3.quantile(sortedValues, percentile)
      percentiles.push(threshold)
    }
    
    const valueRanges = []
    const thresholds = percentiles
    
    // Create value ranges for logging using percentile boundaries
    for (let i = 0; i < greenColorScheme.length; i++) {
      const rangeStart = i === 0 ? minValue : percentiles[i - 1]
      const rangeEnd = i === greenColorScheme.length - 1 ? maxValue : percentiles[i]
      valueRanges.push({
        min: rangeStart,
        max: rangeEnd,
        color: greenColorScheme[i],
        percentile: `${(i * 10)}-${((i + 1) * 10)}%`
      })
    }
    
    console.log('🎨 WorldMap: Value ranges:', valueRanges)
    console.log('🎨 WorldMap: Thresholds between colors:', thresholds)
    
    // Count countries in each decile
    const countryCounts = new Array(greenColorScheme.length).fill(0)
    countryData.forEach(d => {
      const value = d.value
      let decileIndex = 0
      
      if (value <= minValue) {
        decileIndex = 0
      } else if (value >= maxValue) {
        decileIndex = greenColorScheme.length - 1
      } else {
        for (let i = 0; i < percentiles.length; i++) {
          if (value <= percentiles[i]) {
            decileIndex = i + 1
            break
          }
        }
      }
      
      countryCounts[decileIndex]++
    })
    
    console.log('🎨 WorldMap: Countries per decile:', countryCounts)
    
    // Create a custom scale function that maps values to colors using percentiles
    colorScale = (value) => {
      // Edge cases
      if (value <= minValue) return greenColorScheme[0]
      if (value >= maxValue) return greenColorScheme[greenColorScheme.length - 1]
      
      // Find which percentile band the value falls into
      for (let i = 0; i < percentiles.length; i++) {
        if (value <= percentiles[i]) {
          return greenColorScheme[i + 1]
        }
      }
      
      // If we get here, the value is in the highest percentile
      return greenColorScheme[greenColorScheme.length - 1]
    }
    
    // Store thresholds for legend
    colorScale.thresholds = () => thresholds
    colorScale.range = () => greenColorScheme
    colorScale.domain = () => [minValue, maxValue]
    colorScale.percentiles = () => percentiles
    colorScale.countryCounts = () => countryCounts
    
    legendDomain.value = [minValue, maxValue]
    
    console.log('🎨 WorldMap: Adaptive color scale created with domain:', legendDomain.value)
    
    // Test the scale with a few sample values for verification
    if (colorScale.quantiles) {
      console.log('🎨 WorldMap: Quantile thresholds:', colorScale.quantiles())
    }
    const testValues = [minValue, median, maxValue]
    console.log('🎨 WorldMap: Test colors:', testValues.map(v => ({ value: v, color: colorScale(v) })))
    
    // Update legend scale
    legendScale.value = colorScale
  }

  // Update country colors
  container.selectAll('.country')
    .transition()
    .duration(750)
    .attr('fill', (d) => {
      // Try multiple properties for country identification
      const countryName = (d.properties.name || d.properties.NAME || d.properties.admin || '').toLowerCase()
      const countryCode = d.properties.iso_a3 || d.properties.ISO_A3 || d.properties.adm0_a3 || d.properties.ADM0_A3
      const normalizedName = normalizeCountryName(d.properties.name || d.properties.NAME || '').toLowerCase()
      
      // Try to find value by different keys
      let value = null
      if (countryCode && dataByCountryCode.has(countryCode)) {
        value = dataByCountryCode.get(countryCode)
      } else if (dataByNormalizedName.has(normalizedName)) {
        value = dataByNormalizedName.get(normalizedName)
      } else if (dataByCountry.has(countryName)) {
        value = dataByCountry.get(countryName)
      }
      
      if (value && colorScale) {
        const color = colorScale(value)
        
        // Apply color filter if active
        if (props.colorFilter && props.colorFilter.selectedIndices.length > 0) {
          // Find which color segment this country belongs to
          const colorIndex = getColorIndexForValue(value, colorScale)
          
          // If this country's color is not in the selected filter, dim it
          if (!props.colorFilter.selectedIndices.includes(colorIndex)) {
            return getDimmedColor(color)
          }
        }
        
        // Log first few countries to debug
        if (container.selectAll('.country').nodes().indexOf(d) < 5) {
          console.log(`🎨 Country: ${countryName}, Code: ${countryCode}, Value: ${value}, Color: ${color}`)
        }
        return color
      }
      // Return theme-appropriate default color for countries without data
      const isDarkMode = document.documentElement.classList.contains('dark')
      return isDarkMode ? '#4B5563' : '#e5e7eb' // gray-600 : gray-200
    })
    .attr('opacity', (d) => {
      const countryName = (d.properties.name || d.properties.NAME || d.properties.admin || '').toLowerCase()
      const countryCode = d.properties.iso_a3 || d.properties.ISO_A3 || d.properties.adm0_a3 || d.properties.ADM0_A3
      const normalizedName = normalizeCountryName(d.properties.name || d.properties.NAME || '').toLowerCase()
      
      const hasData = (countryCode && dataByCountryCode.has(countryCode)) || 
                      dataByNormalizedName.has(normalizedName) ||
                      dataByCountry.has(countryName)
      
      // Apply filter opacity if filters are active
      if (props.colorFilter && props.colorFilter.selectedIndices.length > 0 && hasData) {
        // Get the country's value and determine its color index
        let value = null
        if (countryCode && dataByCountryCode.has(countryCode)) {
          value = dataByCountryCode.get(countryCode)
        } else if (dataByNormalizedName.has(normalizedName)) {
          value = dataByNormalizedName.get(normalizedName)
        } else if (dataByCountry.has(countryName)) {
          value = dataByCountry.get(countryName)
        }
        
        if (value && colorScale) {
          const colorIndex = getColorIndexForValue(value, colorScale)
          return props.colorFilter.selectedIndices.includes(colorIndex) ? 1 : 0.4
        }
      }
      
      return hasData ? 1 : 0.6
    })
}

// Update country colors with filter (without reloading data)
const updateCountryColorsWithFilter = (container) => {
  if (!legendScale.value) return
  
  const processedData = getProcessedProductionData()
  if (!processedData.length) return
  
  // Create data maps for quick lookup (same as in applyProductionDataDirect)
  const dataByCountry = new Map()
  const dataByCountryCode = new Map()
  const dataByNormalizedName = new Map()
  
  processedData.forEach(d => {
    if (d.value > 0) {
      dataByCountry.set(d.country.toLowerCase(), d.value)
      if (d.country_code) {
        dataByCountryCode.set(d.country_code, d.value)
      }
      const normalizedName = normalizeCountryName(d.country)
      if (normalizedName) {
        dataByNormalizedName.set(normalizedName.toLowerCase(), d.value)
      }
    }
  })
  
  // Update only colors and opacity without triggering data changes
  container.selectAll('.country')
    .transition()
    .duration(300) // Shorter transition for filter updates
    .attr('fill', (d) => {
      // Try multiple properties for country identification
      const countryName = (d.properties.name || d.properties.NAME || d.properties.admin || '').toLowerCase()
      const countryCode = d.properties.iso_a3 || d.properties.ISO_A3 || d.properties.adm0_a3 || d.properties.ADM0_A3
      const normalizedName = normalizeCountryName(d.properties.name || d.properties.NAME || '').toLowerCase()
      
      // Try to find value by different keys
      let value = null
      if (countryCode && dataByCountryCode.has(countryCode)) {
        value = dataByCountryCode.get(countryCode)
      } else if (dataByNormalizedName.has(normalizedName)) {
        value = dataByNormalizedName.get(normalizedName)
      } else if (dataByCountry.has(countryName)) {
        value = dataByCountry.get(countryName)
      }
      
      if (value && legendScale.value) {
        const color = legendScale.value(value)
        
        // Apply color filter if active
        if (props.colorFilter && props.colorFilter.selectedIndices.length > 0) {
          // Find which color segment this country belongs to
          const colorIndex = getColorIndexForValue(value, legendScale.value)
          
          // If this country's color is not in the selected filter, dim it
          if (!props.colorFilter.selectedIndices.includes(colorIndex)) {
            return getDimmedColor(color)
          }
        }
        
        return color
      }
      // Return theme-appropriate default color for countries without data
      const isDarkMode = document.documentElement.classList.contains('dark')
      return isDarkMode ? '#4B5563' : '#e5e7eb' // gray-600 : gray-200
    })
    .attr('opacity', (d) => {
      const countryName = (d.properties.name || d.properties.NAME || d.properties.admin || '').toLowerCase()
      const countryCode = d.properties.iso_a3 || d.properties.ISO_A3 || d.properties.adm0_a3 || d.properties.ADM0_A3
      const normalizedName = normalizeCountryName(d.properties.name || d.properties.NAME || '').toLowerCase()
      
      const hasData = (countryCode && dataByCountryCode.has(countryCode)) || 
                      dataByNormalizedName.has(normalizedName) ||
                      dataByCountry.has(countryName)
      
      // Apply filter opacity if filters are active
      if (props.colorFilter && props.colorFilter.selectedIndices.length > 0 && hasData) {
        // Get the country's value and determine its color index
        let value = null
        if (countryCode && dataByCountryCode.has(countryCode)) {
          value = dataByCountryCode.get(countryCode)
        } else if (dataByNormalizedName.has(normalizedName)) {
          value = dataByNormalizedName.get(normalizedName)
        } else if (dataByCountry.has(countryName)) {
          value = dataByCountry.get(countryName)
        }
        
        if (value && legendScale.value) {
          const colorIndex = getColorIndexForValue(value, legendScale.value)
          return props.colorFilter.selectedIndices.includes(colorIndex) ? 1 : 0.4
        }
      }
      
      return hasData ? 1 : 0.6
    })
}

// Update map with production data (keeping original for compatibility)
const updateMapWithProductionData = () => {
  const processedData = getProcessedProductionData()
  if (!processedData.length) return

  // Use direct approach instead of queueing
  const container = d3.select(svgContainerRef.value).select('.map-container')
  if (!container.empty()) {
    updateMapWithProductionDataDirect(container)
  }
}

// Legacy function removed - using applyProductionDataDirect with adaptive color scaling instead

// Event handlers
const handleCountryClick = (event, d) => {
  event.stopPropagation()
  event.preventDefault()
  
  const countryName = d.properties.name
  const countryCode = d.properties.iso_a3
  const normalizedName = normalizeCountryName(countryName || '')
  
  console.log('🖱️ WorldMap: Country clicked:', { countryName, countryCode })
  
  // Guard: Check if this is a valid, intentional user click
  if (!countryName || !countryCode) {
    console.warn('🚫 WorldMap: Invalid country data, ignoring click')
    return
  }
  
  // Guard: Prevent rapid duplicate clicks (debounce)
  const now = Date.now()
  if (lastClickTime && now - lastClickTime < 300) {
    console.log('🚫 WorldMap: Click too soon after previous, ignoring')
    return
  }
  lastClickTime = now
  
  // Find country data for detail view
  const processedData = getProcessedProductionData()
  const countryData = processedData.find(
    item => item.countryCode === countryCode || 
             item.country.toLowerCase() === countryName?.toLowerCase() ||
             item.country.toLowerCase() === normalizedName?.toLowerCase()
  )
  
  // Set detail view data
  selectedCountryDetail.value = {
    name: countryName,
    code: countryCode,
    data: countryData,
    product: props.selectedProduct,
    year: props.selectedYear,
    metric: props.selectedMetric
  }
  
  // Show detail panel
  countryDetailVisible.value = true
  
  // Only set selected country if it's different from current
  if (uiStore.selectedCountry !== countryName) {
    console.log('🎯 WorldMap: Setting selected country:', countryName)
    uiStore.setSelectedCountry(countryName)
    emit('countryClick', countryCode)
  } else {
    console.log('🔄 WorldMap: Country already selected, just zooming')
  }
  
  // Zoom to country
  zoomToCountry(d)
}

const handleCountryMouseover = (event, d) => {
  const countryName = d.properties.name || d.properties.NAME || d.properties.admin
  const countryCode = d.properties.iso_a3 || d.properties.adm0_a3
  const normalizedName = normalizeCountryName(countryName || '')
  
  // Add visual hover effect
  d3.select(event.currentTarget)
    .transition()
    .duration(100)
    .attr('stroke', '#3b82f6')
    .attr('stroke-width', 2)
    .style('filter', 'brightness(1.1)')
  
  // Find country data by code, normalized name, or original name
  const processedData = getProcessedProductionData()
  const countryData = processedData.find(
    item => item.countryCode === countryCode || 
             item.country.toLowerCase() === countryName?.toLowerCase() ||
             item.country.toLowerCase() === normalizedName?.toLowerCase()
  )
  
  // Format tooltip content with proper unit handling
  let unit = countryData?.unit || '1000 t'
  if (props.selectedMetric === 'food_supply_kcal') {
    unit = 'kcal/capita/day'
  }
  
  const tooltipFormatter = createD3TooltipFormatter(unit)
  let content = `<strong>${countryName}</strong><br/>`
  if (countryData && countryData.value > 0) {
    const formattedValue = tooltipFormatter(countryData.value)
    const productName = props.selectedProduct?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Produkt'
    const metricLabel = props.selectedMetric === 'production' ? 'Produktion' :
                       props.selectedMetric === 'import_quantity' ? 'Import' :
                       props.selectedMetric === 'export_quantity' ? 'Export' :
                       props.selectedMetric === 'domestic_supply_quantity' ? 'Inlandsversorgung' :
                       props.selectedMetric === 'feed' ? 'Tierfutter' :
                       props.selectedMetric === 'food_supply_kcal' ? 'Kalorienversorgung' :
                       'Inlandsversorgung'
    content += `<span style="color: #fbbf24">${productName}</span><br/>`
    content += `${metricLabel}: <strong>${formattedValue}</strong><br/>`
    content += `<span style="color: #9ca3af; font-size: 12px">Jahr: ${props.selectedYear}</span>`
  } else {
    content += '<span style="color: #ef4444">Keine Daten verfügbar</span>'
  }
  
  // Show tooltip
  tooltip.show(event, d, () => content)
  
  emit('countryHover', countryCode)
}

const handleCountryMouseout = (event, d) => {
  // Get theme-appropriate stroke color
  const isDarkMode = document.documentElement.classList.contains('dark')
  const defaultStroke = isDarkMode ? '#4B5563' : '#ffffff' // gray-600 : white
  
  // Remove visual hover effect
  d3.select(event.currentTarget)
    .transition()
    .duration(100)
    .attr('stroke', defaultStroke)
    .attr('stroke-width', 0.5)
    .style('filter', 'none')
  
  tooltip.hide()
  emit('countryHover', null)
}

// Zoom to specific country
const zoomToCountry = (countryData) => {
  if (!path || !zoom) return

  const svg = d3.select(svgContainerRef.value).select('svg')
  if (svg.empty()) return

  const bounds = path.bounds(countryData)
  const dx = bounds[1][0] - bounds[0][0]
  const dy = bounds[1][1] - bounds[0][1]
  const x = (bounds[0][0] + bounds[1][0]) / 2
  const y = (bounds[0][1] + bounds[1][1]) / 2
  
  // Get current SVG dimensions
  const svgNode = svg.node()
  const width = svgNode ? svgNode.clientWidth : props.width
  const height = svgNode ? svgNode.clientHeight : props.height
  
  const scale = Math.min(8, 0.9 / Math.max(dx / width, dy / height))
  const translate = [width / 2 - scale * x, height / 2 - scale * y]

  svg.transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale))
}

// Reset zoom
const resetZoom = () => {
  const svg = d3.select(svgContainerRef.value).select('svg')
  if (!svg.empty() && zoom) {
    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity)
  }
}

// Theme observer for dynamic styling updates
const updateThemeStyles = () => {
  const container = d3.select(svgContainerRef.value)
  if (container.empty()) return
  
  const isDarkMode = document.documentElement.classList.contains('dark')
  const defaultFill = isDarkMode ? '#4B5563' : '#e5e7eb' // gray-600 : gray-200
  const defaultStroke = isDarkMode ? '#4B5563' : '#ffffff' // gray-600 : white
  
  // Update country styling
  container.selectAll('.country')
    .each(function(d) {
      const element = d3.select(this)
      const currentFill = element.attr('fill')
      
      // Only update if it's the default color (not a data-driven color)
      if (currentFill === '#e5e7eb' || currentFill === '#4B5563') {
        element.attr('fill', defaultFill)
      }
      element.attr('stroke', defaultStroke)
    })
}

const themeObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      updateThemeStyles()
    }
  })
})

// Resize handler (simplified)
const handleResize = () => {
  // Could implement resize logic here if needed
  console.log('🔄 WorldMap: Resize triggered')
}

// Watchers
watch([() => props.selectedProduct, () => props.selectedYear, () => props.selectedMetric], async () => {
  console.log('🔄 WorldMap WATCHER: Product/Year/Metric changed')
  console.log('🔄 WorldMap WATCHER: Current values:', {
    product: props.selectedProduct,
    year: props.selectedYear,
    metric: props.selectedMetric,
    isInitialized: isInitialized.value
  })
  
  // Only reload if map is already initialized
  if (isInitialized.value) {
    console.log('🔄 WorldMap WATCHER: Map is initialized, loading data...')
    await loadProductionData()
    
    // Update country detail if it's visible
    if (countryDetailVisible.value && selectedCountryDetail.value) {
      console.log('🔄 WorldMap WATCHER: Updating country detail data...')
      // Wait for data to be loaded before updating detail
      await nextTick()
      updateCountryDetailData()
    }
  } else {
    console.log('🔄 WorldMap WATCHER: Map not initialized yet, skipping...')
  }
}, { immediate: true })

// Watch for color filter changes
watch(() => props.colorFilter, (newFilter, oldFilter) => {
  // Avoid unnecessary updates if filter hasn't actually changed
  if (JSON.stringify(newFilter) === JSON.stringify(oldFilter)) {
    return
  }
  
  console.log('🎨 WorldMap WATCHER: Color filter changed:', newFilter)
  
  // Only apply filter if map is initialized and we have data
  if (isInitialized.value && legendScale.value && svgContainerRef.value) {
    console.log('🎨 WorldMap WATCHER: Applying color filter to map...')
    
    // Directly update country colors without reloading data
    const container = d3.select(svgContainerRef.value).select('.map-container')
    if (!container.empty()) {
      updateCountryColorsWithFilter(container)
    }
  } else {
    console.log('🎨 WorldMap WATCHER: Map not ready for filter application, skipping...')
  }
}, { deep: true })

// Removed watcher - using static updates instead

// Map information helper functions
const getMapInfoTitle = () => {
  const metric = props.selectedMetric
  const metricLabels = {
    production: 'Globale Produktion',
    import_quantity: 'Weltweite Importe',
    export_quantity: 'Weltweite Exporte', 
    domestic_supply_quantity: 'Inlandsversorgung',
    food_supply_kcal: 'Kalorienversorgung',
    feed: 'Tierfutternutzung'
  }
  return metricLabels[metric] || 'Weltkarte'
}

const getMapInfoDescription = () => {
  const metric = props.selectedMetric
  const product = props.selectedProduct
  const year = props.selectedYear
  
  const descriptions = {
    production: `Zeigt die Produktionsmengen von ${product} nach Ländern für ${year}. Hellere/gelbere Farben bedeuten höhere Produktion.`,
    import_quantity: `Zeigt die Importmengen von ${product} nach Ländern für ${year}. Hellere Farben = höhere Importe. Klicken Sie auf ein Land für Details.`,
    export_quantity: `Zeigt die Exportmengen von ${product} nach Ländern für ${year}. Gelbe Bereiche sind die größten Exporteure.`,
    domestic_supply_quantity: `Zeigt die verfügbare Inlandsversorgung nach Ländern. Hellere Farben = höhere Versorgung. Berechnet als Produktion + Import - Export.`,
    food_supply_kcal: `Zeigt die verfügbaren Kalorien pro Person pro Tag. Gelbe Bereiche = höhere Kalorienversorgung. Wichtiger Indikator für Ernährungssicherheit.`,
    feed: `Zeigt die Mengen die als Tierfutter verwendet werden. Hellere Farben = mehr Futternutzung. Wichtig für die Fleisch- und Milchproduktion.`
  }
  
  return descriptions[metric] || `Zeigt Daten für ${product} im Jahr ${year}. Hellere Farben bedeuten höhere Werte.`
}

const hasDataGaps = () => {
  // Check if there are countries without data
  const processedData = getProcessedProductionData()
  return processedData.length < 180 // Assuming around 195 countries globally
}

// Toggle function for info panel
const toggleInfoPanel = () => {
  infoExpanded.value = !infoExpanded.value
}

// Close country detail panel
const closeCountryDetail = () => {
  countryDetailVisible.value = false
  selectedCountryDetail.value = null
}

// Format country detail value
const formatCountryDetailValue = (value, unit) => {
  if (!value || value === 0) return 'Keine Daten verfügbar'
  
  // Use the main formatting function to ensure consistency with the old detail view
  return formatAgricultureValue(value, { unit: unit || '1000 t', showUnit: true })
}

// Update country detail data when props change
const updateCountryDetailData = () => {
  if (!selectedCountryDetail.value) return
  
  const countryName = selectedCountryDetail.value.name
  const countryCode = selectedCountryDetail.value.code
  const normalizedName = normalizeCountryName(countryName || '')
  
  // Find updated country data
  const processedData = getProcessedProductionData()
  const countryData = processedData.find(
    item => item.countryCode === countryCode || 
             item.country.toLowerCase() === countryName?.toLowerCase() ||
             item.country.toLowerCase() === normalizedName?.toLowerCase()
  )
  
  // Update the detail view with new data
  selectedCountryDetail.value = {
    name: countryName,
    code: countryCode,
    data: countryData,
    product: props.selectedProduct,
    year: props.selectedYear,
    metric: props.selectedMetric
  }
}

// Initialize on mount with better timing
onMounted(async () => {
  console.log('🔧 WorldMap: onMounted called')
  
  // Wait for DOM to be fully ready
  await nextTick()
  
  // Add a small delay to ensure parent containers are sized
  setTimeout(async () => {
    // Use requestAnimationFrame to ensure DOM is stable
    requestAnimationFrame(async () => {
      try {
        console.log('⏰ WorldMap: RequestAnimationFrame fired, attempting initialization...')
        console.log('📏 WorldMap: Initial container check:', {
          containerRef: !!containerRef.value,
          svgContainerRef: !!svgContainerRef.value,
          containerSize: containerRef.value?.getBoundingClientRect(),
          svgContainerSize: svgContainerRef.value?.getBoundingClientRect()
        })
        await initializeMap()
        
        // Start observing theme changes
        if (document.documentElement) {
          themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
          })
        }
        
        console.log('✅ WorldMap: onMounted initialization complete')
      } catch (error) {
        console.error('❌ WorldMap: Error in onMounted initialization:', error)
        isInitialized.value = false
      }
    })
  }, 100) // 100ms delay to ensure parent layout is complete
})

// Cleanup on unmount
onUnmounted(() => {
  if (tooltip && tooltip.destroy) {
    tooltip.destroy()
  }
  themeObserver.disconnect()
  vizStore.setMapInstance(null)
})

// Exposed methods
defineExpose({
  resetZoom,
  loadProductionData,
  zoomToCountry
})
</script>

<template>
  <div 
    ref="containerRef"
    class="chart-container relative w-full h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
    style="min-height: 600px; width: 100%; height: 100%;"
    data-tour="world-map"
  >
    <!-- Loading overlay -->
    <LoadingSpinner
      v-if="isLoading"
      :overlay="true"
      :centered="true"
      text="Lädt Karte..."
      size="md"
    />

    <!-- Error message -->
    <div
      v-if="error"
      class="absolute inset-0 bg-error-50 dark:bg-error-900/20 flex items-center justify-center z-10"
    >
      <div class="text-center">
        <p class="text-error-600 dark:text-error-400 mb-3">{{ error }}</p>
        <BaseButton
          variant="danger"
          size="sm"
          @click="initializeMap"
        >
          Erneut versuchen
        </BaseButton>
      </div>
    </div>

    <!-- Map controls -->
    <div class="absolute top-4 right-4 z-20 flex flex-col space-y-2">
      <BaseButton
        variant="secondary"
        size="sm"
        :icon="true"
        class="!p-2"
        title="Zoom zurücksetzen"
        @click="resetZoom"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </BaseButton>
    </div>

    <!-- Country Detail Panel (Top Right) -->
    <div 
      v-if="countryDetailVisible && reactiveCountryDetail"
      class="absolute top-4 right-16 z-30 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-sm border border-gray-200 dark:border-gray-600 animate-in slide-in-from-right-2 duration-300"
      style="min-width: 280px;"
    >
      <!-- Close Button -->
      <button
        class="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        title="Schließen"
        @click="closeCountryDetail"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Country Header -->
      <div class="mb-3">
        <h3 class="font-semibold text-lg text-gray-900 dark:text-gray-100 pr-6">
          {{ reactiveCountryDetail.name }}
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ reactiveCountryDetail.code }}
        </p>
      </div>

      <!-- Product Information -->
      <div class="mb-4">
        <div class="flex items-center space-x-2 mb-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Produkt:</span>
          <span class="text-sm text-blue-600 dark:text-blue-400">
            {{ reactiveCountryDetail.product?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }}
          </span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Jahr:</span>
          <span class="text-sm text-gray-600 dark:text-gray-400">
            {{ reactiveCountryDetail.year }}
          </span>
        </div>
      </div>

      <!-- Data Value -->
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ 
              reactiveCountryDetail.metric === 'production' ? 'Produktion' :
              reactiveCountryDetail.metric === 'import_quantity' ? 'Import' :
              reactiveCountryDetail.metric === 'export_quantity' ? 'Export' :
              reactiveCountryDetail.metric === 'domestic_supply_quantity' ? 'Inlandsversorgung' :
              reactiveCountryDetail.metric === 'feed' ? 'Tierfutter' :
              reactiveCountryDetail.metric === 'food_supply_kcal' ? 'Kalorienversorgung' :
              'Wert'
            }}:
          </span>
        </div>
        <div class="mt-1">
          <span class="text-lg font-bold text-gray-900 dark:text-gray-100">
            {{ formatCountryDetailValue(reactiveCountryDetail.data?.value, reactiveCountryDetail.data?.unit) }}
          </span>
        </div>
        <div v-if="reactiveCountryDetail.data?.unit" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Einheit: {{ reactiveCountryDetail.data.unit }}
        </div>
      </div>

      <!-- Additional Info -->
      <div class="mt-3 text-xs text-gray-500 dark:text-gray-400">
        <div class="flex items-center space-x-1">
          <span>ℹ️</span>
          <span>Klicken Sie auf ein anderes Land für weitere Details</span>
        </div>
      </div>
    </div>

    <!-- Map Information Panel -->
    <div class="absolute top-4 left-4 z-20">
      <!-- Info Toggle Button -->
      <button
        class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        :title="infoExpanded ? 'Info schließen' : 'Karteninformationen anzeigen'"
        @click="toggleInfoPanel"
      >
        <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
      </button>

      <!-- Collapsible Info Panel -->
      <div 
        v-if="infoExpanded"
        class="mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-xs border border-gray-200 dark:border-gray-600 animate-in slide-in-from-top-2 duration-200"
      >
        <div class="flex items-start space-x-2">
          <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
          <div class="flex-1">
            <h4 class="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">
              {{ getMapInfoTitle() }}
            </h4>
            <p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {{ getMapInfoDescription() }}
            </p>
            <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <div class="flex items-center space-x-1">
                <span>📊</span>
                <span>Datenquelle: FAO</span>
              </div>
              <div class="flex items-center space-x-1 mt-1">
                <span>📅</span>
                <span>Jahr: {{ props.selectedYear }}</span>
              </div>
              <div v-if="hasDataGaps()" class="flex items-center space-x-1 mt-1 text-yellow-600 dark:text-yellow-400">
                <span>⚠️</span>
                <span>Graue Bereiche: Keine Daten</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- Map SVG Container with explicit sizing -->
    <!-- Remove v-once from container to ensure ref works properly -->
    <div 
      ref="svgContainerRef"
      class="map-svg-container" 
      style="width: 100%; height: 100%; min-height: 480px; position: relative;"
    >
      <!-- Debug message -->
      <div v-if="!isInitialized && !isLoading && !error" class="absolute inset-0 flex items-center justify-center text-gray-500">
        <p>Karte wird initialisiert...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-container {
  width: 100%;
  height: 100%;
  min-height: 600px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.map-svg-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.legend-container {
  flex-shrink: 0;
  z-index: 10;
}

.world-map-svg {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

.country {
  transition: fill 0.3s ease, opacity 0.3s ease, stroke 0.1s ease, stroke-width 0.1s ease;
}

/* Ensure proper rendering within parent containers */
:deep(.map-container) {
  width: 100%;
  height: 100%;
}

/* Global tooltip styles (unscoped) */
:global(.worldmap-tooltip) {
  max-width: 300px;
  line-height: 1.4;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

:global(.worldmap-tooltip strong) {
  font-weight: 600;
  color: #fbbf24;
}
</style>