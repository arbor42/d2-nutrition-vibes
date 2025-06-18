import { config } from '@vue/test-utils'
import { createPinia } from 'pinia'

// Global test setup
config.global.plugins = [createPinia()]

// Mock window.ResizeObserver for D3.js tests
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb
  }
  observe() {
    this.cb([{ borderBoxSize: { inlineSize: 0, blockSize: 0 } }], this)
  }
  unobserve() {}
  disconnect() {}
}

// Mock SVG methods for D3.js
Object.defineProperty(SVGElement.prototype, 'getBBox', {
  value: () => ({ x: 0, y: 0, width: 100, height: 100 }),
  writable: true
})

Object.defineProperty(SVGElement.prototype, 'getBoundingClientRect', {
  value: () => ({ x: 0, y: 0, width: 100, height: 100, top: 0, left: 0, bottom: 100, right: 100 }),
  writable: true
})

// Mock canvas for visualization tests
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
}))

// Global test utilities
global.testUtils = {
  createMockData: () => ({
    countries: ['Germany', 'France', 'Italy'],
    values: [100, 200, 150],
    years: [2020, 2021, 2022]
  })
}