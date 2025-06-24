<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import { getAllProductOptions, getGermanName } from '@/utils/productMappings'

const router = useRouter()
const dataStore = useDataStore()
const uiStore = useUIStore()

// Available product options for the searchable dropdown
const productOptions = computed(() => {
  // Get individual items from metadata if available
  const individualItems = dataStore.faoMetadata?.data_summary?.food_items || []
  
  if (individualItems.length > 0) {
    // Use individual products from metadata with German names
    return individualItems.map(product => ({
      value: product,
      label: getGermanName(product)
    })).sort((a, b) => a.label.localeCompare(b.label, 'de'))
  } else {
    // Fallback to all available products from mappings
    return getAllProductOptions()
  }
})

// Metric options
const metricOptions = [
  { value: 'production', label: 'Produktion' },
  { value: 'import_quantity', label: 'Import' },
  { value: 'export_quantity', label: 'Export' },
  { value: 'domestic_supply_quantity', label: 'Inlandsversorgung' },
  { value: 'food_supply_kcal', label: 'Kalorienversorgung' },
  { value: 'feed', label: 'Tierfutter' }
]

// Year options  
const yearOptions = computed(() => {
  const years = dataStore.availableYears || []
  return years.map(year => ({
    value: year,
    label: year.toString()
  })).reverse()
})

// Handle product change
const handleProductChange = (value: string | number | null) => {
  if (value) {
    uiStore.setSelectedProduct(value as string)
  }
}

// Handle metric change
const handleMetricChange = (value: string | number | null) => {
  if (value) {
    uiStore.setSelectedMetric(value as string)
  }
}

// Handle year change
const handleYearChange = (value: string | number | null) => {
  if (value) {
    uiStore.setSelectedYear(Number(value))
  }
}

// Watch for changes and reload data
watch([() => uiStore.selectedProduct, () => uiStore.selectedYear], async ([product, year]) => {
  if (product && year) {
    try {
      // For individual products, we use the timeseries data which contains all products
      // The timeseries data is loaded during app initialization
      if (dataStore.timeseriesData && dataStore.timeseriesData[product]) {
        console.log(`Selected individual product: ${product} for year ${year}`)
        // No need to load additional data as timeseries contains all products
      } else {
        // Fallback to production data loading for grouped products
        await dataStore.loadProductionData(product, year)
      }
    } catch (error) {
      console.error('Failed to load product data:', error)
    }
  }
})

// Action buttons methods
const exportData = () => {
}

const refreshData = async () => {
  if (dataStore.isLoading) return
  
  try {
    uiStore.addLoadingMessage('Aktualisiere Daten...')
    await dataStore.initializeApp()
    
  } catch (error) {
  } finally {
    uiStore.clearLoadingMessages()
  }
}

const resetView = () => {
  uiStore.resetUI()
  router.push('/')
  
}
</script>

<template>
  <div class="flex flex-wrap gap-4 items-end" data-tour="product-selector">
    <!-- Product Selector -->
    <div class="flex-1 min-w-[200px]">
      <SearchableSelect
        :model-value="uiStore.selectedProduct"
        :options="productOptions"
        placeholder="Produkt auswählen..."
        search-placeholder="Produkt suchen..."
        label="Produkt"
        size="md"
        @change="handleProductChange"
      />
    </div>
    
    <!-- Year Selector -->
    <div class="w-32">
      <SearchableSelect
        :model-value="uiStore.selectedYear"
        :options="yearOptions"
        placeholder="Jahr..."
        label="Jahr"
        size="md"
        :searchable="false"
        @change="handleYearChange"
      />
    </div>
    
    <!-- Metric Selector -->
    <div class="w-48">
      <SearchableSelect
        :model-value="uiStore.selectedMetric"
        :options="metricOptions"
        placeholder="Metrik..."
        label="Metrik"
        size="md"
        :searchable="false"
        @change="handleMetricChange"
      />
    </div>
    
    <!-- Action Buttons -->
    <div class="flex items-center space-x-2">
      <button
        class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 flex items-center space-x-2"
        title="Daten exportieren"
        @click="exportData"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span class="hidden sm:inline">Export</span>
      </button>

      <button
        :disabled="dataStore.isLoading"
        class="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        :class="dataStore.isLoading 
          ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' 
          : 'border-primary-500 dark:border-primary-400 bg-primary-500 dark:bg-primary-600 text-white hover:bg-primary-600 dark:hover:bg-primary-500'"
        title="Daten aktualisieren"
        @click="refreshData"
      >
        <svg 
          class="w-4 h-4"
          :class="{ 'animate-spin': dataStore.isLoading }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span class="hidden sm:inline">Aktualisieren</span>
      </button>

      <button
        class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 flex items-center space-x-2"
        title="Ansicht zurücksetzen"
        @click="resetView"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span class="hidden sm:inline">Reset</span>
      </button>
    </div>
  </div>
</template>