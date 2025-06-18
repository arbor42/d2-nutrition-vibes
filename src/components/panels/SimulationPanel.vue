<template>
  <div class="simulation-panel">
    <ErrorBoundary @error="handleError">
      <div class="panel-header">
        <h2 class="panel-title">Simulationsmodelle</h2>
        <p class="panel-description">
          Interaktive Simulationen für landwirtschaftliche Szenarien
        </p>
      </div>

      <div class="panel-controls">
        <div class="simulation-tabs">
          <button
            v-for="tab in simulationTabs"
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
            title="Fehler in der Simulation"
            :showRetry="true"
            @retry="runSimulation"
          />
        </div>

        <div v-else-if="isLoading" class="loading-container">
          <LoadingSpinner size="lg" />
          <p class="loading-text">Simulation läuft...</p>
        </div>

        <div v-else class="simulation-content">
          <!-- Scenario Configuration -->
          <div class="config-section">
            <h3 class="section-title">Szenario-Konfiguration</h3>
            <div class="config-grid">
              <div class="config-item">
                <label>Klimawandel-Faktor</label>
                <RangeSlider
                  v-model="scenarioConfig.climateChange"
                  :min="0.8"
                  :max="1.5"
                  :step="0.1"
                />
              </div>
              
              <div class="config-item">
                <label>Bevölkerungswachstum</label>
                <RangeSlider
                  v-model="scenarioConfig.populationGrowth"
                  :min="0.5"
                  :max="2.0"
                  :step="0.1"
                />
              </div>
              
              <div class="config-item">
                <label>Technologischer Fortschritt</label>
                <RangeSlider
                  v-model="scenarioConfig.techProgress"
                  :min="0.8"
                  :max="2.0"
                  :step="0.1"
                />
              </div>
              
              <div class="config-item">
                <label>Wirtschaftswachstum</label>
                <RangeSlider
                  v-model="scenarioConfig.economicGrowth"
                  :min="0.5"
                  :max="2.5"
                  :step="0.1"
                />
              </div>
            </div>
            
            <div class="config-actions">
              <BaseButton @click="runSimulation" :disabled="isLoading" variant="primary">
                <LoadingSpinner v-if="isLoading" size="sm" />
                {{ isLoading ? 'Simuliert...' : 'Simulation starten' }}
              </BaseButton>
              
              <BaseButton @click="resetConfig" variant="outline">
                Zurücksetzen
              </BaseButton>
            </div>
          </div>

          <!-- Simulation Results -->
          <div v-if="simulationResults" class="results-section">
            <h3 class="section-title">Simulationsergebnisse</h3>
            
            <div class="results-grid">
              <div class="result-card">
                <h4>Produktionsänderung</h4>
                <div class="result-value" :class="getChangeClass(simulationResults.productionChange)">
                  {{ formatChange(simulationResults.productionChange) }}%
                </div>
              </div>
              
              <div class="result-card">
                <h4>Ernährungssicherheit</h4>
                <div class="result-value" :class="getFoodSecurityClass(simulationResults.foodSecurity)">
                  {{ simulationResults.foodSecurity }}%
                </div>
              </div>
              
              <div class="result-card">
                <h4>Umweltauswirkung</h4>
                <div class="result-value" :class="getEnvironmentClass(simulationResults.environmentImpact)">
                  {{ formatChange(simulationResults.environmentImpact) }}%
                </div>
              </div>
              
              <div class="result-card">
                <h4>Wirtschaftlicher Effekt</h4>
                <div class="result-value" :class="getChangeClass(simulationResults.economicImpact)">
                  {{ formatChange(simulationResults.economicImpact) }}%
                </div>
              </div>
            </div>

            <!-- Simulation Chart -->
            <div class="chart-container">
              <SimulationChart
                :data="simulationResults.timeSeriesData"
                :config="chartConfig"
                @scenario-select="handleScenarioSelect"
              />
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="!simulationResults && !isLoading" class="empty-state">
            <div class="empty-icon">⚙️</div>
            <h3>Simulation bereit</h3>
            <p>Konfigurieren Sie die Parameter und starten Sie eine Simulation.</p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useErrorHandling } from '@/composables/useErrorHandling'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import ErrorDisplay from '@/components/ui/ErrorDisplay.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import RangeSlider from '@/components/ui/RangeSlider.vue'
import SimulationChart from '@/components/visualizations/SimulationChart.vue'

// Composables
const { handleError: handleErrorUtil, wrapAsync } = useErrorHandling()

// Reactive state
const activeTab = ref('scenario')
const isLoading = ref(false)
const error = ref(null)
const simulationResults = ref(null)

