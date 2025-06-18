# D3.js + Vue.js Integration Patterns

## Overview

This document provides comprehensive patterns and best practices for integrating D3.js with Vue.js 3 in the D2 Nutrition Vibes application. It covers lifecycle management, reactive data binding, performance optimization, and advanced integration techniques.

## Table of Contents

1. [Basic Integration Patterns](#basic-integration-patterns)
2. [Lifecycle Management](#lifecycle-management)
3. [Reactive Data Binding](#reactive-data-binding)
4. [Performance Optimization](#performance-optimization)
5. [Advanced Patterns](#advanced-patterns)
6. [Error Handling](#error-handling)
7. [Testing Strategies](#testing-strategies)
8. [Best Practices](#best-practices)

## Basic Integration Patterns

### 1. Simple D3 Chart Component

Basic pattern for creating a Vue component with D3:

```vue
<template>
  <div ref="containerRef" class="chart-container w-full h-96"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as d3 from 'd3'

interface DataPoint {
  x: number
  y: number
  label: string
}

interface Props {
  data: DataPoint[]
  width?: number
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 400
})

const containerRef = ref<HTMLElement>()
let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
let xScale: d3.ScaleLinear<number, number>
let yScale: d3.ScaleLinear<number, number>

const initializeChart = () => {
  if (!containerRef.value) return

  // Remove existing SVG
  d3.select(containerRef.value).select('svg').remove()

  // Create SVG
  svg = d3.select(containerRef.value)
    .append('svg')
    .attr('width', props.width)
    .attr('height', props.height)

  // Create scales
  xScale = d3.scaleLinear()
    .range([50, props.width - 50])

  yScale = d3.scaleLinear()
    .range([props.height - 50, 50])

  // Create axes
  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${props.height - 50})`)

  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', 'translate(50, 0)')
}

const updateChart = () => {
  if (!svg || !props.data.length) return

  // Update scales
  xScale.domain(d3.extent(props.data, d => d.x) as [number, number])
  yScale.domain(d3.extent(props.data, d => d.y) as [number, number])

  // Update axes
  svg.select('.x-axis')
    .transition()
    .duration(750)
    .call(d3.axisBottom(xScale))

  svg.select('.y-axis')
    .transition()
    .duration(750)
    .call(d3.axisLeft(yScale))

  // Update circles
  const circles = svg.selectAll('.data-point')
    .data(props.data, (d: any) => d.label)

  circles.enter()
    .append('circle')
    .attr('class', 'data-point')
    .attr('r', 0)
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))
    .transition()
    .duration(750)
    .attr('r', 5)

  circles
    .transition()
    .duration(750)
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))

  circles.exit()
    .transition()
    .duration(750)
    .attr('r', 0)
    .remove()
}

const cleanup = () => {
  if (containerRef.value) {
    d3.select(containerRef.value).select('svg').remove()
  }
}

onMounted(() => {
  initializeChart()
  updateChart()
})

onUnmounted(() => {
  cleanup()
})

watch(() => props.data, updateChart, { deep: true })
watch([() => props.width, () => props.height], () => {
  initializeChart()
  updateChart()
})
</script>
```

### 2. Using useD3 Composable

Leveraging the custom D3 composable for better lifecycle management:

```vue
<template>
  <div ref="containerRef" class="chart-container">
    <div v-if="!isReady" class="loading">Loading chart...</div>
  </div>
</template>

<script setup lang="ts">
import { useD3 } from '@/composables/useD3'
import { watch } from 'vue'

const props = defineProps<{
  data: DataPoint[]
}>()

const containerRef = ref<HTMLElement>()
const { 
  dimensions, 
  isReady, 
  createSVG, 
  createTransition 
} = useD3(containerRef)

const renderChart = () => {
  if (!isReady.value || !props.data.length) return

  const { svg, g } = createSVG({
    margin: { top: 20, right: 20, bottom: 30, left: 40 }
  })

  const xScale = d3.scaleLinear()
    .domain(d3.extent(props.data, d => d.x))
    .range([0, dimensions.value.width - 60])

  const yScale = d3.scaleLinear()
    .domain(d3.extent(props.data, d => d.y))
    .range([dimensions.value.height - 50, 0])

  // Render data with transitions
  g.selectAll('.circle')
    .data(props.data)
    .join('circle')
    .attr('class', 'circle')
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))
    .attr('r', 5)
    .transition(createTransition())
    .style('opacity', 1)
}

