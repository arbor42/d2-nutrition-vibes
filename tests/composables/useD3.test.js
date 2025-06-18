import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { useD3 } from '@/composables/useD3'
import * as d3 from 'd3'

// Mock D3 module
vi.mock('d3', () => ({
  select: vi.fn(),
  selectAll: vi.fn(),
  scaleLinear: vi.fn(() => ({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  })),
  axisBottom: vi.fn(),
  axisLeft: vi.fn(),
  line: vi.fn(() => ({
    x: vi.fn().mockReturnThis(),
    y: vi.fn().mockReturnThis(),
  })),
  extent: vi.fn(),
  max: vi.fn(),
  transition: vi.fn(() => ({
    duration: vi.fn().mockReturnThis(),
    ease: vi.fn().mockReturnThis(),
  })),
}))

describe('useD3 composable', () => {
  let container
  let mockSvg
  
  beforeEach(() => {
    // Create a mock DOM element
    container = document.createElement('div')
    document.body.appendChild(container)
    
    // Mock D3 selection
    mockSvg = {
      append: vi.fn().mockReturnThis(),
      attr: vi.fn().mockReturnThis(),
      style: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      data: vi.fn().mockReturnThis(),
      enter: vi.fn().mockReturnThis(),
      exit: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),
      transition: vi.fn().mockReturnThis(),
      duration: vi.fn().mockReturnThis(),
      call: vi.fn().mockReturnThis(),
      node: vi.fn(() => container),
    }
    
    d3.select.mockReturnValue(mockSvg)
  })
  
  afterEach(() => {
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  it('should initialize D3 container correctly', () => {
    const { initializeContainer } = useD3()
    const containerRef = ref(container)
    
    const svg = initializeContainer(containerRef, { width: 800, height: 400 })
    
    expect(d3.select).toHaveBeenCalledWith(container)
    expect(mockSvg.attr).toHaveBeenCalledWith('width', 800)
    expect(mockSvg.attr).toHaveBeenCalledWith('height', 400)
  })

  it('should create scales correctly', () => {
    const { createScale } = useD3()
    
    const scale = createScale('linear', [0, 100], [0, 400])
    
    expect(d3.scaleLinear).toHaveBeenCalled()
  })

  it('should handle data updates reactively', async () => {
    const { updateVisualization } = useD3()
    const data = ref([{ x: 1, y: 10 }, { x: 2, y: 20 }])
    
    updateVisualization(mockSvg, data, {
      selector: '.data-point',
      enterFn: vi.fn(),
      updateFn: vi.fn(),
      exitFn: vi.fn(),
    })
    
    expect(mockSvg.selectAll).toHaveBeenCalledWith('.data-point')
    expect(mockSvg.data).toHaveBeenCalled()
  })

  it('should cleanup D3 elements on unmount', () => {
    const { cleanup } = useD3()
    const svgRef = ref(mockSvg)
    
    cleanup(svgRef)
    
    expect(mockSvg.selectAll).toHaveBeenCalledWith('*')
    expect(mockSvg.remove).toHaveBeenCalled()
  })

  it('should handle responsive resizing', () => {
    const { handleResize } = useD3()
    const config = ref({ width: 800, height: 400 })
    
    // Simulate window resize
    global.innerWidth = 1200
    global.innerHeight = 800
    
    handleResize(mockSvg, config)
    
    expect(config.value.width).toBeGreaterThan(800)
  })

  it('should create smooth transitions', () => {
    const { createTransition } = useD3()
    
    const transition = createTransition(500, 'easeInOut')
    
    expect(d3.transition).toHaveBeenCalled()
  })

  it('should handle tooltip functionality', () => {
    const { setupTooltip } = useD3()
    
    const tooltip = setupTooltip(container, {
      className: 'custom-tooltip',
      offsetX: 10,
      offsetY: 10,
    })
    
    expect(d3.select).toHaveBeenCalled()
    expect(mockSvg.append).toHaveBeenCalledWith('div')
  })
})