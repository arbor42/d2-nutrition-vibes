<template>
  <!-- Continuous Legend Bar -->
  <div 
    v-if="legendData && !isLoading" 
    class="legend-container bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mb-4 p-4"
    style="min-height: 100px;"
  >
    <div class="flex flex-col h-full">
      <!-- Legend Title with Filter Status -->
      <div class="flex items-center justify-between mb-3">
        <div class="text-sm font-medium text-gray-700 dark:text-gray-300 text-center flex-1">
          {{ legendData.title }}
        </div>
        <div v-if="selectedColors.size > 0" class="flex items-center gap-2">
          <span class="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
            {{ selectedColors.size }} filter{{ selectedColors.size > 1 ? 's' : '' }} active
          </span>
          <button
            @click="resetFilters"
            class="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            title="Reset all filters"
          >
            Reset
          </button>
        </div>
      </div>
      
      <!-- Continuous Color Bar -->
      <div class="flex-1 relative">
        <!-- Main continuous bar container -->
        <div class="relative h-8 mx-4 mb-2 rounded overflow-hidden border border-gray-300 dark:border-gray-600">
          <!-- Discrete color segments -->
          <div 
            v-for="(item, index) in legendData.items" 
            :key="index"
            class="absolute top-0 bottom-0"
            :style="{
              left: `${(index / legendData.items.length) * 100}%`,
              width: `${100 / legendData.items.length}%`,
              backgroundColor: item.color
            }"
          ></div>
          
          <!-- Percentile separators -->
          <div 
            v-for="(item, index) in legendData.items.slice(0, -1)" 
            :key="index"
            class="absolute top-0 bottom-0 w-px bg-white/30"
            :style="{ left: `${((index + 1) / legendData.items.length) * 100}%` }"
          ></div>
          
          <!-- Clickable segments for filtering -->
          <div 
            v-for="(item, index) in legendData.items" 
            :key="index"
            class="absolute top-0 bottom-0 cursor-pointer transition-all duration-200 hover:bg-black/10"
            :style="{ 
              left: `${(index / legendData.items.length) * 100}%`, 
              width: `${100 / legendData.items.length}%` 
            }"
            :title="`Click to ${selectedColors.has(index) ? 'deselect' : 'select'} Decile ${index + 1} (${index * 10 + 10}th percentile): ${item.rangeDisplay} - ${item.countryCount} countries`"
            @mouseenter="hoveredSegment = index"
            @mouseleave="hoveredSegment = null"
            @click="toggleColorFilter(index)"
          ></div>
          
        </div>
        
        <!-- Green highlight strips for selected ranges (outside the box) -->
        <div class="relative h-2 mx-4 mt-1">
          <div 
            v-for="(item, index) in legendData.items" 
            :key="`highlight-${index}`"
            v-show="selectedColors.has(index)"
            class="absolute top-0 h-1 rounded-sm transition-all duration-200"
            style="background-color: #27ae60;"
            :style="{ 
              left: `${(index / legendData.items.length) * 100}%`, 
              width: `${100 / legendData.items.length}%` 
            }"
          ></div>
        </div>
        
        <!-- Value labels below the bar -->
        <div class="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400 px-4">
          <span class="font-medium">{{ legendData.formattedMin }}</span>
          <span class="font-medium">{{ legendData.formattedMax }}</span>
        </div>
      </div>
      
      <!-- Hover tooltip -->
      <div 
        v-if="hoveredSegment !== null"
        class="text-center text-sm text-gray-700 dark:text-gray-300 mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded"
      >
        <div class="font-medium">
          Decile {{ hoveredSegment + 1 }} ({{ hoveredSegment * 10 + 10 }}th percentile)
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-400">
          {{ legendData.items[hoveredSegment].rangeDisplay }}
        </div>
        <div class="text-xs text-blue-600 dark:text-blue-400 mt-1">
          {{ legendData.items[hoveredSegment].countryCount }} countries
        </div>
      </div>
      
      <!-- Unit and additional info -->
      <div class="text-xs text-gray-500 dark:text-gray-500 text-center mt-2">
        <div v-if="legendData.isPercentileBased" class="text-green-600 dark:text-green-400">
          ✓ Dezil-basierte Farbskala (wissenschaftlich korrekt)
        </div>
        <div class="text-gray-400 dark:text-gray-500 mt-1">
          Click on colors to filter the map • Select multiple colors • Click again to deselect
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { formatAgricultureValue } from '@/utils/formatters.js'

// Color scheme - matching WorldMap component
const greenColorScheme = [
  '#440154', '#482878', '#3e4989', '#31688e', '#26828e',
  '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'
]

// Props
interface Props {
  legendScale?: any
  legendDomain?: [number, number]
  legendUnit?: string
  selectedProduct?: string
  selectedMetric?: string
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  legendScale: null,
  legendDomain: () => [0, 100000000],
  legendUnit: '1000 t',
  selectedProduct: 'Wheat and products',
  selectedMetric: 'production',
  isLoading: false
})

