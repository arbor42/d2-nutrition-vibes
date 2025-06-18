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
  selectedCountry?: string
  selectedProduct?: string
  selectedMetric?: string
  showGrid?: boolean
  showPoints?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 600,
  height: 400,
  selectedCountry: '',
  selectedProduct: 'maize_and_products',
  selectedMetric: 'production',
  showGrid: true,
  showPoints: true
})

const emit = defineEmits<{
  pointHover: [data: any | null]
  pointClick: [data: any]
}>()

// Stores
const dataStore = useDataStore()
const vizStore = useVisualizationStore()

// Refs
const containerRef = ref<HTMLDivElement>()

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const chartDataRef = ref<any[]>([])

// Composables
const margin = computed(() => ({
  top: 20,
  right: 30,
  bottom: 40,
  left: 60
}))

const visualization = useVisualization(containerRef, {
  margin: margin.value,
  responsive: true,
  autoResize: true
})

const tooltip = useTooltip({
  className: 'timeseries-tooltip chart-tooltip',
  followMouse: true
})

const { processedData: processedChartData } = useD3Data(chartDataRef, {
  transform: (data) => {
    if (!Array.isArray(data)) return []
    return data.filter(d => d.value > 0).sort((a, b) => a.year - b.year)
  }
})

// Chart configuration
const chartConfig = computed(() => ({
  lineColor: vizStore.getColorScheme('timeseries')[0] || '#3b82f6',
  pointColor: vizStore.getColorScheme('timeseries')[1] || '#1d4ed8',
  gridColor: '#e5e7eb',
  ...vizStore.getVisualizationConfig('timeseries')
}))

// D3 scales and generators
let xScale: d3.ScaleTime<number, number>
let yScale: d3.ScaleLinear<number, number>
let line: d3.Line<any>
let xAxis: d3.Axis<d3.NumberValue>
let yAxis: d3.Axis<d3.NumberValue>

