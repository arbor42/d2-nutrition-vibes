import { ref, computed, watch, reactive } from 'vue'
import * as d3 from 'd3'

import { useDataStore } from '@/stores/useDataStore'
import { useVisualizationStore } from '@/stores/useVisualizationStore'

// Enhanced reactive data transformations for Phase 5
export function useDataTransformations() {
  const dataStore = useDataStore()
  const vizStore = useVisualizationStore()

  // Transformation cache
  const transformationCache = ref(new Map())
  const transformationHistory = ref([])
  const activeTransformations = ref(new Set())

  // Create a reactive transformation pipeline
  const createTransformationPipeline = (sourceData, transformations) => {
    const pipeline = reactive({
      source: sourceData,
      transformations: transformations || [],
      result: null,
      error: null,
      isProcessing: false,
      metadata: {
        created: new Date(),
        lastUpdate: null,
        processingTime: 0
      }
    })

    const processTransformations = async () => {
      if (pipeline.isProcessing) return
      
      pipeline.isProcessing = true
      const startTime = Date.now()
      
      try {
        let currentData = pipeline.source
        
        for (const transform of pipeline.transformations) {
          currentData = await executeTransformation(currentData, transform)
        }
        
        pipeline.result = currentData
        pipeline.error = null
        pipeline.metadata.lastUpdate = new Date()
        pipeline.metadata.processingTime = Date.now() - startTime
        
        return currentData
      } catch (error) {
        pipeline.error = error.message
        console.error('Transformation pipeline error:', error)
        throw error
      } finally {
        pipeline.isProcessing = false
      }
    }

    // Auto-process when source data changes
    watch(() => pipeline.source, () => {
      if (pipeline.source) {
        processTransformations()
      }
    }, { deep: true, immediate: true })

    return {
      pipeline,
      processTransformations,
      addTransformation: (transform) => {
        pipeline.transformations.push(transform)
        processTransformations()
      },
      removeTransformation: (index) => {
        pipeline.transformations.splice(index, 1)
        processTransformations()
      }
    }
  }

  // Execute individual transformation
  const executeTransformation = async (data, transformation) => {
    const { type, config } = transformation
    
    switch (type) {
      case 'filter':
        return transformFilter(data, config)
      case 'sort':
        return transformSort(data, config)
      case 'group':
        return transformGroup(data, config)
      case 'aggregate':
        return transformAggregate(data, config)
      case 'join':
        return transformJoin(data, config)
      case 'pivot':
        return transformPivot(data, config)
      case 'normalize':
        return transformNormalize(data, config)
      case 'timeseries':
        return transformTimeseries(data, config)
      case 'geospatial':
        return transformGeospatial(data, config)
      case 'statistical':
        return transformStatistical(data, config)
      default:
        throw new Error(`Unknown transformation type: ${type}`)
    }
  }

  // Transformation functions
  const transformFilter = (data, config) => {
    const { field, operator, value, condition } = config
    
    if (!Array.isArray(data)) return data
    
    return data.filter(item => {
      switch (operator) {
        case 'equals':
          return item[field] === value
        case 'not_equals':
          return item[field] !== value
        case 'greater_than':
          return item[field] > value
        case 'less_than':
          return item[field] < value
        case 'greater_equal':
          return item[field] >= value
        case 'less_equal':
          return item[field] <= value
        case 'contains':
          return String(item[field]).includes(String(value))
        case 'starts_with':
          return String(item[field]).startsWith(String(value))
        case 'ends_with':
          return String(item[field]).endsWith(String(value))
        case 'in':
          return Array.isArray(value) && value.includes(item[field])
        case 'between':
          return Array.isArray(value) && item[field] >= value[0] && item[field] <= value[1]
        case 'custom':
          return condition ? condition(item) : true
        default:
          return true
      }
    })
  }

  const transformSort = (data, config) => {
    const { field, direction = 'asc', type = 'auto' } = config
    
    if (!Array.isArray(data)) return data
    
    return [...data].sort((a, b) => {
      let valueA = a[field]
      let valueB = b[field]
      
      // Type conversion
      if (type === 'numeric') {
        valueA = parseFloat(valueA) || 0
        valueB = parseFloat(valueB) || 0
      } else if (type === 'date') {
        valueA = new Date(valueA)
        valueB = new Date(valueB)
      }
      
      // Comparison
      let result = 0
      if (valueA < valueB) result = -1
      else if (valueA > valueB) result = 1
      
      return direction === 'desc' ? -result : result
    })
  }

  const transformGroup = (data, config) => {
    const { field, aggregateFields = [] } = config
    
    if (!Array.isArray(data)) return data
    
    const grouped = d3.group(data, d => d[field])
    
    return Array.from(grouped.entries()).map(([key, values]) => {
      const group = { [field]: key, count: values.length }
      
      // Add aggregated fields
      aggregateFields.forEach(({ field: aggField, operation }) => {
        const values_for_field = values.map(v => parseFloat(v[aggField]) || 0)
        
        switch (operation) {
          case 'sum':
            group[`${aggField}_sum`] = d3.sum(values_for_field)
            break
          case 'mean':
            group[`${aggField}_mean`] = d3.mean(values_for_field)
            break
          case 'median':
            group[`${aggField}_median`] = d3.median(values_for_field)
            break
          case 'min':
            group[`${aggField}_min`] = d3.min(values_for_field)
            break
          case 'max':
            group[`${aggField}_max`] = d3.max(values_for_field)
            break
        }
      })
      
      return group
    })
  }

  const transformAggregate = (data, config) => {
    const { operations = [] } = config
    
    if (!Array.isArray(data)) return data
    
    const result = {}
    
    operations.forEach(({ field, operation, outputField }) => {
      const values = data.map(d => parseFloat(d[field]) || 0)
      const output = outputField || `${field}_${operation}`
      
      switch (operation) {
        case 'sum':
          result[output] = d3.sum(values)
          break
        case 'mean':
          result[output] = d3.mean(values)
          break
        case 'median':
          result[output] = d3.median(values)
          break
        case 'min':
          result[output] = d3.min(values)
          break
        case 'max':
          result[output] = d3.max(values)
          break
        case 'count':
          result[output] = values.length
          break
        case 'std':
          result[output] = d3.deviation(values)
          break
      }
    })
    
    return result
  }

  const transformJoin = (data, config) => {
    const { joinData, leftKey, rightKey, joinType = 'inner' } = config
    
    if (!Array.isArray(data) || !Array.isArray(joinData)) return data
    
    const rightMap = new Map(joinData.map(item => [item[rightKey], item]))
    
    switch (joinType) {
      case 'inner':
        return data.filter(item => rightMap.has(item[leftKey]))
          .map(item => ({ ...item, ...rightMap.get(item[leftKey]) }))
      
      case 'left':
        return data.map(item => ({
          ...item,
          ...(rightMap.get(item[leftKey]) || {})
        }))
      
      case 'right':
        return joinData.map(item => {
          const leftItem = data.find(d => d[leftKey] === item[rightKey])
          return { ...(leftItem || {}), ...item }
        })
      
      default:
        return data
    }
  }

  const transformPivot = (data, config) => {
    const { indexField, columnField, valueField, aggregation = 'sum' } = config
    
    if (!Array.isArray(data)) return data
    
    const pivot = d3.rollup(
      data,
      values => {
        const vals = values.map(v => parseFloat(v[valueField]) || 0)
        switch (aggregation) {
          case 'sum': return d3.sum(vals)
          case 'mean': return d3.mean(vals)
          case 'count': return vals.length
          default: return d3.sum(vals)
        }
      },
      d => d[indexField],
      d => d[columnField]
    )
    
    const columns = new Set()
    pivot.forEach(row => {
      row.forEach((_, col) => columns.add(col))
    })
    
    return Array.from(pivot.entries()).map(([index, row]) => {
      const result = { [indexField]: index }
      columns.forEach(col => {
        result[col] = row.get(col) || 0
      })
      return result
    })
  }

  const transformNormalize = (data, config) => {
    const { fields, method = 'min-max' } = config
    
    if (!Array.isArray(data)) return data
    
    const result = [...data]
    
    fields.forEach(field => {
      const values = data.map(d => parseFloat(d[field]) || 0)
      
      switch (method) {
        case 'min-max':
          const min = d3.min(values)
          const max = d3.max(values)
          const range = max - min
          
          result.forEach((item, i) => {
            item[`${field}_normalized`] = range === 0 ? 0 : (values[i] - min) / range
          })
          break
          
        case 'z-score':
          const mean = d3.mean(values)
          const std = d3.deviation(values)
          
          result.forEach((item, i) => {
            item[`${field}_normalized`] = std === 0 ? 0 : (values[i] - mean) / std
          })
          break
      }
    })
    
    return result
  }

  const transformTimeseries = (data, config) => {
    const { 
      dateField, 
      valueField, 
      interval = 'monthly',
      aggregation = 'sum',
      fillGaps = true 
    } = config
    
    if (!Array.isArray(data)) return data
    
    // Parse dates and sort
    const parsed = data.map(d => ({
      ...d,
      date: new Date(d[dateField]),
      value: parseFloat(d[valueField]) || 0
    })).sort((a, b) => a.date - b.date)
    
    // Group by interval
    let groupBy
    switch (interval) {
      case 'daily':
        groupBy = d => d3.timeDay(d.date)
        break
      case 'weekly':
        groupBy = d => d3.timeWeek(d.date)
        break
      case 'monthly':
        groupBy = d => d3.timeMonth(d.date)
        break
      case 'yearly':
        groupBy = d => d3.timeYear(d.date)
        break
      default:
        groupBy = d => d.date
    }
    
    const grouped = d3.rollup(
      parsed,
      values => {
        const vals = values.map(v => v.value)
        switch (aggregation) {
          case 'sum': return d3.sum(vals)
          case 'mean': return d3.mean(vals)
          case 'count': return vals.length
          case 'min': return d3.min(vals)
          case 'max': return d3.max(vals)
          default: return d3.sum(vals)
        }
      },
      groupBy
    )
    
    let result = Array.from(grouped.entries()).map(([date, value]) => ({
      date,
      value,
      [dateField]: date.toISOString(),
      [valueField]: value
    }))
    
    // Fill gaps if requested
    if (fillGaps && result.length > 1) {
      const [start, end] = d3.extent(result, d => d.date)
      const allDates = d3.timeDay.range(start, end)
      
      const dateMap = new Map(result.map(d => [d.date.getTime(), d]))
      
      result = allDates.map(date => {
        const existing = dateMap.get(date.getTime())
        return existing || {
          date,
          value: 0,
          [dateField]: date.toISOString(),
          [valueField]: 0
        }
      })
    }
    
    return result
  }

  const transformGeospatial = (data, config) => {
    const { latField, lonField, operation = 'validate' } = config
    
    if (!Array.isArray(data)) return data
    
    switch (operation) {
      case 'validate':
        return data.filter(d => {
          const lat = parseFloat(d[latField])
          const lon = parseFloat(d[lonField])
          return !isNaN(lat) && !isNaN(lon) && 
                 lat >= -90 && lat <= 90 && 
                 lon >= -180 && lon <= 180
        })
      
      case 'bounds':
        const validData = data.filter(d => {
          const lat = parseFloat(d[latField])
          const lon = parseFloat(d[lonField])
          return !isNaN(lat) && !isNaN(lon)
        })
        
        return {
          bounds: d3.extent(validData, d => [
            parseFloat(d[lonField]), 
            parseFloat(d[latField])
          ]),
          center: [
            d3.mean(validData, d => parseFloat(d[lonField])),
            d3.mean(validData, d => parseFloat(d[latField]))
          ]
        }
      
      default:
        return data
    }
  }

  const transformStatistical = (data, config) => {
    const { fields, operations = ['describe'] } = config
    
    if (!Array.isArray(data)) return data
    
    const result = {}
    
    fields.forEach(field => {
      const values = data.map(d => parseFloat(d[field])).filter(v => !isNaN(v))
      
      result[field] = {}
      
      operations.forEach(operation => {
        switch (operation) {
          case 'describe':
            result[field] = {
              count: values.length,
              sum: d3.sum(values),
              mean: d3.mean(values),
              median: d3.median(values),
              min: d3.min(values),
              max: d3.max(values),
              std: d3.deviation(values),
              variance: d3.variance(values)
            }
            break
          case 'quartiles':
            const sorted = values.sort(d3.ascending)
            result[field].quartiles = [
              d3.quantile(sorted, 0.25),
              d3.quantile(sorted, 0.5),
              d3.quantile(sorted, 0.75)
            ]
            break
          case 'outliers':
            const q1 = d3.quantile(values, 0.25)
            const q3 = d3.quantile(values, 0.75)
            const iqr = q3 - q1
            const lowerBound = q1 - 1.5 * iqr
            const upperBound = q3 + 1.5 * iqr
            
            result[field].outliers = values.filter(v => v < lowerBound || v > upperBound)
            break
        }
      })
    })
    
    return result
  }

  // Predefined transformation templates
  const transformationTemplates = {
    // Common data cleaning
    cleanNumerical: (fields) => ({
      type: 'filter',
      config: {
        field: fields[0],
        operator: 'custom',
        condition: (item) => fields.every(field => !isNaN(parseFloat(item[field])))
      }
    }),
    
    // Time series preparation
    prepareTimeseries: (dateField, valueField) => [
      {
        type: 'filter',
        config: {
          field: dateField,
          operator: 'custom',
          condition: (item) => !isNaN(Date.parse(item[dateField]))
        }
      },
      {
        type: 'sort',
        config: { field: dateField, type: 'date' }
      },
      {
        type: 'timeseries',
        config: { dateField, valueField, interval: 'monthly' }
      }
    ],
    
    // Geographical data preparation
    prepareGeospatial: (latField, lonField) => [
      {
        type: 'geospatial',
        config: { latField, lonField, operation: 'validate' }
      }
    ],
    
    // Statistical summary
    generateSummary: (fields) => ({
      type: 'statistical',
      config: { fields, operations: ['describe', 'quartiles'] }
    })
  }

  // Cache management
  const getCachedTransformation = (key) => {
    return transformationCache.value.get(key)
  }
  
  const setCachedTransformation = (key, result) => {
    transformationCache.value.set(key, {
      result,
      timestamp: Date.now()
    })
    
    // Limit cache size
    if (transformationCache.value.size > 100) {
      const entries = Array.from(transformationCache.value.entries())
      const toDelete = entries.slice(0, 20)
      toDelete.forEach(([key]) => transformationCache.value.delete(key))
    }
  }

  const clearTransformationCache = () => {
    transformationCache.value.clear()
  }

  return {
    // Pipeline creation
    createTransformationPipeline,
    
    // Individual transformations
    executeTransformation,
    transformFilter,
    transformSort,
    transformGroup,
    transformAggregate,
    transformJoin,
    transformPivot,
    transformNormalize,
    transformTimeseries,
    transformGeospatial,
    transformStatistical,
    
    // Templates
    transformationTemplates,
    
    // Cache management
    transformationCache,
    getCachedTransformation,
    setCachedTransformation,
    clearTransformationCache,
    
    // State
    transformationHistory,
    activeTransformations
  }
}