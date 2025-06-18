// Data processing Web Worker for heavy calculations
class DataProcessor {
  constructor() {
    this.cache = new Map()
    this.isProcessing = false
  }

  // Process large datasets
  async processLargeDataset(data, options = {}) {
    const {
      operation = 'aggregate',
      groupBy = null,
      aggregateBy = 'value',
      filterFn = null,
      sortBy = null,
      limit = null
    } = options

    console.log(`Processing ${data.length} data points with operation: ${operation}`)
    
    const startTime = performance.now()
    let result

    try {
      switch (operation) {
        case 'aggregate':
          result = this.aggregateData(data, groupBy, aggregateBy)
          break
        case 'filter':
          result = this.filterData(data, filterFn)
          break
        case 'sort':
          result = this.sortData(data, sortBy)
          break
        case 'statistics':
          result = this.calculateStatistics(data, aggregateBy)
          break
        case 'normalize':
          result = this.normalizeData(data, aggregateBy)
          break
        case 'cluster':
          result = this.clusterData(data, options)
          break
        case 'forecast':
          result = this.forecastData(data, options)
          break
        default:
          throw new Error(`Unknown operation: ${operation}`)
      }

      if (limit && Array.isArray(result)) {
        result = result.slice(0, limit)
      }

      const endTime = performance.now()
      console.log(`Data processing completed in ${(endTime - startTime).toFixed(2)}ms`)

      return {
        success: true,
        data: result,
        processingTime: endTime - startTime,
        originalSize: data.length,
        resultSize: Array.isArray(result) ? result.length : 1
      }
    } catch (error) {
      console.error('Data processing error:', error)
      return {
        success: false,
        error: error.message,
        processingTime: performance.now() - startTime
      }
    }
  }

  // Aggregate data by groups
  aggregateData(data, groupBy, aggregateBy) {
    if (!groupBy) {
      // Simple aggregation
      return {
        sum: data.reduce((sum, item) => sum + (item[aggregateBy] || 0), 0),
        avg: data.reduce((sum, item) => sum + (item[aggregateBy] || 0), 0) / data.length,
        min: Math.min(...data.map(item => item[aggregateBy] || 0)),
        max: Math.max(...data.map(item => item[aggregateBy] || 0)),
        count: data.length
      }
    }

    const groups = new Map()
    
    data.forEach(item => {
      const key = Array.isArray(groupBy) 
        ? groupBy.map(field => item[field]).join('|')
        : item[groupBy]
      
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key).push(item)
    })

    const result = []
    groups.forEach((items, key) => {
      const values = items.map(item => item[aggregateBy] || 0)
      
      result.push({
        group: key,
        sum: values.reduce((a, b) => a + b, 0),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: items.length,
        items: items
      })
    })

