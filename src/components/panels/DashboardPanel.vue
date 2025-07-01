<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useTourStore } from '@/tour/stores/useTourStore'
import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'
import WorldMap from '@/components/visualizations/WorldMap.vue'
import MapLegend from '@/components/visualizations/MapLegend.vue'
import TimeseriesChart from '@/components/visualizations/TimeseriesChart.vue'
import ProductSelector from '@/components/ui/ProductSelector.vue'
import { formatAgricultureValue } from '@/utils/formatters'
import { useVisualizationStore } from '@/stores/useVisualizationStore'
import urlService from '@/services/urlState.js'

const dataStore = useDataStore()
const uiStore = useUIStore()
const tourStore = useTourStore()
const vizStore = useVisualizationStore()

const selectedVisualization = computed({
  get: () => uiStore.selectedVisualization,
  set: (val: string) => uiStore.setSelectedVisualization(val)
})
const dashboardLoading = ref(false)
const containerWidth = ref(400)

// Legend data from WorldMap component
const mapLegendData = ref<{ legendScale: any, legendDomain: [number, number], legendUnit: string } | null>(null)

// Color filter state
const activeColorFilter = ref<{
  selectedIndices: number[]
  selectedColors: string[]
}>({
  selectedIndices: [],
  selectedColors: []
})

// Konstantes Mapping von Schema-Name → Farben (identisch zu MapLegend)
const COLOR_SCHEMES = {
  viridis: ['#440154','#482878','#3e4989','#31688e','#26828e','#1f9e89','#35b779','#6ece58','#b5de2b','#fde725'],
  redYellowGreen: ['#d73027','#f46d43','#fdae61','#fee08b','#ffffbf','#d9ef8b','#a6d96a','#66bd63','#1a9850','#006837'],
  blues: ['#f7fbff','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','#08519c','#08306b','#041d42'],
  oranges: ['#fff5eb','#fee6ce','#fdd0a2','#fdae6b','#fd8d3c','#f16913','#d94801','#a63603','#7f2704','#4a1003']
} as const

// Ausgangs-Farbschema aus dem Store ableiten
const initialScheme = vizStore.getVisualizationConfig('worldMap').colorScheme || 'viridis'
const currentColorScheme = ref<string[]>([...COLOR_SCHEMES[initialScheme as keyof typeof COLOR_SCHEMES]])

// Handle legend updates from WorldMap
const handleLegendUpdate = (legendData: { legendScale: any, legendDomain: [number, number], legendUnit: string }) => {
  mapLegendData.value = legendData
}

// Handle color filter changes from MapLegend
const handleColorFilter = (selectedIndices: number[], selectedColors: string[]) => {
  const newFilter = {
    selectedIndices,
    selectedColors
  }
  
  // Only update if the filter actually changed
  if (JSON.stringify(activeColorFilter.value) !== JSON.stringify(newFilter)) {
    activeColorFilter.value = newFilter
    // In UrlStateService schreiben (reactive Ref)
    urlService._mapState.filt.value = [...selectedIndices]
  }
}

// Watch auf UrlStateService → aktualisiere Filter in UI (Route→State)
watch(
  () => urlService._mapState.filt.value,
  (indices: number[] = []) => {
    if (!indices) return
    if (JSON.stringify(indices) !== JSON.stringify(activeColorFilter.value.selectedIndices)) {
      activeColorFilter.value = {
        selectedIndices: [...indices],
        selectedColors: indices.map(i => currentColorScheme.value[i] ?? '')
      }
    }
  },
  { deep: true, immediate: true }
)

// Handle color scheme changes from MapLegend
const handleColorSchemeChange = (schemeName: string, colors: string[]) => {
  // Lokale Farben aktualisieren
  currentColorScheme.value = colors
  // In den Store schreiben → URL-Service greift die Änderung auf
  vizStore.setMapColorScheme(schemeName)
}

// Store-Änderungen beobachten (z. B. wenn sie aus der URL kommen)
watch(
  () => vizStore.getVisualizationConfig('worldMap').colorScheme,
  (newScheme) => {
    if (newScheme && Object.prototype.hasOwnProperty.call(COLOR_SCHEMES, newScheme as keyof typeof COLOR_SCHEMES)) {
      currentColorScheme.value = [...COLOR_SCHEMES[newScheme as keyof typeof COLOR_SCHEMES]]
    }
  }
)

const visualizationOptions = [
  { value: 'world-map', label: 'Weltkarte', icon: 'globe' },
  { value: 'timeseries', label: 'Zeitreihen', icon: 'chart' },
  { value: 'overview', label: 'Übersicht', icon: 'grid' }
]

