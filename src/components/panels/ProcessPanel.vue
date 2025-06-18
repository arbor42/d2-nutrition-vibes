<template>
  <div class="process-panel">
    <ErrorBoundary @error="handleError">
      <div class="panel-header">
        <h2 class="panel-title">Process Mining</h2>
        <p class="panel-description">
          Analyse und Optimierung von landwirtschaftlichen Prozessen
        </p>
      </div>

      <div class="panel-controls">
        <div class="process-tabs">
          <button
            v-for="tab in processTabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'tab-button',
              { 'tab-active': activeTab === tab.id }
            ]"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="panel-content">
        <div v-if="hasError" class="error-container">
          <ErrorDisplay
            :error="error"
            title="Fehler beim Process Mining"
            :showRetry="true"
            @retry="loadProcessData"
          />
        </div>

        <div v-else-if="isLoading" class="loading-container">
          <LoadingSpinner size="lg" />
          <p class="loading-text">Analysiere Prozesse...</p>
        </div>

        <div v-else class="process-content">
          <!-- Process Discovery -->
          <div v-if="activeTab === 'discovery'" class="discovery-section">
            <div class="controls-row">
              <div class="control-group">
                <label>Prozess-Typ</label>
                <SearchableSelect
                  v-model="discoveryConfig.processType"
                  :options="processTypeOptions"
                />
              </div>
              
              <div class="control-group">
                <label>Zeitraum</label>
                <RangeSlider
                  v-model="discoveryConfig.timeRange"
                  :min="2020"
                  :max="2023"
                  :step="1"
                  :show-labels="true"
                />
              </div>
              
              <BaseButton @click="discoverProcesses">
                Prozesse entdecken
              </BaseButton>
            </div>

            <div v-if="processModel" class="process-visualization">
              <ProcessChart
                :data="processModel"
                :config="processChartConfig"
                @activity-select="handleActivitySelect"
                @path-select="handlePathSelect"
              />
            </div>

            <div v-if="processStats" class="process-stats">
              <h3 class="stats-title">Prozess-Statistiken</h3>
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-label">Aktivitäten</div>
                  <div class="stat-value">{{ processStats.activities }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Traces</div>
                  <div class="stat-value">{{ processStats.traces }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Varianten</div>
                  <div class="stat-value">{{ processStats.variants }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Durchlaufzeit (Tage)</div>
                  <div class="stat-value">{{ processStats.avgDuration }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Process Conformance -->
          <div v-if="activeTab === 'conformance'" class="conformance-section">
            <div class="controls-row">
              <div class="control-group">
                <label>Referenz-Modell</label>
                <SearchableSelect
                  v-model="conformanceConfig.referenceModel"
                  :options="referenceModelOptions"
                />
              </div>
              
              <BaseButton @click="checkConformance">
                Konformität prüfen
              </BaseButton>
            </div>

            <div v-if="conformanceResults" class="conformance-results">
              <div class="conformance-overview">
                <div class="conformance-score">
                  <div class="score-circle" :class="getConformanceClass(conformanceResults.fitness)">
                    <span class="score-value">{{ (conformanceResults.fitness * 100).toFixed(0) }}%</span>
                    <span class="score-label">Fitness</span>
                  </div>
                </div>
                
                <div class="conformance-metrics">
                  <div class="metric-item">
                    <span class="metric-label">Precision:</span>
                    <span class="metric-value">{{ (conformanceResults.precision * 100).toFixed(1) }}%</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Recall:</span>
                    <span class="metric-value">{{ (conformanceResults.recall * 100).toFixed(1) }}%</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">F1-Score:</span>
                    <span class="metric-value">{{ (conformanceResults.f1Score * 100).toFixed(1) }}%</span>
                  </div>
                </div>
              </div>

              <div class="deviations-list">
                <h4 class="deviations-title">Erkannte Abweichungen</h4>
                <div class="deviation-items">
                  <div
                    v-for="deviation in conformanceResults.deviations"
                    :key="deviation.id"
                    class="deviation-item"
                    :class="getDeviationClass(deviation.severity)"
                  >
                    <div class="deviation-header">
                      <span class="deviation-type">{{ deviation.type }}</span>
                      <span class="deviation-count">{{ deviation.count }}x</span>
                    </div>
                    <p class="deviation-description">{{ deviation.description }}</p>
                    <div class="deviation-actions">
                      <BaseButton size="sm" @click="exploreDeviation(deviation)">
                        Untersuchen
                      </BaseButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Process Enhancement -->
          <div v-if="activeTab === 'enhancement'" class="enhancement-section">
            <div class="controls-row">
              <div class="control-group">
                <label>Optimierungs-Typ</label>
                <SearchableSelect
                  v-model="enhancementConfig.optimizationType"
                  :options="optimizationTypeOptions"
                />
              </div>
              
              <BaseButton @click="enhanceProcess">
                Prozess optimieren
              </BaseButton>
            </div>

            <div v-if="enhancementResults" class="enhancement-results">
              <div class="optimization-comparison">
                <div class="comparison-chart">
                  <ProcessChart
                    :data="enhancementResults.comparison"
                    :config="comparisonChartConfig"
                    @improvement-select="handleImprovementSelect"
                  />
                </div>
              </div>

              <div class="improvement-suggestions">
                <h4 class="suggestions-title">Verbesserungsvorschläge</h4>
                <div class="suggestion-items">
                  <div
                    v-for="suggestion in enhancementResults.suggestions"
                    :key="suggestion.id"
                    class="suggestion-item"
                  >
                    <div class="suggestion-header">
                      <h5 class="suggestion-title">{{ suggestion.title }}</h5>
                      <div class="suggestion-impact" :class="getImpactClass(suggestion.impact)">
                        {{ suggestion.impact }} Impact
                      </div>
                    </div>
                    <p class="suggestion-description">{{ suggestion.description }}</p>
                    <div class="suggestion-metrics">
                      <div class="metric">
                        <span class="metric-label">Zeitersparnis:</span>
                        <span class="metric-value">{{ suggestion.timeSavings }}%</span>
                      </div>
                      <div class="metric">
                        <span class="metric-label">Kostenreduktion:</span>
                        <span class="metric-value">{{ suggestion.costReduction }}%</span>
                      </div>
                    </div>
                    <div class="suggestion-actions">
                      <BaseButton size="sm" variant="primary">
                        Implementieren
                      </BaseButton>
                      <BaseButton size="sm" variant="outline">
                        Simulieren
                      </BaseButton>
                    </div>
                  </div>
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
import { ref, computed } from 'vue'
import { useErrorHandling } from '@/composables/useErrorHandling'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import ErrorDisplay from '@/components/ui/ErrorDisplay.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import RangeSlider from '@/components/ui/RangeSlider.vue'
import ProcessChart from '@/components/visualizations/ProcessChart.vue'

// Composables
const { handleError: handleErrorUtil, wrapAsync } = useErrorHandling()

// Reactive state
const activeTab = ref('discovery')
const isLoading = ref(false)
const error = ref(null)

const discoveryConfig = ref({
  processType: 'supply_chain',
  timeRange: [2022, 2023]
})

const conformanceConfig = ref({
  referenceModel: 'iso_standard'
})

const enhancementConfig = ref({
  optimizationType: 'time_optimization'
})

const processModel = ref(null)
const processStats = ref(null)
const conformanceResults = ref(null)
const enhancementResults = ref(null)

// Computed properties
const hasError = computed(() => error.value !== null)

const processTabs = computed(() => [
  { id: 'discovery', label: 'Prozess-Discovery' },
  { id: 'conformance', label: 'Konformitätsprüfung' },
  { id: 'enhancement', label: 'Prozess-Enhancement' }
])

const processTypeOptions = computed(() => [
  { value: 'supply_chain', label: 'Lieferkette' },
  { value: 'production', label: 'Produktion' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'quality_control', label: 'Qualitätskontrolle' }
])

const referenceModelOptions = computed(() => [
  { value: 'iso_standard', label: 'ISO Standard' },
  { value: 'best_practice', label: 'Best Practice' },
  { value: 'custom_model', label: 'Benutzerdefiniert' }
])

const optimizationTypeOptions = computed(() => [
  { value: 'time_optimization', label: 'Zeitoptimierung' },
  { value: 'cost_optimization', label: 'Kostenoptimierung' },
  { value: 'quality_optimization', label: 'Qualitätsoptimierung' },
  { value: 'resource_optimization', label: 'Ressourcenoptimierung' }
])

const processChartConfig = computed(() => ({
  type: 'process_flow',
  width: 800,
  height: 500,
  showMetrics: true,
  showFrequencies: true,
  interactive: true
}))

const comparisonChartConfig = computed(() => ({
  type: 'process_comparison',
  width: 800,
  height: 400,
  showBefore: true,
  showAfter: true,
  showImprovements: true,
  interactive: true
}))

// Methods
const discoverProcesses = wrapAsync(async () => {
  error.value = null
  isLoading.value = true
  
  try {
    // Mock process discovery
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    processModel.value = generateProcessModel()
    processStats.value = {
      activities: 12,
      traces: 1524,
      variants: 47,
      avgDuration: 14.5
    }
    
  } catch (err) {
    error.value = err
  } finally {
    isLoading.value = false
  }
}, {
  component: 'ProcessPanel',
  operation: 'discoverProcesses'
})

const checkConformance = wrapAsync(async () => {
  error.value = null
  isLoading.value = true
  
  try {
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    conformanceResults.value = {
      fitness: 0.85,
      precision: 0.78,
      recall: 0.92,
      f1Score: 0.84,
      deviations: [
        {
          id: 1,
          type: 'Skip Activity',
          count: 23,
          severity: 'medium',
          description: 'Qualitätsprüfung wurde in 23 Fällen übersprungen'
        },
        {
          id: 2,
          type: 'Wrong Order',
          count: 8,
          severity: 'high',
          description: 'Versand vor Qualitätskontrolle in 8 Fällen'
        },
        {
          id: 3,
          type: 'Extra Activity',
          count: 15,
          severity: 'low',
          description: 'Zusätzliche Nachkontrolle in 15 Fällen'
        }
      ]
    }
    
  } catch (err) {
    error.value = err
  } finally {
    isLoading.value = false
  }
}, {
  component: 'ProcessPanel',
  operation: 'checkConformance'
})

const enhanceProcess = wrapAsync(async () => {
  error.value = null
  isLoading.value = true
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1800))
    
    enhancementResults.value = {
      comparison: generateComparisonData(),
      suggestions: [
        {
          id: 1,
          title: 'Parallelisierung der Qualitätskontrolle',
          description: 'Führen Sie Qualitätsprüfungen parallel zur Verpackung durch',
          impact: 'high',
          timeSavings: 25,
          costReduction: 15
        },
        {
          id: 2,
          title: 'Automatisierung der Dokumentation',
          description: 'Implementieren Sie automatische Dokumentationssysteme',
          impact: 'medium',
          timeSavings: 12,
          costReduction: 8
        },
        {
          id: 3,
          title: 'Optimierung der Lagerlogistik',
          description: 'Reorganisieren Sie die Lagerstruktur für kürzere Wege',
          impact: 'medium',
          timeSavings: 18,
          costReduction: 22
        }
      ]
    }
    
  } catch (err) {
    error.value = err
  } finally {
    isLoading.value = false
  }
}, {
  component: 'ProcessPanel',
  operation: 'enhanceProcess'
})

// Helper methods
const generateProcessModel = () => {
  return {
    activities: [
      { id: 'start', name: 'Bestellung eingegangen', type: 'start' },
      { id: 'check', name: 'Verfügbarkeit prüfen', type: 'activity' },
      { id: 'produce', name: 'Produzieren', type: 'activity' },
      { id: 'quality', name: 'Qualitätskontrolle', type: 'activity' },
      { id: 'package', name: 'Verpacken', type: 'activity' },
      { id: 'ship', name: 'Versenden', type: 'activity' },
      { id: 'end', name: 'Bestellung abgeschlossen', type: 'end' }
    ],
    flows: [
      { from: 'start', to: 'check', frequency: 100 },
      { from: 'check', to: 'produce', frequency: 85 },
      { from: 'check', to: 'ship', frequency: 15 },
      { from: 'produce', to: 'quality', frequency: 85 },
      { from: 'quality', to: 'package', frequency: 80 },
      { from: 'quality', to: 'produce', frequency: 5 },
      { from: 'package', to: 'ship', frequency: 80 },
      { from: 'ship', to: 'end', frequency: 95 }
    ]
  }
}

const generateComparisonData = () => {
  return {
    before: generateProcessModel(),
    after: {
      // Enhanced process model with improvements
      activities: [
        { id: 'start', name: 'Bestellung eingegangen', type: 'start' },
        { id: 'check', name: 'Verfügbarkeit prüfen', type: 'activity' },
        { id: 'produce', name: 'Produzieren', type: 'activity' },
        { id: 'parallel', name: 'Qualität & Verpackung', type: 'parallel' },
        { id: 'ship', name: 'Versenden', type: 'activity' },
        { id: 'end', name: 'Bestellung abgeschlossen', type: 'end' }
      ],
      improvements: ['25% schneller', '15% kostengünstiger']
    }
  }
}

const getConformanceClass = (fitness) => {
  if (fitness >= 0.9) return 'score-excellent'
  if (fitness >= 0.8) return 'score-good'
  if (fitness >= 0.7) return 'score-fair'
  return 'score-poor'
}

const getDeviationClass = (severity) => {
  switch (severity) {
    case 'high': return 'deviation-high'
    case 'medium': return 'deviation-medium'
    case 'low': return 'deviation-low'
    default: return 'deviation-medium'
  }
}

const getImpactClass = (impact) => {
  switch (impact) {
    case 'high': return 'impact-high'
    case 'medium': return 'impact-medium'
    case 'low': return 'impact-low'
    default: return 'impact-medium'
  }
}

// Event handlers
const handleError = (err) => {
  error.value = err
  handleErrorUtil(err, {
    component: 'ProcessPanel',
    action: 'component_error'
  })
}

const handleActivitySelect = (activity) => {
  console.log('Activity selected:', activity)
}

const handlePathSelect = (path) => {
  console.log('Path selected:', path)
}

const handleImprovementSelect = (improvement) => {
  console.log('Improvement selected:', improvement)
}

const exploreDeviation = (deviation) => {
  console.log('Exploring deviation:', deviation)
}

const loadProcessData = () => {
  if (activeTab.value === 'discovery') {
    discoverProcesses()
  }
}
</script>

<style scoped>
.process-panel {
  @apply flex flex-col h-full bg-white rounded-lg shadow-lg;
}

.panel-header {
  @apply p-6 border-b border-gray-200;
}

.panel-title {
  @apply text-2xl font-bold text-gray-900 mb-2;
}

.panel-description {
  @apply text-gray-600;
}

.panel-controls {
  @apply p-6 bg-gray-50 border-b border-gray-200;
}

.process-tabs {
  @apply flex space-x-2;
}

.tab-button {
  @apply px-4 py-2 rounded-lg font-medium transition-colors;
  @apply bg-white text-gray-700 hover:bg-gray-100;
}

.tab-active {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.panel-content {
  @apply flex-1 p-6 overflow-auto;
}

.process-content {
  @apply space-y-6;
}

.controls-row {
  @apply flex flex-wrap items-end gap-4 mb-6;
}

.control-group {
  @apply flex flex-col min-w-48;
}

.control-group label {
  @apply text-sm font-medium text-gray-700 mb-2;
}

.process-visualization {
  @apply w-full bg-gray-50 rounded-lg p-4 mb-6;
}

.process-stats {
  @apply space-y-4;
}

.stats-title {
  @apply text-lg font-semibold text-gray-900;
}

.stats-grid {
  @apply grid grid-cols-2 md:grid-cols-4 gap-4;
}

.stat-card {
  @apply bg-gray-50 rounded-lg p-4 text-center;
}

.stat-label {
  @apply text-sm text-gray-600 mb-1;
}

.stat-value {
  @apply text-lg font-bold text-gray-900;
}

.conformance-overview {
  @apply flex items-center gap-8 mb-6;
}

.score-circle {
  @apply w-24 h-24 rounded-full flex flex-col items-center justify-center text-white font-bold;
}

.score-excellent { @apply bg-green-500; }
.score-good { @apply bg-blue-500; }
.score-fair { @apply bg-yellow-500; }
.score-poor { @apply bg-red-500; }

.score-value {
  @apply text-xl;
}

.score-label {
  @apply text-xs;
}

.conformance-metrics {
  @apply space-y-2;
}

.metric-item {
  @apply text-sm;
}

.metric-label {
  @apply text-gray-600 mr-2;
}

.metric-value {
  @apply font-medium text-gray-900;
}

.deviations-list {
  @apply space-y-4;
}

.deviations-title {
  @apply text-lg font-semibold text-gray-900;
}

.deviation-items {
  @apply space-y-3;
}

.deviation-item {
  @apply rounded-lg p-4 border-l-4;
}

.deviation-high { @apply bg-red-50 border-red-500; }
.deviation-medium { @apply bg-yellow-50 border-yellow-500; }
.deviation-low { @apply bg-blue-50 border-blue-500; }

.deviation-header {
  @apply flex justify-between items-center mb-2;
}

.deviation-type {
  @apply font-medium text-gray-900;
}

.deviation-count {
  @apply text-sm text-gray-600;
}

.deviation-description {
  @apply text-sm text-gray-700 mb-3;
}

.deviation-actions {
  @apply flex gap-2;
}

.optimization-comparison {
  @apply mb-6;
}

.comparison-chart {
  @apply w-full bg-gray-50 rounded-lg p-4;
}

.improvement-suggestions {
  @apply space-y-4;
}

.suggestions-title {
  @apply text-lg font-semibold text-gray-900;
}

.suggestion-items {
  @apply space-y-4;
}

.suggestion-item {
  @apply bg-gray-50 rounded-lg p-4;
}

.suggestion-header {
  @apply flex justify-between items-center mb-2;
}

.suggestion-title {
  @apply font-medium text-gray-900;
}

.suggestion-impact {
  @apply px-2 py-1 rounded text-xs font-medium;
}

.impact-high { @apply bg-green-200 text-green-800; }
.impact-medium { @apply bg-yellow-200 text-yellow-800; }
.impact-low { @apply bg-blue-200 text-blue-800; }

.suggestion-description {
  @apply text-sm text-gray-700 mb-3;
}

.suggestion-metrics {
  @apply flex gap-4 mb-3;
}

.metric {
  @apply text-sm;
}

.suggestion-actions {
  @apply flex gap-2;
}

.error-container,
.loading-container {
  @apply flex flex-col items-center justify-center h-64;
}

.loading-text {
  @apply mt-4 text-gray-600;
}
</style>