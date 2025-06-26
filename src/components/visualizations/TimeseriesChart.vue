<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useDataStore } from '@/stores/useDataStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import * as d3 from 'd3'
import { createD3AxisFormatter, createD3TooltipFormatter } from '@/utils/formatters'
import { createColorScale } from '@/utils/chartColors'

interface Props {
  width?: number
  height?: number
  selectedCountries?: string[]
  selectedProducts?: string[]
  selectedMetric?: string
  chartData?: any[]
  showGrid?: boolean
  showPoints?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 600,
  height: 400,
  selectedCountries: () => [],
  selectedProducts: () => [],
  selectedMetric: 'production',
  chartData: () => [],
  showGrid: true,
  showPoints: true
})

const emit = defineEmits<{
  pointHover: [data: any | null]
  pointClick: [data: any]
}>()

// Store
const dataStore = useDataStore()

// Refs
const svgContainerRef = ref<HTMLDivElement>()

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const localChartData = ref<any[]>([])
const colorScale = ref(createColorScale())

// Chart configuration
const margin = { top: 60, right: 30, bottom: 40, left: 60 }

// D3 variables
let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
let g: d3.Selection<SVGGElement, unknown, null, undefined>
let xScale: d3.ScaleTime<number, number>
let yScale: d3.ScaleLinear<number, number>
let line: d3.Line<any>
let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>
let resizeObserver: ResizeObserver

