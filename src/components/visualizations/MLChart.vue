<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'
import { useD3 } from '@/composables/useD3'
import { useUIStore } from '@/stores/useUIStore'
import { createD3AxisFormatter, createD3TooltipFormatter } from '@/utils/formatters'

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

// Stores
const uiStore = useUIStore()

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

// Dark mode detection using UIStore
const isDarkMode = computed(() => uiStore.isDarkMode)

// Utility function to correct unrealistic confidence intervals
// Polynomial regression can produce extremely wide confidence intervals for long-term forecasts
// This function applies reasonable bounds to prevent misleading visualizations
const correctConfidenceInterval = (prediction) => {
  const predicted = prediction.predicted_value
  let lower = prediction.confidence_lower
  let upper = prediction.confidence_upper
  const originalLower = lower
  const originalUpper = upper
  
  // Validate confidence bounds are reasonable
  const maxReasonableRange = predicted * 3 // Max 300% of predicted value
  const minLower = Math.max(0, predicted * 0.1) // At least 10% of predicted value
  
  // Fix unrealistic confidence bounds
  if (upper - lower > maxReasonableRange) {
    const halfRange = maxReasonableRange / 2
    lower = Math.max(minLower, predicted - halfRange)
    upper = predicted + halfRange
  }
  
  // Ensure lower bound is not 0 unless predicted value is very small
  if (lower === 0 && predicted > 100000) {
    lower = Math.max(minLower, predicted * 0.2)
  }
  
  // Cap upper bound to prevent extreme funnel shapes
  const maxUpper = predicted * 2.5
  if (upper > maxUpper) {
    upper = maxUpper
  }
  
  // Log when significant corrections are made
  if (Math.abs(originalLower - lower) > predicted * 0.1 || Math.abs(originalUpper - upper) > predicted * 0.1) {
    console.warn(`📊 MLChart: Confidence interval corrected for year ${prediction.year}:`, {
      original: `${originalLower?.toFixed(0)} - ${originalUpper?.toFixed(0)}`,
      corrected: `${lower?.toFixed(0)} - ${upper?.toFixed(0)}`,
      prediction: predicted?.toFixed(0)
    })
  }
  
  return {
    ...prediction,
    confidence_lower: lower,
    confidence_upper: upper
  }
}

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
  
  // Separate historical and prediction data using the type field if available
  const predictions = props.data.filter(d => {
    // Use type field if available, otherwise fallback to year-based logic
    if (d.type) {
      return d.type === 'prediction' && (d.predicted_value > 0 || d.value > 0)
    } else {
      // Fallback: year >= 2023 is prediction
      return d.year >= 2023 && (d.predicted_value > 0 || d.value > 0)
    }
  })
  
  const historical = props.data.filter(d => {
    // Use type field if available, otherwise fallback to year-based logic
    if (d.type) {
      return d.type === 'historical' && (d.value > 0 || d.predicted_value > 0)
    } else {
      // Fallback: year < 2023 is historical
      return d.year < 2023 && (d.value > 0 || d.predicted_value > 0)
    }
  })
  
  console.log('📊 MLChart data processed:', {
    total: props.data.length,
    historical: historical.length,
    predictions: predictions.length,
    historicalYears: historical.map(d => d.year).slice(0, 5),
    predictionYears: predictions.map(d => d.year).slice(0, 5),
    sampleTypes: props.data.slice(0, 3).map(d => ({ year: d.year, type: d.type }))
  })
  
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
  
  // Get theme-aware colors
  const darkMode = isDarkMode.value
  const historicalColor = darkMode ? '#34d399' : '#10b981' // emerald-400 : emerald-500
  const predictionColor = darkMode ? '#60a5fa' : '#3b82f6' // blue-400 : blue-500
  const confidenceColor = darkMode ? '#93c5fd' : '#60a5fa' // blue-300 : blue-400
  
  // Clear previous content
  gRef.value.selectAll('*').remove()
  
  // Scales
  const allYears = [...historical, ...predictions].map(d => d.year)
  
  // Get corrected confidence intervals for scale calculation
  const correctedPredictions = predictions
    .filter(d => 
      d.confidence_lower != null && d.confidence_upper != null &&
      d.predicted_value != null && d.predicted_value > 0
    )
    .map(correctConfidenceInterval)
  
  const allValues = [
    ...historical.map(d => d.predicted_value || d.value).filter(v => v != null && v > 0),
    ...predictions.map(d => d.predicted_value).filter(v => v != null && v > 0),
    ...correctedPredictions.map(d => d.confidence_lower).filter(v => v != null && v > 0),
    ...correctedPredictions.map(d => d.confidence_upper).filter(v => v != null && v > 0)
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
    .call(d3.axisLeft(yScale).tickFormat(createD3AxisFormatter('1000 t')))
  
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
    .text('Produktion (Mio. t)')
  
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
    // Process confidence intervals with validation and smoothing
    const predictionsWithConfidence = predictions
      .filter(d => 
        d.confidence_lower != null && d.confidence_upper != null &&
        d.confidence_upper > d.confidence_lower &&
        d.predicted_value != null && d.predicted_value > 0
      )
      .map(correctConfidenceInterval)
    
    if (predictionsWithConfidence.length > 0) {
      gRef.value.append('path')
        .datum(predictionsWithConfidence)
        .attr('fill', confidenceColor)
        .attr('fill-opacity', 0.2)
        .attr('d', area)
    }
  }
  
  // Draw historical line if exists
  if (historical.length > 0) {
    gRef.value.append('path')
      .datum(historical)
      .attr('fill', 'none')
      .attr('stroke', historicalColor)
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
      .attr('fill', historicalColor)
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
      .attr('stroke', predictionColor)
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
      .attr('fill', predictionColor)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        emit('prediction-select', d)
      })
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('r', 6)
        
        // Show tooltip with dark mode support
        const darkMode = isDarkMode.value
        
        const tooltip = d3.select('body').append('div')
          .attr('class', 'ml-chart-tooltip')
          .style('position', 'absolute')
          .style('background', darkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)')
          .style('color', darkMode ? '#f9fafb' : '#111827')
          .style('padding', '10px 12px')
          .style('border-radius', '8px')
          .style('font-size', '12px')
          .style('font-weight', '500')
          .style('line-height', '1.5')
          .style('box-shadow', darkMode ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)')
          .style('border', darkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(209, 213, 219, 0.3)')
          .style('backdrop-filter', 'blur(10px)')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .style('opacity', 0)
        
        // Apply confidence interval corrections for tooltip
        const corrected = correctConfidenceInterval(d)
        
        const tooltipFormatter = createD3TooltipFormatter('1000 t')
        tooltip.html(`
          <strong>Jahr ${d.year}</strong><br/>
          Prognose: ${tooltipFormatter(corrected.predicted_value)}<br/>
          Konfidenz: ${tooltipFormatter(corrected.confidence_lower)} - ${tooltipFormatter(corrected.confidence_upper)}<br/>
          Unsicherheit: ${d.uncertainty_percent?.toFixed(1) || 'N/A'}%
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .transition()
        .duration(200)
        .style('opacity', 1)
      })
      .on('mouseleave', function() {
        d3.select(this).attr('r', 4)
        d3.selectAll('.ml-chart-tooltip').remove()
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
  
  const legendItems = [
    { label: 'Historisch', color: historicalColor, dash: false },
    { label: 'Prognose', color: predictionColor, dash: true },
    { label: 'Konfidenzintervall', color: confidenceColor, dash: false, area: true }
  ]
  
  legendItems.forEach((item, i) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${i * 20})`)
    
    if (item.area) {
      legendRow.append('rect')
        .attr('width', 15)
        .attr('height', 10)
        .attr('class', 'legend-area-indicator')
        .attr('fill', item.color)
        .attr('fill-opacity', 0.2)
    } else {
      legendRow.append('line')
        .attr('x1', 0)
        .attr('x2', 15)
        .attr('y1', 5)
        .attr('y2', 5)
        .attr('class', `legend-line ${item.dash ? 'legend-line-dashed' : 'legend-line-solid'}`)
        .attr('stroke', item.color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', item.dash ? '5,5' : null)
    }
    
    legendRow.append('text')
      .attr('x', 20)
      .attr('y', 5)
      .attr('dy', '0.35em')
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
    .attr('class', `confidence-toggle ${showConfidenceInterval.value ? 'confidence-toggle-active' : 'confidence-toggle-inactive'}`)
  
  toggleButton.append('text')
    .attr('x', 70)
    .attr('y', 12.5)
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('class', `confidence-toggle-text ${showConfidenceInterval.value ? 'confidence-toggle-text-active' : 'confidence-toggle-text-inactive'}`)
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

// Watch for dark mode changes and redraw chart for better styling
watch(() => uiStore.isDarkMode, () => {
  if (isReady.value) {
    drawChart()
  }
})

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

/* Tooltip has inline styles for better compatibility */

/* Ensure text is visible in dark mode */
:deep(.ml-chart-svg text) {
  @apply fill-gray-700 dark:fill-gray-300;
}

:deep(.ml-chart-svg .axis-label) {
  @apply fill-gray-600 dark:fill-gray-400;
}

:deep(.ml-chart-svg .legend-text) {
  @apply fill-gray-700 dark:fill-gray-300;
  font-size: 12px;
  font-weight: 500;
}

/* Legend background styling */
:deep(.ml-chart-svg .legend-background) {
  @apply fill-white dark:fill-gray-800 stroke-gray-200 dark:stroke-gray-600;
  fill-opacity: 0.95;
  stroke-width: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

/* Legend line indicators */
:deep(.ml-chart-svg .legend-line) {
  /* Keep original stroke colors from JavaScript */
}

:deep(.ml-chart-svg .legend-line-solid) {
  stroke-dasharray: none;
}

:deep(.ml-chart-svg .legend-line-dashed) {
  stroke-dasharray: 5,5;
}

/* Legend area indicator */
:deep(.ml-chart-svg .legend-area-indicator) {
  /* Keep original fill color from JavaScript */
  /* fill-opacity is set in JavaScript */
}

/* Confidence toggle button styling */
:deep(.ml-chart-svg .confidence-toggle-active) {
  @apply fill-blue-500 dark:fill-blue-400;
}

:deep(.ml-chart-svg .confidence-toggle-inactive) {
  @apply fill-gray-200 dark:fill-gray-600 stroke-gray-300 dark:stroke-gray-500;
  stroke-width: 1;
  transition: all 0.2s ease;
}

:deep(.ml-chart-svg .confidence-toggle-active) {
  transition: all 0.2s ease;
}

/* Hover effects for toggle button */
:deep(.ml-chart-svg g:hover .confidence-toggle-active) {
  @apply fill-blue-600 dark:fill-blue-300;
}

:deep(.ml-chart-svg g:hover .confidence-toggle-inactive) {
  @apply fill-gray-300 dark:fill-gray-500;
}

:deep(.ml-chart-svg .confidence-toggle-text-active) {
  @apply fill-white dark:fill-gray-100;
  font-size: 12px;
}

:deep(.ml-chart-svg .confidence-toggle-text-inactive) {
  @apply fill-gray-700 dark:fill-gray-300;
  font-size: 12px;
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