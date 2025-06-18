# Vue.js Style Guide & Best Practices

## Overview

This document outlines coding standards, best practices, and architectural patterns for the D2 Nutrition Vibes Vue.js application.

## Table of Contents

1. [General Principles](#general-principles)
2. [Vue.js Component Standards](#vuejs-component-standards)
3. [Composition API Patterns](#composition-api-patterns)
4. [TypeScript Integration](#typescript-integration)
5. [TailwindCSS Guidelines](#tailwindcss-guidelines)
6. [D3.js Integration](#d3js-integration)
7. [State Management](#state-management)
8. [Testing Practices](#testing-practices)
9. [Performance Guidelines](#performance-guidelines)
10. [Code Organization](#code-organization)

## General Principles

### 1. Code Clarity
- Write self-documenting code with meaningful variable and function names
- Use TypeScript for enhanced type safety and developer experience
- Follow consistent naming conventions throughout the codebase

### 2. Maintainability
- Keep components small and focused on a single responsibility
- Use composition over inheritance
- Implement proper error handling and validation

### 3. Performance
- Implement lazy loading for routes and heavy components
- Use virtual scrolling for large datasets
- Optimize D3.js rendering with canvas for complex visualizations

## Vue.js Component Standards

### Component Structure

```vue
<template>
  <!-- Use semantic HTML elements -->
  <main class="component-container">
    <!-- Component content -->
  </main>
</template>

<script setup>
// 1. Vue imports
import { ref, computed, watch, onMounted } from 'vue'

// 2. Third-party imports
import * as d3 from 'd3'

// 3. Internal composables
import { useDataLoader } from '@/composables/useDataLoader'

// 4. Internal components
import BaseButton from '@/components/ui/BaseButton.vue'

// 5. Props definition with TypeScript
interface Props {
  data: DataItem[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// 6. Emits definition
const emit = defineEmits<{
  update: [value: string]
  error: [error: Error]
}>()

// 7. Reactive state
const localState = ref('')
const computedValue = computed(() => {
  return props.data.length > 0
})

// 8. Composables
const { loadData, isLoading } = useDataLoader()

// 9. Methods
const handleAction = () => {
  emit('update', localState.value)
}

// 10. Lifecycle hooks
onMounted(() => {
  loadData()
})

// 11. Watchers
watch(() => props.data, (newData) => {
  // Handle data changes
}, { deep: true })
</script>

<style scoped>
/* Use TailwindCSS classes primarily */
/* Only add custom CSS when absolutely necessary */
.component-container {
  /* Custom styles go here */
}
</style>
```

### Naming Conventions

#### Components
- Use PascalCase for component names
- Be descriptive and specific
- Include the component type suffix

```javascript
// ✅ Good
BaseButton.vue
DataVisualization.vue
UserProfileCard.vue

// ❌ Bad
button.vue
viz.vue
card.vue
```

#### Props and Variables
- Use camelCase for props, variables, and methods
- Be descriptive and avoid abbreviations

```javascript
// ✅ Good
const userData = ref({})
const isLoadingData = ref(false)
const handleUserInteraction = () => {}

// ❌ Bad
const data = ref({})
const loading = ref(false)
const handle = () => {}
```

#### Events
- Use kebab-case for custom events
- Use descriptive action names

```javascript
// ✅ Good
emit('user-selected', user)
emit('data-loading-started')
emit('chart-zoom-changed', zoomLevel)

// ❌ Bad
emit('select', user)
emit('loading')
emit('zoom', zoomLevel)
```

### Props Definition

Always use TypeScript interfaces for props:

```typescript
interface ChartProps {
  data: DataPoint[]
  width?: number
  height?: number
  colorScheme?: 'light' | 'dark'
  onDataPointClick?: (point: DataPoint) => void
}

const props = withDefaults(defineProps<ChartProps>(), {
  width: 800,
  height: 400,
  colorScheme: 'light'
})
```

## Composition API Patterns

### Composable Design

Create focused, reusable composables:

```typescript
// useDataVisualization.ts
export function useDataVisualization(options: VisualizationOptions) {
  const chartData = ref([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  const processData = async (rawData: RawData[]) => {
    isLoading.value = true
    try {
      chartData.value = await transformData(rawData)
    } catch (err) {
      error.value = err as Error
    } finally {
      isLoading.value = false
    }
  }

  const exportData = (format: 'csv' | 'json') => {
    // Export logic
  }

  return {
    chartData,
    isLoading,
    error,
    processData,
    exportData
  }
}
```

### Reactive Patterns

Use computed properties for derived state:

```typescript
const filteredData = computed(() => {
  return props.data.filter(item => 
    item.category === selectedCategory.value &&
    item.value >= minValue.value
  )
})

const chartConfig = computed(() => ({
  width: containerWidth.value - margin.left - margin.right,
  height: containerHeight.value - margin.top - margin.bottom,
  colorScale: getColorScale(props.colorScheme)
}))
```

### Watchers Best Practices

Use specific watchers with proper options:

```typescript
// Watch specific reactive properties
watch(() => props.data, (newData, oldData) => {
  if (newData !== oldData) {
    processNewData(newData)
  }
}, { 
  immediate: true,
  deep: false // Avoid deep watching unless necessary
})

// Watch multiple sources
watchEffect(() => {
  if (containerRef.value && props.data.length > 0) {
    renderVisualization()
  }
})
```

## TypeScript Integration

### Type Definitions

Create comprehensive type definitions:

```typescript
// types/data.ts
export interface DataPoint {
  id: string
  timestamp: Date
  value: number
  category: string
  metadata?: Record<string, unknown>
}

export interface ChartDimensions {
  width: number
  height: number
  margin: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export type ColorScheme = 'viridis' | 'plasma' | 'cool' | 'warm'
export type ChartType = 'line' | 'bar' | 'scatter' | 'heatmap'
```

### Generic Composables

Use generics for reusable composables:

```typescript
export function useDataProcessor<T, R>(
  processor: (data: T[]) => R[]
) {
  const processedData = ref<R[]>([])
  
  const process = (inputData: T[]) => {
    processedData.value = processor(inputData)
  }
  
  return {
    processedData,
    process
  }
}
```

## TailwindCSS Guidelines

### Class Organization

Organize classes by category:

```vue
<template>
  <!-- Layout → Typography → Colors → Effects -->
  <div class="
    flex flex-col items-center justify-center p-4 
    text-lg font-semibold 
    bg-white text-gray-900 
    shadow-lg rounded-lg hover:shadow-xl
    transition-shadow duration-200
  ">
    Content
  </div>
</template>
```

### Component Variants

Use computed classes for dynamic styling:

```typescript
const buttonClasses = computed(() => [
  'px-4 py-2 rounded font-medium transition-colors',
  {
    'bg-blue-600 hover:bg-blue-700 text-white': props.variant === 'primary',
    'bg-gray-200 hover:bg-gray-300 text-gray-900': props.variant === 'secondary',
    'bg-red-600 hover:bg-red-700 text-white': props.variant === 'danger'
  },
  {
    'opacity-50 cursor-not-allowed': props.disabled
  }
])
```

### Responsive Design

Follow mobile-first approach:

```vue
<template>
  <div class="
    grid grid-cols-1 gap-4
    md:grid-cols-2 md:gap-6
    lg:grid-cols-3 lg:gap-8
    xl:grid-cols-4
  ">
    <!-- Grid items -->
  </div>
</template>
```

## D3.js Integration

### D3 with Vue Lifecycle

```typescript
import { useD3 } from '@/composables/useD3'

export default defineComponent({
  setup() {
    const containerRef = ref<HTMLElement>()
    const { createSVG, cleanup } = useD3(containerRef)

    const renderChart = () => {
      const { svg, g } = createSVG({
        width: 800,
        height: 400,
        margin: { top: 20, right: 20, bottom: 30, left: 40 }
      })

      // D3 rendering logic
      g.selectAll('.bar')
        .data(chartData.value)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        // ... other attributes
    }

    onMounted(() => {
      renderChart()
    })

    onUnmounted(() => {
      cleanup()
    })

    return {
      containerRef
    }
  }
})
```

### Reactive D3 Updates

```typescript
watch(() => props.data, (newData) => {
  if (!containerRef.value) return

  const svg = d3.select(containerRef.value).select('svg')
  
  const bars = svg.selectAll('.bar')
    .data(newData, d => d.id) // Key function for object constancy

  // Update existing elements
  bars.transition()
    .duration(750)
    .attr('height', d => yScale(d.value))

  // Add new elements
  bars.enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('height', 0)
    .transition()
    .duration(750)
    .attr('height', d => yScale(d.value))

  // Remove old elements
  bars.exit()
    .transition()
    .duration(750)
    .attr('height', 0)
    .remove()
}, { deep: true })
```

## State Management

### Pinia Store Structure

```typescript
// stores/dataStore.ts
export const useDataStore = defineStore('data', () => {
  // State
  const datasets = ref<Dataset[]>([])
  const selectedDataset = ref<Dataset | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const filteredDatasets = computed(() => 
    datasets.value.filter(ds => ds.isActive)
  )

  const datasetById = computed(() => (id: string) =>
    datasets.value.find(ds => ds.id === id)
  )

  // Actions
  const loadDatasets = async () => {
    isLoading.value = true
    try {
      const response = await dataService.fetchDatasets()
      datasets.value = response.data
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  const selectDataset = (dataset: Dataset) => {
    selectedDataset.value = dataset
  }

  return {
    // State
    datasets,
    selectedDataset,
    isLoading,
    error,
    // Getters
    filteredDatasets,
    datasetById,
    // Actions
    loadDatasets,
    selectDataset
  }
})
```

## Testing Practices

### Component Testing

```typescript
// BaseButton.test.ts
import { mount } from '@vue/test-utils'
import BaseButton from '@/components/ui/BaseButton.vue'

describe('BaseButton', () => {
  it('renders with correct variant classes', () => {
    const wrapper = mount(BaseButton, {
      props: {
        variant: 'primary'
      },
      slots: {
        default: 'Click me'
      }
    })

    expect(wrapper.classes()).toContain('bg-blue-600')
    expect(wrapper.text()).toBe('Click me')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(BaseButton)
    
    await wrapper.trigger('click')
    
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
```

### Composable Testing

```typescript
// useDataLoader.test.ts
import { useDataLoader } from '@/composables/useDataLoader'

describe('useDataLoader', () => {
  it('loads data successfully', async () => {
    const { data, isLoading, loadData } = useDataLoader()

    expect(isLoading.value).toBe(false)
    
    const promise = loadData('test-url')
    expect(isLoading.value).toBe(true)
    
    await promise
    expect(isLoading.value).toBe(false)
    expect(data.value).toBeDefined()
  })
})
```

## Performance Guidelines

### Component Optimization

```typescript
// Use shallow refs for large objects
const chartData = shallowRef([])

// Memoize expensive computations
const expensiveComputation = computed(() => {
  return complexCalculation(props.data)
})

// Use v-memo for expensive list rendering
<template>
  <div v-for="item in items" :key="item.id" v-memo="[item.id, item.updatedAt]">
    <ExpensiveComponent :data="item" />
  </div>
</template>
```

### Lazy Loading

```typescript
// Route-level code splitting
const Dashboard = () => import('@/views/DashboardView.vue')
const Analytics = () => import('@/views/AnalyticsView.vue')

// Component-level lazy loading
const HeavyChart = defineAsyncComponent({
  loader: () => import('@/components/visualizations/HeavyChart.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorComponent,
  delay: 200,
  timeout: 3000
})
```

## Code Organization

### File Structure

```
src/
├── components/
│   ├── layout/          # Layout components
│   ├── ui/              # Reusable UI components
│   ├── visualizations/  # D3.js visualization components
│   └── panels/          # Application panels
├── composables/         # Vue composables
├── stores/              # Pinia stores
├── services/            # API and data services
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
└── assets/              # Static assets
```

### Import Organization

```typescript
// 1. Vue core
import { ref, computed, watch } from 'vue'

// 2. Vue ecosystem
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

// 3. Third-party libraries
import * as d3 from 'd3'
import { debounce } from 'lodash-es'

// 4. Internal composables
import { useDataLoader } from '@/composables/useDataLoader'

// 5. Internal components
import BaseButton from '@/components/ui/BaseButton.vue'

// 6. Types
import type { ChartData, DataPoint } from '@/types/data'
```

## Error Handling

### Component Error Boundaries

```vue
<template>
  <Suspense>
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <LoadingSpinner />
    </template>
  </Suspense>
</template>

<script setup>
import { onErrorCaptured } from 'vue'

onErrorCaptured((error, instance, info) => {
  console.error('Component error:', error, info)
  // Send to error reporting service
  return false // Prevent error from propagating
})
</script>
```

### Async Error Handling

```typescript
const handleAsyncOperation = async () => {
  try {
    isLoading.value = true
    const result = await riskyOperation()
    data.value = result
  } catch (error) {
    errorMessage.value = error.message
    console.error('Operation failed:', error)
  } finally {
    isLoading.value = false
  }
}
```

## Accessibility Guidelines

### Semantic HTML

```vue
<template>
  <main role="main" aria-label="Data visualization dashboard">
    <section aria-labelledby="chart-title">
      <h2 id="chart-title">Agricultural Production Trends</h2>
      <div role="img" aria-label="Interactive chart showing production data">
        <!-- Chart content -->
      </div>
    </section>
  </main>
</template>
```

### Keyboard Navigation

```typescript
const handleKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'Enter':
    case ' ':
      handleSelection()
      event.preventDefault()
      break
    case 'Escape':
      closeModal()
      break
  }
}
```

This style guide ensures consistent, maintainable, and performant Vue.js code across the D2 Nutrition Vibes application.