// State for hover functionality
const hoveredSegment = ref<number | null>(null)

// State for color filtering
const selectedColors = ref<Set<number>>(new Set())
const isResetting = ref(false)

// Emit function for communicating filter changes to parent
const emit = defineEmits<{
  colorFilter: [selectedIndices: number[], selectedColors: string[]]
}>()

// Toggle color filter selection
const toggleColorFilter = (index: number) => {
  if (selectedColors.value.has(index)) {
    selectedColors.value.delete(index)
  } else {
    selectedColors.value.add(index)
  }
  
  // Trigger reactivity
  selectedColors.value = new Set(selectedColors.value)
  
  // Emit the filter change
  emitFilterChange()
}

// Reset all filters
const resetFilters = () => {
  if (isResetting.value) return // Prevent recursive calls
  
  isResetting.value = true
  selectedColors.value.clear()
  selectedColors.value = new Set()
  emitFilterChange()
  
  nextTick(() => {
    isResetting.value = false
  })
}

// Emit filter change to parent component
const emitFilterChange = () => {
  const selectedIndices = Array.from(selectedColors.value)
  const selectedColorValues = selectedIndices.map(index => greenColorScheme[index])
  emit('colorFilter', selectedIndices, selectedColorValues)
}

// Watch for changes in legend data to reset filters when data changes
watch(() => props.legendDomain, (newDomain, oldDomain) => {
  // Only reset if domain actually changed to prevent infinite loops
  if (JSON.stringify(newDomain) !== JSON.stringify(oldDomain)) {
    resetFilters()
  }
})

// Computed legend data
const legendData = computed(() => {
  if (!props.legendDomain || !props.legendUnit || !props.legendScale) return null
  
  const domain = props.legendDomain
  const numColors = greenColorScheme.length
  
  // Create legend items with percentile-based value ranges for each color
  const items = []
  
  // Check if we have percentile data from the color scale
  const percentiles = props.legendScale.percentiles ? props.legendScale.percentiles() : null
  const countryCounts = props.legendScale.countryCounts ? props.legendScale.countryCounts() : null
  
  for (let i = 0; i < numColors; i++) {
    let rangeStart, rangeEnd
    
    if (percentiles) {
      // Use percentile-based ranges
      rangeStart = i === 0 ? domain[0] : percentiles[i - 1]
      rangeEnd = i === numColors - 1 ? domain[1] : percentiles[i]
    } else {
      // Fallback to equal intervals if percentiles not available
      const stepSize = (domain[1] - domain[0]) / numColors
      rangeStart = domain[0] + (stepSize * i)
      rangeEnd = domain[0] + (stepSize * (i + 1))
    }
    
    // Use centralized formatting for start and end values
    const formattedStart = formatAgricultureValue(rangeStart, { 
      unit: props.legendUnit, 
      showUnit: true,
      longForm: false
    })
    const formattedEnd = formatAgricultureValue(rangeEnd, { 
      unit: props.legendUnit, 
      showUnit: true,
      longForm: false
    })
    
    // For display purposes, also get versions without units for compact display
    const formattedStartNoUnit = formatAgricultureValue(rangeStart, { 
      unit: props.legendUnit, 
      showUnit: false,
      longForm: false
    })
    const formattedEndNoUnit = formatAgricultureValue(rangeEnd, { 
      unit: props.legendUnit, 
      showUnit: false,
      longForm: false
    })
    
    items.push({
      color: greenColorScheme[i],
      rangeStart: rangeStart,
      rangeEnd: rangeEnd,
      formattedStart: formattedStart,
      formattedEnd: formattedEnd,
      formattedStartNoUnit: formattedStartNoUnit,
      formattedEndNoUnit: formattedEndNoUnit,
      rangeDisplay: `${formattedStart} - ${formattedEnd}`,
      percentile: percentiles ? `${(i + 1) * 10}th percentile` : null,
      countryCount: countryCounts ? countryCounts[i] : 0,
      isLast: i === numColors - 1
    })
  }
  
  return {
    items,
    title: getLegendTitle(),
    min: domain[0],
    max: domain[1],
    unit: props.legendUnit,
    formattedMin: formatAgricultureValue(domain[0], { unit: props.legendUnit, showUnit: true, longForm: false }),
    formattedMax: formatAgricultureValue(domain[1], { unit: props.legendUnit, showUnit: true, longForm: false }),
    isPercentileBased: !!percentiles
  }
})

// Get legend title based on selected metric
const getLegendTitle = () => {
  const metricTitles = {
    production: 'Produktion',
    import_quantity: 'Importe',
    export_quantity: 'Exporte',
    domestic_supply_quantity: 'Inlandsversorgung',
    food_supply_kcal: 'Nahrungsenergie',
    feed: 'Futtermittel'
  }
  
  const baseTitle = metricTitles[props.selectedMetric as keyof typeof metricTitles] || 'Daten'
  return `${baseTitle} - ${props.selectedProduct}`
}
</script>