// Initialize chart
const initializeChart = () => {
  if (!svgContainerRef.value) return
  
  console.log('📈 TimeseriesChart: Initializing chart...')
  
  // Clear existing chart
  d3.select(svgContainerRef.value).selectAll('*').remove()
  
  // Get full parent dimensions
  const containerRect = svgContainerRef.value.getBoundingClientRect()
  const width = containerRect.width || 600
  const height = containerRect.height || 400
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  
  console.log('📈 TimeseriesChart: Chart dimensions:', { width, height, innerWidth, innerHeight })

  // Create SVG with responsive sizing
  svg = d3.select(svgContainerRef.value)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('class', 'timeseries-chart')

  // Create main group
  g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // Setup scales
  xScale = d3.scaleTime().range([0, innerWidth])
  yScale = d3.scaleLinear().range([innerHeight, 0])

  // Setup line generator
  line = d3.line<any>()
    .x(d => xScale(new Date(d.year, 0, 1)))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX)

  // Add axes groups
  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerHeight})`)

  g.append('g')
    .attr('class', 'y-axis')

  // Add grid if enabled
  if (props.showGrid) {
    g.append('g')
      .attr('class', 'grid x-grid')
      .attr('transform', `translate(0,${innerHeight})`)

    g.append('g')
      .attr('class', 'grid y-grid')
  }

  // Add axis labels
  const isDarkMode = document.documentElement.classList.contains('dark')
  const labelColor = isDarkMode ? '#9CA3AF' : '#374151' // gray-400 : gray-700

  g.append('text')
    .attr('class', 'x-label')
    .attr('text-anchor', 'middle')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + 35)
    .text('Jahr')
    .style('font-size', '12px')
    .style('fill', labelColor)

  g.append('text')
    .attr('class', 'y-label')
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -40)
    .text(getMetricLabel())
    .style('font-size', '12px')
    .style('fill', labelColor)

  // Create tooltip with green theme
  tooltip = d3.select('body')
    .append('div')
    .attr('class', 'timeseries-tooltip')
    .style('position', 'absolute')
    .style('padding', '8px 12px')
    .style('background', 'rgba(6, 78, 59, 0.95)') // emerald-800 with opacity
    .style('color', 'white')
    .style('border', '1px solid #10b981') // emerald-500
    .style('border-radius', '6px')
    .style('font-size', '12px')
    .style('font-weight', '500')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('z-index', 1000)
    .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1)')

  // Setup resize observer
  setupResizeObserver()
  
  console.log('✅ TimeseriesChart: Chart initialized')
}

// Setup resize observer for responsive behavior
const setupResizeObserver = () => {
  if (!svgContainerRef.value || !window.ResizeObserver) return
  
  resizeObserver = new ResizeObserver(() => {
    if (chartData.value.length > 0) {
      updateChart()
    }
  })
  
  resizeObserver.observe(svgContainerRef.value)
}

// Get metric label for Y-axis
const getMetricLabel = () => {
  switch (props.selectedMetric) {
    case 'production': {
      return 'Produktion (Mio. t)'
    }
    case 'import_quantity': {
      return 'Import (Mio. t)'
    }
    case 'export_quantity': {
      return 'Export (Mio. t)'
    }
    case 'domestic_supply_quantity': {
      return 'Inlandsversorgung (Mio. t)'
    }
    case 'feed': {
      return 'Tierfutter (Mio. t)'
    }
    case 'food_supply_kcal': {
      return 'Kalorienversorgung (kcal/Kopf/Tag)'
    }
    default: {
      return 'Wert (Mio. t)'
    }
  }
}

// Load and prepare data
const loadData = () => {
  // Use the chartData passed from parent
  localChartData.value = props.chartData || []
  
  // Reset color scale when new data is loaded
  colorScale.value = createColorScale()
  
  if (localChartData.value.length > 0) {
    console.log(`📈 TimeseriesChart: Loaded ${localChartData.value.length} data points`)
    updateChart()
  }
}

// Update chart with current data
const updateChart = () => {
  if (!g || !localChartData.value.length) return
  
  console.log('📈 TimeseriesChart: Updating chart with', localChartData.value.length, 'data points')
  
  const data = localChartData.value.filter(d => d.value > 0).sort((a, b) => a.year - b.year)
  if (!data.length) return

  // Get current dimensions from container
  const containerRect = svgContainerRef.value?.getBoundingClientRect()
  const width = containerRect?.width || 600
  const height = containerRect?.height || 400
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  // Update viewBox for responsive scaling
  svg.attr('viewBox', `0 0 ${width} ${height}`)

  // Group data by series
  const seriesData = d3.group(data, d => d.series)
  
  // Update scale domains
  const years = data.map(d => new Date(d.year, 0, 1))
  const values = data.map(d => d.value)

  xScale.domain(d3.extent(years) as [Date, Date])
  yScale.domain([0, d3.max(values) as number])

  // Get theme colors
  const isDarkMode = document.documentElement.classList.contains('dark')
  const axisColor = isDarkMode ? '#9CA3AF' : '#374151' // gray-400 : gray-700
  const gridColor = isDarkMode ? '#4B5563' : '#E5E7EB' // gray-600 : gray-200

  // Update axes
  const xAxis = d3.axisBottom(xScale)
    .tickFormat(d3.timeFormat('%Y'))
    .tickSizeOuter(0)
  // Format Y-axis based on metric type
  const getAxisFormatter = () => {
    switch (props.selectedMetric) {
      case 'food_supply_kcal': {
        return createD3AxisFormatter('kcal')
      }
      default: {
        return createD3AxisFormatter('1000 t')
      }
    }
  }
  
  const yAxis = d3.axisLeft(yScale)
    .tickFormat(getAxisFormatter())
    .tickSizeOuter(0)

  const xAxisSelection = g.select('.x-axis')
    .transition()
    .duration(750)
    .call(xAxis)

  const yAxisSelection = g.select('.y-axis')
    .transition()
    .duration(750)
    .call(yAxis)

  // Style axes
  xAxisSelection.selectAll('path').style('stroke', axisColor).style('stroke-width', '1px')
  xAxisSelection.selectAll('line').style('stroke', axisColor).style('stroke-width', '1px')
  xAxisSelection.selectAll('text').style('fill', axisColor).style('font-size', '12px')

  yAxisSelection.selectAll('path').style('stroke', axisColor).style('stroke-width', '1px')
  yAxisSelection.selectAll('line').style('stroke', axisColor).style('stroke-width', '1px')
  yAxisSelection.selectAll('text').style('fill', axisColor).style('font-size', '12px')

  // Update grid
  if (props.showGrid) {
    const xGridSelection = g.select('.x-grid')
      .transition()
      .duration(750)
      .call(d3.axisBottom(xScale)
        .tickSize(-innerHeight)
        .tickFormat(() => '')
        .tickSizeOuter(0)
      )

    const yGridSelection = g.select('.y-grid')
      .transition()
      .duration(750)
      .call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat(() => '')
        .tickSizeOuter(0)
      )

    // Style grid lines
    xGridSelection.selectAll('path').style('stroke', 'none')
    xGridSelection.selectAll('line').style('stroke', gridColor).style('stroke-width', '1px').style('opacity', 0.5)

    yGridSelection.selectAll('path').style('stroke', 'none')
    yGridSelection.selectAll('line').style('stroke', gridColor).style('stroke-width', '1px').style('opacity', 0.5)
  }

  // Remove existing lines
  g.selectAll('.line-path').remove()
  g.selectAll('.series-group').remove()

  // Create a group for each series
  const seriesGroups = g.selectAll('.series-group')
    .data(Array.from(seriesData.entries()), d => d[0])
    .enter()
    .append('g')
    .attr('class', 'series-group')

  // Draw lines for each series
  seriesGroups.each(function([seriesKey, seriesValues]) {
    const sortedValues = seriesValues.sort((a, b) => a.year - b.year)
    const color = colorScale.value(seriesKey)
    
    d3.select(this)
      .append('path')
      .attr('class', 'line-path')
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2.5)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0)
      .attr('d', line(sortedValues))
      .transition()
      .duration(750)
      .attr('opacity', 1)
  })

  // Draw points if enabled
  if (props.showPoints) {
    // Remove existing points
    g.selectAll('.data-point').remove()
    
    // Add points for each data point
    data.forEach(d => {
      const color = colorScale.value(d.series)
      
      g.append('circle')
        .attr('class', 'data-point')
        .attr('r', 0)
        .attr('fill', color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .attr('cx', xScale(new Date(d.year, 0, 1)))
        .attr('cy', yScale(d.value))
        .datum(d)
        .on('mouseover', handlePointMouseover)
        .on('mouseout', handlePointMouseout)
        .on('click', handlePointClick)
        .transition()
        .duration(750)
        .attr('r', 4)
    })
  }

  // Update Y-axis label
  g.select('.y-label')
    .text(getMetricLabel())
    .style('fill', axisColor)

  // Update X-axis label
  g.select('.x-label')
    .style('fill', axisColor)
    
  // Add legend at the top
  g.selectAll('.legend').remove()
  
  const legendItems = Array.from(seriesData.keys()).sort()
  
  if (legendItems.length > 0) {
    const legendGroup = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(0, -40)`)
    
    // Calculate layout for horizontal legend
    const itemWidth = 120 // Approximate width per legend item
    const itemsPerRow = Math.floor(innerWidth / itemWidth) || 1
    
    legendItems.forEach((series, i) => {
      const row = Math.floor(i / itemsPerRow)
      const col = i % itemsPerRow
      const x = col * itemWidth
      const y = row * 18
      
      const legendItem = legendGroup.append('g')
        .attr('transform', `translate(${x}, ${y})`)
      
      // Color box
      legendItem.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', colorScale.value(series))
        .attr('rx', 2)
      
      // Label
      legendItem.append('text')
        .attr('x', 15)
        .attr('y', 8)
        .text(series)
        .style('font-size', '10px')
        .style('fill', axisColor)
        .style('alignment-baseline', 'middle')
    })
  }
}

