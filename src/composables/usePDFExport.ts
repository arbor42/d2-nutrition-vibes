import { ref, computed } from 'vue'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { formatAgricultureValue } from '@/utils/formatters'
import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'

interface DashboardData {
  selectedProduct?: string
  selectedYear?: number
  selectedMetric?: string
  selectedCountry?: string
  globalStats?: {
    total: number
    countries: number
    topProducer?: string
    unit?: string
  }
  feedUsage?: {
    percentage: number
    amount: number
    unit: string
  }
  topCountries?: Array<{
    country: string
    value: number
    unit?: string
  }>
}

interface ExportOptions {
  filename?: string
  orientation?: 'portrait' | 'landscape'
}

/**
 * Composable for PDF export functionality
 * Provides methods to export dashboard data as comprehensive PDF reports
 */
export function usePDFExport() {
  const isExporting = ref(false)
  const exportProgress = ref(0)
  const exportError = ref<string | null>(null)

  /**
   * Wait for data to be loaded and components to be ready
   */
  const waitForDataAndComponents = async (): Promise<{
    dataStore: any,
    uiStore: any,
    dashboardData: DashboardData
  }> => {
    console.log('🔄 Waiting for data and components...')
    
    const dataStore = useDataStore()
    const uiStore = useUIStore()
    
    // Step 1: Ensure basic data is loaded
    if (!dataStore.hasData) {
      console.log('🔄 Initializing data store...')
      await dataStore.initializeApp()
    }
    
    // Step 2: Wait for current product/year data to be available
    const maxWait = 30000 // 30 seconds max
    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWait) {
      const currentProduct = uiStore.selectedProduct
      const currentYear = uiStore.selectedYear
      const currentMetric = uiStore.selectedMetric
      
      console.log('🔄 Checking data availability:', {
        product: currentProduct,
        year: currentYear,
        metric: currentMetric,
        timeseriesData: !!dataStore.timeseriesData,
        timeseriesForProduct: dataStore.timeseriesData?.[currentProduct] ? 'available' : 'missing'
      })
      
      // Check if we have either timeseries data or production data
      let hasData = false
      
      if (dataStore.timeseriesData?.[currentProduct]) {
        hasData = true
        console.log('✅ Timeseries data available for', currentProduct)
      } else {
        // Try to load production data
        try {
          const productionData = dataStore.getProductionData(currentProduct, currentYear)
          if (productionData && (Array.isArray(productionData) ? productionData.length > 0 : Object.keys(productionData).length > 0)) {
            hasData = true
            console.log('✅ Production data available for', currentProduct, currentYear)
          }
        } catch (error) {
          console.log('⚠️ Production data not yet available')
        }
      }
      
      if (hasData) {
        break
      }
      
      console.log('⏳ Data not ready, waiting...')
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Step 3: Calculate dashboard data from stores
    const dashboardData = calculateDashboardData(dataStore, uiStore)
    
    console.log('📊 Final dashboard data:', dashboardData)
    
    return { dataStore, uiStore, dashboardData }
  }

  /**
   * Calculate dashboard data from current store state
   */
  const calculateDashboardData = (dataStore: any, uiStore: any): DashboardData => {
    const currentProduct = uiStore.selectedProduct
    const currentYear = uiStore.selectedYear
    const currentMetric = uiStore.selectedMetric
    
    console.log('📊 Calculating dashboard data for:', {
      product: currentProduct,
      year: currentYear,
      metric: currentMetric
    })
    
    // Get data array for calculations
    let dataArray: any[] = []
    
    // Try timeseries data first
    if (dataStore.timeseriesData?.[currentProduct]) {
      const metricKey = getMetricKey(currentMetric)
      const productTimeseries = dataStore.timeseriesData[currentProduct]
      
      dataArray = Object.entries(productTimeseries).map(([country, countryData]: [string, any]) => {
        const yearData = countryData.find((d: any) => d.year === currentYear)
        const value = yearData ? (yearData[metricKey] || 0) : 0
        let unit = yearData?.unit || '1000 t'
        
        if (currentMetric === 'food_supply_kcal') {
          unit = 'kcal/capita/day'
        }
        
        return {
          country,
          value: value,
          unit: unit,
          year: currentYear
        }
      }).filter(item => item.value > 0)
      
      console.log('📊 Using timeseries data:', dataArray.length, 'entries')
    } else {
      // Fallback to production data
      const rawData = dataStore.getProductionData(currentProduct, currentYear)
      if (rawData) {
        if (Array.isArray(rawData)) {
          dataArray = rawData
        } else if (rawData.data && Array.isArray(rawData.data)) {
          dataArray = rawData.data
        } else if (typeof rawData === 'object') {
          dataArray = Object.entries(rawData).map(([country, data]: [string, any]) => ({
            country,
            value: data.value || 0,
            unit: data.unit || '1000 t',
            year: data.year || currentYear
          }))
        }
        console.log('📊 Using production data:', dataArray.length, 'entries')
      }
    }
    
    // Filter out aggregate regions
    const NON_COUNTRY_ENTITIES = [
      'World', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania',
      'Northern America', 'South America', 'Central America', 'Caribbean',
      'Northern Africa', 'Eastern Africa', 'Middle Africa', 'Southern Africa', 'Western Africa',
      'Eastern Asia', 'South-eastern Asia', 'Southern Asia', 'Western Asia', 'Central Asia',
      'Eastern Europe', 'Northern Europe', 'Southern Europe', 'Western Europe',
      'Australia and New Zealand', 'Melanesia',
      'European Union (27)',
      'Small Island Developing States', 'Least Developed Countries',
      'Land Locked Developing Countries', 'Low Income Food Deficit Countries',
      'Net Food Importing Developing Countries'
    ]
    
    const validData = dataArray.filter(item => 
      item && item.value > 0 &&
      !NON_COUNTRY_ENTITIES.includes(item.country) &&
      !item.country.toLowerCase().includes('total') &&
      item.country !== 'All'
    )
    
    // Calculate statistics
    const isPerCapitaMetric = currentMetric === 'food_supply_kcal'
    const total = isPerCapitaMetric 
      ? validData.length > 0 ? validData.reduce((sum, item) => sum + (item.value || 0), 0) / validData.length : 0
      : validData.reduce((sum, item) => sum + (item.value || 0), 0)
    
    const topProducer = validData.length > 0 ? validData.reduce((max, item) => 
      (item.value || 0) > (max?.value || 0) ? item : max, null
    ) : null
    
    const topCountries = validData
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
    
    // Calculate feed usage
    const feedUsage = calculateFeedUsage(dataStore, currentProduct, currentYear)
    
    // Determine unit
    let unit = '1000 t'
    if (currentMetric === 'food_supply_kcal') {
      unit = 'kcal/capita/day'
    } else if (validData.length > 0 && validData[0].unit) {
      unit = validData[0].unit
    }
    
    return {
      selectedProduct: currentProduct,
      selectedYear: currentYear,
      selectedMetric: currentMetric,
      selectedCountry: uiStore.selectedCountry,
      globalStats: {
        total: total,
        countries: validData.length,
        topProducer: topProducer?.country,
        unit: unit
      },
      feedUsage: feedUsage,
      topCountries: topCountries
    }
  }

  /**
   * Get metric key for timeseries data
   */
  const getMetricKey = (metric: string): string => {
    const keyMap: Record<string, string> = {
      'production': 'production',
      'import_quantity': 'imports',
      'export_quantity': 'exports',
      'domestic_supply_quantity': 'domestic_supply',
      'food_supply_kcal': 'food_supply_kcal',
      'feed': 'feed'
    }
    return keyMap[metric] || 'production'
  }

  /**
   * Calculate feed usage for a product
   */
  const calculateFeedUsage = (dataStore: any, product: string, year: number) => {
    if (!dataStore.timeseriesData?.[product]) {
      return { percentage: 0, amount: 0, unit: '1000 t' }
    }
    
    const productData = dataStore.timeseriesData[product]
    let totalProduction = 0
    let totalFeed = 0
    let hasFeedData = false
    
    Object.values(productData).forEach((countryData: any) => {
      const yearData = countryData.find((d: any) => d.year === year)
      if (yearData) {
        totalProduction += yearData.production || 0
        const feedValue = yearData.feed || 0
        totalFeed += feedValue
        
        if (feedValue > 0) {
          hasFeedData = true
        }
      }
    })
    
    if (hasFeedData && totalProduction > 0) {
      const percentage = Math.round((totalFeed / totalProduction) * 100)
      return {
        percentage,
        amount: totalFeed,
        unit: '1000 t'
      }
    }
    
    return { percentage: 0, amount: 0, unit: '1000 t' }
  }

  /**
   * Debug function to analyze current DOM state
   */
  const debugCurrentDOMState = () => {
    console.log('🔍 === DOM STATE DEBUG ===')
    
    // Check all potential containers
    const containers = {
      'data-tour="world-map"': document.querySelector('[data-tour="world-map"]'),
      '.legend-container': document.querySelector('.legend-container'),
      '.map-svg-container': document.querySelector('.map-svg-container'),
      '.chart-container': document.querySelector('.chart-container'),
      '.card-body': document.querySelector('.card-body'),
      '.world-map-visualization': document.querySelector('.world-map-visualization'),
      '.world-map-container': document.querySelector('.world-map-container')
    }
    
    console.log('🔍 Available containers:')
    Object.entries(containers).forEach(([name, element]) => {
      if (element) {
        const rect = element.getBoundingClientRect()
        console.log(`  ✅ ${name}:`, {
          exists: true,
          size: `${rect.width}x${rect.height}`,
          className: element.className,
          id: element.id
        })
      } else {
        console.log(`  ❌ ${name}: not found`)
      }
    })
    
    // Check all SVGs
    const svgs = document.querySelectorAll('svg')
    console.log(`🔍 Found ${svgs.length} SVG elements:`)
    svgs.forEach((svg, index) => {
      const rect = svg.getBoundingClientRect()
      const paths = svg.querySelectorAll('path')
      const countries = svg.querySelectorAll('.country')
      console.log(`  SVG ${index}:`, {
        size: `${rect.width}x${rect.height}`,
        pathCount: paths.length,
        countryCount: countries.length,
        className: svg.className?.baseVal || svg.className,
        parent: svg.parentElement?.className
      })
    })
    
    console.log('🔍 === END DOM DEBUG ===')
  }

  /**
   * Wait for map and legend to be fully rendered
   */
  const waitForMapRendering = async (): Promise<HTMLElement | null> => {
    console.log('🗺️ Waiting for map rendering...')
    
    // Debug current DOM state at the beginning
    debugCurrentDOMState()
    
    const maxWait = 15000 // 15 seconds
    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWait) {
      console.log('🗺️ Map detection attempt...')
      
      // Strategy 1: Look for the main container
      let mapContainer = document.querySelector('[data-tour="world-map"]') as HTMLElement
      console.log('🗺️ Strategy 1 - data-tour container:', !!mapContainer)
      
      if (!mapContainer) {
        // Strategy 2: Look for legend + map containers
        const legendContainer = document.querySelector('.legend-container')
        const mapSvgContainer = document.querySelector('.map-svg-container, .chart-container')
        console.log('🗺️ Strategy 2 - legend container:', !!legendContainer, 'map container:', !!mapSvgContainer)
        
        if (legendContainer && mapSvgContainer) {
          mapContainer = legendContainer.closest('.card-body') as HTMLElement ||
                        legendContainer.parentElement as HTMLElement
          console.log('🗺️ Strategy 2 - found parent container:', !!mapContainer)
        }
      }
      
      if (!mapContainer) {
        // Strategy 3: Look for any large SVG that might be the map
        const svgs = document.querySelectorAll('svg')
        console.log('🗺️ Strategy 3 - found', svgs.length, 'SVG elements')
        
        for (const svg of svgs) {
          const rect = svg.getBoundingClientRect()
          const hasPathElements = svg.querySelectorAll('path').length > 10
          const isLargeEnough = rect.width > 300 && rect.height > 200
          
          console.log('🗺️ SVG analysis:', {
            width: rect.width,
            height: rect.height,
            pathCount: svg.querySelectorAll('path').length,
            hasCountryClass: !!svg.querySelector('.country'),
            hasPathElements,
            isLargeEnough
          })
          
          if (hasPathElements && isLargeEnough) {
            mapContainer = svg.closest('.card-body') as HTMLElement ||
                         svg.closest('[data-tour="world-map"]') as HTMLElement ||
                         svg.parentElement as HTMLElement
            console.log('🗺️ Strategy 3 - found map container via SVG:', !!mapContainer)
            break
          }
        }
      }
      
      if (mapContainer) {
        // Enhanced content validation with detailed logging
        const svg = mapContainer.querySelector('svg')
        const legend = mapContainer.querySelector('.legend-container')
        const allPaths = svg?.querySelectorAll('path') || []
        const countriesWithClass = svg?.querySelectorAll('.country') || []
        const pathsWithFill = svg?.querySelectorAll('path[fill]:not([fill="none"])') || []
        const containerRect = mapContainer.getBoundingClientRect()
        
        console.log('🗺️ Detailed map validation:', {
          containerFound: !!mapContainer,
          containerSize: { width: containerRect.width, height: containerRect.height },
          svgFound: !!svg,
          svgSize: svg ? { width: svg.getBoundingClientRect().width, height: svg.getBoundingClientRect().height } : null,
          legendFound: !!legend,
          allPathsCount: allPaths.length,
          countriesWithClassCount: countriesWithClass.length,
          pathsWithFillCount: pathsWithFill.length,
          hasVisibleContent: containerRect.width > 0 && containerRect.height > 0
        })
        
        // More relaxed validation criteria
        const hasValidContainer = containerRect.width > 0 && containerRect.height > 0
        const hasValidSvg = svg && svg.getBoundingClientRect().width > 0
        const hasMapContent = allPaths.length > 10 || countriesWithClass.length > 0 || pathsWithFill.length > 5
        
        console.log('🗺️ Validation results:', {
          hasValidContainer,
          hasValidSvg,
          hasMapContent,
          requiresLegend: !!legend
        })
        
        // Accept if we have a valid container with SVG and map content (legend is optional)
        if (hasValidContainer && hasValidSvg && hasMapContent) {
          console.log('✅ Map validation passed! Container ready for capture')
          
          // Brief wait for any final rendering
          await new Promise(resolve => setTimeout(resolve, 500))
          return mapContainer
        } else {
          console.log('❌ Map validation failed, continuing to wait...')
        }
      } else {
        console.log('❌ No map container found in any strategy')
      }
      
      console.log('⏳ Map not ready, waiting 500ms...')
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.warn('⚠️ Map rendering timeout after', maxWait / 1000, 'seconds')
    
    // Final attempt - just find any container that might work
    console.log('🗺️ Final attempt - looking for any viable container...')
    const fallbackContainers = [
      document.querySelector('[data-tour="world-map"]'),
      document.querySelector('.card-body'),
      document.querySelector('.world-map-visualization'),
      document.querySelector('.world-map-container')
    ]
    
    for (const container of fallbackContainers) {
      if (container) {
        const rect = (container as HTMLElement).getBoundingClientRect()
        console.log('🗺️ Fallback container found:', container.className, 'size:', rect.width, 'x', rect.height)
        if (rect.width > 0 && rect.height > 0) {
          return container as HTMLElement
        }
      }
    }
    
    return null
  }

  /**
   * Aggressive fallback to find any container that might contain the map
   */
  const attemptFallbackCapture = async (): Promise<HTMLElement | null> => {
    console.log('🚨 Attempting aggressive fallback capture...')
    
    // Strategy 1: Just find the first card-body or main container that has reasonable size
    const potentialContainers = [
      document.querySelector('[data-tour="world-map"]'),
      document.querySelector('.world-map-visualization'),
      document.querySelector('.card-body'),
      document.querySelector('main'),
      document.querySelector('#app'),
      document.querySelector('.dashboard-container')
    ]
    
    for (const container of potentialContainers) {
      if (container) {
        const rect = (container as HTMLElement).getBoundingClientRect()
        const hasAnyContent = container.children.length > 0
        console.log('🚨 Fallback candidate:', {
          selector: container.tagName + (container.className ? '.' + container.className.split(' ')[0] : ''),
          size: `${rect.width}x${rect.height}`,
          hasContent: hasAnyContent,
          childCount: container.children.length
        })
        
        if (rect.width > 200 && rect.height > 200 && hasAnyContent) {
          console.log('🚨 Selected fallback container:', container)
          return container as HTMLElement
        }
      }
    }
    
    // Strategy 2: Find any large SVG and capture its parent
    const svgs = document.querySelectorAll('svg')
    for (const svg of svgs) {
      const rect = svg.getBoundingClientRect()
      if (rect.width > 300 && rect.height > 200) {
        console.log('🚨 Found large SVG, using parent container')
        const parent = svg.closest('div') || svg.parentElement
        if (parent) {
          return parent as HTMLElement
        }
      }
    }
    
    console.log('🚨 No fallback container found')
    return null
  }

  /**
   * Generate a comprehensive PDF report of the current dashboard state
   */
  const exportDashboardToPDF = async (initialData?: DashboardData, options: ExportOptions = {}) => {
    isExporting.value = true
    exportProgress.value = 0
    exportError.value = null

    try {
      console.log('🚀 Starting comprehensive PDF export...')
      exportProgress.value = 5

      // Step 1: Wait for data and components
      const { dashboardData } = await waitForDataAndComponents()
      exportProgress.value = 20
      
      // Validate data
      if (!dashboardData.globalStats?.total && dashboardData.globalStats?.total !== 0) {
        throw new Error('No data available for export. Please ensure data is loaded.')
      }
      
      console.log('📊 Export data validated:', dashboardData)
      exportProgress.value = 30

      // Step 2: Wait for map rendering (with fallback)
      const mapContainer = await waitForMapRendering()
      exportProgress.value = 40
      
      // If map waiting timed out, try immediate capture of visible elements
      if (!mapContainer) {
        console.log('🗺️ Map wait timed out, attempting immediate capture of visible elements...')
        debugCurrentDOMState()
      }

      // Step 3: Initialize PDF document
      const pdf = new jsPDF({
        orientation: options.orientation || 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      pdf.setProperties({
        title: 'OpenFoodMap - Dashboard Report',
        subject: `Agricultural Data Report - ${dashboardData.selectedProduct || 'All Products'} (${dashboardData.selectedYear || new Date().getFullYear()})`,
        author: 'OpenFoodMap',
        creator: 'OpenFoodMap Application'
      })

      let yPosition = 20
      exportProgress.value = 50

      // Add content sections
      yPosition = await addHeader(pdf, dashboardData, yPosition)
      exportProgress.value = 60

      yPosition = await addOverviewCards(pdf, dashboardData, yPosition)
      exportProgress.value = 70

      yPosition = await addMetricsAndCountries(pdf, dashboardData, yPosition)
      exportProgress.value = 80

      if (mapContainer) {
        yPosition = await addWorldMapImage(pdf, mapContainer, yPosition)
      } else {
        // Try aggressive fallback capture
        const fallbackContainer = await attemptFallbackCapture()
        if (fallbackContainer) {
          console.log('🗺️ Using fallback container for map capture')
          yPosition = await addWorldMapImage(pdf, fallbackContainer, yPosition)
        } else {
          yPosition = await addMapPlaceholder(pdf, yPosition)
        }
      }
      exportProgress.value = 90

      addFooter(pdf)
      exportProgress.value = 95

      // Generate filename and save
      const timestamp = new Date().toISOString().split('T')[0]
      const productName = dashboardData.selectedProduct?.replace(/[^a-zA-Z0-9]/g, '_') || 'AllProducts'
      const filename = options.filename || `D2_Dashboard_${productName}_${dashboardData.selectedYear || new Date().getFullYear()}_${timestamp}.pdf`

      pdf.save(filename)
      exportProgress.value = 100

      console.log('✅ PDF export completed successfully')

    } catch (error) {
      console.error('❌ PDF Export Error:', error)
      exportError.value = error instanceof Error ? error.message : 'Failed to export PDF'
      throw error
    } finally {
      isExporting.value = false
      setTimeout(() => {
        exportProgress.value = 0
      }, 2000)
    }
  }

  /**
   * Add header section to PDF
   */
  const addHeader = async (pdf: jsPDF, data: DashboardData, yPos: number): Promise<number> => {
    // Title
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('OpenFoodMap - Dashboard Report', 20, yPos)
    yPos += 15

    // Subtitle with current selection
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    const subtitle = `${data.selectedProduct || 'All Products'} - ${getMetricDisplayName(data.selectedMetric)} - ${data.selectedYear || new Date().getFullYear()}`
    pdf.text(subtitle, 20, yPos)
    yPos += 10

    // Date generated
    pdf.setFontSize(10)
    pdf.setTextColor(128, 128, 128)
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
    yPos += 15

    // Add separator line
    pdf.setDrawColor(200, 200, 200)
    pdf.line(20, yPos, 190, yPos)
    yPos += 10

    return yPos
  }

  /**
   * Add overview cards section to PDF
   */
  const addOverviewCards = async (pdf: jsPDF, data: DashboardData, yPos: number): Promise<number> => {
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0, 0, 0)
    pdf.text('Overview Statistics', 20, yPos)
    yPos += 10

    // Calculate card positions (2x2 grid)
    const cardWidth = 80
    const cardHeight = 25
    const cardSpacing = 10
    const startX = 20

    const cards = [
      {
        title: getMetricDisplayName(data.selectedMetric),
        value: formatAgricultureValue(data.globalStats?.total || 0, { 
          unit: data.globalStats?.unit || '1000 t', 
          showUnit: true 
        }),
        subtitle: formatProductName(data.selectedProduct || ''),
        x: startX,
        y: yPos
      },
      {
        title: getCountriesTitle(data.selectedMetric),
        value: (data.globalStats?.countries || 0).toString(),
        subtitle: `with ${getDataTypeLabel(data.selectedMetric)}`,
        x: startX + cardWidth + cardSpacing,
        y: yPos
      },
      {
        title: getTopProducerTitle(data.selectedMetric),
        value: data.globalStats?.topProducer || 'N/A',
        subtitle: data.selectedYear?.toString() || new Date().getFullYear().toString(),
        x: startX,
        y: yPos + cardHeight + cardSpacing
      },
      {
        title: 'Feed Usage',
        value: (data.feedUsage?.percentage ?? 0) > 0 ? `${data.feedUsage?.percentage}%` : 'N/A',
        subtitle: (data.feedUsage?.amount ?? 0) > 0 ? 
          formatAgricultureValue(data.feedUsage?.amount || 0, { 
            unit: data.feedUsage?.unit || '1000 t', 
            showUnit: true 
          }) : 'Not used as feed',
        x: startX + cardWidth + cardSpacing,
        y: yPos + cardHeight + cardSpacing
      }
    ]

    // Draw cards
    cards.forEach(card => {
      // Card background
      pdf.setFillColor(248, 250, 252)
      pdf.setDrawColor(226, 232, 240)
      pdf.rect(card.x, card.y, cardWidth, cardHeight, 'FD')

      // Card title
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(75, 85, 99)
      pdf.text(card.title, card.x + 5, card.y + 8)

      // Card value
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      const valueLines = pdf.splitTextToSize(card.value, cardWidth - 10)
      pdf.text(valueLines, card.x + 5, card.y + 16)

      // Card subtitle
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(107, 114, 128)
      const subtitleLines = pdf.splitTextToSize(card.subtitle, cardWidth - 10)
      pdf.text(subtitleLines, card.x + 5, card.y + 22)
    })

    return yPos + (cardHeight * 2) + cardSpacing + 15
  }

  /**
   * Add metrics and selected countries section
   */
  const addMetricsAndCountries = async (pdf: jsPDF, data: DashboardData, yPos: number): Promise<number> => {
    // Check if we need a new page
    if (yPos > 200) {
      pdf.addPage()
      yPos = 20
    }

    // Current selections section
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0, 0, 0)
    pdf.text('Current Selection & Top Countries', 20, yPos)
    yPos += 15

    // Current selections box
    pdf.setFillColor(240, 249, 255)
    pdf.setDrawColor(147, 197, 253)
    pdf.rect(20, yPos, 170, 25, 'FD')

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(30, 64, 175)
    pdf.text('Selected Filters:', 25, yPos + 8)

    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(0, 0, 0)
    pdf.text(`Product: ${formatProductName(data.selectedProduct || '')}`, 25, yPos + 14)
    pdf.text(`Metric: ${getMetricDisplayName(data.selectedMetric)}`, 25, yPos + 18)
    pdf.text(`Year: ${data.selectedYear || new Date().getFullYear()}`, 25, yPos + 22)

    if (data.selectedCountry) {
      pdf.text(`Selected Country: ${data.selectedCountry}`, 100, yPos + 14)
    }

    yPos += 35

    // Top countries list
    if (data.topCountries && data.topCountries.length > 0) {
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Top 10 Countries', 20, yPos)
      yPos += 10

      // Table headers
      pdf.setFillColor(249, 250, 251)
      pdf.setDrawColor(209, 213, 219)
      pdf.rect(20, yPos, 170, 8, 'FD')

      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(55, 65, 81)
      pdf.text('Rank', 25, yPos + 5)
      pdf.text('Country', 45, yPos + 5)
      pdf.text('Value', 140, yPos + 5)
      yPos += 8

      // Table rows
      data.topCountries.slice(0, 8).forEach((country, index) => {
        const rowY = yPos + (index * 6)
        
        // Alternate row background
        if (index % 2 === 0) {
          pdf.setFillColor(249, 250, 251)
          pdf.rect(20, rowY, 170, 6, 'F')
        }

        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(0, 0, 0)
        pdf.text((index + 1).toString(), 25, rowY + 4)
        
        // Truncate country name if too long
        const countryName = country.country.length > 25 ? country.country.substring(0, 22) + '...' : country.country
        pdf.text(countryName, 45, rowY + 4)
        
        const formattedValue = formatAgricultureValue(country.value, { 
          unit: country.unit || '1000 t', 
          showUnit: true 
        })
        pdf.text(formattedValue, 140, rowY + 4)
      })

      yPos += (Math.min(data.topCountries.length, 8) * 6) + 10
    }

    return yPos
  }

  /**
   * Validate canvas content to ensure it's not empty
   */
  const validateCanvasContent = (canvas: HTMLCanvasElement): boolean => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return false
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    // Check if canvas is not just white/transparent
    let hasContent = false
    let colorPixels = 0
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      
      // Skip fully transparent pixels
      if (a === 0) continue
      
      // Count non-white pixels (allowing for slight variations)
      if (r < 250 || g < 250 || b < 250) {
        colorPixels++
        if (colorPixels > 100) { // If we find enough colored pixels
          hasContent = true
          break
        }
      }
    }
    
    const contentPercentage = (colorPixels / (canvas.width * canvas.height)) * 100
    console.log('🗺️ Canvas content validation:', {
      hasContent,
      colorPixels,
      totalPixels: canvas.width * canvas.height,
      contentPercentage: contentPercentage.toFixed(2) + '%'
    })
    
    return hasContent
  }

  /**
   * Capture and add world map image to PDF
   */
  const addWorldMapImage = async (pdf: jsPDF, mapContainer: HTMLElement, yPos: number): Promise<number> => {
    try {
      console.log('🗺️ Capturing map image...')

      // Check if we need a new page for the map
      if (yPos > 120) {
        pdf.addPage()
        yPos = 20
      }

      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      pdf.text('World Map Visualization & Legend', 20, yPos)
      yPos += 15

      // Ensure container is visible and get dimensions
      const containerRect = mapContainer.getBoundingClientRect()
      console.log('🗺️ Container dimensions:', containerRect)

      if (containerRect.width === 0 || containerRect.height === 0) {
        throw new Error('Map container has zero dimensions')
      }

      // Enhanced capture attempts with different strategies
      let canvas: HTMLCanvasElement | null = null
      let captureSuccess = false

      // Strategy 1: Standard html2canvas with SVG optimizations
      try {
        console.log('🗺️ Attempt 1: Standard html2canvas with SVG optimizations')
        canvas = await html2canvas(mapContainer, {
          backgroundColor: '#ffffff',
          scale: 3, // Higher scale for better quality
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: Math.max(containerRect.width, 800),
          height: Math.max(containerRect.height, 600),
          foreignObjectRendering: true,
          imageTimeout: 15000,
          ignoreElements: (element) => {
            // Skip certain elements that might interfere
            return element.classList.contains('tooltip') || 
                   element.classList.contains('loading')
          },
          onclone: (clonedDoc, element) => {
            // Force all SVGs to be visible and properly sized
            const svgs = element.querySelectorAll('svg')
            svgs.forEach(svg => {
              const rect = svg.getBoundingClientRect()
              if (rect.width > 0 && rect.height > 0) {
                svg.setAttribute('width', rect.width.toString())
                svg.setAttribute('height', rect.height.toString())
                svg.style.display = 'block'
                svg.style.visibility = 'visible'
              }
              
              // Ensure all paths are visible
              const paths = svg.querySelectorAll('path')
              paths.forEach(path => {
                path.style.visibility = 'visible'
                path.style.display = 'block'
              })
            })
            
            // Make sure the container itself is visible
            element.style.position = 'static'
            element.style.transform = 'none'
            element.style.visibility = 'visible'
            element.style.display = 'block'
          }
        })

        if (canvas && validateCanvasContent(canvas)) {
          console.log('✅ Strategy 1 successful - canvas has content')
          captureSuccess = true
        } else {
          console.log('❌ Strategy 1 failed - canvas empty or null')
        }
      } catch (error) {
        console.log('❌ Strategy 1 failed with error:', error)
      }

      // Strategy 2: Capture just the SVG element if strategy 1 failed
      if (!captureSuccess) {
        try {
          console.log('🗺️ Attempt 2: Direct SVG capture')
          const svg = mapContainer.querySelector('svg')
          if (svg) {
            canvas = await html2canvas(svg as HTMLElement, {
              backgroundColor: '#ffffff',
              scale: 3,
              useCORS: true,
              allowTaint: true,
              logging: false,
              onclone: (clonedDoc, element) => {
                element.style.visibility = 'visible'
                element.style.display = 'block'
                const paths = element.querySelectorAll('path')
                paths.forEach(path => {
                  path.style.visibility = 'visible'
                })
              }
            })

            if (canvas && validateCanvasContent(canvas)) {
              console.log('✅ Strategy 2 successful - SVG captured with content')
              captureSuccess = true
            }
          }
        } catch (error) {
          console.log('❌ Strategy 2 failed:', error)
        }
      }

      // Strategy 3: Wait and retry with forced rendering
      if (!captureSuccess) {
        try {
          console.log('🗺️ Attempt 3: Wait and retry with forced rendering')
          
          // Force a repaint
          mapContainer.style.transform = 'translateZ(0)'
          await new Promise(resolve => setTimeout(resolve, 1000))
          mapContainer.style.transform = ''

          canvas = await html2canvas(mapContainer, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: true, // Enable logging for debugging
            removeContainer: false,
            onclone: (clonedDoc, element) => {
              // Force everything to be visible
              element.style.opacity = '1'
              element.style.visibility = 'visible'
              element.style.display = 'block'
              
              const allElements = element.querySelectorAll('*')
              allElements.forEach(el => {
                const htmlEl = el as HTMLElement
                htmlEl.style.visibility = 'visible'
                htmlEl.style.opacity = '1'
              })
            }
          })

          if (canvas && validateCanvasContent(canvas)) {
            console.log('✅ Strategy 3 successful')
            captureSuccess = true
          }
        } catch (error) {
          console.log('❌ Strategy 3 failed:', error)
        }
      }

      if (!canvas || !captureSuccess) {
        throw new Error('All capture strategies failed or produced empty canvas')
      }

      console.log('🗺️ Final canvas captured:', canvas.width, 'x', canvas.height)

      // Calculate proper sizing for PDF
      const maxWidth = 170
      const maxHeight = 180
      
      let imgWidth = maxWidth
      let imgHeight = (canvas.height * imgWidth) / canvas.width
      
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight
        imgWidth = (canvas.width * imgHeight) / canvas.height
      }

      // Center the image horizontally
      const xOffset = (210 - imgWidth) / 2

      // Add image to PDF with quality validation
      const imgData = canvas.toDataURL('image/png', 0.95)
      
      // Check if image data looks valid (not just a tiny header)
      if (imgData.length < 1000) {
        throw new Error('Generated image data appears to be empty')
      }
      
      console.log('🗺️ Image data size:', imgData.length, 'characters')
      
      pdf.addImage(imgData, 'PNG', xOffset, yPos, imgWidth, imgHeight)
      yPos += imgHeight + 10

      // Add a note about the visualization
      pdf.setFontSize(9)
      pdf.setTextColor(100, 100, 100)
      pdf.text('Map includes legend, color scheme, and current data filters', 20, yPos)
      yPos += 10

      console.log('✅ Map successfully added to PDF')

    } catch (error) {
      console.error('❌ Failed to capture map image:', error)
      return addMapPlaceholder(pdf, yPos)
    }

    return yPos
  }

  /**
   * Add map placeholder when capture fails
   */
  const addMapPlaceholder = async (pdf: jsPDF, yPos: number): Promise<number> => {
    if (yPos > 120) {
      pdf.addPage()
      yPos = 20
    }

    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0, 0, 0)
    pdf.text('World Map Visualization', 20, yPos)
    yPos += 15

    pdf.setFontSize(10)
    pdf.setTextColor(128, 128, 128)
    pdf.text('Map visualization could not be captured', 20, yPos)
    pdf.text('Please ensure the map is visible and fully loaded before export', 20, yPos + 5)
    yPos += 25

    return yPos
  }

  /**
   * Add footer to PDF
   */
  const addFooter = (pdf: jsPDF) => {
    const pageCount = (pdf as any).internal.getNumberOfPages()
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      
      // Page number
      pdf.setFontSize(8)
      pdf.setTextColor(128, 128, 128)
      pdf.text(`Page ${i} of ${pageCount}`, 170, 285)
      
      // Footer text
      pdf.text('Generated by OpenFoodMap', 20, 285)
      pdf.text('Data source: FAO Statistics', 20, 290)
    }
  }

  // Helper functions
  const getMetricDisplayName = (metric?: string) => {
    const titles = {
      production: 'Total Production',
      import_quantity: 'Total Imports',
      export_quantity: 'Total Exports',
      domestic_supply_quantity: 'Domestic Supply',
      food_supply_kcal: 'Calorie Supply',
      feed: 'Feed Usage'
    }
    return titles[metric as keyof typeof titles] || 'Total'
  }

  const getCountriesTitle = (metric?: string) => {
    const titles = {
      production: 'Producing Countries',
      import_quantity: 'Importing Countries',
      export_quantity: 'Exporting Countries',
      domestic_supply_quantity: 'Supplied Countries',
      food_supply_kcal: 'Countries with Calorie Data',
      feed: 'Countries with Feed Data'
    }
    return titles[metric as keyof typeof titles] || 'Countries with Data'
  }

  const getTopProducerTitle = (metric?: string) => {
    const titles = {
      production: 'Top Producer',
      import_quantity: 'Top Importer',
      export_quantity: 'Top Exporter',
      domestic_supply_quantity: 'Top Consumer',
      food_supply_kcal: 'Highest Calorie Supply',
      feed: 'Top Feed User'
    }
    return titles[metric as keyof typeof titles] || 'Top Country'
  }

  const getDataTypeLabel = (metric?: string) => {
    const labels = {
      production: 'production data',
      import_quantity: 'import data',
      export_quantity: 'export data',
      domestic_supply_quantity: 'supply data',
      food_supply_kcal: 'calorie data',
      feed: 'feed data'
    }
    return labels[metric as keyof typeof labels] || 'data'
  }

  const formatProductName = (productCode: string) => {
    if (productCode === 'All') return 'All Products'
    
    const productNames: Record<string, string> = {
      'cassava_and_products': 'Cassava',
      'fruits_-_excluding_wine': 'Fruits',
      'maize_and_products': 'Maize',
      'milk_-_excluding_butter': 'Milk',
      'nuts_and_products': 'Nuts',
      'potatoes_and_products': 'Potatoes',
      'pulses': 'Pulses',
      'rice_and_products': 'Rice',
      'sugar_and_sweeteners': 'Sugar',
      'vegetables': 'Vegetables',
      'wheat_and_products': 'Wheat'
    }
    return productNames[productCode] || productCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return {
    isExporting: computed(() => isExporting.value),
    exportProgress: computed(() => exportProgress.value),
    exportError: computed(() => exportError.value),
    exportDashboardToPDF
  }
}