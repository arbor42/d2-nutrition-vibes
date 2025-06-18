<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useVisualization, useTooltip } from '@/composables/useVisualization'
import { useD3Data } from '@/composables/useD3'
import { useDataStore } from '@/stores/useDataStore'
import { useVisualizationStore } from '@/stores/useVisualizationStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import * as d3 from 'd3'

interface Props {
  width?: number
  height?: number
  selectedProduct?: string
  selectedRegion?: string
  predictionYears?: number
  modelType?: 'linear' | 'polynomial' | 'neural'
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 500,
  selectedProduct: 'maize_and_products',
  selectedRegion: 'global',
  predictionYears: 5,
  modelType: 'linear'
})

const emit = defineEmits<{
  predictionClick: [data: any]
  modelChange: [model: string]
}>()

// Stores
const dataStore = useDataStore()
const vizStore = useVisualizationStore()

// Refs
const containerRef = ref<HTMLDivElement>()

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const historicalDataRef = ref<any[]>([])
const predictionDataRef = ref<any[]>([])

// Composables
const margin = computed(() => ({
  top: 20,
  right: 120,
  bottom: 40,
  left: 60
}))

const visualization = useVisualization(containerRef, {
  margin: margin.value,
  responsive: true,
  autoResize: true
})

const tooltip = useTooltip({
  className: 'ml-chart-tooltip chart-tooltip',
  followMouse: true
})

const { processedData: processedHistoricalData } = useD3Data(historicalDataRef, {
  transform: (data) => {
    if (!Array.isArray(data)) return []
    return data.filter(d => d.value > 0).sort((a, b) => a.year - b.year)
  }
})

const { processedData: processedPredictionData } = useD3Data(predictionDataRef, {
  transform: (data) => {
    if (!Array.isArray(data)) return []
    return data.sort((a, b) => a.year - b.year)
  }
})

// Chart configuration
const chartConfig = computed(() => ({
  historicalColor: vizStore.getColorScheme('analysis')[0] || '#3b82f6',
  predictionColor: vizStore.getColorScheme('analysis')[1] || '#ef4444',
  confidenceColor: vizStore.getColorScheme('analysis')[2] || '#f59e0b',
  ...vizStore.getVisualizationConfig('ml')
}))

// D3 scales and generators
let xScale: d3.ScaleTime<number, number>
let yScale: d3.ScaleLinear<number, number>
let historicalLine: d3.Line<any>
let predictionLine: d3.Line<any>
let area: d3.Area<any>

// Initialize chart
const initializeChart = async () => {
  if (!visualization.isReady.value) return

  try {
    isLoading.value = true
    error.value = null

    visualization.queueUpdate(setupChart, null, true)

  } catch (err) {
    error.value = 'Fehler beim Initialisieren der ML-Analyse'
    console.error('ML Chart initialization error:', err)
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
    className: 'ml-chart-svg',
    margin: margin.value
  })

  // Setup scales
  xScale = d3.scaleTime().range([0, innerWidth])
  yScale = d3.scaleLinear().range([innerHeight, 0])

  // Setup line generators
  historicalLine = d3.line()
    .x(d => xScale(new Date(d.year, 0, 1)))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX)

  predictionLine = d3.line()
    .x(d => xScale(new Date(d.year, 0, 1)))
    .y(d => yScale(d.predicted))
    .curve(d3.curveMonotoneX)

  // Setup area for confidence intervals
  area = d3.area()
    .x(d => xScale(new Date(d.year, 0, 1)))
    .y0(d => yScale(d.lower))
    .y1(d => yScale(d.upper))
    .curve(d3.curveMonotoneX)

  // Setup axes
  const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat('%Y'))
  const yAxis = d3.axisLeft(yScale).tickFormat(d3.format('.2s'))

  // Add axes groups
  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerHeight})`)

  g.append('g')
    .attr('class', 'y-axis')

  // Add grid
  g.append('g')
    .attr('class', 'grid x-grid')
    .attr('transform', `translate(0,${innerHeight})`)
    .style('opacity', 0.1)

  g.append('g')
    .attr('class', 'grid y-grid')
    .style('opacity', 0.1)

  // Add axis labels
  addAxisLabels(g, innerWidth, innerHeight)

  // Add legend
  addLegend(g, innerWidth)

  // Set chart instance
  vizStore.setChartInstance('ml', svg.node())
}

// Add axis labels
const addAxisLabels = (container, innerWidth, innerHeight) => {
  container.append('text')
    .attr('class', 'x-label')
    .attr('text-anchor', 'middle')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + margin.value.bottom - 5)
    .text('Jahr')
    .style('fill', 'currentColor')
    .style('font-size', '12px')

  container.append('text')
    .attr('class', 'y-label')
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -margin.value.left + 15)
    .text('Produktionsmenge')
    .style('fill', 'currentColor')
    .style('font-size', '12px')
}

// Add legend
const addLegend = (container, innerWidth) => {
  const legend = container.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${innerWidth + 20}, 20)`)

  const legendItems = [
    { label: 'Historische Daten', color: chartConfig.value.historicalColor },
    { label: 'Vorhersage', color: chartConfig.value.predictionColor },
    { label: 'Konfidenzintervall', color: chartConfig.value.confidenceColor }
  ]

  const legendItem = legend.selectAll('.legend-item')
    .data(legendItems)
    .enter()
    .append('g')
    .attr('class', 'legend-item')
    .attr('transform', (d, i) => `translate(0, ${i * 20})`)

  legendItem.append('line')
    .attr('x1', 0)
    .attr('x2', 15)
    .attr('y1', 0)
    .attr('y2', 0)
    .attr('stroke', d => d.color)
    .attr('stroke-width', 2)

  legendItem.append('text')
    .attr('x', 20)
    .attr('y', 0)
    .attr('dy', '0.35em')
    .style('fill', 'currentColor')
    .style('font-size', '12px')
    .text(d => d.label)
}