// Helper to get countries array from different data structures
const getCountriesArray = () => {
  const currentProduct = uiStore.selectedProduct
  const currentYear = uiStore.selectedYear
  const currentMetric = uiStore.selectedMetric
  const hasTimeseries = !!dataStore.timeseriesData
  
  // Special handling for "All" products - aggregate across all products
  if (currentProduct === 'All' && hasTimeseries && dataStore.timeseriesData) {
    const metricKey = currentMetric === 'production' ? 'production' :
                      currentMetric === 'import_quantity' ? 'imports' :
                      currentMetric === 'export_quantity' ? 'exports' :
                      currentMetric === 'feed' ? 'feed' :
                      currentMetric === 'food_supply_kcal' ? 'food_supply_kcal' :
                      currentMetric === 'protein' ? 'protein' :
                      currentMetric === 'protein_gpcd' ? 'protein_gpcd' :
                      currentMetric === 'fat' ? 'fat' :
                      currentMetric === 'fat_gpcd' ? 'fat_gpcd' :
                      currentMetric === 'processing' ? 'processing' :
                      currentMetric === 'domestic_supply_quantity' ? 'domestic_supply' :
                      'domestic_supply'
    
    // Aggregate data across all products for each country
    const countryTotals = new Map()
    
    Object.keys(dataStore.timeseriesData).forEach(product => {
      if (product !== 'All') { // Skip the "All" entry itself
        const productData = dataStore.timeseriesData[product]
        Object.entries(productData).forEach(([country, countryData]) => {
          if (country !== 'All') { // Skip the "All" country entry
            const yearData = countryData.find(d => d.year === currentYear)
            if (yearData) {
              if (currentMetric === 'feed_share') {
                const currentTotal = countryTotals.get(country) || { feed: 0, ds: 0 }
                currentTotal.feed += yearData.feed || 0
                currentTotal.ds += yearData.domestic_supply || 0
                countryTotals.set(country, currentTotal)
              } else if (yearData[metricKey]) {
                const currentTotal = countryTotals.get(country) || { value: 0, unit: yearData.unit || '1000 t' }
                currentTotal.value += yearData[metricKey] || 0
                countryTotals.set(country, currentTotal)
              }
            }
          }
        })
      }
    })
    
    // Convert to array format
    return Array.from(countryTotals.entries()).map(([country, data]) => {
      if (currentMetric === 'feed_share') {
        const share = data.ds > 0 ? (data.feed / data.ds) * 100 : 0
        return {
          country,
          value: share,
          unit: '%',
          year: currentYear
        }
      } else {
        return {
          country,
          value: data.value,
          unit: data.unit,
          year: currentYear
        }
      }
    }).filter(item => item.value > 0)
  }
  
  // Use timeseries data for individual products when available
  if (hasTimeseries && dataStore.timeseriesData[currentProduct]) {
    const metricKey = currentMetric === 'production' ? 'production' :
                      currentMetric === 'import_quantity' ? 'imports' :
                      currentMetric === 'export_quantity' ? 'exports' :
                      currentMetric === 'feed' ? 'feed' :
                      currentMetric === 'food_supply_kcal' ? 'food_supply_kcal' :
                      currentMetric === 'protein' ? 'protein' :
                      currentMetric === 'protein_gpcd' ? 'protein_gpcd' :
                      currentMetric === 'fat' ? 'fat' :
                      currentMetric === 'fat_gpcd' ? 'fat_gpcd' :
                      currentMetric === 'processing' ? 'processing' :
                      currentMetric === 'domestic_supply_quantity' ? 'domestic_supply' :
                      'domestic_supply'
    
    const productTimeseries = dataStore.timeseriesData[currentProduct]
    return Object.entries(productTimeseries)
      // Entferne künstliche Aggregationen "All" (alle Länder), da diese
      // das Farbschema der Weltkarte massiv verzerren würden.
      .filter(([country]) => country !== 'All')
      .map(([country, countryData]) => {
        const yearData = countryData.find(d => d.year === currentYear)
        let value = 0
        if (yearData) {
          if (currentMetric === 'feed_share') {
            value = computeFeedShare(yearData)
          } else {
            value = yearData[metricKey] || 0
          }
        }
        let unit = yearData?.unit || '1000 t'
        
        // Override unit for specific metrics
        if (currentMetric === 'food_supply_kcal') {
          unit = 'kcal/capita/day'
        } else if (currentMetric === 'feed_share') {
          unit = '%'
        } else if (currentMetric === 'protein_gpcd' || currentMetric === 'fat_gpcd') {
          unit = 'g/Kopf/Tag'
        }
        
        return {
          country,
          value: value,
          unit: unit,
          year: currentYear
        }
      }).filter(item => item.value > 0)
  }
  
  // Fallback to production data for grouped products
  const rawData = dataStore.getProductionData(currentProduct, currentYear)
  if (!rawData) return []
  
  if (Array.isArray(rawData)) {
    return rawData
  } else if (rawData.data && Array.isArray(rawData.data)) {
    return rawData.data
  } else if (typeof rawData === 'object') {
    return Object.entries(rawData).map(([country, data]) => ({
      country,
      value: data.value || 0,
      unit: data.unit || 't',
      year: data.year || currentYear
    }))
  }
  return []
}

const selectedCountryData = computed(() => {
  if (!uiStore.selectedCountry || !uiStore.selectedProduct || !uiStore.selectedYear) {
    return null
  }
  
  const countries = getCountriesArray()
  return countries.find(item => item.country === uiStore.selectedCountry)
})

// Country ranking
const countryRank = computed(() => {
  if (!uiStore.selectedCountry) return 'N/A'
  
  const countries = getCountriesArray()
  const sorted = countries
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)
  
  const index = sorted.findIndex(item => item.country === uiStore.selectedCountry)
  return index >= 0 ? index + 1 : 'N/A'
})

// Top countries computed property with proper filtering
const topCountries = computed(() => {
  const countries = getCountriesArray()
  
  // Filter out non-country entities (continents, regions, aggregates)
  const NON_COUNTRY_ENTITIES = [
    // Global/Continental
    "World", "Africa", "Americas", "Asia", "Europe", "Oceania",
    
    // Regional subdivisions
    "Northern America", "South America", "Central America", "Caribbean",
    "Northern Africa", "Eastern Africa", "Middle Africa", "Southern Africa", "Western Africa", 
    "Eastern Asia", "South-eastern Asia", "Southern Asia", "Western Asia", "Central Asia",
    "Eastern Europe", "Northern Europe", "Southern Europe", "Western Europe",
    "Australia and New Zealand", "Melanesia",
    
    // Economic/Political unions
    "European Union (27)",
    
    // Development status groups
    "Small Island Developing States", "Least Developed Countries", 
    "Land Locked Developing Countries", "Low Income Food Deficit Countries",
    "Net Food Importing Developing Countries"
  ]
  
  return countries
    .filter(item => 
      item.value > 0 &&
      item.country && 
      !NON_COUNTRY_ENTITIES.includes(item.country) &&
      !item.country.toLowerCase().includes('total') &&
      item.country !== 'All'
    )
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
})

