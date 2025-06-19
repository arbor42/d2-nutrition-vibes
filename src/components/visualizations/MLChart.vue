<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'
import { useD3 } from '@/composables/useD3'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  config: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['prediction-select', 'confidence-toggle'])

// D3 setup
const containerRef = ref(null)
const svgRef = ref(null)
const gRef = ref(null)
let resizeObserver = null

const { 
  dimensions,
  isReady,
  createSVG,
  updateDimensions 
} = useD3(containerRef, {
  margin: { top: 40, right: 150, bottom: 60, left: 80 }
})

// State
const showConfidenceInterval = ref(true)

// Chart dimensions
const chartDimensions = computed(() => {
  // Use container width if config width is '100%' or not specified
  let width = 800
  if (props.config?.width === '100%') {
    width = containerRef.value?.clientWidth || 800
  } else if (props.config?.width) {
    width = props.config.width
  }
  
  const height = props.config?.height || 400
  const margin = { top: 40, right: 150, bottom: 60, left: 80 }
  
  return {
    width,
    height,
    innerWidth: width - margin.left - margin.right,
    innerHeight: height - margin.top - margin.bottom,
    margin
  }
})

// Process data
const processedData = computed(() => {
  if (!props.data || props.data.length === 0) return { predictions: [], historical: [] }
  
  // Separate historical and prediction data
  const currentYear = new Date().getFullYear()
  const predictions = props.data.filter(d => d.year > currentYear && (d.predicted_value > 0 || d.value > 0))
  const historical = props.data.filter(d => d.year <= currentYear && (d.predicted_value > 0 || d.value > 0))
  
  return { predictions, historical }
})

// Initialize chart
const initChart = () => {
  if (!isReady.value || !containerRef.value) return
  
  const { width, height, margin } = chartDimensions.value
  
  // Clear any existing SVG
  d3.select(containerRef.value).selectAll('svg').remove()
  
  // Create new SVG
  const result = createSVG({
    width,
    height,
    className: 'ml-chart-svg',
    margin
  })
  
  if (result) {
    svgRef.value = result.svg
    gRef.value = result.g
    drawChart()
  }
}

