<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
// Removed unused composables
import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'
import { useVisualizationStore } from '@/stores/useVisualizationStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'

interface Props {
  width?: number
  height?: number
  selectedProduct?: string
  selectedYear?: number
  selectedMetric?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 600,
  selectedProduct: 'Wheat and products',
  selectedYear: 2022,
  selectedMetric: 'production'
})

const emit = defineEmits<{
  countryClick: [country: string]
  countryHover: [country: string | null]
}>()

// Stores
const dataStore = useDataStore()
const uiStore = useUIStore()
const vizStore = useVisualizationStore()

// Refs
const containerRef = ref<HTMLDivElement>()
const svgContainerRef = ref<HTMLDivElement>()

// State (completely isolate from Vue reactivity)
const isLoading = ref(false)
const error = ref<string | null>(null)
let geoDataStatic = null // Non-reactive
let productionDataStatic = [] // Non-reactive
const isInitialized = ref(false)

// Legend state
const legendScale = ref(null)
const legendDomain = ref([0, 100000000]) // Static domain across years

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
    
    // Get mouse position
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
  if (!Array.isArray(productionDataStatic)) return []
  return productionDataStatic.filter(d => d.value > 0)
}

// Map elements
let projection: d3.GeoProjection
let path: d3.GeoPath
let colorScale: d3.ScaleQuantize<string>
let zoom: d3.ZoomBehavior<SVGElement, unknown>

// High contrast green color scheme for production data
const greenColorScheme = [
  '#f7fcf5',  // Almost white for zero/very low values
  '#e5f5e0',  // Very light green
  '#a8dba8',  // Light green
  '#7bc96f',  // Light-medium green
  '#4eb157',  // Medium green
  '#2e8b3e',  // Medium-dark green
  '#1b7828',  // Dark green
  '#0d5814',  // Very dark green
  '#003300'   // Almost black green for highest values
]

// Computed properties
const mapConfig = computed(() => ({
  projection: 'naturalEarth1',
  colorScheme: greenColorScheme,
  ...vizStore.getVisualizationConfig('worldMap')
}))

// Initialize map
const initializeMap = async () => {
  console.log('🚀 WorldMap: initializeMap called')
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
    geoDataStatic = loadedGeoData

    // Initialize tooltip
    tooltip.init()
    
    // Initialize map with direct D3 approach (working solution)
    console.log('🚀 WorldMap: Creating map directly...')
    createMapDirect(loadedGeoData)

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
const createMapDirect = (data) => {
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
    .style('background-color', '#f8fafc')

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
  
  const countries = container.selectAll('.country')
    .data(features, d => d.properties.iso_a3 || d.properties.adm0_a3 || d.properties.name)
  
  // Remove old countries
  countries.exit().remove()
  
  // Add new countries
  const enterCountries = countries.enter()
    .append('path')
    .attr('class', 'country')
    .attr('d', path)
    .attr('fill', '#e5e7eb')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 0.5)
    .style('cursor', 'pointer')
    .on('click', handleCountryClick)
    .on('mouseover', handleCountryMouseover)
    .on('mouseout', handleCountryMouseout)
  
  // Update existing countries
  countries.merge(enterCountries)
    .attr('d', path)
  
  const totalCountries = container.selectAll('.country').size()
  console.log('✅ WorldMap: Countries drawn, total:', totalCountries)
}