const scenarioConfig = ref({
  climateChange: 1.0,
  populationGrowth: 1.2,
  techProgress: 1.1,
  economicGrowth: 1.5
})

// Computed properties
const hasError = computed(() => error.value !== null)

const simulationTabs = computed(() => [
  { id: 'scenario', label: 'Szenario-Analyse' },
  { id: 'monte-carlo', label: 'Monte Carlo' },
  { id: 'sensitivity', label: 'Sensitivitätsanalyse' }
])

const chartConfig = computed(() => ({
  width: 800,
  height: 400,
  margin: { top: 20, right: 30, bottom: 40, left: 80 },
  showConfidenceInterval: true,
  showScenarios: true,
  interactive: true,
  animated: true
}))

// Methods
const runSimulation = wrapAsync(async () => {
  error.value = null
  isLoading.value = true
  
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock simulation calculation
    const config = scenarioConfig.value
    const baselineProd = 100
    
    const productionChange = (
      (config.climateChange - 1) * -20 +
      (config.populationGrowth - 1) * 10 +
      (config.techProgress - 1) * 30 +
      (config.economicGrowth - 1) * 5
    )
    
    const foodSecurity = Math.max(20, Math.min(100, 
      85 + productionChange * 0.3 - (config.populationGrowth - 1) * 20
    ))
    
    const environmentImpact = (
      (config.climateChange - 1) * 15 +
      (config.populationGrowth - 1) * 10 +
      (config.techProgress - 1) * -10 +
      (config.economicGrowth - 1) * 8
    )
    
    const economicImpact = (
      productionChange * 0.8 +
      (config.techProgress - 1) * 25 +
      (config.economicGrowth - 1) * 40
    )
    
    // Generate time series data
    const timeSeriesData = []
    const currentYear = new Date().getFullYear()
    
    for (let i = 0; i <= 10; i++) {
      const year = currentYear + i
      const trend = i * (productionChange / 10)
      const noise = (Math.random() - 0.5) * 5
      
      timeSeriesData.push({
        year,
        baseline: baselineProd + i * 2,
        scenario: baselineProd + trend + noise,
        lower: baselineProd + trend - 10,
        upper: baselineProd + trend + 10
      })
    }
    
    simulationResults.value = {
      productionChange,
      foodSecurity,
      environmentImpact,
      economicImpact,
      timeSeriesData,
      config: { ...config }
    }
    
  } catch (err) {
    error.value = err
  } finally {
    isLoading.value = false
  }
}, {
  component: 'SimulationPanel',
  operation: 'runSimulation'
})

const resetConfig = () => {
  scenarioConfig.value = {
    climateChange: 1.0,
    populationGrowth: 1.2,
    techProgress: 1.1,
    economicGrowth: 1.5
  }
  simulationResults.value = null
}

const handleError = (err) => {
  error.value = err
  handleErrorUtil(err, {
    component: 'SimulationPanel',
    action: 'component_error'
  })
}

const handleScenarioSelect = (scenario) => {
  console.log('Scenario selected:', scenario)
  // TODO: Show scenario details
}

// Helper methods
const formatChange = (value) => {
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)
}

const getChangeClass = (value) => {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return 'text-gray-600'
}

const getFoodSecurityClass = (value) => {
  if (value >= 80) return 'text-green-600'
  if (value >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

const getEnvironmentClass = (value) => {
  if (value <= 0) return 'text-green-600'
  if (value <= 10) return 'text-yellow-600'
  return 'text-red-600'
}
</script>

<style scoped>
.simulation-panel {
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

.simulation-tabs {
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

.simulation-content {
  @apply space-y-8;
}

.config-section,
.results-section {
  @apply space-y-4;
}

.section-title {
  @apply text-xl font-semibold text-gray-900 mb-4;
}

.config-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-6;
}

.config-item {
  @apply space-y-2;
}

.config-item label {
  @apply block text-sm font-medium text-gray-700;
}

.config-actions {
  @apply flex space-x-4 pt-4;
}

.results-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6;
}

.result-card {
  @apply bg-gray-50 rounded-lg p-4 text-center;
}

.result-card h4 {
  @apply text-sm font-medium text-gray-700 mb-2;
}

.result-value {
  @apply text-2xl font-bold;
}

.chart-container {
  @apply w-full h-96 bg-gray-50 rounded-lg p-4;
}

.error-container,
.loading-container,
.empty-state {
  @apply flex flex-col items-center justify-center h-64;
}

.loading-text {
  @apply mt-4 text-gray-600;
}

.empty-icon {
  @apply text-6xl mb-4;
}

.empty-state h3 {
  @apply text-xl font-semibold text-gray-700 mb-2;
}

.empty-state p {
  @apply text-gray-500;
}
</style>