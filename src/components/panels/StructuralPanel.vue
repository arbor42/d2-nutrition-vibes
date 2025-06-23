<template>
  <div class="structural-panel">
    <ErrorBoundary @error="handleError">
      <!-- Header -->
      <div class="panel-header">
        <h2 class="panel-title">Strukturanalyse</h2>
        <p class="panel-description">
          Globale Handelsbeziehungen und Netzwerkanalyse
        </p>
      </div>

      <!-- Main Content -->
      <div class="panel-content">
        <!-- Tab Navigation -->
        <div class="tab-navigation">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'tab-button',
              activeTab === tab.id ? 'active' : ''
            ]"
          >
            <component :is="tab.icon" class="tab-icon" />
            <span>{{ tab.label }}</span>
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="loading-container">
          <LoadingSpinner size="lg" />
          <p class="loading-text">Lade Handelsdaten...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-container">
          <ErrorDisplay
            :error="error"
            title="Fehler beim Laden der Daten"
            :showRetry="true"
            @retry="loadData"
          />
        </div>

        <!-- Content -->
        <div v-else class="tab-content">
          <!-- Network View -->
          <div v-if="activeTab === 'network'" class="network-view">
            <div class="view-header">
              <h3>Handelsnetzwerk</h3>
              <p>Visualisierung der globalen Handelsbeziehungen basierend auf gemeinsamen Produkten</p>
            </div>

            <div class="controls">
              <div class="control-group">
                <label>Ansicht</label>
                <select v-model="networkView" class="control-select">
                  <option value="force">Kraft-Layout</option>
                  <option value="circular">Kreisförmig</option>
                </select>
              </div>
              <div class="control-group">
                <label>Filter nach Volumen</label>
                <input
                  type="range"
                  v-model.number="volumeThreshold"
                  min="0"
                  max="10000"
                  step="100"
                  class="control-slider"
                />
                <span class="control-value">{{ volumeThreshold.toLocaleString() }}</span>
              </div>
            </div>

            <div class="visualization-container">
              <NetworkVisualization
                v-if="networkData"
                :data="filteredNetworkData"
                :layout="networkView"
                @node-click="handleNodeClick"
                @node-hover="handleNodeHover"
              />
            </div>

            <!-- Node Details -->
            <div v-if="selectedNode" class="detail-panel">
              <h4>{{ selectedNode.name }}</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Handelsvolumen:</span>
                  <span class="detail-value">{{ selectedNode.total_trade_volume.toLocaleString() }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Importe:</span>
                  <span class="detail-value">{{ selectedNode.imports.toLocaleString() }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Exporte:</span>
                  <span class="detail-value">{{ selectedNode.exports.toLocaleString() }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Handelsbilanz:</span>
                  <span class="detail-value" :class="selectedNode.trade_balance > 0 ? 'positive' : 'negative'">
                    {{ selectedNode.trade_balance.toLocaleString() }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Hierarchy View -->
          <div v-if="activeTab === 'hierarchy'" class="hierarchy-view">
            <div class="view-header">
              <h3>Handelshierarchie</h3>
              <p>Regionale Struktur des globalen Handels nach Produktkategorien</p>
            </div>

            <div class="controls">
              <div class="control-group">
                <label>Darstellung</label>
                <select v-model="hierarchyView" class="control-select">
                  <option value="tree">Baumdiagramm</option>
                  <option value="sunburst">Sunburst</option>
                  <option value="treemap">Treemap</option>
                </select>
              </div>
            </div>

            <div class="visualization-container">
              <HierarchyVisualization
                v-if="hierarchyData"
                :data="hierarchyData"
                :view-type="hierarchyView"
                @node-click="handleHierarchyNodeClick"
              />
            </div>
          </div>

          <!-- Clusters View -->
          <div v-if="activeTab === 'clusters'" class="clusters-view">
            <div class="view-header">
              <h3>Handelscluster</h3>
              <p>Gruppierung von Ländern nach Handelsmustern</p>
            </div>

            <div class="cluster-grid">
              <div
                v-for="cluster in clusterData"
                :key="cluster.id"
                class="cluster-card"
                :style="{ borderColor: cluster.color }"
              >
                <div class="cluster-header">
                  <h4>{{ cluster.name }}</h4>
                  <span class="cluster-badge" :style="{ backgroundColor: cluster.color }">
                    {{ cluster.size }} Länder
                  </span>
                </div>
                <div class="cluster-members">
                  <span
                    v-for="(member, idx) in cluster.members.slice(0, 8)"
                    :key="member"
                    class="member-chip"
                  >
                    {{ member }}
                  </span>
                  <span v-if="cluster.members.length > 8" class="more-chip">
                    +{{ cluster.members.length - 8 }} weitere
                  </span>
                </div>
                <div class="cluster-metrics">
                  <div class="metric">
                    <span class="metric-label">Kohäsion:</span>
                    <div class="metric-bar">
                      <div 
                        class="metric-fill"
                        :style="{ 
                          width: (cluster.cohesion * 100) + '%',
                          backgroundColor: cluster.color
                        }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Statistics View -->
          <div v-if="activeTab === 'stats'" class="stats-view">
            <div class="view-header">
              <h3>Handelsstatistiken</h3>
              <p>Übersicht der wichtigsten Handelskennzahlen</p>
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">🌍</div>
                <div class="stat-content">
                  <div class="stat-value">{{ summaryData?.total_nodes || 0 }}</div>
                  <div class="stat-label">Länder/Regionen</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">🔗</div>
                <div class="stat-content">
                  <div class="stat-value">{{ summaryData?.total_links || 0 }}</div>
                  <div class="stat-label">Handelsverbindungen</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                  <div class="stat-value">{{ summaryData?.total_clusters || 0 }}</div>
                  <div class="stat-label">Handelscluster</div>
                </div>
              </div>
            </div>

            <div class="top-traders">
              <h4>Top 10 Handelsakteure</h4>
              <div class="traders-table">
                <div class="table-header">
                  <span>Land/Region</span>
                  <span>Handelsvolumen</span>
                  <span>Bilanz</span>
                </div>
                <div
                  v-for="trader in topTraders"
                  :key="trader.id"
                  class="table-row"
                >
                  <span class="trader-name">{{ trader.name }}</span>
                  <span class="trader-volume">{{ formatNumber(trader.total_trade_volume) }}</span>
                  <span 
                    class="trader-balance"
                    :class="trader.trade_balance > 0 ? 'positive' : 'negative'"
                  >
                    {{ formatNumber(trader.trade_balance) }}
                  </span>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useDataStore } from '@/stores/useDataStore'
import { useErrorHandling } from '@/composables/useErrorHandling'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import ErrorDisplay from '@/components/ui/ErrorDisplay.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import NetworkVisualization from '@/components/visualizations/NetworkVisualization.vue'
import HierarchyVisualization from '@/components/visualizations/HierarchyVisualization.vue'

// Icons (using simple text for now, can be replaced with proper icons)
const NetworkIcon = { template: '<span>🌐</span>' }
const HierarchyIcon = { template: '<span>🏛️</span>' }
const ClusterIcon = { template: '<span>🎯</span>' }
const StatsIcon = { template: '<span>📈</span>' }

// Composables
const dataStore = useDataStore()
const { handleError: handleErrorUtil, wrapAsync } = useErrorHandling()

// State
const activeTab = ref('network')
const isLoading = ref(false)
const error = ref(null)

// Data
const networkData = ref(null)
const hierarchyData = ref(null)
const clusterData = ref(null)
const summaryData = ref(null)

// Controls
const networkView = ref('force')
const hierarchyView = ref('tree')
const volumeThreshold = ref(1000)

// Selection
const selectedNode = ref(null)

// Tabs configuration
const tabs = [
  { id: 'network', label: 'Netzwerk', icon: NetworkIcon },
  { id: 'hierarchy', label: 'Hierarchie', icon: HierarchyIcon },
  { id: 'clusters', label: 'Cluster', icon: ClusterIcon },
  { id: 'stats', label: 'Statistiken', icon: StatsIcon }
]

// Computed
const filteredNetworkData = computed(() => {
  if (!networkData.value) return null
  
  const filteredNodes = networkData.value.nodes.filter(node => 
    node.total_trade_volume >= volumeThreshold.value
  )
  
  const nodeIds = new Set(filteredNodes.map(n => n.id))
  const filteredLinks = networkData.value.links.filter(link =>
    nodeIds.has(link.source) && nodeIds.has(link.target)
  )
  
  return {
    nodes: filteredNodes,
    links: filteredLinks
  }
})

const topTraders = computed(() => {
  return summaryData.value?.top_traders || []
})

// Methods
const loadData = wrapAsync(async () => {
  error.value = null
  isLoading.value = true
  
  try {
    // Load all structural data
    const [network, hierarchy, clusters, summary] = await Promise.all([
      fetch('/data/fao_data/structural/trade_network.json').then(r => r.json()),
      fetch('/data/fao_data/structural/trade_hierarchy.json').then(r => r.json()),
      fetch('/data/fao_data/structural/trade_clusters.json').then(r => r.json()),
      fetch('/data/fao_data/structural/trade_summary.json').then(r => r.json())
    ])
    
    networkData.value = network
    hierarchyData.value = hierarchy
    clusterData.value = clusters
    summaryData.value = summary
    
  } catch (err) {
    error.value = err
    console.error('Error loading structural data:', err)
  } finally {
    isLoading.value = false
  }
}, {
  component: 'StructuralPanel',
  operation: 'loadData'
})

const handleError = (err) => {
  error.value = err
  handleErrorUtil(err, {
    component: 'StructuralPanel',
    action: 'component_error'
  })
}

const handleNodeClick = (node) => {
  selectedNode.value = node
}

const handleNodeHover = (node) => {
  // Can be used for tooltip display
}

const handleHierarchyNodeClick = (node) => {
  console.log('Hierarchy node clicked:', node)
}

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}

// Lifecycle
onMounted(() => {
  loadData()
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

.panel-content {
  @apply flex-1 flex flex-col overflow-hidden;
}

/* Tab Navigation */
.tab-navigation {
  @apply flex gap-1 p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700;
}

.tab-button {
  @apply flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-600 dark:text-gray-400;
  @apply hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors;
}

.tab-button.active {
  @apply bg-primary-500 text-white hover:bg-primary-600;
}

.tab-icon {
  @apply text-lg;
}

/* Content */
.tab-content {
  @apply flex-1 overflow-auto p-6;
}

.loading-container,
.error-container {
  @apply flex flex-col items-center justify-center h-64;
}

.loading-text {
  @apply mt-4 text-gray-600 dark:text-gray-400;
}

/* View Headers */
.view-header {
  @apply mb-6;
}

.view-header h3 {
  @apply text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2;
}

.view-header p {
  @apply text-gray-600 dark:text-gray-400;
}

/* Controls */
.controls {
  @apply flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg;
}

.control-group {
  @apply flex flex-col gap-2;
}

.control-group label {
  @apply text-sm font-medium text-gray-700 dark:text-gray-300;
}

.control-select {
  @apply px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md;
  @apply text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500;
}

.control-slider {
  @apply w-48;
}

.control-value {
  @apply text-sm text-gray-600 dark:text-gray-400 ml-2;
}

/* Visualization Container */
.visualization-container {
  @apply bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700;
  @apply h-[600px] overflow-hidden;
}

/* Detail Panel */
.detail-panel {
  @apply mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg;
}

.detail-panel h4 {
  @apply text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4;
}

.detail-grid {
  @apply grid grid-cols-2 gap-4;
}

.detail-item {
  @apply flex flex-col;
}

.detail-label {
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.detail-value {
  @apply text-lg font-medium text-gray-900 dark:text-gray-100;
}

.detail-value.positive {
  @apply text-green-600 dark:text-green-400;
}

.detail-value.negative {
  @apply text-red-600 dark:text-red-400;
}

/* Cluster View */
.cluster-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-6;
}

.cluster-card {
  @apply p-6 bg-white dark:bg-gray-800 rounded-lg border-l-4;
  @apply shadow-sm hover:shadow-md transition-shadow;
}

.cluster-header {
  @apply flex items-center justify-between mb-4;
}

.cluster-header h4 {
  @apply text-lg font-semibold text-gray-900 dark:text-gray-100;
}

.cluster-badge {
  @apply px-3 py-1 rounded-full text-white text-sm font-medium;
}

.cluster-members {
  @apply flex flex-wrap gap-2 mb-4;
}

.member-chip {
  @apply px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300;
}

.more-chip {
  @apply px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded-full text-sm text-gray-600 dark:text-gray-400;
}

.cluster-metrics {
  @apply space-y-2;
}

.metric {
  @apply flex items-center gap-3;
}

.metric-label {
  @apply text-sm text-gray-600 dark:text-gray-400 min-w-[80px];
}

.metric-bar {
  @apply flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden;
}

.metric-fill {
  @apply h-full transition-all duration-300;
}

/* Statistics View */
.stats-grid {
  @apply grid grid-cols-1 md:grid-cols-3 gap-6 mb-8;
}

.stat-card {
  @apply flex items-center gap-4 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg;
}

.stat-icon {
  @apply text-4xl;
}

.stat-content {
  @apply flex-1;
}

.stat-value {
  @apply text-3xl font-bold text-gray-900 dark:text-gray-100;
}

.stat-label {
  @apply text-gray-600 dark:text-gray-400;
}

/* Top Traders Table */
.top-traders {
  @apply mt-8;
}

.top-traders h4 {
  @apply text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4;
}

.traders-table {
  @apply bg-white dark:bg-gray-800 rounded-lg overflow-hidden;
}

.table-header {
  @apply grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 font-medium text-gray-700 dark:text-gray-300;
}

.table-row {
  @apply grid grid-cols-3 gap-4 p-4 border-t border-gray-200 dark:border-gray-700;
  @apply hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors;
}

.trader-name {
  @apply font-medium text-gray-900 dark:text-gray-100;
}

.trader-volume {
  @apply text-gray-600 dark:text-gray-400;
}

.trader-balance {
  @apply font-medium;
}

.trader-balance.positive {
  @apply text-green-600 dark:text-green-400;
}

.trader-balance.negative {
  @apply text-red-600 dark:text-red-400;
}
</style>