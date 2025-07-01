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
  selectedMetrics?: string[]
  chartData?: any[]
  showGrid?: boolean
  showPoints?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 600,
  height: 400,
  selectedCountries: () => [],
  selectedProducts: () => [],
  selectedMetrics: () => ['production'],
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
const margin = ref({ top: 80, right: 30, bottom: 30, left: 60 })

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
  const innerWidth = width - margin.value.left - margin.value.right
  const innerHeight = height - margin.value.top - margin.value.bottom
  
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
    .attr('transform', `translate(${margin.value.left},${margin.value.top})`)

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
    .attr('y', innerHeight + 30)
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

  // Create tooltip with theme-aware colors
  const tooltipBg = isDarkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(6, 78, 59, 0.95)' // gray-800 : emerald-800
  const tooltipBorder = isDarkMode ? '#6B7280' : '#10b981' // gray-500 : emerald-500
  
  tooltip = d3.select('body')
    .append('div')
    .attr('class', 'timeseries-tooltip')
    .style('position', 'absolute')
    .style('padding', '8px 12px')
    .style('background', tooltipBg)
    .style('color', 'white')
    .style('border', `1px solid ${tooltipBorder}`)
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
const getMetricLabel = (metric?: string) => {
  const metricToCheck = metric || (props.selectedMetrics?.length > 0 ? props.selectedMetrics[0] : 'production')
  switch (metricToCheck) {
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
    case 'protein': {
      return 'Protein (Mio. t)'
    }
    case 'protein_gpcd': {
      return 'Protein (g/Kopf/Tag)'
    }
    case 'fat': {
      return 'Fett (Mio. t)'
    }
    case 'fat_gpcd': {
      return 'Fett (g/Kopf/Tag)'
    }
    case 'processing': {
      return 'Verarbeitung (Mio. t)'
    }
    case 'feed_share': {
      return 'Tierfutteranteil (%)'
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
  const innerWidth = width - margin.value.left - margin.value.right
  const innerHeight = height - margin.value.top - margin.value.bottom

  // Update viewBox for responsive scaling
  svg.attr('viewBox', `0 0 ${width} ${height}`)

  // Group data by series
  const seriesData = d3.group(data, d => d.series)
  
  // Update scale domains
  const years = data.map(d => new Date(d.year, 0, 1))
  const values = data.map(d => d.value)

  xScale.domain(d3.extent(years) as [Date, Date])
  const maxVal = (props.selectedMetrics?.length === 1 && props.selectedMetrics[0] === 'feed_share') ? 100 : (d3.max(values) as number)
  yScale.domain([0, maxVal])

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
    // When multiple metrics are selected, check if any is food_supply_kcal
    const hasKcalMetric = props.selectedMetrics?.includes('food_supply_kcal')
    const hasFeedShareMetric = props.selectedMetrics?.includes('feed_share')
    const hasGpcdMetric = props.selectedMetrics?.some(m => m === 'protein_gpcd' || m === 'fat_gpcd')
    if (hasKcalMetric && props.selectedMetrics?.length === 1) {
      return createD3AxisFormatter('kcal')
    }
    if (hasFeedShareMetric && props.selectedMetrics?.length === 1) {
      return createD3AxisFormatter('%')
    }
    if (hasGpcdMetric && props.selectedMetrics?.length === 1) {
      return createD3AxisFormatter('g/Kopf/Tag')
    }
    return createD3AxisFormatter('1000 t')
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
    
  // Add legend at the top (directly to SVG, not to g group)
  svg.selectAll('.legend').remove()
  
  const legendItems = Array.from(seriesData.keys()).sort()
  
  if (legendItems.length > 0) {
    // Re-check dark mode for legend rendering
    const isDarkModeLegend = document.documentElement.classList.contains('dark')
    console.log('Legend Dark Mode Check:', isDarkModeLegend, 'Classes:', document.documentElement.classList.toString())
    
    const legendGroup = svg.append('g')
      .attr('class', 'legend')
    
    // Calculate dynamic layout for legend
    const maxLabelLength = Math.max(...legendItems.map(item => item.length))
    const itemWidth = Math.min(200, maxLabelLength * 6 + 30) // Dynamic width based on text length, increased for more padding
    const padding = 20 // Space between items, increased from 15
    const itemHeight = 30 // Height per row, increased from 20 for bigger boxes
    const itemsPerRow = Math.max(1, Math.floor(innerWidth / (itemWidth + padding)))
    const totalRows = Math.ceil(legendItems.length / itemsPerRow)
    
    // Calculate legend space needed
    const legendHeight = totalRows * itemHeight + 20 // Added extra padding
    const requiredTopMargin = legendHeight + 50 // Space for legend plus buffer
    
    // Always adjust top margin and container size to accommodate legend
    let adjustedHeight = height
    if (requiredTopMargin > margin.value.top) {
      margin.value.top = requiredTopMargin
      
      // Calculate new total height needed
      adjustedHeight = Math.max(height, margin.value.top + margin.value.bottom + 300) // Minimum chart area of 300px
      
      // Resize the container first
      if (svgContainerRef.value) {
        svgContainerRef.value.style.height = `${adjustedHeight}px`
      }
      
      // Update SVG dimensions
      svg.attr('viewBox', `0 0 ${width} ${adjustedHeight}`)
      svg.attr('height', adjustedHeight)
    }
    
    // Re-calculate inner height with final margin
    const finalInnerHeight = adjustedHeight - margin.value.top - margin.value.bottom
    
    // Update main group position to account for new margin
    g.attr('transform', `translate(${margin.value.left},${margin.value.top})`)
    
    // Update scales and axes positions
    yScale.range([finalInnerHeight, 0])
    g.select('.x-axis').attr('transform', `translate(0,${finalInnerHeight})`)
    g.select('.x-grid').attr('transform', `translate(0,${finalInnerHeight})`)
    g.select('.x-label').attr('y', finalInnerHeight + 30)
    g.select('.y-label').attr('x', -finalInnerHeight / 2)
    
    // Position legend at the top left of the chart area (accounting for left margin)
    legendGroup.attr('transform', `translate(${margin.value.left}, 20)`)
    
    legendItems.forEach((series, i) => {
      const row = Math.floor(i / itemsPerRow)
      const col = i % itemsPerRow
      const x = col * (itemWidth + padding)
      const y = row * itemHeight
      
      const legendItem = legendGroup.append('g')
        .attr('transform', `translate(${x}, ${y})`)
        .style('cursor', 'pointer')
        .attr('opacity', 1)
      
      // Hover effect
      legendItem.on('mouseover', function() {
        d3.select(this).attr('opacity', 0.7)
      }).on('mouseout', function() {
        d3.select(this).attr('opacity', 1)
      })
      
      // Background for better readability
      legendItem.append('rect')
        .attr('x', -8)
        .attr('y', -6)
        .attr('width', itemWidth + 16)
        .attr('height', 24)
        .attr('fill', isDarkModeLegend ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.95)') // gray-800 dark, white light
        .attr('stroke', isDarkModeLegend ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.8)') // gray-600 dark, gray-300 light
        .attr('stroke-width', 0.5)
        .attr('rx', 3)
      
      // Color box
      legendItem.append('rect')
        .attr('x', 2)
        .attr('y', 2)
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', colorScale.value(series))
        .attr('rx', 2)
        .attr('stroke', isDarkModeLegend ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)')
        .attr('stroke-width', isDarkModeLegend ? 1 : 0.5)
      
      // Label with text truncation
      legendItem.append('text')
        .attr('x', 18)
        .attr('y', 9)
        .text(series)
        .style('font-size', '11px')
        .style('fill', isDarkModeLegend ? '#E5E7EB' : '#1F2937') // gray-200 in dark, gray-800 in light
        .style('alignment-baseline', 'middle')
        .style('font-weight', '500')
        .each(function() {
          const textElement = d3.select(this)
          const textNode = this as SVGTextElement
          const availableWidth = itemWidth - 20
          
          // Truncate text if too long
          let text = series
          while (textNode.getComputedTextLength() > availableWidth && text.length > 0) {
            text = text.slice(0, -1)
            textElement.text(text + '...')
          }
        })
      
      // Tooltip for full text
      legendItem.append('title').text(series)
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
  const getTooltipFormatter = (metric: string) => {
    switch (metric) {
      case 'food_supply_kcal': {
        return createD3TooltipFormatter('kcal')
      }
      case 'feed_share': {
        return createD3TooltipFormatter('%')
      }
      case 'protein_gpcd':
      case 'fat_gpcd': {
        return createD3TooltipFormatter('g/Kopf/Tag')
      }
      default: {
        return createD3TooltipFormatter('1000 t')
      }
    }
  }

  const metricLabel = d.metricLabel || getMetricLabel(d.metric).replace(/\s*\([^)]*\)/, '') // Remove unit from label

  tooltip
    .style('opacity', 1)
    .style('background', color)
    .style('border-color', color)
    .html(`
      <strong>${d.series}</strong><br/>
      Jahr: ${d.year}<br/>
      ${metricLabel}: ${getTooltipFormatter(d.metric || 'production')(d.value)}
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
  
  // Update legend - legend is attached to svg, not g
  const legendBackgroundColor = isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.95)'
  const legendStrokeColor = isDarkMode ? 'rgba(75, 85, 99, 0.7)' : 'rgba(209, 213, 219, 0.8)' // Improved stroke opacity
  const legendTextColor = isDarkMode ? '#E5E7EB' : '#1F2937'
  const legendBoxStroke = isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'
  const legendBoxStrokeWidth = isDarkMode ? 1 : 0.5
  
  // Update legend on svg, not g
  if (svg) {
    svg.selectAll('.legend g').each(function() {
      const legendItem = d3.select(this)
      const rects = legendItem.selectAll('rect')
      
      // First rect is background
      rects.filter((d, i) => i === 0)
        .attr('fill', legendBackgroundColor)
        .attr('stroke', legendStrokeColor)
      
      // Second rect is color box
      rects.filter((d, i) => i === 1)
        .attr('stroke', legendBoxStroke)
        .attr('stroke-width', legendBoxStrokeWidth)
    })
    
    svg.selectAll('.legend text').style('fill', legendTextColor)
  }
  
  // Update tooltip colors if it exists
  if (tooltip) {
    const tooltipBg = isDarkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(6, 78, 59, 0.95)'
    const tooltipBorder = isDarkMode ? '#6B7280' : '#10b981'
    
    tooltip.style('background', tooltipBg)
           .style('border', `1px solid ${tooltipBorder}`)
  }
}

// Watch for theme changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      // First update the theme styles for existing elements
      updateThemeStyles()
      
      // If we have data, re-render the chart to update the legend properly
      if (chartData.value.length > 0) {
        // Small delay to ensure theme classes are applied
        setTimeout(() => {
          updateChart()
        }, 50)
      }
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
    <div v-if="localChartData.length > 0 && selectedMetrics?.length === 1" class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
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