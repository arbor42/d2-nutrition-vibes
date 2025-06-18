<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useVisualization, useTooltip } from '@/composables/useVisualization'
import { useDataStore } from '@/stores/useDataStore'
import { useVisualizationStore } from '@/stores/useVisualizationStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import * as d3 from 'd3'

interface Props {
  width?: number
  height?: number
  processType?: 'production' | 'supply_chain' | 'consumption'
  timeRange?: 'monthly' | 'yearly'
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 500,
  processType: 'production',
  timeRange: 'yearly'
})

const emit = defineEmits<{
  processChange: [type: string]
  timeRangeChange: [range: string]
  processStep: [step: any]
}>()

// Stores
const dataStore = useDataStore()
const vizStore = useVisualizationStore()

// Refs
const containerRef = ref<HTMLDivElement>()

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const isAnalyzing = ref(false)

// Composables
const margin = computed(() => ({
  top: 40,
  right: 40,
  bottom: 40,
  left: 40
}))

const visualization = useVisualization(containerRef, {
  margin: margin.value,
  responsive: true,
  autoResize: true
})

const tooltip = useTooltip({
  className: 'process-tooltip chart-tooltip',
  followMouse: true
})

// Chart configuration
const chartConfig = computed(() => ({
  primaryColor: vizStore.getColorScheme('process')[0] || '#3b82f6',
  secondaryColor: vizStore.getColorScheme('process')[1] || '#10b981',
  accentColor: vizStore.getColorScheme('process')[2] || '#f59e0b',
  ...vizStore.getVisualizationConfig('process')
}))

// Process types
const processTypes = [
  { id: 'production', name: 'Produktion', description: 'Produktionsprozesse und -effizienz' },
  { id: 'supply_chain', name: 'Lieferkette', description: 'Supply-Chain-Optimierung' },
  { id: 'consumption', name: 'Verbrauch', description: 'Verbrauchsmuster und -trends' }
]

// Time ranges
const timeRanges = [
  { id: 'monthly', name: 'Monatlich', description: 'Monatliche Prozessanalyse' },
  { id: 'yearly', name: 'Jährlich', description: 'Jährliche Prozessanalyse' }
]

// Initialize chart
const initializeChart = async () => {
  if (!visualization.isReady.value) return

  try {
    isLoading.value = true
    error.value = null

    visualization.queueUpdate(setupChart, null, true)

  } catch (err) {
    error.value = 'Fehler beim Initialisieren der Prozessanalyse'
    console.error('Process analysis initialization error:', err)
  } finally {
    isLoading.value = false
  }
}

// Setup chart with D3.js
const setupChart = (container) => {
  const { width, height } = visualization.dimensions.value
  const innerWidth = width - margin.value.left - margin.value.right
  const innerHeight = height - margin.value.top - margin.value.bottom

  // Create SVG
  const { svg, g } = visualization.createSVG({
    width,
    height,
    className: 'process-svg',
    margin: margin.value
  })

  // Create process flow diagram based on type
  if (props.processType === 'production') {
    createProductionFlow(g, innerWidth, innerHeight)
  } else if (props.processType === 'supply_chain') {
    createSupplyChainFlow(g, innerWidth, innerHeight)
  } else if (props.processType === 'consumption') {
    createConsumptionFlow(g, innerWidth, innerHeight)
  }

  // Set chart instance
  vizStore.setChartInstance('process', svg.node())
}

// Create production flow diagram
const createProductionFlow = (container, width, height) => {
  const steps = [
    { name: 'Planung', x: width * 0.15, y: height * 0.5 },
    { name: 'Anbau', x: width * 0.35, y: height * 0.3 },
    { name: 'Ernte', x: width * 0.55, y: height * 0.3 },
    { name: 'Verarbeitung', x: width * 0.75, y: height * 0.5 },
    { name: 'Distribution', x: width * 0.85, y: height * 0.7 }
  ]

  // Draw connections
  for (let i = 0; i < steps.length - 1; i++) {
    container.append('line')
      .attr('x1', steps[i].x)
      .attr('y1', steps[i].y)
      .attr('x2', steps[i + 1].x)
      .attr('y2', steps[i + 1].y)
      .attr('stroke', chartConfig.value.secondaryColor)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrow)')
  }

  // Draw process steps
  container.selectAll('.process-step')
    .data(steps)
    .enter()
    .append('g')
    .attr('class', 'process-step')
    .attr('transform', d => `translate(${d.x}, ${d.y})`)
    .each(function(d) {
      const group = d3.select(this)
      
      group.append('circle')
        .attr('r', 25)
        .attr('fill', chartConfig.value.primaryColor)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')

      group.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('fill', 'white')
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .text(d.name)
    })

  // Add arrow marker
  container.append('defs')
    .append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 8)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', chartConfig.value.secondaryColor)
}

// Create supply chain flow diagram
const createSupplyChainFlow = (container, width, height) => {
  const nodes = [
    { name: 'Lieferant', x: width * 0.1, y: height * 0.3, type: 'supplier' },
    { name: 'Produzent', x: width * 0.4, y: height * 0.5, type: 'producer' },
    { name: 'Händler', x: width * 0.7, y: height * 0.3, type: 'distributor' },
    { name: 'Verbraucher', x: width * 0.9, y: height * 0.7, type: 'consumer' }
  ]

  // Draw supply chain network
  container.selectAll('.supply-node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'supply-node')
    .attr('transform', d => `translate(${d.x}, ${d.y})`)
    .each(function(d) {
      const group = d3.select(this)
      
      group.append('rect')
        .attr('x', -30)
        .attr('y', -15)
        .attr('width', 60)
        .attr('height', 30)
        .attr('rx', 5)
        .attr('fill', chartConfig.value.accentColor)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)

      group.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('fill', 'white')
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .text(d.name)
    })
}