// Create legend
const createLegend = (svg) => {
  console.log('🎨 WorldMap: Creating legend...')
  
  // Remove existing legend
  svg.select('.legend-group').remove()
  
  if (!legendScale.value || !legendDomain.value) {
    console.log('⚠️ WorldMap: No legend scale available yet')
    return
  }
  
  const legendWidth = 200
  const legendHeight = 10
  const legendMargin = { top: 10, right: 20, bottom: 30, left: 20 }
  
  // Get actual SVG dimensions
  const svgNode = svg.node()
  const svgWidth = svgNode ? svgNode.clientWidth : props.width
  const svgHeight = svgNode ? svgNode.clientHeight : props.height
  
  const legend = svg.append('g')
    .attr('class', 'legend-group')
    .attr('transform', `translate(${svgWidth - legendWidth - legendMargin.right}, ${svgHeight - legendHeight - legendMargin.bottom})`)
  
  // Create gradient
  const gradientId = 'legend-gradient'
  
  // Check if defs already exists
  let defs = svg.select('defs')
  if (defs.empty()) {
    defs = svg.append('defs')
  }
  
  const gradient = defs
    .append('linearGradient')
    .attr('id', gradientId)
    .attr('x1', '0%')
    .attr('x2', '100%')
    .attr('y1', '0%')
    .attr('y2', '0%')
  
  // Color stops are now added above in the scale section
  
  // Add rectangle with gradient
  legend.append('rect')
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .attr('fill', `url(#${gradientId})`)
    .attr('stroke', '#e5e7eb')
    .attr('stroke-width', 0.5)
  
  // Add scale
  const legendScaleLinear = d3.scaleLinear()
    .domain(legendDomain.value)
    .range([0, legendWidth])
  
  // Update gradient with smooth transition
  gradient.selectAll('stop').remove()
  
  // Add color stops for each color in the scheme
  if (legendScale.value && legendScale.value.quantiles) {
    const quantiles = [0, ...legendScale.value.quantiles(), legendDomain.value[1]]
    
    greenColorScheme.forEach((color, i) => {
      if (i < quantiles.length - 1) {
        const startPos = legendScaleLinear(quantiles[i]) / legendWidth
        const endPos = legendScaleLinear(quantiles[i + 1]) / legendWidth
        
        gradient.append('stop')
          .attr('offset', `${startPos * 100}%`)
          .attr('stop-color', color)
        
        if (i < greenColorScheme.length - 1) {
          gradient.append('stop')
            .attr('offset', `${endPos * 100}%`)
            .attr('stop-color', color)
        }
      }
    })
  } else {
    // Fallback: linear gradient
    greenColorScheme.forEach((color, i) => {
      gradient.append('stop')
        .attr('offset', `${(i / (greenColorScheme.length - 1)) * 100}%`)
        .attr('stop-color', color)
    })
  }
  
  const legendAxis = d3.axisBottom(legendScaleLinear)
    .ticks(5)
    .tickFormat(d => {
      if (d >= 1000000) return d3.format('.1s')(d)
      if (d >= 1000) return d3.format('.0s')(d)
      return d3.format('.0f')(d)
    })
  
  legend.append('g')
    .attr('transform', `translate(0, ${legendHeight})`)
    .call(legendAxis)
    .selectAll('text')
    .style('font-size', '10px')
  
  // Add title
  legend.append('text')
    .attr('x', legendWidth / 2)
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .style('font-size', '11px')
    .style('font-weight', '500')
    .text(props.selectedMetric === 'production' ? 'Produktion (t)' : 
          props.selectedMetric === 'import_quantity' ? 'Import (t)' :
          props.selectedMetric === 'export_quantity' ? 'Export (t)' :
          'Versorgung (t)')
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
  if (!props.selectedProduct || !props.selectedYear) return

  try {
    console.log(`🗺️ WorldMap: Loading data for ${props.selectedProduct} ${props.selectedYear} - Metric: ${props.selectedMetric}`)
    
    let productionData = null
    
    // Check if we have timeseries data for this product (individual products)
    if (dataStore.timeseriesData && dataStore.timeseriesData[props.selectedProduct]) {
      console.log('🗺️ WorldMap: Using timeseries data for individual product')
      const timeseriesData = dataStore.getTimeseriesDataForProduct(props.selectedProduct, props.selectedYear)
      
      if (timeseriesData) {
        productionData = Object.entries(timeseriesData).map(([country, data]) => {
          const metricKey = props.selectedMetric === 'production' ? 'production' :
                           props.selectedMetric === 'import_quantity' ? 'imports' :
                           props.selectedMetric === 'export_quantity' ? 'exports' :
                           props.selectedMetric === 'domestic_supply_quantity' ? 'domestic_supply' :
                           'production'
          
          return {
            country: country,
            countryCode: getCountryCode(country),
            value: data[metricKey] || 0,
            unit: data.unit || 't',
            year: props.selectedYear,
            element: props.selectedMetric
          }
        }).filter(item => item.value > 0)
      }
    } else {
      // Fallback to production data for grouped products
      console.log('🗺️ WorldMap: Using production data for grouped product')
      productionData = await dataStore.loadProductionData(
        props.selectedProduct, 
        props.selectedYear
      )
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
      productionDataStatic = transformedData
      
      // Update map if already initialized
      updateMapWithProductionDataStatic()
    }
  } catch (err) {
    console.warn('Failed to load production data:', err)
    productionDataStatic = []
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
  const containerElement = svgContainerRef.value
  if (!containerElement) return
  
  const container = d3.select(containerElement).select('.map-container')
  if (!container.empty()) {
    updateMapWithProductionDataDirect(container)
  }
}

// Apply production data directly
const applyProductionDataDirect = (container, data) => {
  if (!data || !Array.isArray(data)) return

  console.log('📊 WorldMap: Applying production data:', data.length, 'entries')
  console.log('📊 WorldMap: Sample data:', data.slice(0, 5))

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

  // Create color scale with fixed domain for consistency across years
  const values = data.filter(d => d.value > 0).map(d => d.value)
  if (values.length > 0) {
    // Update legend domain if needed
    const maxValue = d3.max(values)
    const minValue = d3.min(values)
    
    // Create domain with better distribution
    legendDomain.value = [0, maxValue]
    
    console.log('🎨 WorldMap: Color scale domain:', legendDomain.value)
    console.log('🎨 WorldMap: Min value:', minValue, 'Max value:', maxValue)
    
    // Use quantile scale for better distribution of colors
    // This ensures equal number of countries in each color bin
    const sortedValues = values.sort((a, b) => a - b)
    
    colorScale = d3.scaleQuantile()
      .domain(sortedValues)
      .range(greenColorScheme)
    
    console.log('🎨 WorldMap: Quantile thresholds:', colorScale.quantiles())
    
    // Test the scale
    console.log('🎨 WorldMap: Test colors - 0:', colorScale(0), maxValue/2 + ':', colorScale(maxValue/2), maxValue + ':', colorScale(maxValue))
    
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
        // Log first few countries to debug
        if (container.selectAll('.country').nodes().indexOf(d) < 5) {
          console.log(`🎨 Country: ${countryName}, Code: ${countryCode}, Value: ${value}, Color: ${color}`)
        }
        return color
      }
      return '#e5e7eb'
    })
    .attr('opacity', (d) => {
      const countryName = (d.properties.name || d.properties.NAME || d.properties.admin || '').toLowerCase()
      const countryCode = d.properties.iso_a3 || d.properties.ISO_A3 || d.properties.adm0_a3 || d.properties.ADM0_A3
      const normalizedName = normalizeCountryName(d.properties.name || d.properties.NAME || '').toLowerCase()
      
      const hasData = (countryCode && dataByCountryCode.has(countryCode)) || 
                      dataByNormalizedName.has(normalizedName) ||
                      dataByCountry.has(countryName)
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

// Apply production data to map
const applyProductionData = (container, data) => {
  if (!data || !Array.isArray(data)) return

  console.log('🗺️ WorldMap: Applying production data to map:', data)

  // Create data lookup by both country name and country code for better matching
  const dataByCountry = new Map()
  const dataByCountryCode = new Map()
  const dataByNormalizedName = new Map()
  
  data.forEach(d => {
    if (d.value > 0) {
      // Store by original name (lowercase)
      dataByCountry.set(d.country.toLowerCase(), d.value)
      // Store by country code
      dataByCountryCode.set(d.countryCode, d.value)
      // Store by normalized name (lowercase)
      const normalizedName = normalizeCountryName(d.country).toLowerCase()
      dataByNormalizedName.set(normalizedName, d.value)
    }
  })

  console.log('🗺️ WorldMap: Data lookup maps created:', { 
    countryNames: Array.from(dataByCountry.keys()), 
    countryCodes: Array.from(dataByCountryCode.keys()),
    normalizedNames: Array.from(dataByNormalizedName.keys())
  })

  // Create color scale
  const values = Array.from(dataByCountry.values()).filter(v => v > 0)
  if (values.length > 0) {
    const extent = d3.extent(values)
    const colorScheme = mapConfig.value.colorScheme
    
    colorScale = d3.scaleQuantize()
      .domain(extent)
      .range(colorScheme)
      
    console.log('🗺️ WorldMap: Color scale created with domain:', extent)
  }

  // Update country colors with smooth transition
  const countries = container.selectAll('.country')
  console.log('🗺️ WorldMap: Found', countries.size(), 'country elements to update')
  
  countries.transition()
    .duration(750)
    .attr('fill', (d) => {
      // Try multiple properties for country identification
      const countryName = (d.properties.name || d.properties.NAME || d.properties.admin || '').toLowerCase()
      const countryCode = d.properties.iso_a3 || d.properties.adm0_a3
      const normalizedName = normalizeCountryName(d.properties.name || d.properties.admin || '').toLowerCase()
      
      // Look up by country code first, then by normalized name, then by original name
      let value = dataByCountryCode.get(countryCode) || 
                  dataByNormalizedName.get(normalizedName) ||
                  dataByCountry.get(countryName)
      
      if (value && colorScale) {
        console.log(`🗺️ WorldMap: Coloring ${countryName}/${countryCode} with value ${value}`)
        return colorScale(value)
      }
      return '#e5e7eb'
    })
    .attr('opacity', (d) => {
      const countryName = (d.properties.name || d.properties.NAME || d.properties.admin || '').toLowerCase()
      const countryCode = d.properties.iso_a3 || d.properties.adm0_a3
      const normalizedName = normalizeCountryName(d.properties.name || d.properties.admin || '').toLowerCase()
      
      const hasData = dataByCountryCode.has(countryCode) || 
                      dataByNormalizedName.has(normalizedName) ||
                      dataByCountry.has(countryName)
      return hasData ? 1 : 0.6
    })
}

// Event handlers
const handleCountryClick = (event, d) => {
  const countryName = d.properties.name
  const countryCode = d.properties.iso_a3
  
  uiStore.setSelectedCountry(countryName)
  emit('countryClick', countryCode)
  
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
  
  // Format tooltip content
  let content = `<strong>${countryName}</strong><br/>`
  if (countryData && countryData.value > 0) {
    const formattedValue = d3.format(',.0f')(countryData.value)
    const productName = props.selectedProduct?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Produkt'
    const metricLabel = props.selectedMetric === 'production' ? 'Produktion' :
                       props.selectedMetric === 'import_quantity' ? 'Import' :
                       props.selectedMetric === 'export_quantity' ? 'Export' :
                       'Inlandsversorgung'
    content += `<span style="color: #fbbf24">${productName}</span><br/>`
    content += `${metricLabel}: <strong>${formattedValue}</strong> ${countryData.unit || 't'}<br/>`
    content += `<span style="color: #9ca3af; font-size: 12px">Jahr: ${props.selectedYear}</span>`
  } else {
    content += '<span style="color: #ef4444">Keine Daten verfügbar</span>'
  }
  
  // Show tooltip
  tooltip.show(event, d, () => content)
  
  emit('countryHover', countryCode)
}

const handleCountryMouseout = (event, d) => {
  // Remove visual hover effect
  d3.select(event.currentTarget)
    .transition()
    .duration(100)
    .attr('stroke', '#ffffff')
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

// Resize handler (simplified)
const handleResize = () => {
  // Could implement resize logic here if needed
  console.log('🔄 WorldMap: Resize triggered')
}

// Watchers
watch([() => props.selectedProduct, () => props.selectedYear, () => props.selectedMetric], async () => {
  console.log('🔄 WorldMap: Product/Year/Metric changed, reloading data...')
  await loadProductionData()
}, { immediate: false })

// Removed watcher - using static updates instead

// Removed - no longer needed

// Removed - no longer needed

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
        console.log('📊 WorldMap: Loading production data from onMounted...')
        await loadProductionData()
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
          @click="initializeMap"
          variant="danger"
          size="sm"
        >
          Erneut versuchen
        </BaseButton>
      </div>
    </div>

    <!-- Map controls -->
    <div class="absolute top-4 right-4 z-20 flex flex-col space-y-2">
      <BaseButton
        @click="resetZoom"
        variant="secondary"
        size="sm"
        :icon="true"
        class="!p-2"
        title="Zoom zurücksetzen"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </BaseButton>
    </div>

    <!-- Map SVG Container with explicit sizing -->
    <!-- Remove v-once from container to ensure ref works properly -->
    <div 
      ref="svgContainerRef"
      class="map-svg-container" 
      style="width: 100%; height: 100%; min-height: 600px; position: relative;"
    >
      <!-- Debug message -->
      <div v-if="!isInitialized && !isLoading && !error" class="absolute inset-0 flex items-center justify-center text-gray-500">
        <p>Karte wird initialisiert...</p>
      </div>
    </div>

    <!-- Legend is rendered inside the SVG via D3 -->
  </div>
</template>

<style scoped>
.chart-container {
  width: 100%;
  height: 100%;
  min-height: 600px;
  position: relative;
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