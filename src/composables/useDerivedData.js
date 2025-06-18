import { computed, ref, watch } from 'vue'
import { useDataStore } from '@/stores/useDataStore'
import { useDataTransformations } from './useDataTransformations'
import * as d3 from 'd3'

// Enhanced composable for computed properties and derived data
export function useDerivedData() {
  const dataStore = useDataStore()
  const { transformFilter, transformSort, transformAggregate } = useDataTransformations()

  // Cache for expensive computations
  const computationCache = ref(new Map())
  const lastDataHash = ref(null)

  // Helper to create cache key
  const createCacheKey = (prefix, params) => {
    return `${prefix}_${JSON.stringify(params)}`
  }

  // Helper to check if data has changed
  const hasDataChanged = () => {
    const currentHash = JSON.stringify(dataStore.filteredData)
    const changed = currentHash !== lastDataHash.value
    if (changed) {
      lastDataHash.value = currentHash
      computationCache.value.clear() // Clear cache when data changes
    }
    return changed
  }

  // Cached computation wrapper
  const computeWithCache = (key, computeFn) => {
    hasDataChanged() // Check and clear cache if needed
    
    if (computationCache.value.has(key)) {
      return computationCache.value.get(key)
    }
    
    const result = computeFn()
    computationCache.value.set(key, result)
    return result
  }

  // Data availability indicators
  const dataAvailability = computed(() => {
    const data = dataStore.filteredData
    if (!data.length) return { available: false, message: 'Keine Daten verfügbar' }
    
    return computeWithCache('availability', () => {
      const totalRecords = data.length
      const completeness = {}
      
      // Check completeness for key fields
      const keyFields = ['Year', 'Area', 'Item', 'Element', 'Value']
      keyFields.forEach(field => {
        const validCount = data.filter(d => d[field] != null && d[field] !== '').length
        completeness[field] = (validCount / totalRecords) * 100
      })
      
      const avgCompleteness = Object.values(completeness).reduce((a, b) => a + b, 0) / keyFields.length
      
      return {
        available: true,
        totalRecords,
        completeness,
        avgCompleteness: Math.round(avgCompleteness),
        message: `${totalRecords} Datensätze verfügbar (${Math.round(avgCompleteness)}% vollständig)`
      }
    })
  })

  // Regional statistics
  const regionalStats = computed(() => {
    const data = dataStore.filteredData
    if (!data.length) return []
    
    return computeWithCache('regional_stats', () => {
      const regionData = d3.rollup(
        data,
        values => {
          const valueNumbers = values.map(d => parseFloat(d.Value)).filter(v => !isNaN(v))
          return {
            count: values.length,
            sum: d3.sum(valueNumbers),
            mean: d3.mean(valueNumbers),
            median: d3.median(valueNumbers),
            min: d3.min(valueNumbers),
            max: d3.max(valueNumbers),
            std: d3.deviation(valueNumbers)
          }
        },
        d => d.Area
      )
      
      return Array.from(regionData.entries())
        .map(([region, stats]) => ({ region, ...stats }))
        .sort((a, b) => b.sum - a.sum)
    })
  })

  // Product statistics
  const productStats = computed(() => {
    const data = dataStore.filteredData
    if (!data.length) return []
    
    return computeWithCache('product_stats', () => {
      const productData = d3.rollup(
        data,
        values => {
          const valueNumbers = values.map(d => parseFloat(d.Value)).filter(v => !isNaN(v))
          const regions = new Set(values.map(d => d.Area))
          
          return {
            count: values.length,
            regions: regions.size,
            sum: d3.sum(valueNumbers),
            mean: d3.mean(valueNumbers),
            median: d3.median(valueNumbers),
            growth: calculateGrowthRate(values)
          }
        },
        d => d.Item
      )
      
      return Array.from(productData.entries())
        .map(([product, stats]) => ({ product, ...stats }))
        .sort((a, b) => b.sum - a.sum)
    })
  })

  // Temporal trends
  const temporalTrends = computed(() => {
    const data = dataStore.filteredData
    if (!data.length) return { overall: null, byProduct: [], byRegion: [] }
    
    return computeWithCache('temporal_trends', () => {
      // Overall trend
      const yearlyData = d3.rollup(
        data,
        values => d3.sum(values, d => parseFloat(d.Value) || 0),
        d => d.Year
      )
      
      const yearlyTrend = Array.from(yearlyData.entries())
        .map(([year, value]) => ({ year: parseInt(year), value }))
        .sort((a, b) => a.year - b.year)
      
      const overallTrend = calculateTrendAnalysis(yearlyTrend)
      
      // By product trends
      const productTrends = Array.from(
        d3.group(data, d => d.Item),
        ([product, productData]) => {
          const yearlyProductData = d3.rollup(
            productData,
            values => d3.sum(values, d => parseFloat(d.Value) || 0),
            d => d.Year
          )
          
          const trend = Array.from(yearlyProductData.entries())
            .map(([year, value]) => ({ year: parseInt(year), value }))
            .sort((a, b) => a.year - b.year)
          
          return {
            product,
            trend: calculateTrendAnalysis(trend),
            data: trend
          }
        }
      ).slice(0, 10) // Top 10 products
      
      // By region trends
      const regionTrends = Array.from(
        d3.group(data, d => d.Area),
        ([region, regionData]) => {
          const yearlyRegionData = d3.rollup(
            regionData,
            values => d3.sum(values, d => parseFloat(d.Value) || 0),
            d => d.Year
          )
          
          const trend = Array.from(yearlyRegionData.entries())
            .map(([year, value]) => ({ year: parseInt(year), value }))
            .sort((a, b) => a.year - b.year)
          
          return {
            region,
            trend: calculateTrendAnalysis(trend),
            data: trend
          }
        }
      ).slice(0, 10) // Top 10 regions
      
      return {
        overall: { ...overallTrend, data: yearlyTrend },
        byProduct: productTrends,
        byRegion: regionTrends
      }
    })
  })

  // Market concentration analysis
  const marketConcentration = computed(() => {
    const data = dataStore.filteredData
    if (!data.length) return null
    
    return computeWithCache('market_concentration', () => {
      // Calculate market shares by region
      const totalValue = d3.sum(data, d => parseFloat(d.Value) || 0)
      
      const marketShares = Array.from(
        d3.rollup(
          data,
          values => d3.sum(values, d => parseFloat(d.Value) || 0),
          d => d.Area
        ),
        ([region, value]) => ({
          region,
          value,
          share: (value / totalValue) * 100
        })
      ).sort((a, b) => b.share - a.share)
      
      // Calculate concentration indices
      const shares = marketShares.map(d => d.share / 100)
      const hhi = d3.sum(shares, s => s * s) * 10000 // Herfindahl-Hirschman Index
      const cr4 = d3.sum(shares.slice(0, 4)) * 100 // Concentration Ratio (top 4)
      
      // Gini coefficient
      const sortedShares = shares.sort((a, b) => a - b)
      const n = sortedShares.length
      let gini = 0
      for (let i = 0; i < n; i++) {
        gini += (2 * (i + 1) - n - 1) * sortedShares[i]
      }
      gini = gini / (n * d3.sum(sortedShares))
      
      return {
        marketShares,
        hhi: Math.round(hhi),
        cr4: Math.round(cr4 * 100) / 100,
        gini: Math.round(gini * 1000) / 1000,
        interpretation: {
          hhi: hhi < 1500 ? 'Unconcentrated' : hhi < 2500 ? 'Moderately concentrated' : 'Highly concentrated',
          gini: gini < 0.25 ? 'Low inequality' : gini < 0.5 ? 'Moderate inequality' : 'High inequality'
        }
      }
    })
  })

  // Seasonal patterns (if monthly data available)
  const seasonalPatterns = computed(() => {
    const data = dataStore.filteredData
    if (!data.length) return null
    
    return computeWithCache('seasonal_patterns', () => {
      // Try to extract seasonal data if dates are available
      const datedData = data.filter(d => d.Date || d.Month)
      if (!datedData.length) return null
      
      const monthlyData = d3.rollup(
        datedData,
        values => ({
          count: values.length,
          sum: d3.sum(values, d => parseFloat(d.Value) || 0),
          mean: d3.mean(values, d => parseFloat(d.Value) || 0)
        }),
        d => {
          if (d.Month) return parseInt(d.Month)
          if (d.Date) return new Date(d.Date).getMonth() + 1
          return 1
        }
      )
      
      const seasonalData = Array.from(monthlyData.entries())
        .map(([month, stats]) => ({ month, ...stats }))
        .sort((a, b) => a.month - b.month)
      
      // Calculate seasonal index
      const overallMean = d3.mean(seasonalData, d => d.mean)
      seasonalData.forEach(d => {
        d.seasonalIndex = d.mean / overallMean
      })
      
      return {
        data: seasonalData,
        peakMonth: seasonalData.reduce((peak, curr) => 
          curr.seasonalIndex > peak.seasonalIndex ? curr : peak
        ),
        lowMonth: seasonalData.reduce((low, curr) => 
          curr.seasonalIndex < low.seasonalIndex ? curr : low
        )
      }
    })
  })

  // Data quality metrics
  const dataQuality = computed(() => {
    const data = dataStore.filteredData
    if (!data.length) return null
    
    return computeWithCache('data_quality', () => {
      const totalRecords = data.length
      
      // Missing values analysis
      const fields = Object.keys(data[0] || {})
      const missingAnalysis = fields.map(field => {
        const missing = data.filter(d => d[field] == null || d[field] === '').length
        return {
          field,
          missing,
          present: totalRecords - missing,
          completeness: ((totalRecords - missing) / totalRecords) * 100
        }
      })
      
      // Outlier detection for numerical fields
      const numericalFields = fields.filter(field => 
        data.some(d => !isNaN(parseFloat(d[field])))
      )
      
      const outlierAnalysis = numericalFields.map(field => {
        const values = data.map(d => parseFloat(d[field])).filter(v => !isNaN(v))
        const q1 = d3.quantile(values, 0.25)
        const q3 = d3.quantile(values, 0.75)
        const iqr = q3 - q1
        const lowerBound = q1 - 1.5 * iqr
        const upperBound = q3 + 1.5 * iqr
        
        const outliers = values.filter(v => v < lowerBound || v > upperBound)
        
        return {
          field,
          outliers: outliers.length,
          outlierRate: (outliers.length / values.length) * 100,
          bounds: { lower: lowerBound, upper: upperBound }
        }
      })
      
      // Data consistency checks
      const duplicates = data.length - new Set(data.map(d => JSON.stringify(d))).size
      
      // Overall quality score
      const avgCompleteness = d3.mean(missingAnalysis, d => d.completeness)
      const avgOutlierRate = d3.mean(outlierAnalysis, d => d.outlierRate)
      const duplicateRate = (duplicates / totalRecords) * 100
      
      const qualityScore = Math.max(0, 
        avgCompleteness - avgOutlierRate - duplicateRate
      )
      
      return {
        totalRecords,
        missing: missingAnalysis,
        outliers: outlierAnalysis,
        duplicates,
        duplicateRate,
        qualityScore: Math.round(qualityScore),
        recommendations: generateQualityRecommendations(
          avgCompleteness, avgOutlierRate, duplicateRate
        )
      }
    })
  })

  // Comparative analysis
  const comparativeAnalysis = computed(() => {
    const data = dataStore.filteredData
    if (!data.length) return null
    
    return computeWithCache('comparative_analysis', () => {
      const selectedProduct = dataStore.selectedProduct
      const selectedRegion = dataStore.selectedRegion
      
      // Compare selected product with others
      const productComparison = dataStore.availableProducts.map(product => {
        const productData = data.filter(d => d.Item === product)
        const total = d3.sum(productData, d => parseFloat(d.Value) || 0)
        const regions = new Set(productData.map(d => d.Area)).size
        
        return {
          product,
          total,
          regions,
          selected: product === selectedProduct
        }
      }).sort((a, b) => b.total - a.total)
      
      // Compare selected region with others
      const regionComparison = dataStore.availableRegions.map(region => {
        const regionData = data.filter(d => d.Area === region)
        const total = d3.sum(regionData, d => parseFloat(d.Value) || 0)
        const products = new Set(regionData.map(d => d.Item)).size
        
        return {
          region,
          total,
          products,
          selected: region === selectedRegion
        }
      }).sort((a, b) => b.total - a.total)
      
      return {
        products: productComparison.slice(0, 20), // Top 20
        regions: regionComparison.slice(0, 20)    // Top 20
      }
    })
  })

  // Helper functions
  const calculateGrowthRate = (values) => {
    const yearlyData = d3.rollup(
      values,
      vals => d3.sum(vals, d => parseFloat(d.Value) || 0),
      d => d.Year
    )
    
    const sorted = Array.from(yearlyData.entries())
      .map(([year, value]) => ({ year: parseInt(year), value }))
      .sort((a, b) => a.year - b.year)
    
    if (sorted.length < 2) return null
    
    const first = sorted[0].value
    const last = sorted[sorted.length - 1].value
    const years = sorted[sorted.length - 1].year - sorted[0].year
    
    if (first === 0 || years === 0) return null
    
    return Math.pow(last / first, 1 / years) - 1
  }

  const calculateTrendAnalysis = (timeSeriesData) => {
    if (timeSeriesData.length < 2) return null
    
    const n = timeSeriesData.length
    const sumX = d3.sum(timeSeriesData, (d, i) => i)
    const sumY = d3.sum(timeSeriesData, d => d.value)
    const sumXY = d3.sum(timeSeriesData, (d, i) => i * d.value)
    const sumX2 = d3.sum(timeSeriesData, (d, i) => i * i)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    // Calculate R-squared
    const meanY = sumY / n
    const totalSumSquares = d3.sum(timeSeriesData, d => Math.pow(d.value - meanY, 2))
    const residualSumSquares = d3.sum(timeSeriesData, (d, i) => {
      const predicted = slope * i + intercept
      return Math.pow(d.value - predicted, 2)
    })
    
    const rSquared = 1 - (residualSumSquares / totalSumSquares)
    
    return {
      slope,
      intercept,
      rSquared,
      direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      strength: Math.abs(rSquared)
    }
  }

  const generateQualityRecommendations = (completeness, outlierRate, duplicateRate) => {
    const recommendations = []
    
    if (completeness < 90) {
      recommendations.push('Improve data collection to reduce missing values')
    }
    
    if (outlierRate > 5) {
      recommendations.push('Investigate potential data entry errors or extreme values')
    }
    
    if (duplicateRate > 1) {
      recommendations.push('Implement data deduplication processes')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Data quality is good - continue current practices')
    }
    
    return recommendations
  }

  // Clear cache when filters change
  watch([
    () => dataStore.selectedProduct,
    () => dataStore.selectedRegion,
    () => dataStore.selectedYears,
    () => dataStore.dataFilters
  ], () => {
    computationCache.value.clear()
  }, { deep: true })

  return {
    // Data insights
    dataAvailability,
    regionalStats,
    productStats,
    temporalTrends,
    marketConcentration,
    seasonalPatterns,
    dataQuality,
    comparativeAnalysis,
    
    // Utilities
    computeWithCache,
    clearCache: () => computationCache.value.clear(),
    cacheSize: computed(() => computationCache.value.size)
  }
}