watch([isReady, () => props.data], renderChart, { immediate: true })
</script>
```

## Lifecycle Management

### 1. Advanced D3 Lifecycle Composable

```typescript
// composables/useD3Advanced.ts
import { ref, onMounted, onUnmounted, watch, computed, Ref } from 'vue'
import * as d3 from 'd3'

interface D3AdvancedOptions {
  responsive?: boolean
  debounceResize?: number
  enableZoom?: boolean
  enableBrush?: boolean
  margin?: { top: number; right: number; bottom: number; left: number }
}

export function useD3Advanced(
  containerRef: Ref<HTMLElement | null>,
  options: D3AdvancedOptions = {}
) {
  const {
    responsive = true,
    debounceResize = 250,
    enableZoom = false,
    enableBrush = false,
    margin = { top: 20, right: 20, bottom: 30, left: 40 }
  } = options

  // State
  const dimensions = ref({ width: 0, height: 0 })
  const isReady = ref(false)
  const zoomTransform = ref(d3.zoomIdentity)
  const brushSelection = ref<[[number, number], [number, number]] | null>(null)

  // D3 selections and utilities
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  let chartGroup: d3.Selection<SVGGElement, unknown, null, undefined>
  let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>
  let brushBehavior: d3.BrushBehavior<unknown>
  let resizeObserver: ResizeObserver | null = null
  let resizeTimeout: number | null = null

  // Computed properties
  const chartDimensions = computed(() => ({
    width: dimensions.value.width - margin.left - margin.right,
    height: dimensions.value.height - margin.top - margin.bottom
  }))

  const transforms = computed(() => ({
    zoom: zoomTransform.value,
    brush: brushSelection.value
  }))

  // Setup functions
  const updateDimensions = () => {
    if (!containerRef.value) return

    const rect = containerRef.value.getBoundingClientRect()
    dimensions.value = {
      width: rect.width,
      height: rect.height
    }
  }

  const setupResizeObserver = () => {
    if (!responsive || !containerRef.value || !window.ResizeObserver) return

    resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      
      resizeTimeout = setTimeout(() => {
        updateDimensions()
      }, debounceResize)
    })

    resizeObserver.observe(containerRef.value)
  }

  const createSVG = () => {
    if (!containerRef.value) return null

    // Remove existing SVG
    d3.select(containerRef.value).select('svg').remove()

    // Create new SVG
    svg = d3.select(containerRef.value)
      .append('svg')
      .attr('width', dimensions.value.width)
      .attr('height', dimensions.value.height)
      .attr('viewBox', `0 0 ${dimensions.value.width} ${dimensions.value.height}`)

    // Create main chart group
    chartGroup = svg.append('g')
      .attr('class', 'chart-group')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)

    // Setup zoom if enabled
    if (enableZoom) {
      setupZoom()
    }

    // Setup brush if enabled
    if (enableBrush) {
      setupBrush()
    }

    isReady.value = true
    return { svg, chartGroup }
  }

  const setupZoom = () => {
    if (!svg) return

    zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        zoomTransform.value = event.transform
        chartGroup.attr('transform', 
          `translate(${margin.left}, ${margin.top}) ${event.transform}`
        )
      })

    svg.call(zoomBehavior)
  }

  const setupBrush = () => {
    if (!chartGroup) return

    brushBehavior = d3.brush()
      .extent([[0, 0], [chartDimensions.value.width, chartDimensions.value.height]])
      .on('end', (event) => {
        brushSelection.value = event.selection
      })

    chartGroup.append('g')
      .attr('class', 'brush')
      .call(brushBehavior)
  }

  // Utility functions
  const createTransition = (duration = 750, ease = d3.easeQuadInOut) => {
    return d3.transition()
      .duration(duration)
      .ease(ease)
  }

  const resetZoom = () => {
    if (svg && zoomBehavior) {
      svg.transition()
        .duration(750)
        .call(zoomBehavior.transform, d3.zoomIdentity)
    }
  }

  const clearBrush = () => {
    if (chartGroup) {
      chartGroup.select('.brush').call(brushBehavior.clear)
    }
  }

  const cleanup = () => {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    
    if (resizeTimeout) {
      clearTimeout(resizeTimeout)
      resizeTimeout = null
    }

    if (containerRef.value) {
      d3.select(containerRef.value).selectAll('*').remove()
    }

    isReady.value = false
  }

  // Lifecycle
  onMounted(() => {
    updateDimensions()
    setupResizeObserver()
    createSVG()
  })

  onUnmounted(cleanup)

  // Watch for dimension changes
  watch(dimensions, () => {
    if (isReady.value) {
      createSVG()
    }
  }, { deep: true })

  return {
    // State
    dimensions,
    chartDimensions,
    isReady,
    transforms,

    // SVG elements
    svg: computed(() => svg),
    chartGroup: computed(() => chartGroup),

    // Methods
    createSVG,
    createTransition,
    updateDimensions,
    resetZoom,
    clearBrush,
    cleanup
  }
}
```

## Reactive Data Binding

### 1. Data-Driven D3 Updates

Pattern for reactive D3 updates with Vue data:

```typescript
// composables/useD3DataBinding.ts
import { watch, computed, Ref } from 'vue'
import * as d3 from 'd3'

