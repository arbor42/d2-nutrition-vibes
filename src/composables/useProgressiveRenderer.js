import { ref, nextTick } from 'vue'

/**
 * Progressive rendering composable for handling large datasets
 * Renders data in chunks to maintain UI responsiveness
 */
export function useProgressiveRenderer(options = {}) {
  const {
    chunkSize = 100,
    chunkDelay = 16, // ~60fps
    maxConcurrentChunks = 3,
    enablePrioritization = true,
    enableAdaptiveChunking = true
  } = options

  const isRendering = ref(false)
  const progress = ref(0)
  const renderedItems = ref(0)
  const totalItems = ref(0)
  const currentChunk = ref(0)
  const renderQueue = ref([])
  const activeRenders = ref(new Set())

  let renderController = null
  let performanceMetrics = {
    averageChunkTime: 0,
    totalRenderTime: 0,
    adaptiveChunkSize: chunkSize
  }

  /**
   * Calculate adaptive chunk size based on performance
   */
  const calculateAdaptiveChunkSize = (chunkTime) => {
    if (!enableAdaptiveChunking) return chunkSize

    const targetTime = 8 // Target 8ms per chunk for 120fps
    
    if (chunkTime > targetTime * 2) {
      // Chunk taking too long, reduce size
      performanceMetrics.adaptiveChunkSize = Math.max(
        Math.floor(performanceMetrics.adaptiveChunkSize * 0.8),
        10
      )
    } else if (chunkTime < targetTime * 0.5) {
      // Chunk finishing quickly, increase size
      performanceMetrics.adaptiveChunkSize = Math.min(
        Math.floor(performanceMetrics.adaptiveChunkSize * 1.2),
        chunkSize * 3
      )
    }

    return performanceMetrics.adaptiveChunkSize
  }

  /**
   * Render a single chunk of data
   */
  const renderChunk = async (data, renderFn, chunkIndex, chunkData) => {
    const chunkId = `chunk_${chunkIndex}_${Date.now()}`
    activeRenders.value.add(chunkId)

    const startTime = performance.now()

    try {
      // Use requestAnimationFrame for smooth rendering
      await new Promise(resolve => {
        requestAnimationFrame(async () => {
          try {
            await renderFn(chunkData, chunkIndex, {
              startIndex: chunkIndex * performanceMetrics.adaptiveChunkSize,
              endIndex: chunkIndex * performanceMetrics.adaptiveChunkSize + chunkData.length,
              totalChunks: Math.ceil(data.length / performanceMetrics.adaptiveChunkSize),
              isFirst: chunkIndex === 0,
              isLast: chunkIndex === Math.ceil(data.length / performanceMetrics.adaptiveChunkSize) - 1
            })
            resolve()
          } catch (error) {
            console.error(`Error rendering chunk ${chunkIndex}:`, error)
            resolve()
          }
        })
      })

      const chunkTime = performance.now() - startTime
      
      // Update performance metrics
      performanceMetrics.averageChunkTime = 
        (performanceMetrics.averageChunkTime + chunkTime) / 2

      // Calculate adaptive chunk size for next render
      if (enableAdaptiveChunking) {
        calculateAdaptiveChunkSize(chunkTime)
      }

      // Update progress
      renderedItems.value += chunkData.length
      progress.value = (renderedItems.value / totalItems.value) * 100
      currentChunk.value = chunkIndex + 1

    } finally {
      activeRenders.value.delete(chunkId)
    }
  }

  /**
   * Start progressive rendering
   */
  const startProgressiveRender = async (data, renderFn, options = {}) => {
    const {
      priorityFn = null,
      onProgress = null,
      onComplete = null,
      onError = null
    } = options

    if (isRendering.value) {
      console.warn('Progressive render already in progress')
      return
    }

    // Reset state
    isRendering.value = true
    progress.value = 0
    renderedItems.value = 0
    totalItems.value = data.length
    currentChunk.value = 0
    activeRenders.value.clear()

    const startTime = performance.now()
    let chunks = []

    try {
      // Split data into chunks
      const currentChunkSize = performanceMetrics.adaptiveChunkSize
      for (let i = 0; i < data.length; i += currentChunkSize) {
        const chunkData = data.slice(i, i + currentChunkSize)
        const chunkIndex = Math.floor(i / currentChunkSize)
        
        chunks.push({
          index: chunkIndex,
          data: chunkData,
          priority: priorityFn ? priorityFn(chunkData, chunkIndex) : chunkIndex
        })
      }

      // Sort by priority if prioritization is enabled
      if (enablePrioritization && priorityFn) {
        chunks.sort((a, b) => b.priority - a.priority)
      }

      // Create render controller for cancellation
      renderController = new AbortController()

      // Process chunks with concurrency control
      let chunkIndex = 0
      const processingPromises = []

      const processNextChunk = async () => {
        while (chunkIndex < chunks.length && !renderController.signal.aborted) {
          if (activeRenders.value.size >= maxConcurrentChunks) {
            // Wait for a render to complete
            await new Promise(resolve => setTimeout(resolve, chunkDelay))
            continue
          }

          const chunk = chunks[chunkIndex++]
          
          const renderPromise = renderChunk(data, renderFn, chunk.index, chunk.data)
            .then(() => {
              if (onProgress) {
                onProgress({
                  progress: progress.value,
                  renderedItems: renderedItems.value,
                  totalItems: totalItems.value,
                  currentChunk: currentChunk.value,
                  averageChunkTime: performanceMetrics.averageChunkTime
                })
              }
            })

          processingPromises.push(renderPromise)

          // Add delay between chunk starts
          if (chunkDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, chunkDelay))
          }
        }
      }

      // Start processing
      await processNextChunk()

      // Wait for all chunks to complete
      await Promise.all(processingPromises)

      performanceMetrics.totalRenderTime = performance.now() - startTime

      if (onComplete) {
        onComplete({
          totalItems: totalItems.value,
          totalTime: performanceMetrics.totalRenderTime,
          averageChunkTime: performanceMetrics.averageChunkTime,
          adaptiveChunkSize: performanceMetrics.adaptiveChunkSize
        })
      }

    } catch (error) {
      console.error('Progressive rendering error:', error)
      if (onError) {
        onError(error)
      }
    } finally {
      isRendering.value = false
      renderController = null
    }
  }

  /**
   * Cancel ongoing progressive render
   */
  const cancelRender = () => {
    if (renderController) {
      renderController.abort()
      renderController = null
    }
    
    isRendering.value = false
    activeRenders.value.clear()
  }

  /**
   * Render with priority-based scheduling
   */
  const renderWithPriority = (data, renderFn, priorityFn) => {
    return startProgressiveRender(data, renderFn, { priorityFn })
  }

  /**
   * Render visible items first (viewport-based priority)
   */
  const renderVisibleFirst = (data, renderFn, getItemBounds) => {
    const priorityFn = (chunkData, chunkIndex) => {
      // Calculate how many items in this chunk are visible
      let visibleCount = 0
      
      chunkData.forEach((item, index) => {
        const bounds = getItemBounds(item, chunkIndex * chunkSize + index)
        if (isInViewport(bounds)) {
          visibleCount++
        }
      })

      // Higher priority for chunks with more visible items
      return visibleCount / chunkData.length
    }

    return renderWithPriority(data, renderFn, priorityFn)
  }

  /**
   * Check if bounds are in viewport
   */
  const isInViewport = (bounds) => {
    if (!bounds) return false
    
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    
    return (
      bounds.left < viewportWidth &&
      bounds.right > 0 &&
      bounds.top < viewportHeight &&
      bounds.bottom > 0
    )
  }

  /**
   * Batch DOM operations for better performance
   */
  const batchDOMOperations = (operations) => {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        // Batch read operations
        const readResults = operations
          .filter(op => op.type === 'read')
          .map(op => op.fn())

        // Batch write operations
        requestAnimationFrame(() => {
          operations
            .filter(op => op.type === 'write')
            .forEach(op => op.fn())
          
          resolve(readResults)
        })
      })
    })
  }

  /**
   * Render with intersection observer for lazy loading
   */
  const renderWithIntersection = (data, renderFn, containerRef) => {
    if (!window.IntersectionObserver) {
      // Fallback to regular progressive rendering
      return startProgressiveRender(data, renderFn)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const chunkIndex = parseInt(entry.target.dataset.chunkIndex)
            const chunkData = data.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize)
            
            renderChunk(data, renderFn, chunkIndex, chunkData)
            observer.unobserve(entry.target)
          }
        })
      },
      {
        root: containerRef.value,
        rootMargin: '100px', // Load chunks 100px before they become visible
        threshold: 0
      }
    )

    // Create placeholder elements for intersection observation
    const chunks = Math.ceil(data.length / chunkSize)
    for (let i = 0; i < chunks; i++) {
      const placeholder = document.createElement('div')
      placeholder.dataset.chunkIndex = i
      placeholder.style.height = '1px'
      placeholder.style.position = 'absolute'
      placeholder.style.top = `${i * 100}px` // Rough estimate
      
      containerRef.value.appendChild(placeholder)
      observer.observe(placeholder)
    }

    return Promise.resolve()
  }

  /**
   * Get performance metrics
   */
  const getPerformanceMetrics = () => {
    return {
      ...performanceMetrics,
      currentProgress: progress.value,
      renderedItems: renderedItems.value,
      totalItems: totalItems.value,
      activeRenders: activeRenders.value.size,
      isRendering: isRendering.value
    }
  }

  /**
   * Reset progressive renderer state
   */
  const reset = () => {
    cancelRender()
    progress.value = 0
    renderedItems.value = 0
    totalItems.value = 0
    currentChunk.value = 0
    renderQueue.value = []
    
    performanceMetrics = {
      averageChunkTime: 0,
      totalRenderTime: 0,
      adaptiveChunkSize: chunkSize
    }
  }

  return {
    // State
    isRendering,
    progress,
    renderedItems,
    totalItems,
    currentChunk,
    
    // Core methods
    startProgressiveRender,
    cancelRender,
    reset,
    
    // Advanced rendering
    renderWithPriority,
    renderVisibleFirst,
    renderWithIntersection,
    batchDOMOperations,
    
    // Utilities
    getPerformanceMetrics,
    
    // Performance
    adaptiveChunkSize: () => performanceMetrics.adaptiveChunkSize
  }
}

