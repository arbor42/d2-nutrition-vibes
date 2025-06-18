<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'
import WorldMap from '@/components/visualizations/WorldMap.vue'
import WorldMapSimple from '@/components/visualizations/WorldMapSimple.vue'
import TimeseriesChart from '@/components/visualizations/TimeseriesChart.vue'

const dataStore = useDataStore()
const uiStore = useUIStore()

const selectedVisualization = ref('world-map')
const dashboardLoading = ref(false)

const visualizationOptions = [
  { value: 'world-map', label: 'Weltkarte', icon: 'globe' },
  { value: 'timeseries', label: 'Zeitreihen', icon: 'chart' },
  { value: 'overview', label: 'Übersicht', icon: 'grid' }
]

const selectedCountryData = computed(() => {
  if (!uiStore.selectedCountry || !uiStore.selectedProduct || !uiStore.selectedYear) {
    return null
  }
  
  const data = dataStore.getProductionData(uiStore.selectedProduct, uiStore.selectedYear)
  return data?.data?.find(item => item.country === uiStore.selectedCountry)
})

const globalStats = computed(() => {
  if (!uiStore.selectedProduct || !uiStore.selectedYear) {
    return { production: 0, countries: 0, topProducer: null }
  }
  
  const data = dataStore.getProductionData(uiStore.selectedProduct, uiStore.selectedYear)
  if (!data?.data) return { production: 0, countries: 0, topProducer: null }
  
  const total = data.data.reduce((sum, item) => sum + item.value, 0)
  const countries = data.data.filter(item => item.value > 0).length
  const topProducer = data.data.reduce((max, item) => 
    item.value > (max?.value || 0) ? item : max, null
  )
  
  return { 
    production: total, 
    countries, 
    topProducer: topProducer?.country 
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
  
  // Load initial production data
  try {
    await dataStore.loadProductionData(uiStore.selectedProduct, uiStore.selectedYear)
  } catch (error) {
    console.error('Failed to load initial production data:', error)
  }
})

// Watch for changes in selection and reload data
watch([() => uiStore.selectedProduct, () => uiStore.selectedYear], async ([product, year]) => {
  if (product && year) {
    try {
      await dataStore.loadProductionData(product, year)
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
                Gesamtproduktion {{ uiStore.selectedYear }}
              </h3>
              <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ globalStats.production.toLocaleString('de-DE') }}
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
                Produzierende Länder
              </h3>
              <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ globalStats.countries }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                mit Produktionsdaten
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
                Größter Produzent
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
          @click="uiStore.setSelectedCountry('')"
          class="btn btn-ghost btn-sm"
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
              {{ selectedCountryData.value.toLocaleString('de-DE') }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ selectedCountryData.unit || 'Tonnen' }}
            </p>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">Weltanteil</p>
            <p class="text-xl font-bold text-secondary-600 dark:text-secondary-400">
              {{ ((selectedCountryData.value / globalStats.production) * 100).toFixed(1) }}%
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              der Weltproduktion
            </p>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">Rang</p>
            <p class="text-xl font-bold text-success-600 dark:text-success-400">
              #{{ (dataStore.getProductionData(uiStore.selectedProduct, uiStore.selectedYear)?.data
                ?.sort((a, b) => b.value - a.value)
                ?.findIndex(item => item.country === uiStore.selectedCountry) + 1) || 'N/A' }}
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
            @click="selectedVisualization = option.value"
            :class="[
              'btn btn-sm',
              selectedVisualization === option.value
                ? 'btn-primary'
                : 'btn-outline'
            ]"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
      <div class="card-body p-0">
        <!-- World Map View -->
        <div v-if="selectedVisualization === 'world-map'" class="h-96">
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
        <div v-else-if="selectedVisualization === 'overview'" class="p-4">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Mini World Map -->
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Weltweite Verteilung
              </h4>
              <div class="h-48">
                <WorldMap
                  :width="400"
                  :height="200"
                  :selected-product="uiStore.selectedProduct"
                  :selected-year="uiStore.selectedYear"
                  :selected-metric="uiStore.selectedMetric"
                  @country-click="onCountryClick"
                />
              </div>
            </div>
            
            <!-- Mini Timeseries -->
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Zeitliche Entwicklung
              </h4>
              <div class="h-48">
                <TimeseriesChart
                  :width="400"
                  :height="200"
                  :selected-country="uiStore.selectedCountry"
                  :selected-product="uiStore.selectedProduct"
                  :selected-metric="uiStore.selectedMetric"
                />
              </div>
            </div>
            
            <!-- Top Countries List -->
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Top 10 Länder
              </h4>
              <div class="space-y-2">
                <div
                  v-for="(item, index) in (dataStore.getProductionData(uiStore.selectedProduct, uiStore.selectedYear)?.data
                    ?.sort((a, b) => b.value - a.value)
                    ?.slice(0, 10) || [])"
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
                    {{ item.value.toLocaleString('de-DE') }}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Quick Stats -->
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Schnellstatistiken
              </h4>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400">Durchschnitt/Land:</span>
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ Math.round(globalStats.production / globalStats.countries).toLocaleString('de-DE') }}
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
                    {{ dataStore.availableCountries?.length || 0 }}
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