// Load data and generate predictions
const loadData = async () => {
  if (!props.selectedProduct) return

  try {
    isLoading.value = true
    error.value = null

    // Load historical data (simplified for demo)
    const currentYear = new Date().getFullYear()
    const startYear = currentYear - 10

    const historicalData = []
    const predictionData = []

    // Generate sample historical data
    for (let year = startYear; year <= currentYear; year++) {
      historicalData.push({
        year,
        value: Math.random() * 1000000 + year * 10000,
        product: props.selectedProduct
      })
    }

    // Generate sample predictions
    for (let i = 1; i <= props.predictionYears; i++) {
      const year = currentYear + i
      const baseValue = historicalData[historicalData.length - 1].value
      const trend = baseValue * 0.05 * i // 5% growth per year
      const noise = (Math.random() - 0.5) * baseValue * 0.1

      predictionData.push({
        year,
        predicted: baseValue + trend + noise,
        lower: baseValue + trend + noise - baseValue * 0.2,
        upper: baseValue + trend + noise + baseValue * 0.2,
        confidence: Math.max(0.95 - i * 0.1, 0.5)
      })
    }

    historicalDataRef.value = historicalData
    predictionDataRef.value = predictionData

  } catch (err) {
    error.value = 'Fehler beim Laden der ML-Daten'
    console.error('ML data loading error:', err)
  } finally {
    isLoading.value = false
  }
}

// Update chart with data
const updateChartWithData = () => {
  if (!processedHistoricalData.value.length && !processedPredictionData.value.length) return

  visualization.queueUpdate(renderChart, {
    historical: processedHistoricalData.value,
    predictions: processedPredictionData.value
  })
}

