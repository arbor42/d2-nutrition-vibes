<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'
import { usePDFExport } from '@/composables/usePDFExport'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import { getAllProductOptions, getGermanName } from '@/utils/productMappings'

const router = useRouter()
const dataStore = useDataStore()
const uiStore = useUIStore()
const { isExporting, exportDashboardToPDF } = usePDFExport()

// Available product options for the searchable dropdown
const productOptions = computed(() => {
  // Get individual items from metadata if available
  const individualItems = dataStore.faoMetadata?.data_summary?.food_items || []
  
  let options = []
  
  if (individualItems.length > 0) {
    // Use individual products from metadata with German names
    options = individualItems.map(product => ({
      value: product,
      label: getGermanName(product)
    }))
  } else {
    // Fallback to all available products from mappings
    options = getAllProductOptions()
  }
  
  // Add "All" option at the beginning
  const allOptions = [
    { value: 'All', label: 'Alle Produkte' },
    ...options.sort((a, b) => a.label.localeCompare(b.label, 'de'))
  ]
  
  return allOptions
})

// Metric options with descriptions
const metricOptions = [
  { 
    value: 'production', 
    label: 'Produktion',
    description: 'Gesamte inländische Produktion in 1000 Tonnen'
  },
  { 
    value: 'import_quantity', 
    label: 'Import',
    description: 'Importierte Menge in 1000 Tonnen'
  },
  { 
    value: 'export_quantity', 
    label: 'Export',
    description: 'Exportierte Menge in 1000 Tonnen'
  },
  { 
    value: 'domestic_supply_quantity', 
    label: 'Inlandsversorgung',
    description: 'Verfügbare Menge für den inländischen Verbrauch in 1000 Tonnen'
  },
  { 
    value: 'food_supply_kcal', 
    label: 'Kalorienversorgung',
    description: 'Verfügbare Kalorien pro Person pro Tag in kcal/Tag'
  },
  { 
    value: 'feed', 
    label: 'Tierfutter',
    description: 'Menge die als Tierfutter verwendet wird in 1000 Tonnen'
  }
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
const exportData = async () => {
  console.log('🔥 Export button clicked!')
  try {
    // Check if we're on the dashboard page
    if (router.currentRoute.value.path !== '/dashboard' && router.currentRoute.value.name !== 'dashboard') {
      console.log('📍 Navigating to dashboard for export...')
      await router.push('/dashboard')
      
      // Wait for the navigation and component rendering
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    console.log('📍 Starting comprehensive PDF export...')
    // The new export function handles all data collection and validation internally
    await exportDashboardToPDF()
    
  } catch (error) {
    console.error('❌ Failed to export PDF:', error)
    
    // Show user-friendly error message
    if (error instanceof Error) {
      console.error('Export error details:', error.message)
    }
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
        :class="{ 'opacity-75 cursor-not-allowed': isExporting }"
        :disabled="isExporting"
        title="Daten exportieren"
        @click="exportData"
      >
        <svg v-if="!isExporting" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <span class="hidden sm:inline">{{ isExporting ? 'Exportiere...' : 'Export' }}</span>
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