// Feed usage calculation - dynamically detects if product has feed data
const feedUsage = computed(() => {
  const currentProduct = uiStore.selectedProduct
  const currentYear = uiStore.selectedYear  
  if (!currentProduct || !currentYear) {
    return { percentage: 0, amount: 0, unit: '1000 t' }
  }
  
  // Get timeseries data for feed metric
  if (dataStore.timeseriesData && dataStore.timeseriesData[currentProduct]) {
    const productData = dataStore.timeseriesData[currentProduct]
    let totalProduction = 0
    let totalFeed = 0
    let hasFeedData = false
    
    Object.values(productData).forEach(countryData => {
      const yearData = countryData.find(d => d.year === currentYear)
      if (yearData) {
        totalProduction += yearData.production || 0
        const feedValue = yearData.feed || 0
        totalFeed += feedValue
        
        // Check if this product actually has feed data
        if (feedValue > 0) {
          hasFeedData = true
        }
      }
    })
    
    // Only calculate percentage if we actually found feed data for this product
    if (hasFeedData && totalProduction > 0) {
      const percentage = Math.round((totalFeed / totalProduction) * 100)
      return {
        percentage,
        amount: totalFeed,
        unit: '1000 t'
      }
    }
  }
  
  return { percentage: 0, amount: 0, unit: '1000 t' }
})

