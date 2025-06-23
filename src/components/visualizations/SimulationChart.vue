<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useVisualizationStore } from '@/stores/useVisualizationStore'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import * as d3 from 'd3'
import { createD3AxisFormatter } from '@/utils/formatters'

interface Props {
  data?: any[]
  config?: any
  width?: number
  height?: number
  selectedScenario?: string
  simulationRuns?: number
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  config: () => ({}),
  width: 800,
  height: 500,
  selectedScenario: 'climate_change',
  simulationRuns: 100
})

const emit = defineEmits<{
  'scenario-select': [scenario: string]
  runSimulation: []
}>()

// Stores
const vizStore = useVisualizationStore()

// Refs
const containerRef = ref<HTMLDivElement>()
const svgRef = ref<SVGElement | null>(null)

// State
const isLoading = ref(false)
const error = ref<string | null>(null)

// Chart dimensions
const margin = computed(() => ({
  top: 20,
  right: 30,
  bottom: 40,
  left: 60
}))

const dimensions = computed(() => {
  const container = containerRef.value
  if (!container) return { width: 800, height: 400 }
  
  const rect = container.getBoundingClientRect()
  return {
    width: Math.max(400, rect.width || 800),
    height: 400
  }
})

// Chart configuration
const chartConfig = computed(() => ({
  baselineColor: '#6b7280',
  scenarioColor: '#ef4444'
}))


// Initialize chart
const initializeChart = async () => {
  await nextTick()
  
  try {
    isLoading.value = true
    error.value = null
    
    await setupChart()

  } catch (err) {
    error.value = 'Fehler beim Initialisieren der Simulation'
    console.error('Simulation initialization error:', err)
  } finally {
    isLoading.value = false
  }
}

