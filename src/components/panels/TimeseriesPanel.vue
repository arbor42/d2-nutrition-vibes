<template>
  <div class="timeseries-panel">
    <ErrorBoundary @error="handleError">
      <div class="panel-header">
        <h2 class="panel-title">Zeitreihen-Analyse</h2>
        <p class="panel-description">
          Zeitliche Entwicklung von Produktionsdaten und Trends
        </p>
      </div>

      <div class="panel-controls">
        <div class="filters-grid">
          <div class="filter-group">
            <SearchableSelect
              v-model="selectedProduct"
              :options="productOptions"
              placeholder="Produkt auswählen..."
              label="Produkt"
              size="md"
            />
          </div>
          
          <div class="filter-group">
            <SearchableSelect
              v-model="selectedCountry"
              :options="countryOptions"
              placeholder="Land auswählen..."
              label="Land"
              size="md"
            />
          </div>
          
          <div class="filter-group" data-tour="year-selector">
            <SearchableSelect
              v-model="selectedMetric"
              :options="metricOptions"
              placeholder="Metrik auswählen..."
              label="Metrik"
              size="md"
            />
          </div>

          <div class="filter-group">
            <BaseButton 
              :disabled="isLoading" 
              variant="primary"
              size="md"
              class="mt-6"
              @click="loadData"
            >
              <LoadingSpinner v-if="isLoading" size="sm" />
              {{ isLoading ? 'Lädt...' : 'Daten laden' }}
            </BaseButton>
          </div>
        </div>
      </div>

      <div class="panel-content">
        <div v-if="hasError" class="error-container">
          <ErrorDisplay
            :error="error"
            title="Fehler beim Laden der Zeitreihendaten"
            :show-retry="true"
            @retry="loadData"
          />
        </div>

        <div v-else-if="isLoading" class="loading-container">
          <LoadingSpinner size="lg" />
          <p class="loading-text">Lade Zeitreihendaten...</p>
        </div>

        <div v-else-if="chartData.length > 0" class="chart-container" data-tour="timeseries-chart">
          <TimeseriesChart
            :width="800"
            :height="500"
            :selected-country="selectedCountry"
            :selected-product="selectedProduct"
            :selected-metric="selectedMetric"
            @point-click="handlePointClick"
          />
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">📈</div>
          <h3>Keine Daten verfügbar</h3>
          <p>Wählen Sie Produkt und Land aus, um Zeitreihendaten anzuzeigen.</p>
        </div>
      </div>

      <div v-if="chartData.length > 0" class="panel-footer">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Datenpunkte</span>
            <span class="stat-value">{{ chartData.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Produkt</span>
            <span class="stat-value">{{ getGermanName(selectedProduct) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Land</span>
            <span class="stat-value">{{ selectedCountry || 'Global' }}</span>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import ErrorDisplay from '@/components/ui/ErrorDisplay.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import TimeseriesChart from '@/components/visualizations/TimeseriesChart.vue'
import { getAllProductOptions, getGermanName } from '@/utils/productMappings'

// Store and composables
const dataStore = useDataStore()
const uiStore = useUIStore()

// Reactive state - use the same defaults as dashboard
const selectedProduct = ref('Wheat and products')
const selectedCountry = ref('')
const selectedMetric = ref('production')
const chartData = ref([])
const isLoading = ref(false)
const error = ref(null)

// Computed properties
const hasError = computed(() => error.value !== null)

// Get available products from metadata
const productOptions = computed(() => {
  const individualItems = dataStore.faoMetadata?.data_summary?.food_items || []
  
  if (individualItems.length > 0) {
    return individualItems.map(product => ({
      value: product,
      label: getGermanName(product)
    })).sort((a, b) => a.label.localeCompare(b.label, 'de'))
  } else {
    return getAllProductOptions()
  }
})

// Get available countries from timeseries data
const countryOptions = computed(() => {
  if (!dataStore.timeseriesData || !selectedProduct.value) return []
  
  const productData = dataStore.timeseriesData[selectedProduct.value]
  if (!productData) return []
  
  const countries = Object.keys(productData)
  const NON_COUNTRY_ENTITIES = [
    "World", "Africa", "Americas", "Asia", "Europe", "Oceania",
    "Northern America", "South America", "Central America", "Caribbean",
    "Northern Africa", "Eastern Africa", "Middle Africa", "Southern Africa", "Western Africa", 
    "Eastern Asia", "South-eastern Asia", "Southern Asia", "Western Asia", "Central Asia",
    "Eastern Europe", "Northern Europe", "Southern Europe", "Western Europe",
    "Australia and New Zealand", "Melanesia",
    "European Union (27)",
    "Small Island Developing States", "Least Developed Countries", 
    "Land Locked Developing Countries", "Low Income Food Deficit Countries",
    "Net Food Importing Developing Countries"
  ]
  
  return countries
    .filter(country => !NON_COUNTRY_ENTITIES.includes(country) && !country.toLowerCase().includes('total'))
    .map(country => ({
      value: country,
      label: country
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

// Metric options
const metricOptions = [
  { value: 'production', label: 'Produktion' },
  { value: 'import_quantity', label: 'Import' },
  { value: 'export_quantity', label: 'Export' },
  { value: 'domestic_supply_quantity', label: 'Inlandsversorgung' }
]

// Update chart data when selections change
const updateChartData = () => {
  if (!dataStore.timeseriesData || !selectedProduct.value) {
    chartData.value = []
    return
  }

  const productData = dataStore.timeseriesData[selectedProduct.value]
  if (!productData) {
    chartData.value = []
    return
  }

  if (selectedCountry.value && productData[selectedCountry.value]) {
    // Single country data
    const countryData = productData[selectedCountry.value]
    const metricKey = selectedMetric.value === 'production' ? 'production' :
                     selectedMetric.value === 'import_quantity' ? 'imports' :
                     selectedMetric.value === 'export_quantity' ? 'exports' :
                     'domestic_supply'
    
    chartData.value = countryData
      .map(yearData => ({
        year: yearData.year,
        value: yearData[metricKey] || 0,
        country: selectedCountry.value,
        product: selectedProduct.value,
        unit: yearData.unit || 't'
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => a.year - b.year)
  } else {
    // Global aggregated data
    const yearlyTotals = new Map()
    const metricKey = selectedMetric.value === 'production' ? 'production' :
                     selectedMetric.value === 'import_quantity' ? 'imports' :
                     selectedMetric.value === 'export_quantity' ? 'exports' :
                     'domestic_supply'
    
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
    
    chartData.value = Array.from(yearlyTotals.entries())
      .map(([year, value]) => ({
        year: year,
        value: value,
        country: 'Global',
        product: selectedProduct.value,
        unit: 't'
      }))
      .sort((a, b) => a.year - b.year)
  }
}

// Methods
const loadData = async () => {
  error.value = null
  isLoading.value = true
  
  try {
    // Ensure timeseries data is loaded
    if (!dataStore.timeseriesData) {
      await dataStore.initializeApp()
    }
    
    updateChartData()
    
  } catch (err) {
    error.value = err
    chartData.value = []
  } finally {
    isLoading.value = false
  }
}

const handleError = (err) => {
  error.value = err
  console.error('TimeseriesPanel error:', err)
}

const handlePointClick = (point) => {
  console.log('Point clicked:', point)
}

// Watchers
watch([selectedProduct, selectedCountry, selectedMetric], () => {
  updateChartData()
})

// Lifecycle
onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.timeseries-panel {
  @apply flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg;
}

.panel-header {
  @apply p-6 border-b border-gray-200 dark:border-gray-700;
}

.panel-title {
  @apply text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2;
}

.panel-description {
  @apply text-gray-600 dark:text-gray-400;
}

.panel-controls {
  @apply p-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700;
}

.filters-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end;
}

.filter-group {
  @apply flex flex-col;
}

.panel-content {
  @apply flex-1 p-6 min-h-0;
}

.error-container,
.loading-container,
.empty-state {
  @apply flex flex-col items-center justify-center h-full;
}

.loading-text {
  @apply mt-4 text-gray-600 dark:text-gray-400;
}

.empty-icon {
  @apply text-6xl mb-4;
}

.empty-state h3 {
  @apply text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2;
}

.empty-state p {
  @apply text-gray-500 dark:text-gray-400;
}

.chart-container {
  @apply w-full h-full min-h-[500px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700;
}

.panel-footer {
  @apply p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700;
}

.stats-grid {
  @apply grid grid-cols-3 gap-4;
}

.stat-item {
  @apply text-center;
}

.stat-label {
  @apply block text-sm text-gray-500 dark:text-gray-400 mb-1;
}

.stat-value {
  @apply block text-lg font-semibold text-gray-900 dark:text-gray-100;
}
</style>