const globalStats = computed(() => {
  // Force reactivity on these dependencies
  const currentProduct = uiStore.selectedProduct
  const currentYear = uiStore.selectedYear  
  const currentMetric = uiStore.selectedMetric
  const hasTimeseries = !!dataStore.timeseriesData
  if (!currentProduct || !currentYear) {
    return { total: 0, countries: 0, topProducer: null, unit: '1000 t' }
  }
  
  let rawData = null
  let dataArray = []
  
  // Special handling for "All" products - aggregate across all products
  if (currentProduct === 'All' && hasTimeseries && dataStore.timeseriesData) {
    console.log(`📊 DashboardPanel: Processing "All" products for metric: "${currentMetric}"`)
    
    const metricKey = currentMetric === 'production' ? 'production' :
                      currentMetric === 'import_quantity' ? 'imports' :
                      currentMetric === 'export_quantity' ? 'exports' :
                      currentMetric === 'feed' ? 'feed' :
                      currentMetric === 'food_supply_kcal' ? 'food_supply_kcal' :
                      currentMetric === 'protein' ? 'protein' :
                      currentMetric === 'protein_gpcd' ? 'protein_gpcd' :
                      currentMetric === 'fat' ? 'fat' :
                      currentMetric === 'fat_gpcd' ? 'fat_gpcd' :
                      currentMetric === 'processing' ? 'processing' :
                      currentMetric === 'domestic_supply_quantity' ? 'domestic_supply' :
                      'domestic_supply'
    
    // Aggregate data across all products for each country
    const countryTotals = new Map()
    
    Object.keys(dataStore.timeseriesData).forEach(product => {
      if (product !== 'All') { // Skip the "All" entry itself
        const productData = dataStore.timeseriesData[product]
        Object.entries(productData).forEach(([country, countryData]) => {
          if (country !== 'All') { // Skip the "All" country entry
            const yearData = countryData.find(d => d.year === currentYear)
            if (yearData) {
              if (currentMetric === 'feed_share') {
                const currentTotal = countryTotals.get(country) || { feed: 0, ds: 0 }
                currentTotal.feed += yearData.feed || 0
                currentTotal.ds += yearData.domestic_supply || 0
                countryTotals.set(country, currentTotal)
              } else if (yearData[metricKey]) {
                const currentTotal = countryTotals.get(country) || { value: 0, unit: yearData.unit || '1000 t' }
                currentTotal.value += yearData[metricKey] || 0
                countryTotals.set(country, currentTotal)
              }
            }
          }
        })
      }
    })
    
    // Convert to array format
    dataArray = Array.from(countryTotals.entries()).map(([country, data]) => {
      if (currentMetric === 'feed_share') {
        const share = data.ds > 0 ? (data.feed / data.ds) * 100 : 0
        return {
          country,
          value: share,
          unit: '%',
          year: currentYear
        }
      } else {
        return {
          country,
          value: data.value,
          unit: data.unit,
          year: currentYear
        }
      }
    }).filter(item => item.value > 0)
    
    console.log(`📊 DashboardPanel: "All" products aggregation found ${dataArray.length} countries with ${metricKey} > 0`)
  }
  // Use timeseries data for all metrics when available for individual products
  else if (hasTimeseries && dataStore.timeseriesData[currentProduct]) {
    // Use timeseries data for individual products
    const metricKey = currentMetric === 'production' ? 'production' :
                      currentMetric === 'import_quantity' ? 'imports' :
                      currentMetric === 'export_quantity' ? 'exports' :
                      currentMetric === 'feed' ? 'feed' :
                      currentMetric === 'food_supply_kcal' ? 'food_supply_kcal' :
                      currentMetric === 'protein' ? 'protein' :
                      currentMetric === 'protein_gpcd' ? 'protein_gpcd' :
                      currentMetric === 'fat' ? 'fat' :
                      currentMetric === 'fat_gpcd' ? 'fat_gpcd' :
                      currentMetric === 'processing' ? 'processing' :
                      currentMetric === 'domestic_supply_quantity' ? 'domestic_supply' :
                      'domestic_supply'
    
    console.log(`📊 DashboardPanel: Looking for timeseries data - Product: "${currentProduct}", Metric: "${metricKey}"`)
    
    const productTimeseries = dataStore.timeseriesData[currentProduct]
    console.log(`📊 DashboardPanel: Processing ${metricKey} data for ${currentProduct}:`, {
      countries: Object.keys(productTimeseries).length,
      year: currentYear
    })
    
    dataArray = Object.entries(productTimeseries)
      // Entferne künstliche Aggregationen "All" (alle Länder), da diese
      // das Farbschema der Weltkarte massiv verzerren würden.
      .filter(([country]) => country !== 'All')
      .map(([country, countryData]) => {
        const yearData = countryData.find(d => d.year === currentYear)
        let value = 0
        if (yearData) {
          if (currentMetric === 'feed_share') {
            value = computeFeedShare(yearData)
          } else {
            value = yearData[metricKey] || 0
          }
        }
        let unit = yearData?.unit || '1000 t'
        
        // Override unit for specific metrics
        if (currentMetric === 'food_supply_kcal') {
          unit = 'kcal/capita/day'
        } else if (currentMetric === 'feed_share') {
          unit = '%'
        } else if (currentMetric === 'protein_gpcd' || currentMetric === 'fat_gpcd') {
          unit = 'g/Kopf/Tag'
        }
        
        return {
          country,
          value: value,
          unit: unit,
          year: currentYear
        }
      }).filter(item => item.value > 0)
    
    console.log(`📊 DashboardPanel: Found ${dataArray.length} countries with ${metricKey} > 0`)
  } else if (currentMetric === 'production') {
    // Fallback to production data for grouped products
    console.log(`📊 DashboardPanel: Using production data fallback for grouped product: ${currentProduct}`)
    rawData = dataStore.getProductionData(currentProduct, currentYear)
  } else {
    // Fallback to production data
    rawData = dataStore.getProductionData(currentProduct, currentYear)
  }
  
  if (!rawData && dataArray.length === 0) return { total: 0, countries: 0, topProducer: null, unit: '1000 t' }
  
  // Handle different data structures (object with country keys vs array) - only if we used production data
  if (rawData && dataArray.length === 0) {
    if (Array.isArray(rawData)) {
      dataArray = rawData
    } else if (rawData.data && Array.isArray(rawData.data)) {
      dataArray = rawData.data
    } else if (typeof rawData === 'object') {
      // Convert object format to array
      dataArray = Object.entries(rawData).map(([country, data]) => ({
        country,
        value: data.value || 0,
        unit: data.unit || '1000 t',
        year: data.year || currentYear
      }))
    }
  }
  
  const validData = dataArray.filter(item => item && item.value > 0)
  
  // For per-capita metrics, calculate average instead of sum
  const isPerCapitaMetric = ['food_supply_kcal', 'protein_gpcd', 'fat_gpcd', 'feed_share'].includes(uiStore.selectedMetric)
  const total = isPerCapitaMetric 
    ? validData.length > 0 ? validData.reduce((sum, item) => sum + (item.value || 0), 0) / validData.length : 0
    : validData.reduce((sum, item) => sum + (item.value || 0), 0)
  
  console.log(`📊 DashboardPanel globalStats: validData count: ${validData.length}`)
  console.log(`📊 DashboardPanel globalStats: sample data:`, validData.slice(0, 3))
  
  const countries = validData.length
  
  // Filter out non-country entities (continents, regions, aggregates) for top producer calculation
  const NON_COUNTRY_ENTITIES = [
    // Global/Continental
    "World", "Africa", "Americas", "Asia", "Europe", "Oceania",
    
    // Regional subdivisions
    "Northern America", "South America", "Central America", "Caribbean",
    "Northern Africa", "Eastern Africa", "Middle Africa", "Southern Africa", "Western Africa", 
    "Eastern Asia", "South-eastern Asia", "Southern Asia", "Western Asia", "Central Asia",
    "Eastern Europe", "Northern Europe", "Southern Europe", "Western Europe",
    "Australia and New Zealand", "Melanesia",
    
    // Economic/Political unions
    "European Union (27)",
    
    // Development status groups
    "Small Island Developing States", "Least Developed Countries", 
    "Land Locked Developing Countries", "Low Income Food Deficit Countries",
    "Net Food Importing Developing Countries"
  ]
  
  const countryData = validData.filter(item => 
    item.country && 
    !NON_COUNTRY_ENTITIES.includes(item.country) &&
    !item.country.toLowerCase().includes('total') &&
    item.country !== 'All'
  )
  
  console.log(`📊 DashboardPanel globalStats: countryData count: ${countryData.length}`)
  console.log(`📊 DashboardPanel globalStats: sample countries:`, countryData.slice(0, 3).map(c => c.country))
  
  const topProducer = countryData.length > 0 ? countryData.reduce((max, item) => 
    (item.value || 0) > (max?.value || 0) ? item : max, null
  ) : null
  
  // Determine the correct unit based on metric
  let unit = '1000 t'
  if (currentMetric === 'food_supply_kcal') {
    unit = 'kcal/capita/day'
  } else if (currentMetric === 'feed_share') {
    unit = '%'
  } else if (currentMetric === 'protein_gpcd' || currentMetric === 'fat_gpcd') {
    unit = 'g/Kopf/Tag'
  } else if (validData.length > 0 && validData[0].unit) {
    unit = validData[0].unit
  }
  
  return { 
    total, 
    countries: countryData.length, // Use filtered country count instead of all data
    topProducer: topProducer?.country,
    unit: unit
  }
})