/**
 * Progressive SVG renderer specifically for D3.js
 */
export function useProgressiveSVGRenderer(svgRef, options = {}) {
  const {
    enableTransitions = true,
    transitionDuration = 300,
    ...rendererOptions
  } = options

  const renderer = useProgressiveRenderer(rendererOptions)

  /**
   * Render SVG elements progressively
   */
  const renderSVGElements = (data, elementType, attributesFn) => {
    const renderFn = async (chunkData, chunkIndex, meta) => {
      if (!svgRef.value) return

      const svg = d3.select(svgRef.value)
      
      // Create elements for this chunk
      const elements = svg.selectAll(`${elementType}.chunk-${chunkIndex}`)
        .data(chunkData)
        .enter()
        .append(elementType)
        .attr('class', `chunk-${chunkIndex}`)

      // Apply attributes
      if (typeof attributesFn === 'function') {
        attributesFn(elements, chunkData, meta)
      }

      // Add enter transition if enabled
      if (enableTransitions) {
        elements
          .style('opacity', 0)
          .transition()
          .duration(transitionDuration)
          .style('opacity', 1)
      }

      // Ensure DOM updates are batched
      await nextTick()
    }

    return renderer.startProgressiveRender(data, renderFn)
  }

  /**
   * Progressive line chart rendering
   */
  const renderLineChart = (data, xScale, yScale, options = {}) => {
    const {
      line = d3.line(),
      strokeWidth = 2,
      stroke = '#3b82f6'
    } = options

    const renderFn = async (chunkData, chunkIndex, meta) => {
      if (!svgRef.value) return

      const svg = d3.select(svgRef.value)
      
      // Create path for this chunk
      const path = svg.append('path')
        .datum(chunkData)
        .attr('class', `line-chunk-${chunkIndex}`)
        .attr('fill', 'none')
        .attr('stroke', stroke)
        .attr('stroke-width', strokeWidth)
        .attr('d', line.x(d => xScale(d.x)).y(d => yScale(d.y)))

      // Animate path drawing
      if (enableTransitions) {
        const totalLength = path.node().getTotalLength()
        
        path
          .attr('stroke-dasharray', totalLength + ' ' + totalLength)
          .attr('stroke-dashoffset', totalLength)
          .transition()
          .duration(transitionDuration)
          .attr('stroke-dashoffset', 0)
      }
    }

    return renderer.startProgressiveRender(data, renderFn)
  }

  return {
    ...renderer,
    renderSVGElements,
    renderLineChart
  }
}