// Setup chart with D3.js
const setupChart = async () => {
  if (!containerRef.value) return
  
  const chartData = props.data || []
  const { width, height } = dimensions.value
  const m = margin.value
  
  // Clear previous content
  d3.select(containerRef.value).selectAll('*').remove()
  
  // Create SVG
  const svg = d3.select(containerRef.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'simulation-svg')
  
  svgRef.value = svg.node()
  
  const g = svg.append('g')
    .attr('transform', `translate(${m.left},${m.top})`)
  
  const innerWidth = width - m.left - m.right
  const innerHeight = height - m.top - m.bottom

  if (chartData.length === 0) {
    // Show empty state
    g.append('text')
      .attr('class', 'empty-text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', 'currentColor')
      .style('opacity', 0.6)
      .text('Keine Simulationsdaten verfügbar')
    return
  }

  // Scales
  const xScale = d3.scaleLinear()
    .domain(d3.extent(chartData, d => d.year))
    .range([0, innerWidth])

  const allValues = chartData.reduce((acc, d) => {
    if (d && typeof d === 'object') {
      const values = [d.baseline, d.scenario, d.lower, d.upper].filter(v => v !== undefined && v !== null && !isNaN(v))
      acc.push(...values)
    }
    return acc
  }, [])
  
  const yScale = d3.scaleLinear()
    .domain(d3.extent(allValues))
    .nice()
    .range([innerHeight, 0])

  // Line generators with null value handling
  const baselineLine = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.baseline))
    .defined(d => d.baseline !== null && d.baseline !== undefined && !isNaN(d.baseline))
    .curve(d3.curveMonotoneX)

  const scenarioLine = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.scenario))
    .defined(d => d.scenario !== null && d.scenario !== undefined && !isNaN(d.scenario))
    .curve(d3.curveMonotoneX)

  // Confidence interval area
  const confidenceArea = d3.area()
    .x(d => xScale(d.year))
    .y0(d => yScale(d.lower))
    .y1(d => yScale(d.upper))
    .defined(d => d.lower !== null && d.lower !== undefined && d.upper !== null && d.upper !== undefined && !isNaN(d.lower) && !isNaN(d.upper))
    .curve(d3.curveMonotoneX)

  // Add axes
  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format('d')))
    .selectAll('text')
    .style('fill', 'currentColor')

  g.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(yScale).tickFormat(createD3AxisFormatter('1000 t')))
    .selectAll('text')
    .style('fill', 'currentColor')
    
  // Style axis lines
  g.selectAll('.domain, .tick line')
    .style('stroke', 'currentColor')
    .style('opacity', 0.3)

  // Add confidence interval
  g.append('path')
    .datum(chartData)
    .attr('class', 'confidence-area')
    .attr('d', confidenceArea)
    .style('fill', chartConfig.value.scenarioColor)
    .style('fill-opacity', 0.2)

  // Add baseline line
  g.append('path')
    .datum(chartData)
    .attr('class', 'baseline-line')
    .attr('d', baselineLine)
    .style('stroke', chartConfig.value.baselineColor)
    .style('stroke-width', 2)
    .style('fill', 'none')

  // Add scenario line
  g.append('path')
    .datum(chartData)
    .attr('class', 'scenario-line')
    .attr('d', scenarioLine)
    .style('stroke', chartConfig.value.scenarioColor)
    .style('stroke-width', 2)
    .style('fill', 'none')
    .style('stroke-dasharray', '5,5')

  // Add legend
  const legend = g.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${innerWidth - 120}, 20)`)

  legend.append('line')
    .attr('x1', 0)
    .attr('x2', 20)
    .attr('y1', 0)
    .attr('y2', 0)
    .style('stroke', chartConfig.value.baselineColor)
    .style('stroke-width', 2)

  legend.append('text')
    .attr('x', 25)
    .attr('y', 4)
    .style('font-size', '12px')
    .style('fill', 'currentColor')
    .text('Baseline')

  legend.append('line')
    .attr('x1', 0)
    .attr('x2', 20)
    .attr('y1', 20)
    .attr('y2', 20)
    .style('stroke', chartConfig.value.scenarioColor)
    .style('stroke-width', 2)
    .style('stroke-dasharray', '5,5')

  legend.append('text')
    .attr('x', 25)
    .attr('y', 24)
    .style('font-size', '12px')
    .style('fill', 'currentColor')
    .text('Szenario')

}


// Initialize when mounted
onMounted(() => {
  initializeChart()
})

// Re-initialize when data changes
watch(() => props.data, () => {
  initializeChart()
}, { deep: true })

// Cleanup on unmount
onUnmounted(() => {
  if (containerRef.value) {
    d3.select(containerRef.value).selectAll('*').remove()
  }
})

// No exposed methods needed - chart is purely reactive to props
</script>

<template>
  <div 
    ref="containerRef"
    class="chart-container relative w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
  >
    <!-- Loading overlay -->
    <LoadingSpinner
      v-if="isLoading"
      :overlay="true"
      :centered="true"
      text="Lädt Simulation..."
      size="md"
    />

    <!-- Error message -->
    <div
      v-if="error"
      class="absolute inset-0 bg-error-50 dark:bg-error-900/20 flex items-center justify-center z-10"
    >
      <div class="text-center">
        <p class="text-error-600 dark:text-error-400 mb-3">{{ error }}</p>
        <BaseButton
          variant="danger"
          size="sm"
          @click="initializeChart"
        >
          Erneut versuchen
        </BaseButton>
      </div>
    </div>

    <!-- Chart Header -->
    <div v-if="data && data.length > 0" class="p-4 border-b border-gray-200 dark:border-gray-700">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Simulationsergebnisse
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Zeitreihen-Analyse mit Konfidenzintervallen
      </p>
    </div>

    <!-- Chart SVG Container -->
    <div v-if="data && data.length > 0" class="p-4 min-h-[400px]" />

    <!-- Placeholder content -->
    <div v-if="!data || data.length === 0" class="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400 pointer-events-none">
      <div class="text-center">
        <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p>Bereit für Simulation</p>
        <p class="text-xs mt-1">Starten Sie eine Simulation, um die Ergebnisse zu sehen</p>
      </div>
    </div>
  </div>
</template>