// Dashboard timeseries data for the TimeseriesChart component
const dashboardTimeseriesData = computed(() => {
  const currentProduct = uiStore.selectedProduct
  const currentCountry = uiStore.selectedCountry
  const currentMetric = uiStore.selectedMetric
  
  if (!dataStore.timeseriesData || !currentProduct) {
    return []
  }

  const productData = dataStore.timeseriesData[currentProduct]
  if (!productData) {
    return []
  }

  const metricKey = currentMetric === 'production' ? 'production' :
                   currentMetric === 'import_quantity' ? 'imports' :
                   currentMetric === 'export_quantity' ? 'exports' :
                   currentMetric === 'protein' ? 'protein' :
                   currentMetric === 'protein_gpcd' ? 'protein_gpcd' :
                   currentMetric === 'fat' ? 'fat' :
                   currentMetric === 'fat_gpcd' ? 'fat_gpcd' :
                   currentMetric === 'processing' ? 'processing' :
                   currentMetric === 'domestic_supply_quantity' ? 'domestic_supply' :
                   currentMetric === 'feed' ? 'feed' :
                   currentMetric === 'food_supply_kcal' ? 'food_supply_kcal' :
                   currentMetric === 'protein' ? 'protein' :
                   currentMetric === 'protein_gpcd' ? 'protein_gpcd' :
                   currentMetric === 'fat' ? 'fat' :
                   currentMetric === 'fat_gpcd' ? 'fat_gpcd' :
                   currentMetric === 'processing' ? 'processing' :
                   currentMetric === 'feed_share' ? 'feed_share' :
                   'production'

  if (currentCountry && productData[currentCountry]) {
    // Single country data
    const countryData = productData[currentCountry]
    return countryData
      .map(yearData => ({
        year: yearData.year,
        value: currentMetric === 'feed_share' ? computeFeedShare(yearData) : (yearData[metricKey] || 0),
        country: currentCountry,
        product: currentProduct,
        unit: yearData.unit || 't',
        series: `${currentCountry} - ${currentProduct}`
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => a.year - b.year)
  } else {
    // Global aggregated data
    const yearlyTotals = new Map()
    
    Object.entries(productData).forEach(([country, countryData]) => {
      countryData.forEach(yearData => {
        const value = yearData[metricKey] || 0
        if (value > 0) {
          const year = yearData.year
          const currentTotal = yearlyTotals.get(year) || 0
          yearlyTotals.set(year, currentTotal + value)
        }
      })
    })
    
    return Array.from(yearlyTotals.entries())
      .map(([year, value]) => ({
        year: year,
        value: value,
        country: 'Global',
        product: currentProduct,
        unit: 't',
        series: `Global - ${currentProduct}`
      }))
      .sort((a, b) => a.year - b.year)
  }
})


const onCountryClick = (countryCode: string) => {
  console.log('🖱️ DashboardPanel: Country click received:', countryCode)
  
  // Guard: Validate country code
  if (!countryCode || typeof countryCode !== 'string') {
    console.warn('🚫 DashboardPanel: Invalid country code, ignoring click')
    return
  }
  
  // Find country name from data
  const data = dataStore.getProductionData(uiStore.selectedProduct, uiStore.selectedYear)
  const countryData = data?.data?.find(item => item.countryCode === countryCode)
  
  if (countryData) {
    // Only set if different to prevent unnecessary updates
    if (uiStore.selectedCountry !== countryData.country) {
      console.log('🎯 DashboardPanel: Setting selected country:', countryData.country)
      uiStore.setSelectedCountry(countryData.country)
    } else {
      console.log('🔄 DashboardPanel: Country already selected:', countryData.country)
    }
  } else {
    console.warn('🚫 DashboardPanel: Country data not found for code:', countryCode)
  }
}

onMounted(async () => {
  // Initialize dashboard
  if (!dataStore.hasData) {
    await dataStore.initializeApp()
  }
  
  // Check if we need to load production data or if timeseries is sufficient
  try {
    // Wait a bit for timeseries data to be loaded
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (dataStore.timeseriesData && dataStore.timeseriesData[uiStore.selectedProduct]) {
      console.log('📊 DashboardPanel: Using timeseries data for', uiStore.selectedProduct)
      // Timeseries data is available, no need to load production data
    } else {
      console.log('📊 DashboardPanel: Loading production data for', uiStore.selectedProduct)
      await dataStore.loadProductionData(uiStore.selectedProduct, uiStore.selectedYear)
    }
  } catch (error) {
    console.error('Failed to load initial production data:', error)
  }
  
  // Timeseries data is now loaded during app initialization
  console.log('📊 DashboardPanel: Timeseries data available:', dataStore.timeseriesData ? Object.keys(dataStore.timeseriesData).length + ' products' : 'Not loaded')
  
  // Set up responsive width calculation
  const updateWidth = () => {
    containerWidth.value = Math.min(400, Math.max(300, window.innerWidth * 0.4))
  }
  
  updateWidth()
  window.addEventListener('resize', updateWidth)
  
  // Store handler for cleanup
  resizeHandler = updateWidth
})

let resizeHandler = null
onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
})