// Event handlers
const handlePointMouseover = (event: MouseEvent, d: any) => {
  const color = colorScale.value(d.series)
  
  // Highlight the hovered point
  d3.select(event.target as Element)
    .transition()
    .duration(150)
    .attr('r', 6)
    .attr('stroke-width', 3)

  // Format tooltip value based on metric type
  const getTooltipFormatter = () => {
    switch (props.selectedMetric) {
      case 'food_supply_kcal': {
        return createD3TooltipFormatter('kcal')
      }
      default: {
        return createD3TooltipFormatter('1000 t')
      }
    }
  }

  const metricLabel = getMetricLabel().replace(/\s*\([^)]*\)/, '') // Remove unit from label

  tooltip
    .style('opacity', 1)
    .style('background', color)
    .style('border-color', color)
    .html(`
      <strong>${d.series}</strong><br/>
      Jahr: ${d.year}<br/>
      ${metricLabel}: ${getTooltipFormatter()(d.value)}
    `)
    .style('left', (event.pageX + 10) + 'px')
    .style('top', (event.pageY - 10) + 'px')
  
  emit('pointHover', d)
}

const handlePointMouseout = (event: MouseEvent) => {
  // Reset point to normal size
  d3.select(event.target as Element)
    .transition()
    .duration(150)
    .attr('r', 4)
    .attr('stroke-width', 2)

  tooltip.style('opacity', 0)
  emit('pointHover', null)
}

