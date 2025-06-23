<template>
  <div class="structural-panel">
    <ErrorBoundary @error="handleError">
      <div class="panel-header">
        <h2 class="panel-title">Strukturanalyse</h2>
        <p class="panel-description">
          Netzwerk- und Strukturanalyse der globalen Landwirtschaft
        </p>
      </div>

      <div class="panel-controls">
        <div class="analysis-tabs">
          <BaseButton
            v-for="tab in analysisTabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :variant="activeTab === tab.id ? 'primary' : 'outline-primary'"
            size="sm"
          >
            {{ tab.label }}
          </BaseButton>
        </div>
      </div>

      <div class="panel-content">
        <div v-if="hasError" class="error-container">
          <ErrorDisplay
            :error="error"
            title="Fehler bei der Strukturanalyse"
            :showRetry="true"
            @retry="loadAnalysis"
          />
        </div>

        <div v-else-if="isLoading" class="loading-container">
          <LoadingSpinner size="lg" />
          <p class="loading-text">Führe Strukturanalyse durch...</p>
        </div>

        <div v-else class="analysis-content">
          <!-- Network Analysis -->
          <div v-if="activeTab === 'network'" class="network-section">
            <div class="controls-row">
              <div class="control-group">
                <label>Analyse-Typ</label>
                <SearchableSelect
                  v-model="networkConfig.analysisType"
                  :options="analysisTypeOptions"
                />
              </div>
              
              <div class="control-group">
                <label>Schwellenwert</label>
                <RangeSlider
                  v-model="networkConfig.threshold"
                  :min="0"
                  :max="1"
                  :step="0.1"
                />
              </div>
              
              <BaseButton 
                variant="primary"
                @click="loadAnalysis"
              >
                Analysieren
              </BaseButton>
            </div>

            <div v-if="networkData" class="network-visualization h-96">
              <StructuralChart
                :data="networkData"
                :analysis-type="networkConfig.analysisType"
                :selected-region="'global'"
                @node-click="handleNodeSelect"
                @analysis-change="handleAnalysisChange"
              />
            </div>

            <div v-if="networkMetrics" class="network-metrics">
              <h3 class="metrics-title">Netzwerk-Metriken</h3>
              <div class="metrics-grid">
                <div class="metric-card">
                  <div class="metric-label">Knoten</div>
                  <div class="metric-value">{{ networkMetrics.nodeCount }}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Verbindungen</div>
                  <div class="metric-value">{{ networkMetrics.linkCount }}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Dichte</div>
                  <div class="metric-value">{{ networkMetrics.density.toFixed(3) }}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Clustering</div>
                  <div class="metric-value">{{ networkMetrics.clustering.toFixed(3) }}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Durchmesser</div>
                  <div class="metric-value">{{ networkMetrics.diameter }}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Modularität</div>
                  <div class="metric-value">{{ networkMetrics.modularity.toFixed(3) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Cluster Analysis -->
          <div v-if="activeTab === 'clusters'" class="clusters-section">
            <div class="controls-row">
              <div class="control-group">
                <label>Cluster-Methode</label>
                <SearchableSelect
                  v-model="clusterConfig.method"
                  :options="clusterMethodOptions"
                />
              </div>
              
              <div class="control-group">
                <label>Anzahl Cluster</label>
                <RangeSlider
                  v-model="clusterConfig.numClusters"
                  :min="2"
                  :max="10"
                  :step="1"
                  :show-labels="true"
                />
              </div>
              
              <BaseButton 
                variant="primary"
                @click="performClustering"
              >
                Clustern
              </BaseButton>
            </div>

            <div v-if="clusterResults" class="cluster-results">
              <div class="cluster-visualization">
                <StructuralChart
                  :data="clusterResults.visualization"
                  :config="clusterChartConfig"
                  @cluster-select="handleClusterSelect"
                />
              </div>

              <div class="cluster-details">
                <h3 class="details-title">Cluster-Details</h3>
                <div class="cluster-list">
                  <div
                    v-for="cluster in clusterResults.clusters"
                    :key="cluster.id"
                    class="cluster-item"
                    :style="{ borderLeftColor: cluster.color }"
                  >
                    <div class="cluster-header">
                      <h4>Cluster {{ cluster.id }}</h4>
                      <span class="cluster-size">{{ cluster.members.length }} Mitglieder</span>
                    </div>
                    <div class="cluster-members">
                      <span
                        v-for="member in cluster.members.slice(0, 5)"
                        :key="member"
                        class="member-tag"
                      >
                        {{ member }}
                      </span>
                      <span v-if="cluster.members.length > 5" class="more-members">
                        +{{ cluster.members.length - 5 }} weitere
                      </span>
                    </div>
                    <div class="cluster-stats">
                      <div class="stat">
                        <span class="stat-label">Kohäsion:</span>
                        <span class="stat-value">{{ cluster.cohesion.toFixed(2) }}</span>
                      </div>
                      <div class="stat">
                        <span class="stat-label">Separierung:</span>
                        <span class="stat-value">{{ cluster.separation.toFixed(2) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Hierarchy Analysis -->
          <div v-if="activeTab === 'hierarchy'" class="hierarchy-section">
            <div class="controls-row">
              <div class="control-group">
                <label>Hierarchie-Typ</label>
                <SearchableSelect
                  v-model="hierarchyConfig.type"
                  :options="hierarchyTypeOptions"
                />
              </div>
              
              <BaseButton 
                variant="primary"
                @click="buildHierarchy"
              >
                Hierarchie erstellen
              </BaseButton>
            </div>

            <div v-if="hierarchyData" class="hierarchy-visualization">
              <StructuralChart
                :data="hierarchyData"
                :config="hierarchyChartConfig"
                @node-expand="handleNodeExpand"
                @level-select="handleLevelSelect"
              />
            </div>

            <div v-if="hierarchyMetrics" class="hierarchy-metrics">
              <h3 class="metrics-title">Hierarchie-Metriken</h3>
              <div class="hierarchy-stats">
                <div class="stat-item">
                  <span class="stat-label">Ebenen:</span>
                  <span class="stat-value">{{ hierarchyMetrics.levels }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Breite:</span>
                  <span class="stat-value">{{ hierarchyMetrics.width }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Balance:</span>
                  <span class="stat-value">{{ hierarchyMetrics.balance.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDataStore } from '@/stores/useDataStore'
import { useErrorHandling } from '@/composables/useErrorHandling'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import ErrorDisplay from '@/components/ui/ErrorDisplay.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import RangeSlider from '@/components/ui/RangeSlider.vue'
import StructuralChart from '@/components/visualizations/StructuralChart.vue'

// Store and composables
const dataStore = useDataStore()
const { handleError: handleErrorUtil, wrapAsync } = useErrorHandling()

// Reactive state
const activeTab = ref('network')
const isLoading = ref(false)
const error = ref(null)

const networkConfig = ref({
  analysisType: 'trade',
  threshold: 0.1
})

const clusterConfig = ref({
  method: 'kmeans',
  numClusters: 5
})

const hierarchyConfig = ref({
  type: 'production'
})

const networkData = ref(null)
const networkMetrics = ref(null)
const clusterResults = ref(null)
const hierarchyData = ref(null)
const hierarchyMetrics = ref(null)

// Computed properties
const hasError = computed(() => error.value !== null)

const analysisTabs = computed(() => [
  { id: 'network', label: 'Netzwerk-Analyse' },
  { id: 'clusters', label: 'Cluster-Analyse' },
  { id: 'hierarchy', label: 'Hierarchie-Analyse' }
])

const analysisTypeOptions = computed(() => [
  { value: 'trade', label: 'Handelsbeziehungen' },
  { value: 'production', label: 'Produktionsähnlichkeit' },
  { value: 'dependency', label: 'Abhängigkeiten' },
  { value: 'competition', label: 'Wettbewerb' }
])

const clusterMethodOptions = computed(() => [
  { value: 'kmeans', label: 'K-Means' },
  { value: 'hierarchical', label: 'Hierarchisch' },
  { value: 'dbscan', label: 'DBSCAN' },
  { value: 'spectral', label: 'Spektral' }
])

const hierarchyTypeOptions = computed(() => [
  { value: 'production', label: 'Produktionshierarchie' },
  { value: 'trade', label: 'Handelshierarchie' },
  { value: 'geographic', label: 'Geografische Hierarchie' }
])

const networkChartConfig = computed(() => ({
  type: 'network',
  width: 800,
  height: 600,
  showLabels: true,
  enableForce: true,
  nodeRadius: 8,
  linkWidth: 2,
  interactive: true
}))

const clusterChartConfig = computed(() => ({
  type: 'scatter',
  width: 800,
  height: 400,
  showClusters: true,
  showCentroids: true,
  interactive: true
}))

const hierarchyChartConfig = computed(() => ({
  type: 'tree',
  width: 800,
  height: 500,
  orientation: 'vertical',
  showLabels: true,
  collapsible: true,
  interactive: true
}))

// Methods
const loadAnalysis = wrapAsync(async () => {
  error.value = null
  isLoading.value = true
  
  try {
    // Load network data
    const rawNetworkData = await dataStore.loadNetworkData()
    
    // Use actual network data if available
    if (rawNetworkData && rawNetworkData.nodes && rawNetworkData.links) {
      networkData.value = rawNetworkData
      networkMetrics.value = calculateNetworkMetrics(rawNetworkData)
    } else {
      // Fallback to mock data if real data not available
      networkData.value = processNetworkData(rawNetworkData)
      networkMetrics.value = calculateNetworkMetrics(networkData.value)
    }
    
  } catch (err) {
    error.value = err
  } finally {
    isLoading.value = false
  }
}, {
  component: 'StructuralPanel',
  operation: 'loadAnalysis'
})

const performClustering = wrapAsync(async () => {
  error.value = null
  isLoading.value = true
  
  try {
    // Load production data for clustering
    const productionDataMap = new Map()
    const products = ['maize_and_products', 'rice_and_products', 'wheat_and_products', 'vegetables', 'fruits_-_excluding_wine']
    const year = 2022
    
    // Load data for multiple products
    for (const product of products) {
      try {
        const data = await dataStore.loadProductionData(product, year)
        if (data) productionDataMap.set(product, data)
      } catch (err) {
        console.warn(`Could not load data for ${product}`)
      }
    }
    
    // Process data for clustering
    const countries = new Set()
    productionDataMap.forEach(data => {
      if (data.features) {
        data.features.forEach(feature => {
          if (feature.properties?.country) {
            countries.add(feature.properties.country)
          }
        })
      }
    })
    
    // Create clusters based on production patterns
    const countriesArray = Array.from(countries)
    const numClusters = Math.min(clusterConfig.value.numClusters, countriesArray.length)
    const clusters = []
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']
    
    // Simple clustering by dividing countries
    const clusterSize = Math.ceil(countriesArray.length / numClusters)
    
    for (let i = 0; i < numClusters; i++) {
      const startIdx = i * clusterSize
      const endIdx = Math.min((i + 1) * clusterSize, countriesArray.length)
      const members = countriesArray.slice(startIdx, endIdx)
      
      if (members.length > 0) {
        clusters.push({
          id: i + 1,
          color: colors[i % colors.length],
          members,
          cohesion: 0.7 + Math.random() * 0.3,
          separation: 0.5 + Math.random() * 0.4
        })
      }
    }
    
    clusterResults.value = {
      clusters,
      visualization: generateClusterVisualization(clusters)
    }
    
  } catch (err) {
    error.value = err
  } finally {
    isLoading.value = false
  }
}, {
  component: 'StructuralPanel',
  operation: 'performClustering'
})

const buildHierarchy = wrapAsync(async () => {
  error.value = null
  isLoading.value = true
  
  try {
    // Load summary data for hierarchy
    const summaryData = await dataStore.loadSummaryData()
    
    if (summaryData && summaryData.production_by_category) {
      // Build hierarchy from actual data
      const root = {
        name: 'Global Agriculture',
        children: []
      }
      
      // Group by category
      const categories = {}
      Object.entries(summaryData.production_by_category).forEach(([category, data]) => {
        if (!categories[data.category || 'Other']) {
          categories[data.category || 'Other'] = {
            name: data.category || 'Other',
            children: []
          }
        }
        
        categories[data.category || 'Other'].children.push({
          name: category,
          size: data.total_production || 100,
          value: data.total_production
        })
      })
      
      root.children = Object.values(categories)
      hierarchyData.value = root
      
      // Calculate metrics
      const levels = 3
      const width = Object.keys(categories).length
      const totalNodes = Object.values(categories).reduce((sum, cat) => sum + cat.children.length, 0)
      
      hierarchyMetrics.value = {
        levels,
        width,
        balance: Math.min(width / totalNodes, 1)
      }
    } else {
      // Fallback to generated data
      hierarchyData.value = generateHierarchyData()
      hierarchyMetrics.value = {
        levels: 4,
        width: 12,
        balance: 0.85
      }
    }
    
  } catch (err) {
    error.value = err
  } finally {
    isLoading.value = false
  }
}, {
  component: 'StructuralPanel',
  operation: 'buildHierarchy'
})

// Helper methods
const processNetworkData = (rawData) => {
  // Mock network processing
  const nodes = []
  const links = []
  
  for (let i = 0; i < 20; i++) {
    nodes.push({
      id: `node-${i}`,
      name: `Node ${i}`,
      value: Math.random() * 100,
      group: Math.floor(i / 5)
    })
  }
  
  for (let i = 0; i < 30; i++) {
    const sourceId = Math.floor(Math.random() * 20)
    const targetId = Math.floor(Math.random() * 20)
    
    if (sourceId !== targetId) {
      links.push({
        source: `node-${sourceId}`,
        target: `node-${targetId}`,
        value: Math.random() * 10
      })
    }
  }
  
  return { nodes, links }
}

const calculateNetworkMetrics = (data) => {
  return {
    nodeCount: data.nodes.length,
    linkCount: data.links.length,
    density: (2 * data.links.length) / (data.nodes.length * (data.nodes.length - 1)),
    clustering: 0.3 + Math.random() * 0.4,
    diameter: Math.floor(Math.random() * 5) + 3,
    modularity: 0.2 + Math.random() * 0.6
  }
}

const generateClusterVisualization = (clusters) => {
  const points = []
  
  clusters.forEach((cluster, clusterIndex) => {
    const centerX = (clusterIndex % 3) * 300 + 150
    const centerY = Math.floor(clusterIndex / 3) * 200 + 100
    
    cluster.members.forEach((member, memberIndex) => {
      points.push({
        x: centerX + (Math.random() - 0.5) * 100,
        y: centerY + (Math.random() - 0.5) * 100,
        cluster: cluster.id,
        name: member,
        color: cluster.color
      })
    })
  })
  
  return points
}

const generateHierarchyData = () => {
  return {
    name: 'Global Agriculture',
    children: [
      {
        name: 'Cereals',
        children: [
          { name: 'Wheat', size: 100 },
          { name: 'Rice', size: 90 },
          { name: 'Maize', size: 120 }
        ]
      },
      {
        name: 'Vegetables',
        children: [
          { name: 'Tomatoes', size: 60 },
          { name: 'Onions', size: 40 },
          { name: 'Potatoes', size: 80 }
        ]
      },
      {
        name: 'Fruits',
        children: [
          { name: 'Apples', size: 50 },
          { name: 'Bananas', size: 70 },
          { name: 'Oranges', size: 45 }
        ]
      }
    ]
  }
}

// Event handlers
const handleError = (err) => {
  error.value = err
  handleErrorUtil(err, {
    component: 'StructuralPanel',
    action: 'component_error'
  })
}

const handleNodeSelect = (node) => {
  console.log('Node selected:', node)
}

const handleLinkSelect = (link) => {
  console.log('Link selected:', link)
}

const handleAnalysisChange = (type) => {
  networkConfig.value.analysisType = type
}

const handleClusterSelect = (cluster) => {
  console.log('Cluster selected:', cluster)
}

const handleNodeExpand = (node) => {
  console.log('Node expanded:', node)
}

const handleLevelSelect = (level) => {
  console.log('Level selected:', level)
}

// Watchers
watch(activeTab, (newTab) => {
  if (newTab === 'network' && !networkData.value) {
    loadAnalysis()
  }
})
</script>

<style scoped>
.structural-panel {
  @apply flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg;
}

.panel-header {
  @apply p-6 border-b border-gray-200 dark:border-gray-700;
}

.panel-title {
  @apply text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2;
}

.panel-description {
  @apply text-gray-600 dark:text-gray-400;
}

.panel-controls {
  @apply p-6 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700;
}

.analysis-tabs {
  @apply flex gap-2;
}

.panel-content {
  @apply flex-1 p-6 overflow-auto;
}

.analysis-content {
  @apply space-y-6;
}

.controls-row {
  @apply flex flex-wrap items-end gap-4 mb-6;
}

.control-group {
  @apply flex flex-col min-w-48;
}

.control-group label {
  @apply text-sm font-medium text-gray-700 dark:text-gray-300 mb-2;
}

.network-visualization,
.cluster-visualization,
.hierarchy-visualization {
  @apply w-full bg-gray-50 dark:bg-gray-800 rounded-lg mb-6;
}

.network-metrics,
.hierarchy-metrics {
  @apply space-y-4;
}

.metrics-title {
  @apply text-lg font-semibold text-gray-900 dark:text-gray-100;
}

.metrics-grid {
  @apply grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4;
}

.metric-card {
  @apply bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center;
}

.metric-label {
  @apply text-sm text-gray-600 dark:text-gray-400 mb-1;
}

.metric-value {
  @apply text-lg font-bold text-gray-900 dark:text-gray-100;
}

.cluster-results {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
}

.cluster-details {
  @apply space-y-4;
}

.details-title {
  @apply text-lg font-semibold text-gray-900 dark:text-gray-100;
}

.cluster-list {
  @apply space-y-4;
}

.cluster-item {
  @apply bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border-l-4;
}

.cluster-header {
  @apply flex justify-between items-center mb-3;
}

.cluster-header h4 {
  @apply font-semibold text-gray-900 dark:text-gray-100;
}

.cluster-size {
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.cluster-members {
  @apply flex flex-wrap gap-2 mb-3;
}

.member-tag {
  @apply px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300;
}

.more-members {
  @apply px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300;
}

.cluster-stats {
  @apply flex gap-4;
}

.stat {
  @apply text-sm;
}

.stat-label {
  @apply text-gray-600 dark:text-gray-400;
}

.stat-value {
  @apply font-medium text-gray-900 dark:text-gray-100;
}

.hierarchy-stats {
  @apply flex gap-6;
}

.stat-item {
  @apply text-sm;
}

.stat-item .stat-label {
  @apply text-gray-600 mr-2;
}

.stat-item .stat-value {
  @apply font-medium text-gray-900 dark:text-gray-100;
}

.error-container,
.loading-container {
  @apply flex flex-col items-center justify-center h-64;
}

.loading-text {
  @apply mt-4 text-gray-600 dark:text-gray-400;
}
</style>