// Watch for changes in selection and reload data
// Tooltip and explanation functions
const getTotalMetricTooltip = () => {
  const metric = uiStore.selectedMetric
  const unit = globalStats.value?.unit || '1000 t'
  
  const tooltips = {
    production: `Zeigt die weltweite Gesamtproduktion in ${unit}. Basiert auf FAO-Daten für ${uiStore.selectedYear}.`,
    import_quantity: `Zeigt die weltweiten Gesamtimporte in ${unit}. Umfasst alle Importe zwischen Ländern.`,
    export_quantity: `Zeigt die weltweiten Gesamtexporte in ${unit}. Umfasst alle Exporte zwischen Ländern.`,
    domestic_supply_quantity: `Zeigt die verfügbare Inlandsversorgung in ${unit}. Berechnet als: Produktion + Import - Export ± Lagerveränderungen.`,
    food_supply_kcal: `Zeigt die durchschnittliche Kalorienversorgung pro Person pro Tag. Datenquelle: FAO Food Balance Sheets.`,
    feed: `Zeigt die Menge die als Tierfutter verwendet wird in ${unit}. Wichtiger Indikator für die Fleischproduktion.`,
    protein: `Gesamtmenge an Protein in 1000 t. Datenquelle: FAO Food Balance Sheets`,
    protein_gpcd: `Proteinversorgung pro Kopf pro Tag in g/Kopf/Tag.`,
    fat: `Gesamtmenge an Fett in 1000 t (FAO Food Balance Sheets).`,
    fat_gpcd: `Fettversorgung pro Kopf pro Tag in g/Kopf/Tag.`,
    processing: `Menge der zur Verarbeitung bestimmten Rohstoffe in 1000 t.`,
    feed_share: `Anteil der Inlandsversorgung, der als Tierfutter verwendet wird (%).`
  }
  
  return tooltips[metric] || 'Gesamtwert für die ausgewählte Metrik und das Jahr.'
}

const getFeedUsageTooltip = () => {
  return 'Zeigt den Anteil der Produktion, der als Tierfutter verwendet wird. "N/A" bedeutet, dass dieses Produkt normalerweise nicht als Tierfutter genutzt wird (z.B. Obst, Gemüse). Getreide wird häufig als Tierfutter verwendet.'
}

const getFeedUsageExplanation = () => {
  const product = uiStore.selectedProduct
  const percentage = feedUsage.value.percentage
  
  if (percentage > 50) {
    return 'Hauptsächlich für Tierfutter verwendet'
  } else if (percentage > 20) {
    return 'Teilweise als Tierfutter genutzt'
  } else if (percentage > 0) {
    return 'Geringe Futternutzung'
  } else if (['Maize and products', 'Wheat and products', 'Barley and products', 'Sorghum and products'].includes(product)) {
    return 'Null Futternutzung registriert'
  } else {
    return 'Typischerweise nicht als Tierfutter genutzt'
  }
}

// Debounced watcher to prevent race conditions during tour navigation
let watcherTimeout
watch([() => uiStore.selectedProduct, () => uiStore.selectedYear], async ([product, year]) => {
  if (product && year) {
    // Clear any pending watcher execution
    if (watcherTimeout) {
      clearTimeout(watcherTimeout)
    }
    
    // Debounce the watcher to prevent rapid firing during tour navigation
    watcherTimeout = setTimeout(async () => {
      try {
        // Skip data loading if tour is active and currently executing step actions
        if (tourStore.isTourActive && tourStore.currentStep) {
          console.log('📊 DashboardPanel watcher: Skipping data load during tour step execution')
          return
        }
        
        // Check if timeseries data is available for this product
        if (dataStore.timeseriesData && dataStore.timeseriesData[product]) {
          console.log('📊 DashboardPanel watcher: Using timeseries data for', product)
          // Timeseries data is available, no need to load production data
        } else {
          console.log('📊 DashboardPanel watcher: Loading production data for', product)
          await dataStore.loadProductionData(product, year)
        }
      } catch (error) {
        console.error('Failed to load production data:', error)
      }
    }, tourStore.isTourActive ? 500 : 100) // Longer debounce during tour
  }
})


// Cleanup timeout on unmount
onUnmounted(() => {
  if (watcherTimeout) {
    clearTimeout(watcherTimeout)
  }
})

// Helper zur Berechnung des Tierfutteranteils (%)
const computeFeedShare = (entry: any): number => {
  const ds = entry?.domestic_supply || 0
  const feed = entry?.feed || 0
  return ds > 0 ? (feed / ds) * 100 : 0
}
</script>