// Initialize chart
const initializeChart = async () => {
  if (!visualization.isReady.value) return

  try {
    isLoading.value = true
    error.value = null

    // Queue the chart setup
    visualization.queueUpdate(setupChart, null, true)

  } catch (err) {
    error.value = 'Fehler beim Initialisieren des Charts'
    console.error('Chart initialization error:', err)
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
    className: 'timeseries-svg',
    margin: margin.value
  })

  // Setup scales
  xScale = d3.scaleTime().range([0, innerWidth])
  yScale = d3.scaleLinear().range([innerHeight, 0])

  // Setup line generator
  line = d3.line()
    .x(d => xScale(new Date(d.year, 0, 1)))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX)

  // Setup axes
  xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat('%Y'))
  yAxis = d3.axisLeft(yScale).tickFormat(d3.format('.2s'))

  // Add axes groups
  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerHeight})`)

  g.append('g')
    .attr('class', 'y-axis')

  // Add grid if enabled
  if (props.showGrid) {
    setupGrid(g, innerWidth, innerHeight)
  }

  // Add axis labels
  addAxisLabels(g, innerWidth, innerHeight)

  // Set chart instance
  vizStore.setChartInstance('timeseries', svg.node())
}

// Setup grid lines
const setupGrid = (container, innerWidth, innerHeight) => {
  // X grid
  container.append('g')
    .attr('class', 'grid x-grid')
    .attr('transform', `translate(0,${innerHeight})`)
    .style('opacity', 0.1)
    .style('stroke', chartConfig.value.gridColor)

  // Y grid
  container.append('g')
    .attr('class', 'grid y-grid')
    .style('opacity', 0.1)
    .style('stroke', chartConfig.value.gridColor)
}

// Add axis labels
const addAxisLabels = (container, innerWidth, innerHeight) => {
  // X-axis label
  container.append('text')
    .attr('class', 'x-label')
    .attr('text-anchor', 'middle')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + margin.value.bottom - 5)
    .text('Jahr')
    .style('fill', 'currentColor')
    .style('font-size', '12px')

  // Y-axis label
  container.append('text')
    .attr('class', 'y-label')
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -margin.value.left + 15)
    .text(`${props.selectedMetric}`)
    .style('fill', 'currentColor')
    .style('font-size', '12px')
}

// Load and prepare data
const loadData = async () => {
  if (!props.selectedProduct) return

  try {
    isLoading.value = true
    error.value = null

    // Load data for all available years
    const availableYears = dataStore.availableYears
    const dataPromises = availableYears.map(year => 
      dataStore.loadProductionData(props.selectedProduct, year)
        .then(data => ({ year, data }))
        .catch(err => ({ year, error: err }))
    )

    const results = await Promise.all(dataPromises)
    
    // Process and combine data
    const processedData: any[] = []
    
    results.forEach(({ year, data, error }) => {
      if (error) {
        console.warn(`Failed to load data for ${year}:`, error)
        return
      }

      if (data?.data) {
        data.data.forEach((item: any) => {
          if (props.selectedCountry) {
            // Filter by selected country
            if (item.country === props.selectedCountry && item.value > 0) {
              processedData.push({
                year,
                value: item.value,
                country: item.country,
                product: item.product,
                unit: item.unit
              })
            }
          } else {
            // Aggregate global data
            const existingEntry = processedData.find(d => d.year === year)
            if (existingEntry) {
              existingEntry.value += item.value
            } else if (item.value > 0) {
              processedData.push({
                year,
                value: item.value,
                country: 'Global',
                product: item.product,
                unit: item.unit
              })
            }
          }
        })
      }
    })

    // Update reactive data
    chartDataRef.value = processedData

  } catch (err) {
    error.value = 'Fehler beim Laden der Zeitreihen-Daten'
    console.error('Timeseries data loading error:', err)
  } finally {
    isLoading.value = false
  }
}

// Update chart with data
const updateChartWithData = () => {
  if (!processedChartData.value.length) return

  visualization.queueUpdate(renderChart, processedChartData.value)
}

// Render chart with D3.js
const renderChart = (container, data) => {
  if (!data || !Array.isArray(data) || data.length === 0) return

  const { width, height } = visualization.dimensions.value
  const innerWidth = width - margin.value.left - margin.value.right
  const innerHeight = height - margin.value.top - margin.value.bottom

  // Update scales domains
  const years = data.map(d => new Date(d.year, 0, 1))
  const values = data.map(d => d.value)

  xScale.domain(d3.extent(years))
  yScale.domain([0, d3.max(values)])

  // Update axes
  container.select('.x-axis')
    .transition()
    .duration(750)
    .call(xAxis)

  container.select('.y-axis')
    .transition()
    .duration(750)
    .call(yAxis)

  // Update grid
  if (props.showGrid) {
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
  }

  // Draw line using data join pattern
  visualization.handleDataJoin(
    container,
    '.line',
    [data],
    {
      keyFn: () => 'main-line',
      enterFn: (enter, transition) => {
        enter
          .append('path')
          .attr('class', 'line')
          .attr('fill', 'none')
          .attr('stroke', chartConfig.value.lineColor)
          .attr('stroke-width', 2)
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('d', line)
          .call(transition)
      },
      updateFn: (update, transition) => {
        update.call(transition).attr('d', line)
      }
    }
  )

  // Draw points if enabled
  if (props.showPoints) {
    visualization.handleDataJoin(
      container,
      '.point',
      data,
      {
        keyFn: (d) => d.year,
        enterFn: (enter, transition) => {
          enter
            .append('circle')
            .attr('class', 'point')
            .attr('r', 0)
            .attr('fill', chartConfig.value.pointColor)
            .style('cursor', 'pointer')
            .call(selection => 
              visualization.addInteractivity(selection, {
                click: handlePointClick,
                hover: {
                  enter: handlePointMouseover,
                  leave: handlePointMouseout
                },
                tooltip: {
                  show: tooltip.show,
                  move: tooltip.updatePosition,
                  hide: tooltip.hide
                }
              })
            )
            .call(transition)
            .attr('r', 4)
            .attr('cx', d => xScale(new Date(d.year, 0, 1)))
            .attr('cy', d => yScale(d.value))
        },
        updateFn: (update, transition) => {
          update
            .call(transition)
            .attr('cx', d => xScale(new Date(d.year, 0, 1)))
            .attr('cy', d => yScale(d.value))
        }
      }
    )
  }
}

// Event handlers
const handlePointMouseover = (event, d) => {
  // Format tooltip content
  const content = `
    <strong>${d.country}</strong><br/>
    Jahr: ${d.year}<br/>
    ${d.product}: ${d3.format(',.0f')(d.value)} ${d.unit || ''}
  `
  
  // Show tooltip
  tooltip.show(event, d, () => content)
  
  emit('pointHover', d)
}

const handlePointMouseout = (event, d) => {
  tooltip.hide()
  emit('pointHover', null)
}

const handlePointClick = (event, d) => {
  emit('pointClick', d)
}

// Watchers
watch([() => props.selectedCountry, () => props.selectedProduct], () => {
  loadData()
})

watch(processedChartData, () => {
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
    vizStore.removeChartInstance('timeseries')
  }
})

// Exposed methods
defineExpose({
  loadData,
  updateChartWithData
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
      text="Lädt Zeitreihen..."
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

    <!-- Chart title -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {{ props.selectedCountry || 'Global' }} - {{ props.selectedProduct }}
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Zeitreihen-Analyse
        <span v-if="dataStore.availableYears?.length">
          ({{ dataStore.availableYears[0] }} - {{ dataStore.availableYears[dataStore.availableYears.length - 1] }})
        </span>
      </p>
    </div>

    <!-- Chart SVG Container -->
    <div class="p-4 min-h-[300px]" />

    <!-- No data message -->
    <div
      v-if="!isLoading && !error && processedChartData.length === 0"
      class="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400"
    >
      <div class="text-center">
        <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p>Keine Zeitreihen-Daten verfügbar</p>
        <p class="text-xs mt-1">Wählen Sie ein Produkt oder Land aus</p>
      </div>
    </div>
  </div>
</template>