// Draw chart
const drawChart = () => {
  if (!gRef.value || !props.data || props.data.length === 0) return
  
  const { innerWidth, innerHeight } = chartDimensions.value
  const { predictions, historical } = processedData.value
  
  // Clear previous content
  gRef.value.selectAll('*').remove()
  
  // Scales
  const allYears = [...historical, ...predictions].map(d => d.year)
  const allValues = [
    ...historical.map(d => d.predicted_value || d.value).filter(v => v != null && v > 0),
    ...predictions.map(d => d.predicted_value).filter(v => v != null && v > 0),
    ...predictions.map(d => d.confidence_lower).filter(v => v != null && v > 0),
    ...predictions.map(d => d.confidence_upper).filter(v => v != null && v > 0)
  ]
  
  if (allYears.length === 0 || allValues.length === 0) return
  
  const xScale = d3.scaleLinear()
    .domain(d3.extent(allYears))
    .range([0, innerWidth])
  
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(allValues) * 1.1])
    .range([innerHeight, 0])
  
  // Line generators
  const line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.predicted_value || d.value || 0))
    .curve(d3.curveMonotoneX)
  
  // Area generator for confidence interval
  const area = d3.area()
    .x(d => xScale(d.year))
    .y0(d => yScale(d.confidence_lower || d.predicted_value || d.value || 0))
    .y1(d => yScale(d.confidence_upper || d.predicted_value || d.value || 0))
    .curve(d3.curveMonotoneX)
  
  // Add axes
  const xAxis = gRef.value.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format('d')))
  
  const yAxis = gRef.value.append('g')
    .call(d3.axisLeft(yScale).tickFormat(d3.format('.2s')))
  
  // Add axis labels
  xAxis.append('text')
    .attr('x', innerWidth / 2)
    .attr('y', 40)
    .style('text-anchor', 'middle')
    .style('fill', 'currentColor')
    .attr('class', 'axis-label')
    .text('Jahr')
  
  yAxis.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -60)
    .attr('x', -innerHeight / 2)
    .style('text-anchor', 'middle')
    .style('fill', 'currentColor')
    .attr('class', 'axis-label')
    .text('Produktion (1000 t)')
  
  // Add grid lines
  gRef.value.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale)
      .tickSize(-innerHeight)
      .tickFormat('')
    )
    .style('stroke-dasharray', '3,3')
    .style('opacity', 0.3)
  
  gRef.value.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(yScale)
      .tickSize(-innerWidth)
      .tickFormat('')
    )
    .style('stroke-dasharray', '3,3')
    .style('opacity', 0.3)
  
  // Draw confidence interval
  if (showConfidenceInterval.value && predictions.length > 0) {
    // Only include predictions with valid confidence bounds
    const predictionsWithConfidence = predictions.filter(d => 
      d.confidence_lower != null && d.confidence_upper != null &&
      d.confidence_lower >= 0 && d.confidence_upper > d.confidence_lower
    )
    
    if (predictionsWithConfidence.length > 0) {
      gRef.value.append('path')
        .datum(predictionsWithConfidence)
        .attr('fill', '#60a5fa')
        .attr('fill-opacity', 0.2)
        .attr('d', area)
    }
  }
  
  // Draw historical line if exists
  if (historical.length > 0) {
    gRef.value.append('path')
      .datum(historical)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2)
      .attr('d', line)
    
    // Add dots for historical data
    gRef.value.selectAll('.hist-dot')
      .data(historical)
      .enter().append('circle')
      .attr('class', 'hist-dot')
      .attr('cx', d => xScale(d.year))
      .attr('cy', d => yScale(d.predicted_value || d.value))
      .attr('r', 4)
      .attr('fill', '#10b981')
  }
  
  // Draw prediction line
  if (predictions.length > 0) {
    // Connect from last historical point
    const lastHistorical = historical[historical.length - 1]
    const connectionData = lastHistorical 
      ? [{ ...lastHistorical, predicted_value: lastHistorical.value }, ...predictions]
      : predictions
    
    gRef.value.append('path')
      .datum(connectionData)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('d', line)
    
    // Add dots for predictions
    gRef.value.selectAll('.pred-dot')
      .data(predictions)
      .enter().append('circle')
      .attr('class', 'pred-dot')
      .attr('cx', d => xScale(d.year))
      .attr('cy', d => yScale(d.predicted_value || d.value))
      .attr('r', 4)
      .attr('fill', '#3b82f6')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        emit('prediction-select', d)
      })
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('r', 6)
        
        // Show tooltip
        const tooltip = d3.select('body').append('div')
          .attr('class', 'chart-tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('opacity', 0)
        
        tooltip.html(`
          <strong>Jahr ${d.year}</strong><br/>
          Prognose: ${d3.format(',.0f')(d.predicted_value)}<br/>
          Konfidenz: ${d3.format(',.0f')(d.confidence_lower)} - ${d3.format(',.0f')(d.confidence_upper)}<br/>
          Zuverlässigkeit: ${d.reliability?.toFixed(1) || 'N/A'}%
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .transition()
        .duration(200)
        .style('opacity', 1)
      })
      .on('mouseleave', function() {
        d3.select(this).attr('r', 4)
        d3.selectAll('.chart-tooltip').remove()
      })
  }
  
  // Add legend
  const legend = gRef.value.append('g')
    .attr('transform', `translate(${innerWidth - 120}, 20)`)
  
  // Add legend background for better visibility in dark mode
  legend.append('rect')
    .attr('x', -10)
    .attr('y', -10)
    .attr('width', 140)
    .attr('height', 70)
    .attr('rx', 4)
    .attr('class', 'legend-background')
    .style('fill', 'white')
    .style('fill-opacity', 0.9)
    .style('stroke', '#e5e7eb')
    .style('stroke-width', 1)
  
  const legendItems = [
    { label: 'Historisch', color: '#10b981', dash: false },
    { label: 'Prognose', color: '#3b82f6', dash: true },
    { label: 'Konfidenzintervall', color: '#60a5fa', dash: false, area: true }
  ]
  
  legendItems.forEach((item, i) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${i * 20})`)
    
    if (item.area) {
      legendRow.append('rect')
        .attr('width', 15)
        .attr('height', 10)
        .attr('fill', item.color)
        .attr('fill-opacity', 0.2)
    } else {
      legendRow.append('line')
        .attr('x1', 0)
        .attr('x2', 15)
        .attr('y1', 5)
        .attr('y2', 5)
        .attr('stroke', item.color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', item.dash ? '5,5' : null)
    }
    
    legendRow.append('text')
      .attr('x', 20)
      .attr('y', 5)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('fill', 'currentColor')
      .attr('class', 'legend-text')
      .text(item.label)
  })
  
  // Add confidence toggle button
  const toggleButton = gRef.value.append('g')
    .attr('transform', `translate(20, 20)`)
    .style('cursor', 'pointer')
    .on('click', () => {
      showConfidenceInterval.value = !showConfidenceInterval.value
      emit('confidence-toggle', showConfidenceInterval.value)
      drawChart()
    })
  
  toggleButton.append('rect')
    .attr('width', 140)
    .attr('height', 25)
    .attr('rx', 4)
    .attr('class', 'confidence-toggle')
    .attr('fill', showConfidenceInterval.value ? '#3b82f6' : '#e5e7eb')
  
  toggleButton.append('text')
    .attr('x', 70)
    .attr('y', 12.5)
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .style('font-size', '12px')
    .style('fill', showConfidenceInterval.value ? 'white' : 'black')
    .text('Konfidenzintervall')
}