<template>
  <div class="space-y-6">
    <!-- Dashboard Header with Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Total Production Card -->
      <div class="card" :title="getTotalMetricTooltip()">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-12 h-12 bg-primary-100 dark:bg-primary-800/40 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <div class="flex items-center space-x-1">
                <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {{ uiStore.selectedMetric === 'production' ? 'Gesamtproduktion' : 
                    uiStore.selectedMetric === 'import_quantity' ? 'Gesamtimport' :
                    uiStore.selectedMetric === 'export_quantity' ? 'Gesamtexport' :
                    uiStore.selectedMetric === 'domestic_supply_quantity' ? 'Inlandsversorgung' :
                    uiStore.selectedMetric === 'food_supply_kcal' ? 'Kalorienversorgung' :
                    uiStore.selectedMetric === 'feed' ? 'Tierfutterverbrauch' :
                    uiStore.selectedMetric === 'protein' ? 'Gesamtprotein' :
                    uiStore.selectedMetric === 'protein_gpcd' ? 'Proteinversorgung' :
                    uiStore.selectedMetric === 'fat' ? 'Gesamtfett' :
                    uiStore.selectedMetric === 'fat_gpcd' ? 'Fettversorgung' :
                    uiStore.selectedMetric === 'processing' ? 'Verarbeitungsmenge' :
                    uiStore.selectedMetric === 'feed_share' ? 'Tierfutteranteil' :
                    'Gesamt' }} {{ uiStore.selectedYear || new Date().getFullYear() }}
                </h3>
                <svg class="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </div>
              <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ formatAgricultureValue(globalStats?.total || 0, { unit: globalStats?.unit || '1000 t', showUnit: true }) }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ uiStore.selectedProduct?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Alle Produkte' }}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Countries Count Card -->
      <div class="card">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-12 h-12 bg-secondary-100 dark:bg-secondary-800/40 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">
                {{ uiStore.selectedMetric === 'production' ? 'Produzierende Länder' :
                  uiStore.selectedMetric === 'import_quantity' ? 'Importierende Länder' :
                  uiStore.selectedMetric === 'export_quantity' ? 'Exportierende Länder' :
                  uiStore.selectedMetric === 'domestic_supply_quantity' ? 'Versorgte Länder' :
                  uiStore.selectedMetric === 'food_supply_kcal' ? 'Länder mit Kaloriendaten' :
                  uiStore.selectedMetric === 'feed' ? 'Länder mit Futterdaten' :
                  uiStore.selectedMetric === 'protein' ? 'Länder mit Proteindaten' :
                  uiStore.selectedMetric === 'protein_gpcd' ? 'Länder mit Proteinversorgungsdaten' :
                  uiStore.selectedMetric === 'fat' ? 'Länder mit Fettdaten' :
                  uiStore.selectedMetric === 'fat_gpcd' ? 'Länder mit Fettversorgungsdaten' :
                  uiStore.selectedMetric === 'processing' ? 'Länder mit Verarbeitungsdaten' :
                  uiStore.selectedMetric === 'feed_share' ? 'Länder mit Futteranteil' :
                  'Länder mit Daten' }}
              </h3>
              <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ globalStats?.countries || 0 }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                mit {{ uiStore.selectedMetric === 'production' ? 'Produktionsdaten' :
                  uiStore.selectedMetric === 'import_quantity' ? 'Importdaten' :
                  uiStore.selectedMetric === 'export_quantity' ? 'Exportdaten' :
                  uiStore.selectedMetric === 'domestic_supply_quantity' ? 'Versorgungsdaten' :
                  uiStore.selectedMetric === 'food_supply_kcal' ? 'Kalorienwerten' :
                  uiStore.selectedMetric === 'feed' ? 'Futterdaten' :
                  uiStore.selectedMetric === 'protein' ? 'Proteindaten' :
                  uiStore.selectedMetric === 'protein_gpcd' ? 'Proteinversorgungsdaten' :
                  uiStore.selectedMetric === 'fat' ? 'Fettdaten' :
                  uiStore.selectedMetric === 'fat_gpcd' ? 'Fettversorgungsdaten' :
                  uiStore.selectedMetric === 'processing' ? 'Verarbeitungsdaten' :
                  uiStore.selectedMetric === 'feed_share' ? 'Futteranteilswerten' :
                  'Daten' }}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Top Producer Card -->
      <div class="card">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-12 h-12 bg-success-100 dark:bg-success-800/40 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">
                {{ uiStore.selectedMetric === 'production' ? 'Größter Produzent' :
                  uiStore.selectedMetric === 'import_quantity' ? 'Größter Importeur' :
                  uiStore.selectedMetric === 'export_quantity' ? 'Größter Exporteur' :
                  uiStore.selectedMetric === 'domestic_supply_quantity' ? 'Größter Verbraucher' :
                  uiStore.selectedMetric === 'food_supply_kcal' ? 'Höchste Kalorienversorgung' :
                  uiStore.selectedMetric === 'feed' ? 'Größter Futterverbraucher' :
                  uiStore.selectedMetric === 'protein' ? 'Größter Proteinerzeuger' :
                  uiStore.selectedMetric === 'protein_gpcd' ? 'Höchste Proteinversorgung' :
                  uiStore.selectedMetric === 'fat' ? 'Größter Fettproduzent' :
                  uiStore.selectedMetric === 'fat_gpcd' ? 'Höchste Fettversorgung' :
                  uiStore.selectedMetric === 'processing' ? 'Größte Verarbeitung' :
                  uiStore.selectedMetric === 'feed_share' ? 'Höchster Futteranteil' :
                  'Spitzenreiter' }}
              </h3>
              <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ globalStats.topProducer || 'N/A' }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ uiStore.selectedYear }}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Feed Usage Card -->
      <div class="card" data-tour="feed-usage" :title="getFeedUsageTooltip()">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-12 h-12 bg-warning-100 dark:bg-warning-800/40 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <div class="flex items-center space-x-1">
                <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Als Tierfutter
                </h3>
                <svg class="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </div>
              <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ feedUsage.percentage > 0 ? feedUsage.percentage + '%' : 
                  feedUsage.percentage === 0 && ['Maize and products', 'Wheat and products', 'Barley and products', 
                                                 'Sorghum and products', 'Cereals - Excluding Beer', 'Grand Total'].includes(uiStore.selectedProduct) 
                    ? '0%' : 'N/A' }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ feedUsage.amount > 0 
                  ? formatAgricultureValue(feedUsage.amount, { unit: feedUsage.unit, showUnit: true })
                  : feedUsage.percentage === 0 && ['Maize and products', 'Wheat and products', 'Barley and products', 
                                                   'Sorghum and products', 'Cereals - Excluding Beer', 'Grand Total'].includes(uiStore.selectedProduct)
                    ? 'Keine Futternutzung'
                    : 'Nicht als Futter genutzt' }}
              </p>
              <div class="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {{ getFeedUsageExplanation() }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    
    <!-- Visualization Selection -->
    <div class="card">
      <div class="card-header">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Hauptvisualisierung
        </h3>
        <div class="flex space-x-2">
          <button
            v-for="option in visualizationOptions"
            :key="option.value"
            :class="[
              'btn btn-sm transition-colors duration-200',
              selectedVisualization === option.value
                ? 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            ]"
            @click="selectedVisualization = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
      <div class="card-body">
        <!-- World Map View -->
        <div v-if="selectedVisualization === 'world-map'" class="w-full relative world-map-visualization" data-tour="world-map">
          <!-- Map Legend (outside the map container) -->
          <MapLegend
            v-if="mapLegendData"
            :legend-scale="mapLegendData.legendScale"
            :legend-domain="mapLegendData.legendDomain"
            :legend-unit="mapLegendData.legendUnit"
            :selected-product="uiStore.selectedProduct"
            :selected-metric="uiStore.selectedMetric"
            :is-loading="dashboardLoading"
            :scheme-name="vizStore.getVisualizationConfig('worldMap').colorScheme"
            :filter-indices="activeColorFilter.selectedIndices"
            @color-filter="handleColorFilter"
            @color-scheme-change="handleColorSchemeChange"
          />
          
          <!-- World Map (without internal legend) -->
          <div class="h-[600px] w-full relative world-map-container">
            <WorldMap
              :selected-product="uiStore.selectedProduct"
              :selected-year="uiStore.selectedYear"
              :selected-metric="uiStore.selectedMetric"
              :color-filter="activeColorFilter"
              :color-scheme="currentColorScheme"
              @country-click="onCountryClick"
              @country-hover="(country) => {}"
              @legend-update="handleLegendUpdate"
            />
          </div>
        </div>
        
        <!-- Timeseries View -->
        <div v-else-if="selectedVisualization === 'timeseries'" class="flex flex-col p-4 min-h-[500px]">
          <div class="flex-1 w-full">
            <TimeseriesChart
              :selected-countries="uiStore.selectedCountry ? [uiStore.selectedCountry] : []"
              :selected-products="uiStore.selectedProduct ? [uiStore.selectedProduct] : []"
              :selected-metric="uiStore.selectedMetric"
              :chart-data="dashboardTimeseriesData"
              @point-hover="(data) => {}"
              @point-click="(data) => {}"
            />
          </div>
        </div>
        
        <!-- Overview Grid -->
        <div v-else-if="selectedVisualization === 'overview'" class="p-4 overflow-hidden">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-full">
            <!-- Mini World Map -->
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden min-h-[700px] flex flex-col">
              <div class="px-4 pt-4 pb-2 flex-shrink-0">
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Weltweite Verteilung
                </h4>
              </div>
              <div class="flex-1 w-full">
                <WorldMap
                  :width="containerWidth"
                  :height="600"
                  :selected-product="uiStore.selectedProduct"
                  :selected-year="uiStore.selectedYear"
                  :selected-metric="uiStore.selectedMetric"
                  @country-click="onCountryClick"
                />
              </div>
            </div>
            
            <!-- Mini Timeseries -->
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden min-h-[700px] flex flex-col">
              <div class="px-4 pt-4 pb-2 flex-shrink-0">
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Zeitliche Entwicklung
                </h4>
              </div>
              <div class="flex-1 w-full">
                <TimeseriesChart
                  :width="containerWidth"
                  :height="600"
                  :selected-countries="uiStore.selectedCountry ? [uiStore.selectedCountry] : []"
                  :selected-products="uiStore.selectedProduct ? [uiStore.selectedProduct] : []"
                  :selected-metric="uiStore.selectedMetric"
                  :chart-data="dashboardTimeseriesData"
                />
              </div>
            </div>
            
            <!-- Top Countries List -->
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-hidden" data-tour="top-countries">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Top 10 Länder
              </h4>
              <div class="space-y-2 max-h-96 overflow-y-auto">
                <div
                  v-for="(item, index) in topCountries"
                  :key="item.country"
                  class="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded"
                >
                  <div class="flex items-center space-x-3">
                    <span class="w-6 h-6 bg-primary-100 dark:bg-primary-800/40 rounded-full flex items-center justify-center text-xs font-medium text-primary-600 dark:text-primary-400">
                      {{ index + 1 }}
                    </span>
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {{ item.country }}
                    </span>
                  </div>
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    {{ formatAgricultureValue(item.value, { unit: item.unit || '1000 t', showUnit: true }) }}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Quick Stats -->
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-hidden">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Schnellstatistiken
              </h4>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400">Durchschnitt/Land:</span>
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ globalStats.countries > 0 ? formatAgricultureValue(Math.round(globalStats.total / globalStats.countries), { unit: globalStats.unit || '1000 t', showUnit: true }) : '0' }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400">Datenjahre:</span>
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ dataStore.availableYears?.length || 0 }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400">Produkte:</span>
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ dataStore.availableProducts?.length || 0 }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400">Gesamt Länder:</span>
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ dataStore.geoData?.features?.length || 0 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="card" data-tour="quick-actions">
      <div class="card-header">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Schnellaktionen
        </h3>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <router-link
            to="/timeseries"
            class="block p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center"
          >
            <svg class="w-8 h-8 text-primary-600 dark:text-primary-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Zeitreihen</p>
          </router-link>
          
          <router-link
            to="/simulation"
            class="block p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center"
          >
            <svg class="w-8 h-8 text-secondary-600 dark:text-secondary-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Simulation</p>
          </router-link>
          
          <router-link
            to="/ml-predictions"
            class="block p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center"
          >
            <svg class="w-8 h-8 text-success-600 dark:text-success-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">ML Prognosen</p>
          </router-link>
          
          <router-link
            to="/structural"
            class="block p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center"
          >
            <svg class="w-8 h-8 text-warning-600 dark:text-warning-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-7v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2h10a2 2 0 012 2zM9 11h6" />
            </svg>
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Strukturanalyse</p>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>