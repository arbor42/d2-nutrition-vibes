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
            <label for="product-select">Produkt</label>
            <SearchableSelect
              id="product-select"
              v-model="selectedProduct"
              :options="productOptions"
              placeholder="Produkt auswählen..."
            />
          </div>
          
          <div class="filter-group">
            <label for="countries-select">Land</label>
            <SearchableSelect
              id="countries-select"
              v-model="selectedCountry"
              :options="countryOptions"
              placeholder="Land auswählen..."
            />
          </div>
          
          <div class="filter-group">
            <label>Zeitraum</label>
            <div class="flex gap-2 items-center">
              <input 
                type="number" 
                v-model.number="yearRange[0]" 
                :min="2010" 
                :max="2022"
                class="form-input flex-1"
                placeholder="Von"
              />
              <span>bis</span>
              <input 
                type="number" 
                v-model.number="yearRange[1]" 
                :min="2010" 
                :max="2022"
                class="form-input flex-1"
                placeholder="Bis"
              />
            </div>
          </div>

          <div class="filter-group">
            <BaseButton @click="loadData" :disabled="isLoading">
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
            :showRetry="true"
            @retry="loadData"
          />
        </div>

        <div v-else-if="isLoading" class="loading-container">
          <LoadingSpinner size="lg" />
          <p class="loading-text">Lade Zeitreihendaten...</p>
        </div>

        <div v-else-if="chartData.length > 0" class="chart-container">
          <TimeseriesChart
            :data="chartData"
            :config="chartConfig"
            @point-click="handlePointClick"
            @range-select="handleRangeSelect"
          />
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">📈</div>
          <h3>Keine Daten verfügbar</h3>
          <p>Wählen Sie Produkt und Länder aus, um Zeitreihendaten anzuzeigen.</p>
        </div>
      </div>

      <div v-if="chartData.length > 0" class="panel-footer">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Datenpunkte</span>
            <span class="stat-value">{{ chartData.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Zeitraum</span>
            <span class="stat-value">{{ yearRange[0] }} - {{ yearRange[1] }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Land</span>
            <span class="stat-value">{{ selectedCountry }}</span>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useDataStore } from '@/stores/useDataStore'
import { useErrorHandling } from '@/composables/useErrorHandling'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import ErrorDisplay from '@/components/ui/ErrorDisplay.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import RangeSlider from '@/components/ui/RangeSlider.vue'
import TimeseriesChart from '@/components/visualizations/TimeseriesChart.vue'

// Store and composables
const dataStore = useDataStore()
const { handleError: handleErrorUtil, wrapAsync } = useErrorHandling()

// Reactive state
const selectedProduct = ref('maize_and_products')
const selectedCountry = ref('USA')
const yearRange = ref([2015, 2022])
const chartData = ref([])
const isLoading = ref(false)
const error = ref(null)

// Computed properties
const hasError = computed(() => error.value !== null)

const productOptions = computed(() => [
  { value: 'maize_and_products', label: 'Mais und Produkte' },
  { value: 'wheat_and_products', label: 'Weizen und Produkte' },
  { value: 'rice_and_products', label: 'Reis und Produkte' },
  { value: 'cassava_and_products', label: 'Kassava und Produkte' },
  { value: 'potatoes_and_products', label: 'Kartoffeln und Produkte' },
  { value: 'fruits_-_excluding_wine', label: 'Früchte (ohne Wein)' },
  { value: 'vegetables', label: 'Gemüse' },
  { value: 'nuts_and_products', label: 'Nüsse und Produkte' },
  { value: 'pulses', label: 'Hülsenfrüchte' },
  { value: 'sugar_and_sweeteners', label: 'Zucker und Süßstoffe' },
  { value: 'milk_-_excluding_butter', label: 'Milch (ohne Butter)' }
])

const countryOptions = computed(() => [
  { value: 'USA', label: 'Vereinigte Staaten' },
  { value: 'CHN', label: 'China' },
  { value: 'BRA', label: 'Brasilien' },
  { value: 'IND', label: 'Indien' },
  { value: 'RUS', label: 'Russland' },
  { value: 'ARG', label: 'Argentinien' },
  { value: 'CAN', label: 'Kanada' },
  { value: 'FRA', label: 'Frankreich' },
  { value: 'UKR', label: 'Ukraine' },
  { value: 'TUR', label: 'Türkei' },
  { value: 'DEU', label: 'Deutschland' },
  { value: 'IDN', label: 'Indonesien' },
  { value: 'THA', label: 'Thailand' },
  { value: 'VNM', label: 'Vietnam' },
  { value: 'POL', label: 'Polen' }
])

const chartConfig = computed(() => ({
  width: 800,
  height: 400,
  margin: { top: 20, right: 30, bottom: 40, left: 80 },
  showPoints: true,
  pointRadius: 4,
  curveType: 'monotone',
  showGrid: true,
  xAxisFormat: 'd',
  yAxisFormat: '.2s',
  responsive: true,
  animated: true,
  interactive: true
}))

// Methods
const loadData = wrapAsync(async () => {
  error.value = null
  isLoading.value = true
  
  try {
    // Load timeseries data from store
    const timeseriesData = await dataStore.loadTimeseriesData()
    
    // Filter data based on selections
    const filtered = timeseriesData.filter(item => 
      item.product === selectedProduct.value &&
      item.country === selectedCountry.value &&
      item.year >= yearRange.value[0] &&
      item.year <= yearRange.value[1]
    )
    
    // Transform data for chart
    chartData.value = filtered.map(item => ({
      year: item.year,
      value: item.value,
      country: item.country,
      product: item.product,
      unit: item.unit || 'tonnes'
    }))
    
  } catch (err) {
    error.value = err
    chartData.value = []
  } finally {
    isLoading.value = false
  }
}, {
  component: 'TimeseriesPanel',
  operation: 'loadData'
})

const handleError = (err) => {
  error.value = err
  handleErrorUtil(err, {
    component: 'TimeseriesPanel',
    action: 'component_error'
  })
}

const handlePointClick = (point) => {
  console.log('Point clicked:', point)
  // TODO: Show detail modal or update selection
}

const handleRangeSelect = (range) => {
  console.log('Range selected:', range)
  // TODO: Update year range based on brush selection
}

// Watchers
watch([selectedProduct, selectedCountry, yearRange], () => {
  if (selectedProduct.value && selectedCountry.value) {
    loadData()
  }
}, { deep: true })

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.timeseries-panel {
  @apply flex flex-col h-full bg-white rounded-lg shadow-lg;
}

.panel-header {
  @apply p-6 border-b border-gray-200;
}

.panel-title {
  @apply text-2xl font-bold text-gray-900 mb-2;
}

.panel-description {
  @apply text-gray-600;
}

.panel-controls {
  @apply p-6 bg-gray-50 border-b border-gray-200;
}

.filters-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
}

.filter-group {
  @apply flex flex-col;
}

.filter-group label {
  @apply text-sm font-medium text-gray-700 mb-2;
}

.panel-content {
  @apply flex-1 p-6;
}

.error-container,
.loading-container,
.empty-state {
  @apply flex flex-col items-center justify-center h-full;
}

.loading-text {
  @apply mt-4 text-gray-600;
}

.empty-icon {
  @apply text-6xl mb-4;
}

.empty-state h3 {
  @apply text-xl font-semibold text-gray-700 mb-2;
}

.empty-state p {
  @apply text-gray-500;
}

.chart-container {
  @apply w-full h-full min-h-96;
}

.panel-footer {
  @apply p-6 bg-gray-50 border-t border-gray-200;
}

.stats-grid {
  @apply grid grid-cols-3 gap-4;
}

.stat-item {
  @apply text-center;
}

.stat-label {
  @apply block text-sm text-gray-500 mb-1;
}

.stat-value {
  @apply block text-lg font-semibold text-gray-900;
}
</style>