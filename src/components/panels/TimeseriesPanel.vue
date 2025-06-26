<template>
  <div class="timeseries-panel">
    <ErrorBoundary @error="handleError">
      <div class="panel-header">
        <h2 class="panel-title">Zeitreihen-Analyse</h2>
        <p class="panel-description">
          Zeitliche Entwicklung von Produktionsdaten und Trends
        </p>
        
        <div class="simulation-info">
          <div class="info-section">
            <h3 class="info-title">Was wird berechnet?</h3>
            <p class="info-text">
              Diese Analyse zeigt die <strong>historische Entwicklung</strong> verschiedener landwirtschaftlicher Metriken über Zeit. Die Daten stammen aus der FAO-Datenbank und umfassen Produktions-, Import-, Export- und Versorgungsdaten für verschiedene Länder und Regionen von 1961 bis heute.
            </p>
          </div>
          
          <div class="info-section">
            <h3 class="info-title">Wie benutzt man es?</h3>
            <div class="info-steps">
              <div class="step">
                <span class="step-number">1</span>
                <span class="step-text"><strong>Produkte wählen:</strong> Wählen Sie bis zu 3 landwirtschaftliche Produkte aus der Liste</span>
              </div>
              <div class="step">
                <span class="step-number">2</span>
                <span class="step-text"><strong>Länder auswählen:</strong> Wählen Sie bis zu 5 Länder oder lassen Sie das Feld leer für globale Daten</span>
              </div>
              <div class="step">
                <span class="step-number">3</span>
                <span class="step-text"><strong>Metriken festlegen:</strong> Wählen Sie bis zu 3 Metriken wie Produktion, Import, Export oder Kalorienversorgung</span>
              </div>
            </div>
          </div>
          
          <div class="info-section">
            <h3 class="info-title">Berechnungsgrundlage</h3>
            <p class="info-text">
              Die Zeitreihendaten basieren auf offiziellen <strong>FAO-Statistiken</strong> und werden in verschiedenen Einheiten dargestellt (Tonnen, Kalorien/Person/Tag). Fehlende Daten werden als solche markiert. Globale Werte werden durch Summierung aller verfügbaren Länderdaten berechnet.
            </p>
          </div>
        </div>
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
            <MultiSelect
              v-model="selectedMetrics"
              :options="metricOptions"
              placeholder="Metriken auswählen..."
              label="Metriken"
              size="md"
              :max-items="3"
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

        <div v-else-if="chartData.length > 0 || missingDataCombinations.length > 0" class="content-wrapper">
          <div v-if="missingDataCombinations.length > 0" class="missing-data-warning">
            <div class="warning-header">
              <span class="warning-icon">⚠️</span>
              <span class="warning-title">Hinweis: Einige Datenkombinationen sind nicht verfügbar</span>
              <button 
                @click="showMissingDetails = !showMissingDetails"
                class="toggle-details-btn"
              >
                {{ showMissingDetails ? 'Details ausblenden' : 'Details anzeigen' }}
              </button>
            </div>
            <div v-if="showMissingDetails" class="missing-details">
              <div 
                v-for="(item, index) in missingDataCombinations" 
                :key="index"
                class="missing-item"
              >
                <span class="missing-label">{{ item.product }}</span>
                <span class="missing-separator">-</span>
                <span class="missing-label">{{ item.country }}</span>
                <span class="missing-separator">-</span>
                <span class="missing-label">{{ item.metric }}</span>
                <span class="missing-reason">({{ item.reason }})</span>
              </div>
            </div>
          </div>
          
          <div v-if="chartData.length > 0" class="chart-container" data-tour="timeseries-chart">
            <TimeseriesChart
              :width="800"
              :height="500"
              :selected-countries="selectedCountries"
              :selected-products="selectedProducts"
              :selected-metrics="selectedMetrics"
              :chart-data="chartData"
              @point-click="handlePointClick"
            />
          </div>
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
const selectedMetrics = ref(['production'])
const chartData = ref([])
const error = ref(null)
const missingDataCombinations = ref([])
const showMissingDetails = ref(false)

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
  if (!dataStore.timeseriesData || selectedProducts.value.length === 0 || selectedMetrics.value.length === 0) {
    chartData.value = []
    missingDataCombinations.value = []
    return
  }

  const allData = []
  const missingCombinations = []
  const expectedCombinations = new Set()

  // Iterate through selected metrics
  selectedMetrics.value.forEach(metric => {
    const metricKey = metric === 'production' ? 'production' :
                     metric === 'import_quantity' ? 'imports' :
                     metric === 'export_quantity' ? 'exports' :
                     metric === 'domestic_supply_quantity' ? 'domestic_supply' :
                     metric === 'feed' ? 'feed' :
                     metric === 'food_supply_kcal' ? 'food_supply_kcal' :
                     'production'

    // Get metric label for series naming
    const metricLabel = metricOptions.find(m => m.value === metric)?.label || metric

    // Iterate through selected products
    selectedProducts.value.forEach(product => {
      const productData = dataStore.timeseriesData[product]
      if (!productData) {
        missingCombinations.push({
          product: getGermanName(product),
          country: 'Alle',
          metric: metricLabel,
          reason: 'Keine Daten verfügbar'
        })
        return
      }

      if (selectedCountries.value.length > 0) {
        // Multiple countries selected
        selectedCountries.value.forEach(country => {
          const combinationKey = `${country}-${product}-${metric}`
          expectedCombinations.add(combinationKey)
          
          if (productData[country]) {
            const countryData = productData[country]
            let hasData = false
            
            countryData.forEach(yearData => {
              const value = yearData[metricKey] || 0
              if (value > 0) {
                hasData = true
                allData.push({
                  year: yearData.year,
                  value: value,
                  country: country,
                  product: product,
                  metric: metric,
                  metricLabel: metricLabel,
                  unit: yearData.unit || 't',
                  // Create a unique series identifier for each country-product-metric combination
                  series: `${country} - ${product} - ${metricLabel}`
                })
              }
            })
            
            if (!hasData) {
              missingCombinations.push({
                product: getGermanName(product),
                country: country,
                metric: metricLabel,
                reason: 'Keine Werte > 0'
              })
            }
          } else {
            missingCombinations.push({
              product: getGermanName(product),
              country: country,
              metric: metricLabel,
              reason: 'Land nicht in Daten'
            })
          }
        })
      } else {
        // No countries selected - show global data for each product
        const yearlyTotals = new Map()
        let hasGlobalData = false
        
        Object.entries(productData).forEach(([country, countryData]) => {
          countryData.forEach(yearData => {
            const value = yearData[metricKey] || 0
            if (value > 0) {
              hasGlobalData = true
              const year = yearData.year
              const currentTotal = yearlyTotals.get(year) || 0
              yearlyTotals.set(year, currentTotal + value)
            }
          })
        })
        
        if (hasGlobalData) {
          yearlyTotals.forEach((value, year) => {
            allData.push({
              year: year,
              value: value,
              country: 'Global',
              product: product,
              metric: metric,
              metricLabel: metricLabel,
              unit: 't',
              series: `Global - ${product} - ${metricLabel}`
            })
          })
        } else {
          missingCombinations.push({
            product: getGermanName(product),
            country: 'Global',
            metric: metricLabel,
            reason: 'Keine globalen Daten'
          })
        }
      }
    })
  })
  
  chartData.value = allData.sort((a, b) => {
    if (a.series !== b.series) return a.series.localeCompare(b.series)
    return a.year - b.year
  })
  
  missingDataCombinations.value = missingCombinations
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
watch([selectedProducts, selectedCountries, selectedMetrics], () => {
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
  @apply w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700;
  min-height: 500px;
  height: auto; /* Allow container to grow with content */
  padding: 24px; /* Add padding around chart and legend */
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

.content-wrapper {
  @apply flex flex-col h-full gap-4;
}

.missing-data-warning {
  @apply bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4;
}

.warning-header {
  @apply flex items-center gap-2;
}

.warning-icon {
  @apply text-yellow-600 dark:text-yellow-400 text-lg;
}

.warning-title {
  @apply text-sm font-medium text-yellow-800 dark:text-yellow-200 flex-1;
}

.toggle-details-btn {
  @apply text-xs text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200 underline;
}

.missing-details {
  @apply mt-3 space-y-1;
}

.missing-item {
  @apply text-xs text-yellow-700 dark:text-yellow-300 flex items-center gap-1;
}

.missing-label {
  @apply font-medium;
}

.missing-separator {
  @apply text-yellow-600 dark:text-yellow-400;
}

.missing-reason {
  @apply text-yellow-600 dark:text-yellow-400 ml-1;
}

/* Information Cards Styles */
.simulation-info {
  @apply grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6;
}

.info-section {
  @apply bg-gray-50 dark:bg-gray-900 rounded-lg p-4;
}

.info-title {
  @apply text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3;
}

.info-text {
  @apply text-sm text-gray-600 dark:text-gray-400 leading-relaxed;
}

.info-steps {
  @apply space-y-3;
}

.step {
  @apply flex items-start space-x-3;
}

.step-number {
  @apply flex-shrink-0 w-6 h-6 bg-blue-500 dark:bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center;
}

.step-text {
  @apply text-sm text-gray-600 dark:text-gray-400 leading-relaxed;
}
</style>