    return result.sort((a, b) => b.sum - a.sum)
  }

  // Filter data with optimized performance
  filterData(data, filterFunction) {
    if (typeof filterFunction === 'string') {
      // Convert string to function (be careful with security)
      filterFunction = new Function('item', `return ${filterFunction}`)
    }

    return data.filter(filterFunction)
  }

  // Sort data efficiently
  sortData(data, sortBy) {
    if (typeof sortBy === 'string') {
      return [...data].sort((a, b) => {
        const aVal = a[sortBy]
        const bVal = b[sortBy]
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return aVal - bVal
        }
        
        return String(aVal).localeCompare(String(bVal))
      })
    }

    if (typeof sortBy === 'function') {
      return [...data].sort(sortBy)
    }

    return data
  }

  // Calculate comprehensive statistics
  calculateStatistics(data, field) {
    const values = data.map(item => item[field] || 0).filter(val => !isNaN(val))
    
    if (values.length === 0) {
      return { error: 'No valid numeric values found' }
    }

    const sorted = [...values].sort((a, b) => a - b)
    const n = values.length
    const sum = values.reduce((a, b) => a + b, 0)
    const mean = sum / n
    
    // Calculate variance and standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n
    const stdDev = Math.sqrt(variance)
    
    // Calculate percentiles
    const percentile = (p) => {
      const index = (p / 100) * (n - 1)
      const lower = Math.floor(index)
      const upper = Math.ceil(index)
      const weight = index - lower
      
      if (upper >= n) return sorted[n - 1]
      return sorted[lower] * (1 - weight) + sorted[upper] * weight
    }

    return {
      count: n,
      sum,
      mean,
      median: percentile(50),
      mode: this.calculateMode(values),
      min: sorted[0],
      max: sorted[n - 1],
      range: sorted[n - 1] - sorted[0],
      variance,
      standardDeviation: stdDev,
      percentiles: {
        p25: percentile(25),
        p50: percentile(50),
        p75: percentile(75),
        p90: percentile(90),
        p95: percentile(95),
        p99: percentile(99)
      },
      outliers: this.detectOutliers(values, mean, stdDev)
    }
  }

  // Calculate mode (most frequent value)
  calculateMode(values) {
    const frequency = new Map()
    values.forEach(val => {
      frequency.set(val, (frequency.get(val) || 0) + 1)
    })
    
    let maxFreq = 0
    let mode = null
    
    frequency.forEach((freq, val) => {
      if (freq > maxFreq) {
        maxFreq = freq
        mode = val
      }
    })
    
    return { value: mode, frequency: maxFreq }
  }

  // Detect outliers using IQR method
  detectOutliers(values, mean, stdDev) {
    const sorted = [...values].sort((a, b) => a - b)
    const n = sorted.length
    
    const q1 = sorted[Math.floor(n * 0.25)]
    const q3 = sorted[Math.floor(n * 0.75)]
    const iqr = q3 - q1
    
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr
    
    return values.filter(val => val < lowerBound || val > upperBound)
  }

  // Normalize data
  normalizeData(data, field) {
    const values = data.map(item => item[field] || 0)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min
    
    if (range === 0) {
      return data.map(item => ({ ...item, [`${field}_normalized`]: 0 }))
    }
    
    return data.map(item => ({
      ...item,
      [`${field}_normalized`]: (item[field] - min) / range
    }))
  }

  // Simple K-means clustering
  clusterData(data, options = {}) {
    const {
      k = 3,
      maxIterations = 100,
      features = ['x', 'y']
    } = options

    // Extract feature vectors
    const vectors = data.map(item => 
      features.map(feature => item[feature] || 0)
    )

    // Initialize centroids randomly
    let centroids = []
    for (let i = 0; i < k; i++) {
      centroids.push(vectors[Math.floor(Math.random() * vectors.length)].slice())
    }

    let assignments = new Array(vectors.length)
    let converged = false
    let iteration = 0

    while (!converged && iteration < maxIterations) {
      // Assign points to nearest centroid
      const newAssignments = vectors.map(vector => {
        let minDistance = Infinity
        let cluster = 0
        
        centroids.forEach((centroid, i) => {
          const distance = this.euclideanDistance(vector, centroid)
          if (distance < minDistance) {
            minDistance = distance
            cluster = i
          }
        })
        
        return cluster
      })

      // Check for convergence
      converged = newAssignments.every((cluster, i) => cluster === assignments[i])
      assignments = newAssignments

      if (!converged) {
        // Update centroids
        for (let i = 0; i < k; i++) {
          const clusterPoints = vectors.filter((_, index) => assignments[index] === i)
          
          if (clusterPoints.length > 0) {
            centroids[i] = features.map((_, featureIndex) => 
              clusterPoints.reduce((sum, point) => sum + point[featureIndex], 0) / clusterPoints.length
            )
          }
        }
      }

      iteration++
    }

    // Return data with cluster assignments
    return data.map((item, index) => ({
      ...item,
      cluster: assignments[index]
    }))
  }

  // Calculate Euclidean distance
  euclideanDistance(a, b) {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0))
  }

  // Simple time series forecasting using linear regression
  forecastData(data, options = {}) {
    const {
      timeField = 'date',
      valueField = 'value',
      periods = 12
    } = options

    // Convert dates to numeric values
    const points = data.map(item => ({
      x: new Date(item[timeField]).getTime(),
      y: item[valueField] || 0
    })).sort((a, b) => a.x - b.x)

    if (points.length < 2) {
      return { error: 'Insufficient data for forecasting' }
    }

    // Linear regression
    const n = points.length
    const sumX = points.reduce((sum, p) => sum + p.x, 0)
    const sumY = points.reduce((sum, p) => sum + p.y, 0)
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0)
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Generate forecasts
    const lastTime = points[points.length - 1].x
    const timeStep = (lastTime - points[0].x) / (n - 1)
    
    const forecasts = []
    for (let i = 1; i <= periods; i++) {
      const time = lastTime + i * timeStep
      const value = slope * time + intercept
      
      forecasts.push({
        [timeField]: new Date(time).toISOString(),
        [valueField]: value,
        forecast: true
      })
    }

    return {
      forecasts,
      model: { slope, intercept },
      confidence: this.calculateRSquared(points, slope, intercept)
    }
  }

  // Calculate R-squared for linear regression
  calculateRSquared(points, slope, intercept) {
    const yMean = points.reduce((sum, p) => sum + p.y, 0) / points.length
    
    const ssRes = points.reduce((sum, p) => {
      const predicted = slope * p.x + intercept
      return sum + Math.pow(p.y - predicted, 2)
    }, 0)
    
    const ssTot = points.reduce((sum, p) => 
      sum + Math.pow(p.y - yMean, 2), 0
    )
    
    return 1 - (ssRes / ssTot)
  }

  // Cache management
  getCacheKey(data, options) {
    return JSON.stringify({ 
      dataHash: this.hashData(data),
      options 
    })
  }

  hashData(data) {
    // Simple hash based on data length and sample values
    const sample = data.slice(0, Math.min(10, data.length))
    return JSON.stringify(sample) + data.length
  }

  // Memory management
  clearCache() {
    this.cache.clear()
  }

  getMemoryUsage() {
    return {
      cacheSize: this.cache.size,
      isProcessing: this.isProcessing
    }
  }
}

// Web Worker message handling
const processor = new DataProcessor()

self.onmessage = async function(e) {
  const { id, type, data, options } = e.data

  try {
    let result

    switch (type) {
      case 'process':
        processor.isProcessing = true
        result = await processor.processLargeDataset(data, options)
        processor.isProcessing = false
        break
        
      case 'clearCache':
        processor.clearCache()
        result = { success: true, message: 'Cache cleared' }
        break
        
      case 'getMemoryUsage':
        result = processor.getMemoryUsage()
        break
        
      default:
        throw new Error(`Unknown message type: ${type}`)
    }

    self.postMessage({
      id,
      success: true,
      result
    })
  } catch (error) {
    processor.isProcessing = false
    
    self.postMessage({
      id,
      success: false,
      error: error.message
    })
  }
}