// Create consumption flow diagram
const createConsumptionFlow = (container, width, height) => {
  // Create consumption pattern visualization
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) * 0.3

  const consumptionData = [
    { category: 'Haushalte', value: 40, angle: 0 },
    { category: 'Industrie', value: 30, angle: Math.PI * 0.8 },
    { category: 'Export', value: 20, angle: Math.PI * 1.4 },
    { category: 'Verluste', value: 10, angle: Math.PI * 1.8 }
  ]

  const colorScale = d3.scaleOrdinal()
    .domain(consumptionData.map(d => d.category))
    .range([
      chartConfig.value.primaryColor,
      chartConfig.value.secondaryColor,
      chartConfig.value.accentColor,
      '#ef4444'
    ])

  // Draw consumption sectors
  container.selectAll('.consumption-sector')
    .data(consumptionData)
    .enter()
    .append('g')
    .attr('class', 'consumption-sector')
    .attr('transform', `translate(${centerX}, ${centerY})`)
    .each(function(d) {
      const group = d3.select(this)
      const sectorRadius = radius * (d.value / 50)
      
      group.append('circle')
        .attr('cx', Math.cos(d.angle) * radius * 0.7)
        .attr('cy', Math.sin(d.angle) * radius * 0.7)
        .attr('r', sectorRadius)
        .attr('fill', colorScale(d.category))
        .attr('opacity', 0.8)

      group.append('text')
        .attr('x', Math.cos(d.angle) * radius * 0.7)
        .attr('y', Math.sin(d.angle) * radius * 0.7)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('fill', 'white')
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .text(`${d.category}\n${d.value}%`)
    })
}

// Start process analysis
const startAnalysis = async () => {
  if (isAnalyzing.value) return

  isAnalyzing.value = true
  
  // Simulate analysis process
  setTimeout(() => {
    isAnalyzing.value = false
    // Emit process completion
    emit('processStep', { 
      type: props.processType, 
      timeRange: props.timeRange,
      completed: true 
    })
  }, 2000)
}

// Change process type
const changeProcessType = (type: string) => {
  emit('processChange', type)
  if (visualization.isReady.value) {
    initializeChart()
  }
}

// Change time range
const changeTimeRange = (range: string) => {
  emit('timeRangeChange', range)
}

// Initialize when visualization is ready
watch(() => visualization.isReady.value, (isReady) => {
  if (isReady) {
    initializeChart()
  }
})

// Reinitialize when process type changes
watch(() => props.processType, () => {
  if (visualization.isReady.value) {
    initializeChart()
  }
})

// Cleanup on unmount
watch(() => visualization.isDestroyed.value, (isDestroyed) => {
  if (isDestroyed) {
    tooltip.destroy()
    vizStore.removeChartInstance('process')
  }
})

// Exposed methods
defineExpose({
  startAnalysis,
  changeProcessType,
  changeTimeRange
})
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
      text="Lädt Prozessanalyse..."
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
          @click="initializeChart"
          variant="danger"
          size="sm"
        >
          Erneut versuchen
        </BaseButton>
      </div>
    </div>

    <!-- Process controls -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Process Mining
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ processTypes.find(t => t.id === props.processType)?.description }}
          </p>
        </div>
        
        <BaseButton
          @click="startAnalysis"
          :disabled="isAnalyzing"
          variant="primary"
          size="sm"
        >
          {{ isAnalyzing ? 'Analysiert...' : 'Analyse starten' }}
        </BaseButton>
      </div>

      <div class="flex items-center justify-between">
        <!-- Process type selection -->
        <div class="flex space-x-2">
          <BaseButton
            v-for="process in processTypes"
            :key="process.id"
            :variant="props.processType === process.id ? 'primary' : 'secondary'"
            size="sm"
            @click="changeProcessType(process.id)"
          >
            {{ process.name }}
          </BaseButton>
        </div>

        <!-- Time range selection -->
        <div class="flex space-x-2">
          <BaseButton
            v-for="range in timeRanges"
            :key="range.id"
            :variant="props.timeRange === range.id ? 'primary' : 'secondary'"
            size="sm"
            @click="changeTimeRange(range.id)"
          >
            {{ range.name }}
          </BaseButton>
        </div>
      </div>

      <!-- Analysis progress -->
      <div v-if="isAnalyzing" class="mt-4">
        <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Prozessanalyse läuft...</span>
          <span>Mining Patterns...</span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div class="bg-primary-500 h-2 rounded-full animate-pulse w-full" />
        </div>
      </div>
    </div>

    <!-- Chart SVG Container -->
    <div class="p-4 min-h-[400px]" />

    <!-- Process info -->
    <div class="absolute bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm max-w-xs">
      <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
        {{ processTypes.find(t => t.id === props.processType)?.name }}-Mining
      </h4>
      <p class="text-xs text-gray-600 dark:text-gray-400">
        {{ timeRanges.find(r => r.id === props.timeRange)?.description }}
      </p>
    </div>
  </div>
</template>