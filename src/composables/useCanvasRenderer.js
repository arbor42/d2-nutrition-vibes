import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as d3 from 'd3'

export function useCanvasRenderer(options = {}) {
  const canvasRef = ref(null)
  const context = ref(null)
  const isRendering = ref(false)
  const lastRenderTime = ref(0)
  
  const {
    width = 800,
    height = 600,
    devicePixelRatio = window.devicePixelRatio || 1,
    backgroundColor = '#ffffff',
    enableAntiAliasing = true,
    maxDataPoints = 50000
  } = options

  // Canvas setup
  const setupCanvas = () => {
    if (!canvasRef.value) return

    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    
    // Set actual size in memory (scaled for high-DPI displays)
    canvas.width = width * devicePixelRatio
    canvas.height = height * devicePixelRatio
    
    // Scale back down using CSS
    canvas.style.width = `${width  }px`
    canvas.style.height = `${height  }px`
    
    // Scale the drawing context so everything draws at the correct size
    ctx.scale(devicePixelRatio, devicePixelRatio)
    
    // Enable anti-aliasing
    if (enableAntiAliasing) {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
    }
    
    context.value = ctx
    
    // Clear canvas with background color
    clearCanvas()
  }

  // Clear canvas
  const clearCanvas = () => {
    if (!context.value) return
    
    context.value.fillStyle = backgroundColor
    context.value.fillRect(0, 0, width, height)
  }

  // Optimized scatter plot rendering
  const renderScatterPlot = (data, options = {}) => {
    if (!context.value || !data.length) return
    
    const {
      xScale = d3.scaleLinear().domain(d3.extent(data, d => d.x)).range([50, width - 50]),
      yScale = d3.scaleLinear().domain(d3.extent(data, d => d.y)).range([height - 50, 50]),
      colorScale = d3.scaleOrdinal(d3.schemeCategory10),
      pointRadius = 3,
      pointOpacity = 0.7
    } = options

    const startTime = performance.now()
    isRendering.value = true
    
    clearCanvas()
    
    const ctx = context.value
    
    // Batch rendering for performance
    const batchSize = Math.min(data.length, 1000)
    let currentIndex = 0
    
    const renderBatch = () => {
      const endIndex = Math.min(currentIndex + batchSize, data.length)
      
      ctx.globalAlpha = pointOpacity
      
      for (let i = currentIndex; i < endIndex; i++) {
        const point = data[i]
        const x = xScale(point.x)
        const y = yScale(point.y)
        
        ctx.fillStyle = point.color || colorScale(point.category || 0)
        ctx.beginPath()
        ctx.arc(x, y, pointRadius, 0, 2 * Math.PI)
        ctx.fill()
      }
      
      currentIndex = endIndex
      
      if (currentIndex < data.length) {
        // Use requestAnimationFrame for smooth rendering
        requestAnimationFrame(renderBatch)
      } else {
        // Rendering complete
        ctx.globalAlpha = 1
        drawAxes(xScale, yScale)
        
        const endTime = performance.now()
        lastRenderTime.value = endTime - startTime
        isRendering.value = false
        
        console.log(`Canvas scatter plot rendered: ${data.length} points in ${lastRenderTime.value.toFixed(2)}ms`)
      }
    }
    
    renderBatch()
  }

  // Optimized line chart rendering
  const renderLineChart = (data, options = {}) => {
    if (!context.value || !data.length) return
    
    const {
      xScale = d3.scaleLinear().domain(d3.extent(data, d => d.x)).range([50, width - 50]),
      yScale = d3.scaleLinear().domain(d3.extent(data, d => d.y)).range([height - 50, 50]),
      lineColor = '#2563eb',
      lineWidth = 2,
      showPoints = false,
      pointRadius = 3
    } = options

    const startTime = performance.now()
    isRendering.value = true
    
    clearCanvas()
    
    const ctx = context.value
    
    // Draw line
    ctx.strokeStyle = lineColor
    ctx.lineWidth = lineWidth
    ctx.beginPath()
    
    data.forEach((point, i) => {
      const x = xScale(point.x)
      const y = yScale(point.y)
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
    
    // Draw points if enabled
    if (showPoints) {
      ctx.fillStyle = lineColor
      data.forEach(point => {
        const x = xScale(point.x)
        const y = yScale(point.y)
        
        ctx.beginPath()
        ctx.arc(x, y, pointRadius, 0, 2 * Math.PI)
        ctx.fill()
      })
    }
    
    drawAxes(xScale, yScale)
    
    const endTime = performance.now()
    lastRenderTime.value = endTime - startTime
    isRendering.value = false
    
    console.log(`Canvas line chart rendered: ${data.length} points in ${lastRenderTime.value.toFixed(2)}ms`)
  }

  // Optimized heatmap rendering
  const renderHeatmap = (data, options = {}) => {
    if (!context.value || !data.length) return
    
    const {
      xScale = d3.scaleBand().domain(data.map(d => d.x)).range([50, width - 50]),
      yScale = d3.scaleBand().domain(data.map(d => d.y)).range([50, height - 50]),
      colorScale = d3.scaleSequential(d3.interpolateViridis).domain(d3.extent(data, d => d.value))
    } = options

    const startTime = performance.now()
    isRendering.value = true
    
    clearCanvas()
    
    const ctx = context.value
    const cellWidth = xScale.bandwidth()
    const cellHeight = yScale.bandwidth()
    
    // Use ImageData for faster pixel manipulation
    const imageData = ctx.createImageData(width, height)
    const pixels = imageData.data
    
    data.forEach(point => {
      const x = Math.floor(xScale(point.x))
      const y = Math.floor(yScale(point.y))
      const color = d3.color(colorScale(point.value))
      
      // Fill rectangle area in ImageData
      for (let py = y; py < y + cellHeight && py < height; py++) {
        for (let px = x; px < x + cellWidth && px < width; px++) {
          const index = (py * width + px) * 4
          pixels[index] = color.r
          pixels[index + 1] = color.g
          pixels[index + 2] = color.b
          pixels[index + 3] = 255
        }
      }
    })
    
    ctx.putImageData(imageData, 0, 0)
    
    const endTime = performance.now()
    lastRenderTime.value = endTime - startTime
    isRendering.value = false
    
    console.log(`Canvas heatmap rendered: ${data.length} cells in ${lastRenderTime.value.toFixed(2)}ms`)
  }

  // Draw axes
  const drawAxes = (xScale, yScale) => {
    if (!context.value) return
    
    const ctx = context.value
    
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 1
    ctx.font = '12px Inter, sans-serif'
    ctx.fillStyle = '#374151'
    
    // X-axis
    ctx.beginPath()
    ctx.moveTo(50, height - 50)
    ctx.lineTo(width - 50, height - 50)
    ctx.stroke()
    
    // Y-axis
    ctx.beginPath()
    ctx.moveTo(50, 50)
    ctx.lineTo(50, height - 50)
    ctx.stroke()
    
    // X-axis ticks and labels
    const xTicks = xScale.ticks ? xScale.ticks(5) : xScale.domain()
    xTicks.forEach(tick => {
      const x = xScale(tick)
      
      // Tick mark
      ctx.beginPath()
      ctx.moveTo(x, height - 50)
      ctx.lineTo(x, height - 45)
      ctx.stroke()
      
      // Label
      ctx.textAlign = 'center'
      ctx.fillText(tick.toString(), x, height - 30)
    })
    
    // Y-axis ticks and labels
    const yTicks = yScale.ticks ? yScale.ticks(5) : yScale.domain()
    yTicks.forEach(tick => {
      const y = yScale(tick)
      
      // Tick mark
      ctx.beginPath()
      ctx.moveTo(45, y)
      ctx.lineTo(50, y)
      ctx.stroke()
      
      // Label
      ctx.textAlign = 'right'
      ctx.fillText(tick.toString(), 40, y + 4)
    })
  }

  // Performance-optimized data processing
  const processLargeDataset = (data, maxPoints = maxDataPoints) => {
    if (data.length <= maxPoints) return data
    
    // Use data sampling for large datasets
    const step = Math.ceil(data.length / maxPoints)
    const sampledData = []
    
    for (let i = 0; i < data.length; i += step) {
      sampledData.push(data[i])
    }
    
    console.log(`Data sampled: ${data.length} → ${sampledData.length} points`)
    return sampledData
  }

  // Convert canvas to image
  const exportAsImage = (format = 'png', quality = 1.0) => {
    if (!canvasRef.value) return null
    
    return canvasRef.value.toDataURL(`image/${format}`, quality)
  }

  // Download canvas as image
  const downloadImage = (filename = 'chart', format = 'png') => {
    const dataURL = exportAsImage(format)
    if (!dataURL) return
    
    const link = document.createElement('a')
    link.download = `${filename}.${format}`
    link.href = dataURL
    link.click()
  }

  // Animation utilities
  const animateValue = (from, to, duration, callback) => {
    const startTime = performance.now()
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3)
      const value = from + (to - from) * eased
      
      callback(value, progress)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }

  // Zoom and pan functionality
  const transform = ref({ x: 0, y: 0, scale: 1 })
  
  const handleZoom = (event) => {
    event.preventDefault()
    
    const rect = canvasRef.value.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const scale = event.deltaY > 0 ? 0.9 : 1.1
    
    transform.value = {
      x: x - (x - transform.value.x) * scale,
      y: y - (y - transform.value.y) * scale,
      scale: transform.value.scale * scale
    }
    
    // Re-render with new transform
    applyTransform()
  }
  
  const applyTransform = () => {
    if (!context.value) return
    
    context.value.setTransform(
      transform.value.scale, 0, 0, transform.value.scale,
      transform.value.x, transform.value.y
    )
  }

  // Lifecycle hooks
  onMounted(() => {
    setupCanvas()
    
    // Add zoom support
    if (canvasRef.value) {
      canvasRef.value.addEventListener('wheel', handleZoom, { passive: false })
    }
  })

  onUnmounted(() => {
    if (canvasRef.value) {
      canvasRef.value.removeEventListener('wheel', handleZoom)
    }
  })

  // Reactive updates
  watch([() => width, () => height], () => {
    setupCanvas()
  })

  return {
    canvasRef,
    context,
    isRendering,
    lastRenderTime,
    setupCanvas,
    clearCanvas,
    renderScatterPlot,
    renderLineChart,
    renderHeatmap,
    processLargeDataset,
    exportAsImage,
    downloadImage,
    animateValue,
    transform
  }
}