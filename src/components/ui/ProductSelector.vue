<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'

const router = useRouter()
const dataStore = useDataStore()
const uiStore = useUIStore()

// Available product options for the searchable dropdown
const productOptions = computed(() => {
  // Get grouped products from the data index
  const groupedProducts = dataStore.availableProducts || []
  
  // Get individual items from metadata if available
  const individualItems = dataStore.faoMetadata?.data_summary?.food_items || []
  
  // Create options for grouped products
  const groupedOptions = groupedProducts.map(product => ({
    value: product,
    label: product.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' (Gruppe)'
  }))
  
  // For now, we'll just use grouped products as individual items aren't in the production data
  // In a real implementation, you'd need to map individual items to their data files
  return groupedOptions.sort((a, b) => a.label.localeCompare(b.label, 'de'))
})

// Metric options
const metricOptions = [
  { value: 'production', label: 'Produktion' },
  { value: 'import_quantity', label: 'Import' },
  { value: 'export_quantity', label: 'Export' },
  { value: 'domestic_supply_quantity', label: 'Inlandsversorgung' }
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
      await dataStore.loadProductionData(product, year)
    } catch (error) {
      console.error('Failed to load production data:', error)
    }
  }
})

// Action buttons methods
const exportData = () => {
  uiStore.addNotification({
    type: 'info',
    title: 'Export',
    message: 'Export-Funktionalität wird entwickelt...',
    duration: 3000
  })
}

const refreshData = async () => {
  if (dataStore.isLoading) return
  
  try {
    uiStore.addLoadingMessage('Aktualisiere Daten...')
    await dataStore.initializeApp()
    
    uiStore.addNotification({
      type: 'success',
      title: 'Erfolgreich',
      message: 'Daten wurden aktualisiert.',
      duration: 3000
    })
  } catch (error) {
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: 'Daten konnten nicht aktualisiert werden.',
      duration: 5000
    })
  } finally {
    uiStore.clearLoadingMessages()
  }
}

const resetView = () => {
  uiStore.resetUI()
  router.push('/')
  
  uiStore.addNotification({
    type: 'info',
    title: 'Zurückgesetzt',
    message: 'Ansicht wurde zurückgesetzt.',
    duration: 2000
  })
}
</script>

<template>
  <div class="flex flex-wrap gap-4 items-end">
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
        @click="exportData"
        class="btn btn-secondary flex items-center space-x-2"
        title="Daten exportieren"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span class="hidden sm:inline">Export</span>
      </button>

      <button
        @click="refreshData"
        :disabled="dataStore.isLoading"
        class="btn btn-secondary flex items-center space-x-2"
        :class="{ 'opacity-50 cursor-not-allowed': dataStore.isLoading }"
        title="Daten aktualisieren"
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
        @click="resetView"
        class="btn btn-secondary flex items-center space-x-2"
        title="Ansicht zurücksetzen"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span class="hidden sm:inline">Reset</span>
      </button>
    </div>
  </div>
</template>