const handlePointClick = (event: MouseEvent, d: any) => {
  emit('pointClick', d)
}

// Cleanup function
const cleanup = () => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (tooltip) {
    tooltip.remove()
  }
  if (svgContainerRef.value) {
    d3.select(svgContainerRef.value).selectAll('*').remove()
  }
}

// Update styling based on theme
const updateThemeStyles = () => {
  if (!g) return
  
  const isDarkMode = document.documentElement.classList.contains('dark')
  const axisColor = isDarkMode ? '#9CA3AF' : '#374151' // gray-400 : gray-700
  const gridColor = isDarkMode ? '#4B5563' : '#E5E7EB' // gray-600 : gray-200
  
  // Update axis styling
  g.select('.x-axis').selectAll('path').style('stroke', axisColor)
  g.select('.x-axis').selectAll('line').style('stroke', axisColor)
  g.select('.x-axis').selectAll('text').style('fill', axisColor)
  
  g.select('.y-axis').selectAll('path').style('stroke', axisColor)
  g.select('.y-axis').selectAll('line').style('stroke', axisColor)
  g.select('.y-axis').selectAll('text').style('fill', axisColor)
  
  // Update grid styling
  g.select('.x-grid').selectAll('line').style('stroke', gridColor)
  g.select('.y-grid').selectAll('line').style('stroke', gridColor)
  
  // Update labels
  g.select('.x-label').style('fill', axisColor)
  g.select('.y-label').style('fill', axisColor)
}

// Watch for theme changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      updateThemeStyles()
    }
  })
})

// Watchers
watch(() => props.chartData, () => {
  loadData()
}, { deep: true })

// Lifecycle
onMounted(() => {
  initializeChart()
  loadData()
  
  // Start observing theme changes
  if (document.documentElement) {
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
  }
})

onUnmounted(() => {
  cleanup()
  observer.disconnect()
})

// Exposed methods
defineExpose({
  loadData,
  updateChart
})
</script>

<template>
  <div class="timeseries-chart-wrapper relative w-full h-full flex flex-col">
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
          variant="danger"
          size="sm"
          @click="loadData"
        >
          Erneut versuchen
        </BaseButton>
      </div>
    </div>

    <!-- Chart title (optional, compact) -->
    <div v-if="localChartData.length > 0" class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">
        {{ getMetricLabel() }}
      </h4>
    </div>

    <!-- Chart SVG Container - takes all remaining space -->
    <div 
      ref="svgContainerRef"
      class="timeseries-svg-container flex-1 w-full min-h-0"
    />

    <!-- No data message -->
    <div
      v-if="!isLoading && !error && localChartData.length === 0"
      class="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400"
    >
      <div class="text-center">
        <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p>Keine Zeitreihen-Daten verfügbar</p>
        <p class="text-xs mt-1">Wählen Sie Produkte und Länder aus</p>
      </div>
    </div>
  </div>
</template>