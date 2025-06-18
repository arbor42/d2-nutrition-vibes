import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import MLPanel from '@/components/panels/MLPanel.vue'

// Mock the composables
vi.mock('@/composables/useErrorHandling', () => ({
  useErrorHandling: () => ({
    handleError: vi.fn(),
    wrapAsync: (fn) => fn,
  })
}))

vi.mock('@/stores/useDataStore', () => ({
  useDataStore: () => ({
    loadMLForecast: vi.fn().mockResolvedValue({
      predictions: [
        { year: 2024, value: 100 },
        { year: 2025, value: 105 }
      ]
    })
  })
}))

// Mock child components
vi.mock('@/components/ui/ErrorBoundary.vue', () => ({
  name: 'ErrorBoundary',
  template: '<div><slot /></div>'
}))

vi.mock('@/components/ui/LoadingSpinner.vue', () => ({
  name: 'LoadingSpinner',
  template: '<div class="loading-spinner">Loading...</div>',
  props: ['size']
}))

vi.mock('@/components/visualizations/MLChart.vue', () => ({
  name: 'MLChart',
  template: '<div class="ml-chart">ML Chart</div>',
  props: ['data', 'config'],
  emits: ['prediction-select', 'confidence-toggle']
}))

describe('MLPanel', () => {
  let wrapper
  
  beforeEach(() => {
    wrapper = mount(MLPanel, {
      global: {
        plugins: [createPinia()],
        stubs: {
          SearchableSelect: {
            template: '<select><option>Mock Select</option></select>',
            props: ['modelValue', 'options', 'placeholder'],
            emits: ['update:modelValue']
          },
          BaseButton: {
            template: '<button><slot /></button>',
            props: ['disabled'],
            emits: ['click']
          }
        }
      }
    })
  })

  it('renders the panel title and description', () => {
    expect(wrapper.find('.panel-title').text()).toBe('ML Prognosen')
    expect(wrapper.find('.panel-description').text()).toContain('Machine Learning')
  })

  it('shows filter controls', () => {
    expect(wrapper.find('[data-testid="region-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="product-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="model-select"]').exists()).toBe(true)
  })

  it('displays loading state initially', async () => {
    // Component should load predictions on mount
    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
  })

  it('shows empty state when no predictions', async () => {
    await wrapper.setData({ predictions: [] })
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.empty-state h3').text()).toBe('Keine Prognosen verfügbar')
  })

  it('displays model statistics when predictions loaded', async () => {
    await wrapper.setData({ 
      predictions: [
        { year: 2024, predicted_value: 100, reliability: 85 }
      ],
      modelStats: {
        accuracy: '92.5',
        rmse: '15.2',
        mae: '8.7',
        r2: '0.856'
      }
    })
    await wrapper.vm.$nextTick()
    
    const statsGrid = wrapper.find('.stats-grid')
    expect(statsGrid.exists()).toBe(true)
    expect(statsGrid.text()).toContain('92.5%')
    expect(statsGrid.text()).toContain('15.2')
  })

  it('renders predictions table with correct data', async () => {
    const predictions = [
      {
        year: 2024,
        predicted_value: 1000,
        confidence_lower: 900,
        confidence_upper: 1100,
        trend: 5.2,
        reliability: 87
      },
      {
        year: 2025,
        predicted_value: 1050,
        confidence_lower: 945,
        confidence_upper: 1155,
        trend: -2.1,
        reliability: 82
      }
    ]
    
    await wrapper.setData({ predictions })
    await wrapper.vm.$nextTick()
    
    const table = wrapper.find('.predictions-table-element')
    expect(table.exists()).toBe(true)
    
    const rows = table.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    
    // Check first row data
    const firstRow = rows[0]
    expect(firstRow.text()).toContain('2024')
    expect(firstRow.text()).toContain('1.000')
    expect(firstRow.text()).toContain('+5.2%')
  })

  it('formats trend values correctly', () => {
    const vm = wrapper.vm
    
    expect(vm.formatTrend(5.2)).toBe('+5.2%')
    expect(vm.formatTrend(-3.1)).toBe('-3.1%')
    expect(vm.formatTrend(0)).toBe('+0.0%')
  })

  it('applies correct CSS classes for trend values', () => {
    const vm = wrapper.vm
    
    expect(vm.getTrendClass(5.2)).toBe('text-green-600')
    expect(vm.getTrendClass(-3.1)).toBe('text-red-600')
    expect(vm.getTrendClass(0)).toBe('text-gray-600')
  })

  it('applies correct CSS classes for reliability values', () => {
    const vm = wrapper.vm
    
    expect(vm.getReliabilityClass(95)).toBe('bg-green-500')
    expect(vm.getReliabilityClass(80)).toBe('bg-yellow-500')
    expect(vm.getReliabilityClass(65)).toBe('bg-red-500')
  })

  it('loads predictions when filters change', async () => {
    const loadPredictionsSpy = vi.spyOn(wrapper.vm, 'loadPredictions')
    
    await wrapper.setData({ selectedRegion: 'europe' })
    await wrapper.vm.$nextTick()
    
    expect(loadPredictionsSpy).toHaveBeenCalled()
  })

  it('handles error state correctly', async () => {
    const error = new Error('Failed to load predictions')
    await wrapper.setData({ error })
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('[data-testid="error-display"]').exists()).toBe(true)
  })

  it('renders ML chart when predictions exist', async () => {
    await wrapper.setData({ 
      predictions: [{ year: 2024, predicted_value: 100 }]
    })
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.ml-chart').exists()).toBe(true)
  })
})