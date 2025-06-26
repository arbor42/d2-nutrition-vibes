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
            <MultiSelect
              v-model="selectedProducts"
              :options="productOptions"
              placeholder="Produkte auswählen..."
              label="Produkte"
              size="md"
              :max-items="3"
            />
          </div>
          
          <div class="filter-group">
            <MultiSelect
              v-model="selectedCountries"
              :options="countryOptions"
              placeholder="Länder auswählen..."
              label="Länder"
              size="md"
              :max-items="5"
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
        </div>
      </div>

      <div class="panel-content">
        <div v-if="hasError" class="error-container">
          <ErrorDisplay
            :error="error"
            title="Fehler beim Laden der Zeitreihendaten"
            :show-retry="true"
            @retry="ensureDataLoaded"
          />
        </div>

        <div v-else-if="chartData.length > 0" class="chart-container" data-tour="timeseries-chart">
          <TimeseriesChart
            :width="800"
            :height="500"
            :selected-countries="selectedCountries"
            :selected-products="selectedProducts"
            :selected-metric="selectedMetric"
            :chart-data="chartData"
            @point-click="handlePointClick"
          />
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">📈</div>
          <h3>Keine Daten verfügbar</h3>
          <p v-if="selectedProducts.length === 0">
            Wählen Sie mindestens ein Produkt aus, um Zeitreihendaten anzuzeigen.
          </p>
          <p v-else>
            Die ausgewählten Produkte haben keine verfügbaren Zeitreihendaten.
          </p>
        </div>
      </div>

      <div v-if="chartData.length > 0" class="panel-footer">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Datenpunkte</span>
            <span class="stat-value">{{ chartData.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ selectedProducts.length > 1 ? 'Produkte' : 'Produkt' }}</span>
            <span class="stat-value">{{ selectedProducts.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ selectedCountries.length > 1 ? 'Länder' : 'Land' }}</span>
            <span class="stat-value">{{ selectedCountries.length > 0 ? selectedCountries.length : 'Global' }}</span>
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
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import MultiSelect from '@/components/ui/MultiSelect.vue'
import TimeseriesChart from '@/components/visualizations/TimeseriesChart.vue'
import { getAllProductOptions, getGermanName } from '@/utils/productMappings'

// Store and composables
const dataStore = useDataStore()
const uiStore = useUIStore()

// Reactive state - use the same defaults as dashboard
const selectedProducts = ref(['Wheat and products'])
const selectedCountries = ref([])
const selectedMetric = ref('production')
const chartData = ref([])
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
  if (!dataStore.timeseriesData || selectedProducts.value.length === 0) return []
  
  // Get union of all countries that exist for any selected product
  const allCountries = new Set()
  
  selectedProducts.value.forEach(product => {
    const productData = dataStore.timeseriesData[product]
    if (productData) {
      Object.keys(productData).forEach(country => allCountries.add(country))
    }
  })
  
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
  
  return [...allCountries]
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
  { value: 'domestic_supply_quantity', label: 'Inlandsversorgung' },
  { value: 'feed', label: 'Tierfutter' },
  { value: 'food_supply_kcal', label: 'Kalorienversorgung' }
]

// Update chart data when selections change
const updateChartData = () => {
  if (!dataStore.timeseriesData || selectedProducts.value.length === 0) {
    chartData.value = []
    return
  }

  const metricKey = selectedMetric.value === 'production' ? 'production' :
                   selectedMetric.value === 'import_quantity' ? 'imports' :
                   selectedMetric.value === 'export_quantity' ? 'exports' :
                   selectedMetric.value === 'domestic_supply_quantity' ? 'domestic_supply' :
                   selectedMetric.value === 'feed' ? 'feed' :
                   selectedMetric.value === 'food_supply_kcal' ? 'food_supply_kcal' :
                   'production'

  const allData = []

  // Iterate through selected products
  selectedProducts.value.forEach(product => {
    const productData = dataStore.timeseriesData[product]
    if (!productData) return

    if (selectedCountries.value.length > 0) {
      // Multiple countries selected
      selectedCountries.value.forEach(country => {
        if (productData[country]) {
          const countryData = productData[country]
          countryData.forEach(yearData => {
            const value = yearData[metricKey] || 0
            if (value > 0) {
              allData.push({
                year: yearData.year,
                value: value,
                country: country,
                product: product,
                unit: yearData.unit || 't',
                // Create a unique series identifier for each country-product combination
                series: `${country} - ${product}`
              })
            }
          })
        }
      })
    } else {
      // No countries selected - show global data for each product
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
      
      yearlyTotals.forEach((value, year) => {
        allData.push({
          year: year,
          value: value,
          country: 'Global',
          product: product,
          unit: 't',
          series: `Global - ${product}`
        })
      })
    }
  })
  
  chartData.value = allData.sort((a, b) => {
    if (a.series !== b.series) return a.series.localeCompare(b.series)
    return a.year - b.year
  })
}

// Methods
const ensureDataLoaded = async () => {
  try {
    if (!dataStore.timeseriesData) {
      await dataStore.initializeApp()
    }
  } catch (err) {
    error.value = err
    console.error('TimeseriesPanel data loading error:', err)
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
watch([selectedProducts, selectedCountries, selectedMetric], () => {
  updateChartData()
}, { immediate: true })

// Lifecycle
onMounted(async () => {
  await ensureDataLoaded()
  updateChartData()
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
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start;
}

.filter-group {
  @apply flex flex-col;
}

.panel-content {
  @apply flex-1 p-6 min-h-0;
}

.error-container,
.empty-state {
  @apply flex flex-col items-center justify-center h-full;
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