<script setup lang="ts">
import { computed, watch } from 'vue'
import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'

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
</script>

<template>
  <div class="flex flex-wrap gap-4">
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
  </div>
</template>