interface DataBindingOptions<T> {
  keyFunction?: (d: T, i: number) => string | number
  enterDuration?: number
  updateDuration?: number
  exitDuration?: number
  staggerDelay?: number
}

export function useD3DataBinding<T>(
  svg: Ref<d3.Selection<SVGSVGElement, unknown, null, undefined> | undefined>,
  data: Ref<T[]>,
  selector: string,
  options: DataBindingOptions<T> = {}
) {
  const {
    keyFunction,
    enterDuration = 750,
    updateDuration = 500,
    exitDuration = 300,
    staggerDelay = 50
  } = options

  const processedData = computed(() => {
    return data.value.map((d, i) => ({
      ...d,
      __key: keyFunction ? keyFunction(d, i) : i
    }))
  })

  const update = (renderFunction: (
    enter: d3.Selection<d3.EnterElement, T, d3.BaseType, unknown>,
    update: d3.Selection<d3.BaseType, T, d3.BaseType, unknown>,
    exit: d3.Selection<d3.BaseType, T, d3.BaseType, unknown>
  ) => void) => {
    if (!svg.value) return

    const selection = svg.value
      .selectAll(selector)
      .data(processedData.value, (d: any) => d.__key)

    const enter = selection.enter()
    const update = selection
    const exit = selection.exit()

    // Apply staggered animations
    enter
      .style('opacity', 0)
      .transition()
      .delay((d, i) => i * staggerDelay)
      .duration(enterDuration)
      .style('opacity', 1)

    update
      .transition()
      .duration(updateDuration)

    exit
      .transition()
      .duration(exitDuration)
      .style('opacity', 0)
      .remove()

    renderFunction(enter, update, exit)
  }

  watch(processedData, () => update, { immediate: true, deep: true })

  return { update, processedData }
}
```

### 2. Reactive Scales

```typescript
// composables/useD3Scales.ts
import { computed, Ref } from 'vue'
import * as d3 from 'd3'