// Render chart with D3.js
const renderChart = (container, data) => {
  if (!data) return

  const { historical, predictions } = data
  const allData = [...historical, ...predictions]

  if (allData.length === 0) return

  const { width, height } = visualization.dimensions.value
  const innerWidth = width - margin.value.left - margin.value.right
  const innerHeight = height - margin.value.top - margin.value.bottom

  // Update scales domains
  const years = allData.map(d => new Date(d.year, 0, 1))
  const values = [
    ...historical.map(d => d.value),
    ...predictions.map(d => d.predicted),
    ...predictions.flatMap(d => [d.lower, d.upper])
  ].filter(v => v != null)

  xScale.domain(d3.extent(years))
  yScale.domain([0, d3.max(values)])

  // Update axes
  container.select('.x-axis')
    .transition()
    .duration(750)
    .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%Y')))

  container.select('.y-axis')
    .transition()
    .duration(750)
    .call(d3.axisLeft(yScale).tickFormat(d3.format('.2s')))

  // Update grid
  container.select('.x-grid')
    .transition()
    .duration(750)
    .call(d3.axisBottom(xScale)
      .tickSize(-innerHeight)
      .tickFormat(() => '')
    )

  container.select('.y-grid')
    .transition()
    .duration(750)
    .call(d3.axisLeft(yScale)
      .tickSize(-innerWidth)
      .tickFormat(() => '')
    )

  // Draw confidence interval area
  if (predictions.length > 0) {
    visualization.handleDataJoin(
      container,
      '.confidence-area',
      [predictions],
      {
        keyFn: () => 'confidence',
        enterFn: (enter, transition) => {
          enter
            .append('path')
            .attr('class', 'confidence-area')
            .attr('fill', chartConfig.value.confidenceColor)
            .attr('opacity', 0.3)
            .attr('d', area)
            .call(transition)
        },
        updateFn: (update, transition) => {
          update.call(transition).attr('d', area)
        }
      }
    )
  }

  // Draw historical line
  if (historical.length > 0) {
    visualization.handleDataJoin(
      container,
      '.historical-line',
      [historical],
      {
        keyFn: () => 'historical',
        enterFn: (enter, transition) => {
          enter
            .append('path')
            .attr('class', 'historical-line')
            .attr('fill', 'none')
            .attr('stroke', chartConfig.value.historicalColor)
            .attr('stroke-width', 2)
            .attr('d', historicalLine)
            .call(transition)
        },
        updateFn: (update, transition) => {
          update.call(transition).attr('d', historicalLine)
        }
      }
    )
  }

  // Draw prediction line
  if (predictions.length > 0) {
    visualization.handleDataJoin(
      container,
      '.prediction-line',
      [predictions],
      {
        keyFn: () => 'prediction',
        enterFn: (enter, transition) => {
          enter
            .append('path')
            .attr('class', 'prediction-line')
            .attr('fill', 'none')
            .attr('stroke', chartConfig.value.predictionColor)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('d', predictionLine)
            .call(transition)
        },
        updateFn: (update, transition) => {
          update.call(transition).attr('d', predictionLine)
        }
      }
    )
  }
}

// Event handlers
const handlePredictionClick = (event, d) => {
  emit('predictionClick', d)
}

const changeModel = (newModel: string) => {
  emit('modelChange', newModel)
  // Reload data with new model
  loadData()
}

// Watchers
watch([() => props.selectedProduct, () => props.selectedRegion, () => props.modelType], () => {
  loadData()
})

watch([processedHistoricalData, processedPredictionData], () => {
  updateChartWithData()
}, { deep: true })

// Initialize when visualization is ready
watch(() => visualization.isReady.value, (isReady) => {
  if (isReady) {
    initializeChart()
  }
})

// Cleanup on unmount
watch(() => visualization.isDestroyed.value, (isDestroyed) => {
  if (isDestroyed) {
    tooltip.destroy()
    vizStore.removeChartInstance('ml')
  }
})

// Exposed methods
defineExpose({
  loadData,
  updateChartWithData,
  changeModel
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
      text="Lädt ML-Analyse..."
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
          @click="loadData"
          variant="danger"
          size="sm"
        >
          Erneut versuchen
        </BaseButton>
      </div>
    </div>

    <!-- Chart controls -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            ML Vorhersage - {{ props.selectedProduct }}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ props.predictionYears }}-Jahres-Prognose mit {{ props.modelType }} Modell
          </p>
        </div>
        
        <!-- Model selection -->
        <div class="flex space-x-2">
          <BaseButton
            v-for="model in ['linear', 'polynomial', 'neural']"
            :key="model"
            :variant="props.modelType === model ? 'primary' : 'secondary'"
            size="sm"
            @click="changeModel(model)"
          >
            {{ model }}
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Chart SVG Container -->
    <div class="p-4 min-h-[400px]" />

    <!-- No data message -->
    <div
      v-if="!isLoading && !error && processedHistoricalData.length === 0"
      class="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400"
    >
      <div class="text-center">
        <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p>Keine ML-Daten verfügbar</p>
        <p class="text-xs mt-1">Wählen Sie ein Produkt aus, um Vorhersagen zu generieren</p>
      </div>
    </div>
  </div>
</template>