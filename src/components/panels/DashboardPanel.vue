<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'
import WorldMap from '@/components/visualizations/WorldMap.vue'
import TimeseriesChart from '@/components/visualizations/TimeseriesChart.vue'
import ProductSelector from '@/components/ui/ProductSelector.vue'
import { formatAgricultureValue } from '@/utils/formatters'

const dataStore = useDataStore()
const uiStore = useUIStore()

const selectedVisualization = ref('world-map')
const dashboardLoading = ref(false)
const containerWidth = ref(400)

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
  
  // Use timeseries data for individual products when available
  if (hasTimeseries && dataStore.timeseriesData[currentProduct]) {
    const metricKey = currentMetric === 'production' ? 'production' :
                      currentMetric === 'import_quantity' ? 'imports' :
                      currentMetric === 'export_quantity' ? 'exports' :
                      'domestic_supply'
    
    const productTimeseries = dataStore.timeseriesData[currentProduct]
    return Object.entries(productTimeseries).map(([country, countryData]) => {
      const yearData = countryData.find(d => d.year === currentYear)
      return {
        country,
        value: yearData ? (yearData[metricKey] || 0) : 0,
        unit: yearData?.unit || '1000 t',
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
      !item.country.toLowerCase().includes('total')
    )
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
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
  
  // Use timeseries data for all metrics when available for individual products
  if (hasTimeseries && dataStore.timeseriesData[currentProduct]) {
    // Use timeseries data for individual products
    const metricKey = currentMetric === 'production' ? 'production' :
                      currentMetric === 'import_quantity' ? 'imports' :
                      currentMetric === 'export_quantity' ? 'exports' :
                      'domestic_supply'
    
    console.log(`📊 DashboardPanel: Looking for timeseries data - Product: "${currentProduct}", Metric: "${metricKey}"`)
    
    const productTimeseries = dataStore.timeseriesData[currentProduct]
    console.log(`📊 DashboardPanel: Processing ${metricKey} data for ${currentProduct}:`, {
      countries: Object.keys(productTimeseries).length,
      year: currentYear
    })
    
    dataArray = Object.entries(productTimeseries).map(([country, countryData]) => {
      const yearData = countryData.find(d => d.year === currentYear)
      return {
        country,
        value: yearData ? (yearData[metricKey] || 0) : 0,
        unit: yearData?.unit || '1000 t',
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
  const total = validData.reduce((sum, item) => sum + (item.value || 0), 0)
  
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
    !item.country.toLowerCase().includes('total')
  )
  
  console.log(`📊 DashboardPanel globalStats: countryData count: ${countryData.length}`)
  console.log(`📊 DashboardPanel globalStats: sample countries:`, countryData.slice(0, 3).map(c => c.country))
  
  const topProducer = countryData.length > 0 ? countryData.reduce((max, item) => 
    (item.value || 0) > (max?.value || 0) ? item : max, null
  ) : null
  
  return { 
    total, 
    countries: countryData.length, // Use filtered country count instead of all data
    topProducer: topProducer?.country,
    unit: topProducer?.unit || '1000 t'
  }
})


const onCountryClick = (countryCode: string) => {
  // Find country name from data
  const data = dataStore.getProductionData(uiStore.selectedProduct, uiStore.selectedYear)
  const countryData = data?.data?.find(item => item.countryCode === countryCode)
  
  if (countryData) {
    uiStore.setSelectedCountry(countryData.country)
    uiStore.addNotification({
      type: 'info',
      title: 'Land ausgewählt',
      message: `${countryData.country} wurde ausgewählt`
    })
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
watch([() => uiStore.selectedProduct, () => uiStore.selectedYear], async ([product, year]) => {
  if (product && year) {
    try {
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
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Dashboard Header with Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Total Production Card -->
      <div class="card">
        <div class="card-body">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">
                {{ uiStore.selectedMetric === 'production' ? 'Gesamtproduktion' : 
                  uiStore.selectedMetric === 'import_quantity' ? 'Gesamtimport' :
                  uiStore.selectedMetric === 'export_quantity' ? 'Gesamtexport' :
                  'Inlandsversorgung' }} {{ uiStore.selectedYear || new Date().getFullYear() }}
              </h3>
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
              <div class="w-12 h-12 bg-secondary-100 dark:bg-secondary-900/20 rounded-lg flex items-center justify-center">
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
                  'Länder mit Daten' }}
              </h3>
              <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ globalStats?.countries || 0 }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                mit {{ uiStore.selectedMetric === 'production' ? 'Produktionsdaten' :
                  uiStore.selectedMetric === 'import_quantity' ? 'Importdaten' :
                  uiStore.selectedMetric === 'export_quantity' ? 'Exportdaten' :
                  'Versorgungsdaten' }}
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
              <div class="w-12 h-12 bg-success-100 dark:bg-success-900/20 rounded-lg flex items-center justify-center">
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
                  'Größter Verbraucher' }}
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
    </div>
    
    <!-- Selected Country Details -->
    <div v-if="selectedCountryData" class="card">
      <div class="card-header">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {{ uiStore.selectedCountry }} - Detailansicht
        </h3>
        <button
          class="btn btn-ghost btn-sm"
          @click="uiStore.setSelectedCountry('')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">Produktion</p>
            <p class="text-xl font-bold text-primary-600 dark:text-primary-400">
              {{ formatAgricultureValue(selectedCountryData.value, { unit: selectedCountryData.unit || '1000 t', showUnit: true }) }}
            </p>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">Weltanteil</p>
            <p class="text-xl font-bold text-secondary-600 dark:text-secondary-400">
              {{ globalStats.total > 0 && selectedCountryData ? ((selectedCountryData.value / globalStats.total) * 100).toFixed(1) : '0' }}%
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              der Weltproduktion
            </p>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">Rang</p>
            <p class="text-xl font-bold text-success-600 dark:text-success-400">
              #{{ countryRank }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              weltweit
            </p>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">Jahr</p>
            <p class="text-xl font-bold text-gray-600 dark:text-gray-400">
              {{ uiStore.selectedYear }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Datenjahr
            </p>
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
        <div v-if="selectedVisualization === 'world-map'" class="h-[600px] w-full relative" data-tour="world-map">
          <WorldMap
            :selected-product="uiStore.selectedProduct"
            :selected-year="uiStore.selectedYear"
            :selected-metric="uiStore.selectedMetric"
            @country-click="onCountryClick"
            @country-hover="(country) => {}"
          />
        </div>
        
        <!-- Timeseries View -->
        <div v-else-if="selectedVisualization === 'timeseries'" class="h-96 p-4">
          <TimeseriesChart
            :selected-country="uiStore.selectedCountry"
            :selected-product="uiStore.selectedProduct"
            :selected-metric="uiStore.selectedMetric"
            @point-hover="(data) => {}"
            @point-click="(data) => {}"
          />
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
                  :selected-country="uiStore.selectedCountry"
                  :selected-product="uiStore.selectedProduct"
                  :selected-metric="uiStore.selectedMetric"
                />
              </div>
            </div>
            
            <!-- Top Countries List -->
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-hidden">
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
                    <span class="w-6 h-6 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center text-xs font-medium text-primary-600 dark:text-primary-400">
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
    <div class="card">
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