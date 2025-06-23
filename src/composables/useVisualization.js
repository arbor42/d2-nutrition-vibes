import { ref, computed, watch, nextTick } from 'vue'
import * as d3 from 'd3'

import { useD3, useD3Data, useD3Chart } from './useD3.js'

/**
 * Enhanced visualization composable with reactive updates
 * Handles complex data transformations and update patterns
 */
export function useVisualization(containerRef, options = {}) {
  const {
    margin = { top: 20, right: 20, bottom: 30, left: 40 },
    responsive = true,
    autoResize = true,
    updateStrategy = 'merge', // 'replace', 'merge', 'animate'
    transitionDuration = 750,
    debounceUpdate = 100
  } = options

  const d3Chart = useD3Chart(containerRef, { margin, responsive, autoResize })
  
  // Visualization state
  const isUpdating = ref(false)
  const lastUpdate = ref(null)
  const updateQueue = ref([])
  
  let updateTimeout = null
  let animationFrame = null

  /**
   * Queue an update operation
   */
  const queueUpdate = (updateFn, data = null, immediate = false) => {
    
    if (typeof updateFn !== 'function') {
      console.error('❌ useVisualization: updateFn is not a function:', updateFn)
      return
    }

    const update = {
      fn: updateFn,
      data,
      timestamp: Date.now()
    }

    if (immediate) {
      executeUpdate(update)
    } else {
      updateQueue.value.push(update)
      scheduleUpdate()
    }
  }

  /**
   * Schedule batched updates
   */
  const scheduleUpdate = () => {
    if (updateTimeout) clearTimeout(updateTimeout)
    if (animationFrame) cancelAnimationFrame(animationFrame)

    updateTimeout = setTimeout(() => {
      animationFrame = requestAnimationFrame(processPendingUpdates)
    }, debounceUpdate)
  }

  /**
   * Process all pending updates
   */
  const processPendingUpdates = async () => {
    if (updateQueue.value.length === 0 || isUpdating.value) return

    isUpdating.value = true

    try {
      // Sort updates by timestamp
      const sortedUpdates = [...updateQueue.value].sort((a, b) => a.timestamp - b.timestamp)
      
      // Execute updates in sequence
      for (const update of sortedUpdates) {
        await executeUpdate(update)
      }

      // Clear queue
      updateQueue.value = []
      lastUpdate.value = Date.now()
    } catch (error) {
      console.error('Error processing visualization updates:', error)
    } finally {
      isUpdating.value = false
    }
  }

  /**
   * Execute a single update operation
   */
  const executeUpdate = async (update) => {
    if (!d3Chart.isReady.value) {
      return
    }

    await nextTick()

    try {
      const container = d3Chart.getSelection('container')
      
      if (container) {
        await update.fn(container, update.data, d3Chart.chartState.value)
      }
    } catch (error) {
      console.error('❌ useVisualization: Error executing update:', error)
    }
  }

  /**
   * Create smooth transitions between data states
   */
  const createSmoothTransition = (selection, options = {}) => {
    const {
      duration = transitionDuration,
      ease = d3.easeQuadInOut,
      delay = 0,
      stagger = 0
    } = options

    if (stagger > 0) {
      return selection.transition()
        .duration(duration)
        .ease(ease)
        .delay((d, i) => delay + (i * stagger))
    }

    return selection.transition()
      .duration(duration)
      .ease(ease)
      .delay(delay)
  }

  /**
   * Handle enter-update-exit pattern with transitions
   */
  const handleDataJoin = (container, selector, data, options = {}) => {
    const {
      keyFn = (d, i) => i,
      enterFn = null,
      updateFn = null,
      exitFn = null,
      transitionOptions = {}
    } = options

    const selection = container.selectAll(selector).data(data, keyFn)

    // Handle entering elements
    const enter = selection.enter()
    if (enterFn) {
      enterFn(enter, createSmoothTransition(enter, transitionOptions))
    }

    // Handle updating elements
    const update = selection
    if (updateFn) {
      updateFn(update, createSmoothTransition(update, transitionOptions))
    }

    // Handle exiting elements
    const exit = selection.exit()
    if (exitFn) {
      exitFn(exit, createSmoothTransition(exit, transitionOptions))
    } else {
      // Default exit behavior
      createSmoothTransition(exit, transitionOptions)
        .style('opacity', 0)
        .remove()
    }

    return { enter, update, exit }
  }

  /**
   * Optimize rendering for large datasets
   */
  const optimizedRender = (data, renderFn, options = {}) => {
    const {
      chunkSize = 1000,
      batchDelay = 16 // ~60fps
    } = options

    if (!Array.isArray(data) || data.length <= chunkSize) {
      return renderFn(data)
    }

    // Split data into chunks
    const chunks = []
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize))
    }

    // Render chunks progressively
    return new Promise((resolve) => {
      let currentChunk = 0

      const renderNextChunk = () => {
        if (currentChunk >= chunks.length) {
          resolve()
          return
        }

        renderFn(chunks[currentChunk])
        currentChunk++

        setTimeout(renderNextChunk, batchDelay)
      }

      renderNextChunk()
    })
  }

  /**
   * Create responsive scales that update with container dimensions
   */
  const createResponsiveScales = (dataExtents, options = {}) => {
    const {
      xType = 'linear',
      yType = 'linear',
      padding = 0.1,
      nice = true
    } = options

    const { width, height } = d3Chart.dimensions.value
    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    const scales = {}

    // X Scale
    if (dataExtents.x) {
      if (xType === 'linear') {
        scales.x = d3.scaleLinear()
          .domain(dataExtents.x)
          .range([0, chartWidth])
        
        if (nice) scales.x.nice()
      } else if (xType === 'time') {
        scales.x = d3.scaleTime()
          .domain(dataExtents.x)
          .range([0, chartWidth])
      } else if (xType === 'band') {
        scales.x = d3.scaleBand()
          .domain(dataExtents.x)
          .range([0, chartWidth])
          .padding(padding)
      }
    }

    // Y Scale
    if (dataExtents.y) {
      if (yType === 'linear') {
        scales.y = d3.scaleLinear()
          .domain(dataExtents.y)
          .range([chartHeight, 0])
        
        if (nice) scales.y.nice()
      } else if (yType === 'band') {
        scales.y = d3.scaleBand()
          .domain(dataExtents.y)
          .range([chartHeight, 0])
          .padding(padding)
      }
    }

    return scales
  }

  /**
   * Add interactive features to visualizations
   */
  const addInteractivity = (selection, options = {}) => {
    const {
      tooltip = null,
      click = null,
      hover = null,
      zoom = false,
      brush = false
    } = options

    // Tooltip
    if (tooltip) {
      selection
        .on('mouseover', (event, d) => {
          if (typeof tooltip.show === 'function') {
            tooltip.show(event, d)
          }
        })
        .on('mousemove', (event, d) => {
          if (typeof tooltip.move === 'function') {
            tooltip.move(event, d)
          }
        })
        .on('mouseout', (event, d) => {
          if (typeof tooltip.hide === 'function') {
            tooltip.hide(event, d)
          }
        })
    }

    // Click events
    if (click && typeof click === 'function') {
      selection.on('click', click)
    }

    // Hover effects
    if (hover) {
      selection
        .on('mouseenter', hover.enter || null)
        .on('mouseleave', hover.leave || null)
    }

    // Zoom behavior
    if (zoom && typeof zoom === 'object') {
      const zoomBehavior = d3.zoom()
        .scaleExtent(zoom.scaleExtent || [0.1, 10])
        .on('zoom', zoom.onZoom || null)

      selection.call(zoomBehavior)
    }

    // Brush behavior
    if (brush && typeof brush === 'object') {
      const brushBehavior = d3.brush()
        .on('brush end', brush.onBrush || null)

      selection.call(brushBehavior)
    }

    return selection
  }

  /**
   * Cleanup visualization resources
   */
  const cleanup = () => {
    if (updateTimeout) {
      clearTimeout(updateTimeout)
      updateTimeout = null
    }

    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }

    updateQueue.value = []
    
    // Call parent cleanup
    d3Chart.cleanup()
  }

  return {
    // Inherit all d3Chart functionality
    ...d3Chart,

    // Visualization state
    isUpdating,
    lastUpdate,

    // Update management
    queueUpdate,
    scheduleUpdate,
    executeUpdate,

    // Transition utilities
    createSmoothTransition,
    handleDataJoin,

    // Performance optimization
    optimizedRender,

    // Responsive utilities
    createResponsiveScales,

    // Interactivity
    addInteractivity,

    // Cleanup
    cleanup
  }
}