export function useD3Scales<T>(
  data: Ref<T[]>,
  dimensions: Ref<{ width: number; height: number }>,
  accessors: {
    x: (d: T) => number | Date
    y: (d: T) => number
    color?: (d: T) => string | number
  }
) {
  const xScale = computed(() => {
    const domain = d3.extent(data.value, accessors.x) as [number | Date, number | Date]
    const range = [0, dimensions.value.width]
    
    if (domain[0] instanceof Date) {
      return d3.scaleTime()
        .domain(domain as [Date, Date])
        .range(range)
    } else {
      return d3.scaleLinear()
        .domain(domain as [number, number])
        .range(range)
    }
  })

  const yScale = computed(() => {
    return d3.scaleLinear()
      .domain(d3.extent(data.value, accessors.y) as [number, number])
      .range([dimensions.value.height, 0])
  })

  const colorScale = computed(() => {
    if (!accessors.color) return null

    const domain = Array.from(new Set(data.value.map(accessors.color)))
    
    if (typeof domain[0] === 'string') {
      return d3.scaleOrdinal()
        .domain(domain as string[])
        .range(d3.schemeCategory10)
    } else {
      return d3.scaleSequential()
        .domain(d3.extent(domain as number[]) as [number, number])
        .interpolator(d3.interpolateViridis)
    }
  })

  return {
    xScale,
    yScale,
    colorScale
  }
}
```

## Performance Optimization

### 1. Canvas Rendering for Large Datasets

```vue
<template>
  <div ref="containerRef" class="chart-container">
    <canvas ref="canvasRef" :width="width" :height="height"></canvas>
    <svg ref="svgRef" :width="width" :height="height" class="overlay"></svg>
  </div>
</template>

<script setup lang="ts">
import { useCanvasD3 } from '@/composables/useCanvasD3'

const props = defineProps<{
  data: DataPoint[]
  width: number
  height: number
}>()

const containerRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()
const svgRef = ref<SVGSVGElement>()

const { renderToCanvas, renderOverlay } = useCanvasD3(
  canvasRef,
  svgRef,
  props
)

watch(() => props.data, () => {
  renderToCanvas(props.data)
  renderOverlay(props.data)
}, { immediate: true })
</script>
```

```typescript
// composables/useCanvasD3.ts
export function useCanvasD3(
  canvasRef: Ref<HTMLCanvasElement | null>,
  svgRef: Ref<SVGSVGElement | null>,
  props: any
) {
  const renderToCanvas = (data: DataPoint[]) => {
    if (!canvasRef.value) return

    const canvas = canvasRef.value
    const context = canvas.getContext('2d')!
    
    // Clear canvas
    context.clearRect(0, 0, props.width, props.height)

    // Setup scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.x) as [number, number])
      .range([50, props.width - 50])

    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.y) as [number, number])
      .range([props.height - 50, 50])

    // Render data points
    context.fillStyle = '#3b82f6'
    data.forEach(d => {
      context.beginPath()
      context.arc(xScale(d.x), yScale(d.y), 3, 0, 2 * Math.PI)
      context.fill()
    })
  }

  const renderOverlay = (data: DataPoint[]) => {
    if (!svgRef.value) return

    const svg = d3.select(svgRef.value)
    
    // Render axes and interactive elements on SVG overlay
    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.x) as [number, number])
      .range([50, props.width - 50])

    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.y) as [number, number])
      .range([props.height - 50, 50])

    // X axis
    svg.select('.x-axis').remove()
    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${props.height - 50})`)
      .call(d3.axisBottom(xScale))

    // Y axis
    svg.select('.y-axis').remove()
    svg.append('g')
      .attr('class', 'y-axis')
      .attr('transform', 'translate(50, 0)')
      .call(d3.axisLeft(yScale))
  }

  return {
    renderToCanvas,
    renderOverlay
  }
}
```

### 2. Virtual Scrolling with D3

```typescript
// composables/useD3VirtualScroll.ts
export function useD3VirtualScroll<T>(
  data: Ref<T[]>,
  itemHeight: number,
  containerHeight: number
) {
  const scrollTop = ref(0)
  const visibleRange = computed(() => {
    const start = Math.floor(scrollTop.value / itemHeight)
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + 1,
      data.value.length
    )
    return { start, end }
  })

  const visibleData = computed(() => {
    const { start, end } = visibleRange.value
    return data.value.slice(start, end).map((item, index) => ({
      ...item,
      index: start + index,
      y: (start + index) * itemHeight
    }))
  })

  const totalHeight = computed(() => data.value.length * itemHeight)

  return {
    scrollTop,
    visibleData,
    totalHeight,
    visibleRange
  }
}
```

