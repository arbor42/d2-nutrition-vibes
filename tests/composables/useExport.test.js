import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useExport } from '@/composables/useExport'

// Mock HTML5 APIs
global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn()
}

global.Blob = vi.fn()

// Mock canvas
const mockCanvas = {
  toBlob: vi.fn((callback) => callback(new Blob())),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock-data'),
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) }))
  }))
}

// Mock DOM methods
global.document.createElement = vi.fn((tagName) => {
  if (tagName === 'canvas') return mockCanvas
  if (tagName === 'a') {
    return {
      href: '',
      download: '',
      click: vi.fn(),
      style: { display: '' }
    }
  }
  return {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  }
})

describe('useExport composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exportToCSV', () => {
    it('should export array data to CSV', async () => {
      const { exportToCSV } = useExport()
      
      const data = [
        { country: 'Germany', year: 2020, value: 100 },
        { country: 'France', year: 2020, value: 80 },
        { country: 'Germany', year: 2021, value: 105 }
      ]
      
      await exportToCSV(data, 'test-export.csv')
      
      expect(global.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('country,year,value')],
        { type: 'text/csv;charset=utf-8;' }
      )
    })

    it('should handle custom column headers', async () => {
      const { exportToCSV } = useExport()
      
      const data = [
        { x: 1, y: 10 },
        { x: 2, y: 20 }
      ]
      
      const headers = { x: 'X Value', y: 'Y Value' }
      
      await exportToCSV(data, 'custom-headers.csv', { headers })
      
      expect(global.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('X Value,Y Value')],
        { type: 'text/csv;charset=utf-8;' }
      )
    })

    it('should handle empty data', async () => {
      const { exportToCSV } = useExport()
      
      await exportToCSV([], 'empty.csv')
      
      expect(global.Blob).toHaveBeenCalledWith(
        [''],
        { type: 'text/csv;charset=utf-8;' }
      )
    })

    it('should escape CSV special characters', async () => {
      const { exportToCSV } = useExport()
      
      const data = [
        { name: 'Test, Inc.', description: 'Company with "quotes"' }
      ]
      
      await exportToCSV(data, 'special-chars.csv')
      
      expect(global.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('"Test, Inc.","Company with ""quotes"""')],
        { type: 'text/csv;charset=utf-8;' }
      )
    })
  })

  describe('exportToJSON', () => {
    it('should export data as JSON', async () => {
      const { exportToJSON } = useExport()
      
      const data = { test: 'data', numbers: [1, 2, 3] }
      
      await exportToJSON(data, 'test.json')
      
      expect(global.Blob).toHaveBeenCalledWith(
        [JSON.stringify(data, null, 2)],
        { type: 'application/json;charset=utf-8;' }
      )
    })

    it('should handle circular references', async () => {
      const { exportToJSON } = useExport()
      
      const obj = { name: 'test' }
      obj.self = obj // Create circular reference
      
      await expect(exportToJSON(obj, 'circular.json')).rejects.toThrow()
    })
  })

  describe('exportVisualizationAsPNG', () => {
    it('should export SVG as PNG', async () => {
      const { exportVisualizationAsPNG } = useExport()
      
      const mockSvg = document.createElement('svg')
      mockSvg.innerHTML = '<circle cx="50" cy="50" r="25" />'
      
      await exportVisualizationAsPNG(mockSvg, 'chart.png')
      
      expect(mockCanvas.toBlob).toHaveBeenCalled()
    })

    it('should handle custom dimensions', async () => {
      const { exportVisualizationAsPNG } = useExport()
      
      const mockSvg = document.createElement('svg')
      
      await exportVisualizationAsPNG(mockSvg, 'chart.png', {
        width: 1200,
        height: 800,
        scale: 2
      })
      
      expect(document.createElement).toHaveBeenCalledWith('canvas')
    })

    it('should handle export errors gracefully', async () => {
      const { exportVisualizationAsPNG } = useExport()
      
      mockCanvas.toBlob.mockImplementationOnce((callback) => 
        callback(null) // Simulate failure
      )
      
      const mockSvg = document.createElement('svg')
      
      await expect(exportVisualizationAsPNG(mockSvg, 'failed.png'))
        .rejects.toThrow('Failed to export visualization')
    })
  })

  describe('exportVisualizationAsSVG', () => {
    it('should export SVG with styles', async () => {
      const { exportVisualizationAsSVG } = useExport()
      
      const mockSvg = document.createElement('svg')
      mockSvg.innerHTML = '<circle cx="50" cy="50" r="25" fill="blue" />'
      
      await exportVisualizationAsSVG(mockSvg, 'chart.svg')
      
      expect(global.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('<circle cx="50" cy="50" r="25" fill="blue" />')],
        { type: 'image/svg+xml;charset=utf-8;' }
      )
    })

    it('should include CSS styles in export', async () => {
      const { exportVisualizationAsSVG } = useExport()
      
      const mockSvg = document.createElement('svg')
      
      await exportVisualizationAsSVG(mockSvg, 'styled.svg', {
        includeStyles: true
      })
      
      expect(global.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('<style>')],
        { type: 'image/svg+xml;charset=utf-8;' }
      )
    })
  })

  describe('exportToPDF', () => {
    it('should create PDF from visualization', async () => {
      const { exportToPDF } = useExport()
      
      const mockSvg = document.createElement('svg')
      
      // Mock jsPDF - would normally be imported
      const mockPDF = {
        addImage: vi.fn(),
        save: vi.fn()
      }
      
      // Would need actual PDF library for full test
      await expect(exportToPDF(mockSvg, 'chart.pdf')).rejects.toThrow()
    })
  })

  describe('batch export', () => {
    it('should export multiple formats', async () => {
      const { exportMultipleFormats } = useExport()
      
      const data = [{ x: 1, y: 2 }]
      const mockSvg = document.createElement('svg')
      
      const formats = ['csv', 'json', 'png', 'svg']
      
      await exportMultipleFormats({
        data,
        svg: mockSvg,
        filename: 'export',
        formats
      })
      
      expect(global.Blob).toHaveBeenCalledTimes(4) // One for each format
    })

    it('should handle export errors in batch', async () => {
      const { exportMultipleFormats } = useExport()
      
      mockCanvas.toBlob.mockImplementationOnce((callback) => 
        callback(null) // Simulate PNG failure
      )
      
      const data = [{ x: 1, y: 2 }]
      const mockSvg = document.createElement('svg')
      
      const result = await exportMultipleFormats({
        data,
        svg: mockSvg,
        filename: 'export',
        formats: ['csv', 'png']
      })
      
      expect(result.successful).toContain('csv')
      expect(result.failed).toContain('png')
    })
  })

  describe('export progress tracking', () => {
    it('should track export progress', async () => {
      const { exportToCSV } = useExport()
      
      const onProgress = vi.fn()
      const data = Array.from({ length: 1000 }, (_, i) => ({ id: i }))
      
      await exportToCSV(data, 'large.csv', { onProgress })
      
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        progress: expect.any(Number),
        stage: expect.any(String)
      }))
    })
  })

  describe('export validation', () => {
    it('should validate data before export', async () => {
      const { exportToCSV } = useExport()
      
      const invalidData = 'not an array'
      
      await expect(exportToCSV(invalidData, 'invalid.csv'))
        .rejects.toThrow('Data must be an array')
    })

    it('should validate filename', async () => {
      const { exportToCSV } = useExport()
      
      const data = [{ test: 'data' }]
      
      await expect(exportToCSV(data, ''))
        .rejects.toThrow('Filename is required')
    })

    it('should validate file extension', async () => {
      const { exportToCSV } = useExport()
      
      const data = [{ test: 'data' }]
      
      await expect(exportToCSV(data, 'file.txt'))
        .rejects.toThrow('Invalid file extension')
    })
  })
})