// Watch for ready state
watch(isReady, (ready) => {
  if (ready) {
    initChart()
  }
})

// Watch for data changes
watch(() => props.data, () => {
  if (isReady.value) {
    drawChart()
  }
}, { deep: true })

// Watch for config changes
watch(() => props.config, () => {
  if (isReady.value) {
    initChart()
  }
}, { deep: true })

// Initialize on mount
onMounted(() => {
  if (isReady.value) {
    initChart()
  }
  
  // Setup resize observer for responsive chart
  if (containerRef.value && ResizeObserver) {
    resizeObserver = new ResizeObserver((entries) => {
      // Debounce resize events
      setTimeout(() => {
        if (isReady.value) {
          initChart()
        }
      }, 100)
    })
    
    resizeObserver.observe(containerRef.value)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>

<template>
  <div 
    ref="containerRef" 
    class="ml-chart w-full"
    :style="{ height: chartDimensions.height + 'px' }"
  />
</template>

<style scoped>
.ml-chart {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/20;
}

:deep(.chart-tooltip) {
  z-index: 1000;
}

/* Ensure text is visible in dark mode */
:deep(.ml-chart-svg text) {
  @apply fill-gray-700 dark:fill-gray-300;
}

:deep(.ml-chart-svg .axis-label) {
  @apply fill-gray-600 dark:fill-gray-400;
}

:deep(.ml-chart-svg .legend-text) {
  @apply fill-gray-700 dark:fill-gray-300;
}

/* Legend background and button styling in dark mode */
:deep(.ml-chart-svg .legend-background) {
  @apply fill-white dark:fill-gray-800 stroke-gray-200 dark:stroke-gray-600;
}

:deep(.ml-chart-svg .confidence-toggle) {
  @apply fill-blue-500 dark:fill-blue-400;
}

:deep(.ml-chart-svg .confidence-toggle text) {
  @apply fill-white dark:fill-gray-100;
}

/* Grid lines in dark mode */
:deep(.ml-chart-svg .grid) {
  @apply stroke-gray-300 dark:stroke-gray-600;
}

:deep(.ml-chart-svg .grid line) {
  @apply stroke-gray-300 dark:stroke-gray-600;
}

/* Axis lines in dark mode */
:deep(.ml-chart-svg .domain) {
  @apply stroke-gray-400 dark:stroke-gray-500;
}

/* Tick lines in dark mode */
:deep(.ml-chart-svg .tick line) {
  @apply stroke-gray-400 dark:stroke-gray-500;
}
</style>