## Advanced Patterns

### 1. Multi-Chart Coordination

```typescript
// composables/useChartCoordination.ts
export function useChartCoordination() {
  const charts = ref<Map<string, any>>(new Map())
  const sharedState = ref({
    brushSelection: null,
    hoveredData: null,
    selectedItems: new Set()
  })

  const registerChart = (id: string, chartInstance: any) => {
    charts.value.set(id, chartInstance)
  }

  const unregisterChart = (id: string) => {
    charts.value.delete(id)
  }

  const broadcastBrushSelection = (selection: any, sourceChartId: string) => {
    sharedState.value.brushSelection = selection
    
    charts.value.forEach((chart, id) => {
      if (id !== sourceChartId && chart.setBrushSelection) {
        chart.setBrushSelection(selection)
      }
    })
  }

  const broadcastHover = (data: any, sourceChartId: string) => {
    sharedState.value.hoveredData = data
    
    charts.value.forEach((chart, id) => {
      if (id !== sourceChartId && chart.setHoveredData) {
        chart.setHoveredData(data)
      }
    })
  }

  return {
    registerChart,
    unregisterChart,
    broadcastBrushSelection,
    broadcastHover,
    sharedState
  }
}
```

### 2. D3 Plugin System

```typescript
// composables/useD3Plugins.ts
interface D3Plugin {
  name: string
  setup: (context: D3PluginContext) => any
  update?: (context: D3PluginContext) => void
  cleanup?: () => void
}

interface D3PluginContext {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  data: any[]
  scales: { x: any; y: any; color?: any }
  dimensions: { width: number; height: number }
}

export function useD3Plugins() {
  const plugins = ref<D3Plugin[]>([])
  const pluginInstances = ref<Map<string, any>>(new Map())

  const use = (plugin: D3Plugin) => {
    plugins.value.push(plugin)
  }

  const setupPlugins = (context: D3PluginContext) => {
    plugins.value.forEach(plugin => {
      const instance = plugin.setup(context)
      pluginInstances.value.set(plugin.name, instance)
    })
  }

  const updatePlugins = (context: D3PluginContext) => {
    plugins.value.forEach(plugin => {
      if (plugin.update) {
        plugin.update(context)
      }
    })
  }

  const cleanupPlugins = () => {
    plugins.value.forEach(plugin => {
      if (plugin.cleanup) {
        plugin.cleanup()
      }
    })
    pluginInstances.value.clear()
  }

  return {
    use,
    setupPlugins,
    updatePlugins,
    cleanupPlugins,
    pluginInstances
  }
}

// Example plugins
export const tooltipPlugin: D3Plugin = {
  name: 'tooltip',
  setup: (context) => {
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)

    return {
      show: (data: any, event: MouseEvent) => {
        tooltip.transition()
          .duration(200)
          .style('opacity', .9)
        tooltip.html(`Value: ${data.value}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px')
      },
      hide: () => {
        tooltip.transition()
          .duration(500)
          .style('opacity', 0)
      }
    }
  },
  cleanup: () => {
    d3.select('.tooltip').remove()
  }
}
```

## Error Handling

### 1. D3 Error Boundaries

```typescript
// composables/useD3ErrorHandling.ts
export function useD3ErrorHandling() {
  const errors = ref<Error[]>([])
  const hasErrors = computed(() => errors.value.length > 0)

  const wrapD3Operation = <T>(
    operation: () => T,
    errorMessage = 'D3 operation failed'
  ): T | null => {
    try {
      return operation()
    } catch (error) {
      console.error(errorMessage, error)
      errors.value.push(error as Error)
      return null
    }
  }

  const wrapD3AsyncOperation = async <T>(
    operation: () => Promise<T>,
    errorMessage = 'D3 async operation failed'
  ): Promise<T | null> => {
    try {
      return await operation()
    } catch (error) {
      console.error(errorMessage, error)
      errors.value.push(error as Error)
      return null
    }
  }

  const clearErrors = () => {
    errors.value = []
  }

  return {
    errors,
    hasErrors,
    wrapD3Operation,
    wrapD3AsyncOperation,
    clearErrors
  }
}
```

## Testing Strategies

### 1. Testing D3 Vue Components

```typescript
// tests/components/D3Chart.test.ts
import { mount } from '@vue/test-utils'
import D3Chart from '@/components/visualizations/D3Chart.vue'
import * as d3 from 'd3'