/**
 * Tooltip composable for D3.js visualizations
 */
export function useTooltip(options = {}) {
  const {
    className = 'chart-tooltip',
    offset = { x: 10, y: -10 },
    fadeIn = 200,
    fadeOut = 100,
    followMouse = true
  } = options

  const tooltipRef = ref(null)
  const isVisible = ref(false)
  const content = ref('')
  const position = ref({ x: 0, y: 0 })

  /**
   * Initialize tooltip element
   */
  const initTooltip = () => {
    if (tooltipRef.value) return tooltipRef.value

    const tooltip = d3.select('body')
      .append('div')
      .attr('class', className)
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('z-index', 9999)

    tooltipRef.value = tooltip
    return tooltip
  }

  /**
   * Show tooltip
   */
  const show = (event, data, formatter = null) => {
    const tooltip = initTooltip()
    
    let tooltipContent = data
    if (formatter && typeof formatter === 'function') {
      tooltipContent = formatter(data)
    }

    content.value = tooltipContent
    
    tooltip.html(tooltipContent)
      .transition()
      .duration(fadeIn)
      .style('opacity', 1)

    if (followMouse && event) {
      updatePosition(event)
    }

    isVisible.value = true
  }

  /**
   * Update tooltip position
   */
  const updatePosition = (event) => {
    if (!tooltipRef.value || !event) return

    const x = event.pageX + offset.x
    const y = event.pageY + offset.y

    position.value = { x, y }

    tooltipRef.value
      .style('left', `${x}px`)
      .style('top', `${y}px`)
  }

  /**
   * Hide tooltip
   */
  const hide = () => {
    if (!tooltipRef.value) return

    tooltipRef.value
      .transition()
      .duration(fadeOut)
      .style('opacity', 0)

    isVisible.value = false
  }

  /**
   * Remove tooltip from DOM
   */
  const destroy = () => {
    if (tooltipRef.value) {
      tooltipRef.value.remove()
      tooltipRef.value = null
    }
    isVisible.value = false
  }

  return {
    // State
    isVisible,
    content,
    position,

    // Methods
    show,
    hide,
    updatePosition,
    destroy,

    // Utilities
    move: updatePosition
  }
}