// Mock D3 selections
const mockSelection = {
  append: vi.fn().mockReturnThis(),
  attr: vi.fn().mockReturnThis(),
  selectAll: vi.fn().mockReturnThis(),
  data: vi.fn().mockReturnThis(),
  enter: vi.fn().mockReturnThis(),
  exit: vi.fn().mockReturnThis(),
  remove: vi.fn().mockReturnThis(),
  transition: vi.fn().mockReturnThis(),
  duration: vi.fn().mockReturnThis()
}

vi.mock('d3', () => ({
  select: vi.fn(() => mockSelection),
  scaleLinear: vi.fn(() => ({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis()
  })),
  extent: vi.fn(() => [0, 100]),
  axisBottom: vi.fn(),
  axisLeft: vi.fn()
}))

describe('D3Chart', () => {
  const mockData = [
    { x: 1, y: 10, label: 'A' },
    { x: 2, y: 20, label: 'B' },
    { x: 3, y: 30, label: 'C' }
  ]

  it('renders chart with data', async () => {
    const wrapper = mount(D3Chart, {
      props: {
        data: mockData,
        width: 400,
        height: 300
      }
    })

    await wrapper.vm.$nextTick()

    expect(d3.select).toHaveBeenCalled()
    expect(mockSelection.append).toHaveBeenCalledWith('svg')
  })

  it('updates chart when data changes', async () => {
    const wrapper = mount(D3Chart, {
      props: {
        data: mockData
      }
    })

    const newData = [...mockData, { x: 4, y: 40, label: 'D' }]
    await wrapper.setProps({ data: newData })

    expect(mockSelection.data).toHaveBeenCalledWith(newData)
  })
})
```

### 2. Integration Testing with Cypress

```typescript
// cypress/e2e/d3-chart.cy.ts
describe('D3 Chart Integration', () => {
  beforeEach(() => {
    cy.visit('/dashboard')
    cy.get('[data-testid="chart-container"]').should('be.visible')
  })

  it('renders chart with data', () => {
    cy.get('[data-testid="chart-container"] svg').should('exist')
    cy.get('[data-testid="chart-container"] .data-point').should('have.length.greaterThan', 0)
  })

  it('updates chart on data filter', () => {
    cy.get('[data-testid="country-filter"]').select('Brazil')
    cy.get('[data-testid="chart-container"] .data-point').should('have.length.lessThan', 50)
  })

  it('handles interactions', () => {
    cy.get('[data-testid="chart-container"] .data-point').first().click()
    cy.get('[data-testid="tooltip"]').should('be.visible')
  })
})
```

## Best Practices

### 1. Performance Guidelines

- **Use canvas for >1000 data points**
- **Implement virtual scrolling for large lists**
- **Debounce resize and data updates**
- **Cache expensive computations**
- **Use object constancy for smooth transitions**

### 2. Code Organization

- **Separate D3 logic into composables**
- **Use TypeScript for type safety**
- **Follow Vue lifecycle patterns**
- **Implement proper cleanup**
- **Handle errors gracefully**

### 3. Accessibility

- **Add ARIA labels and roles**
- **Implement keyboard navigation**
- **Provide alternative text descriptions**
- **Ensure sufficient color contrast**
- **Support screen readers**

### 4. Testing

- **Mock D3 selections in unit tests**
- **Test reactive data updates**
- **Verify cleanup on unmount**
- **Use visual regression testing**
- **Test performance with large datasets**

This comprehensive guide provides the foundation for effectively integrating D3.js with Vue.js 3 in modern web applications.