<template>
  <div class="simulation-panel">
    <ErrorBoundary @error="handleError">
      <div class="panel-header">
        <h2 class="panel-title">Simulationsmodelle</h2>
        <p class="panel-description">
          Interaktive Monte-Carlo-Simulationen für landwirtschaftliche Szenarien
        </p>
        
        <div class="simulation-info">
          <div class="info-section">
            <h3 class="info-title">Was wird berechnet?</h3>
            <p class="info-text">
              Diese Simulation verwendet <strong>Monte-Carlo-Verfahren</strong> mit 500 stochastischen Pfaden, um die Auswirkungen verschiedener Faktoren auf die globale Nahrungsmittelproduktion zu modellieren. Basierend auf <strong>Geometrischer Brownscher Bewegung</strong> werden realistische Produktionstrends und Volatilitäten berechnet.
            </p>
          </div>
          
          <div class="info-section">
            <h3 class="info-title">Wie funktioniert es?</h3>
            <div class="info-steps">
              <div class="step">
                <span class="step-number">1</span>
                <span class="step-text"><strong>Szenario wählen:</strong> Klicken Sie auf ein vordefiniertes Szenario, um die Parameter automatisch zu setzen</span>
              </div>
              <div class="step">
                <span class="step-number">2</span>
                <span class="step-text"><strong>Parameter anpassen:</strong> Nutzen Sie die Slider, um Faktoren wie Klimawandel, Bevölkerungswachstum, Technologiefortschritt und wirtschaftliche Stabilität zu justieren</span>
              </div>
              <div class="step">
                <span class="step-number">3</span>
                <span class="step-text"><strong>Simulation starten:</strong> Die Berechnung erfolgt in Echtzeit und zeigt Auswirkungen auf Produktion, Ernährungssicherheit, Umwelt und Wirtschaft</span>
              </div>
            </div>
          </div>
          
          <div class="info-section">
            <h3 class="info-title">Berechnungsgrundlage</h3>
            <p class="info-text">
              Jeder Faktor beeinflusst die Simulation mathematisch: <strong>Klimawandel</strong> reduziert Erträge, <strong>Bevölkerungswachstum</strong> erhöht die Nachfrage, <strong>Technologie</strong> steigert die Effizienz und <strong>wirtschaftliche Instabilität</strong> erhöht die Volatilität. Die Ergebnisse zeigen 10-Jahres-Projektionen mit Konfidenzintervallen.
            </p>
          </div>
        </div>
      </div>


      <div class="panel-content">
        <div v-if="hasError" class="error-container">
          <ErrorDisplay
            :error="error"
            title="Fehler in der Simulation"
            :show-retry="true"
            @retry="runSimulation"
          />
        </div>

        <div v-else-if="isLoading" class="loading-container">
          <LoadingSpinner size="lg" />
          <p class="loading-text">Simulation läuft...</p>
        </div>

        <div v-else class="simulation-content">
          <!-- Scenario Selection -->
          <div class="scenario-section">
            <h3 class="section-title">Szenario auswählen</h3>
            <div class="scenario-grid">
              <div
                v-for="scenario in availableScenarios"
                :key="scenario.id"
                class="scenario-card"
                :class="{
                  'scenario-active': selectedScenario === scenario.id
                }"
                @click="handleScenarioSelect(scenario.id)"
              >
                <div class="scenario-icon">{{ scenario.icon }}</div>
                <h4 class="scenario-name">{{ scenario.name }}</h4>
                <p class="scenario-description">{{ scenario.description }}</p>
              </div>
            </div>
          </div>

          <!-- Scenario Configuration -->
          <div class="config-section">
            <h3 class="section-title">Parameter-Konfiguration</h3>
            <div class="config-grid">
              <div class="config-item">
                <div class="slider-header">
                  <label>Klimawandel-Intensität</label>
                  <span class="slider-value">{{ scenarioConfig.climateChange.toFixed(1) }}</span>
                </div>
                <div class="slider-description">{{ getSliderDescription('climate', scenarioConfig.climateChange) }}</div>
                <RangeSlider
                  v-model="scenarioConfig.climateChange"
                  :min="0.5"
                  :max="1.5"
                  :step="0.1"
                />
              </div>
              
              <div class="config-item">
                <div class="slider-header">
                  <label>Bevölkerungswachstum</label>
                  <span class="slider-value">{{ scenarioConfig.populationGrowth.toFixed(1) }}</span>
                </div>
                <div class="slider-description">{{ getSliderDescription('population', scenarioConfig.populationGrowth) }}</div>
                <RangeSlider
                  v-model="scenarioConfig.populationGrowth"
                  :min="0.5"
                  :max="2.0"
                  :step="0.1"
                />
              </div>
              
              <div class="config-item">
                <div class="slider-header">
                  <label>Technologiefortschritt</label>
                  <span class="slider-value">{{ scenarioConfig.techProgress.toFixed(1) }}</span>
                </div>
                <div class="slider-description">{{ getSliderDescription('tech', scenarioConfig.techProgress) }}</div>
                <RangeSlider
                  v-model="scenarioConfig.techProgress"
                  :min="0.5"
                  :max="2.0"
                  :step="0.1"
                />
              </div>
              
              <div class="config-item">
                <div class="slider-header">
                  <label>Wirtschaftliche Stabilität</label>
                  <span class="slider-value">{{ scenarioConfig.economicGrowth.toFixed(1) }}</span>
                </div>
                <div class="slider-description">{{ getSliderDescription('economic', scenarioConfig.economicGrowth) }}</div>
                <RangeSlider
                  v-model="scenarioConfig.economicGrowth"
                  :min="0.5"
                  :max="1.8"
                  :step="0.1"
                />
              </div>
            </div>
            
            <div class="config-actions">
              <div class="action-buttons">
                <BaseButton :disabled="isLoading" variant="primary" @click="runSimulation">
                  <LoadingSpinner v-if="isLoading" size="sm" />
                  {{ isLoading ? 'Simuliert...' : 'Simulation starten' }}
                </BaseButton>
                
                <BaseButton variant="outline" @click="resetConfig">
                  Zurücksetzen
                </BaseButton>
              </div>
              
              <div v-if="hasConfigChanged" class="config-changed-indicator">
                ⚠️ Parameter geändert - Simulation neu starten
              </div>
            </div>
          </div>

          <!-- Simulation Results -->
          <div v-if="simulationResults" class="results-section">
            <div class="results-header">
              <h3 class="section-title">Simulationsergebnisse</h3>
              <div class="results-meta">
                <span class="meta-item">
                  <strong>Szenario:</strong> {{ simulationResults.scenario }}
                </span>
                <span class="meta-item">
                  <strong>Methode:</strong> {{ simulationResults.dataSource }}
                </span>
                <span v-if="simulationResults.simulationDetails" class="meta-item">
                  <strong>Details:</strong> 
                  {{ simulationResults.simulationDetails.totalPaths }} Pfade, 
                  {{ simulationResults.simulationDetails.confidenceLevel }} Konfidenz, 
                  {{ simulationResults.simulationDetails.timeHorizon }}
                </span>
              </div>
            </div>
            
            <div class="results-grid">
              <div class="result-card">
                <div class="result-header">
                  <h4>Produktionsänderung</h4>
                  <span class="result-icon">🌾</span>
                </div>
                <div class="result-value" :class="getChangeClass(simulationResults.productionChange)">
                  {{ formatChange(simulationResults.productionChange) }}%
                </div>
                <p class="result-description">
                  {{ getProductionDescription(simulationResults.productionChange) }}
                </p>
              </div>
              
              <div class="result-card">
                <div class="result-header">
                  <h4>Ernährungssicherheit</h4>
                  <span class="result-icon">🍽️</span>
                </div>
                <div class="result-value" :class="getFoodSecurityClass(simulationResults.foodSecurity)">
                  {{ simulationResults.foodSecurity }}%
                </div>
                <p class="result-description">
                  {{ getFoodSecurityDescription(simulationResults.foodSecurity) }}
                </p>
              </div>
              
              <div class="result-card">
                <div class="result-header">
                  <h4>Umweltauswirkung</h4>
                  <span class="result-icon">🌍</span>
                </div>
                <div class="result-value" :class="getEnvironmentClass(simulationResults.environmentImpact)">
                  {{ formatChange(simulationResults.environmentImpact) }}%
                </div>
                <p class="result-description">
                  {{ getEnvironmentDescription(simulationResults.environmentImpact) }}
                </p>
              </div>
              
              <div class="result-card">
                <div class="result-header">
                  <h4>Wirtschaftlicher Effekt</h4>
                  <span class="result-icon">💰</span>
                </div>
                <div class="result-value" :class="getChangeClass(simulationResults.economicImpact)">
                  {{ formatChange(simulationResults.economicImpact) }}%
                </div>
                <p class="result-description">
                  {{ getEconomicDescription(simulationResults.economicImpact) }}
                </p>
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
import { ref, computed, watch, onMounted } from 'vue'
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
const isLoading = ref(false)
const error = ref(null)
const simulationResults = ref(null)
const selectedScenario = ref('climate_shock')
const hasConfigChanged = ref(false)
const lastAppliedConfig = ref(null)

const scenarioConfig = ref({
  climateChange: 1.0,
  populationGrowth: 1.2,
  techProgress: 1.1,
  economicGrowth: 1.5
})

// Computed properties
const hasError = computed(() => error.value !== null)


const availableScenarios = computed(() => [
  { 
    id: 'climate_shock', 
    name: 'Klimaschock', 
    description: 'Extreme Wetterereignisse und Klimawandel',
    icon: '🌡️',
    sliderPreset: {
      climateChange: 1.4,
      populationGrowth: 1.1,
      techProgress: 0.9,
      economicGrowth: 0.8
    }
  },
  { 
    id: 'population_pressure', 
    name: 'Bevölkerungsdruck', 
    description: 'Schnelles Bevölkerungswachstum vs. Produktionskapazität',
    icon: '👥',
    sliderPreset: {
      climateChange: 1.1,
      populationGrowth: 1.8,
      techProgress: 1.1,
      economicGrowth: 1.3
    }
  },
  { 
    id: 'tech_revolution', 
    name: 'Technologie-Revolution', 
    description: 'Precision Farming und Biotechnologie',
    icon: '🔬',
    sliderPreset: {
      climateChange: 0.9,
      populationGrowth: 1.2,
      techProgress: 1.8,
      economicGrowth: 1.6
    }
  },
  { 
    id: 'trade_disruption', 
    name: 'Handelsdisruption', 
    description: 'Geopolitische Spannungen und Handelskriege',
    icon: '📈',
    sliderPreset: {
      climateChange: 1.2,
      populationGrowth: 1.1,
      techProgress: 1.0,
      economicGrowth: 0.7
    }
  },
  { 
    id: 'custom', 
    name: 'Benutzerdefiniert', 
    description: 'Eigene Parameter-Kombination',
    icon: '⚙️',
    sliderPreset: {
      climateChange: 1.0,
      populationGrowth: 1.0,
      techProgress: 1.0,
      economicGrowth: 1.0
    }
  }
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

// Simulation calculation functions
const calculateStochasticPath = (baseValue, trend, volatility, steps, deltaT = 1) => {
  const path = [baseValue]
  let currentValue = baseValue
  
  for (let i = 1; i <= steps; i++) {
    // Geometric Brownian Motion with mean reversion
    const dt = deltaT
    const randomShock = (Math.random() - 0.5) * 2 // Normal-ish distribution
    const meanReversion = 0.1 * (baseValue - currentValue) / baseValue
    
    const drift = trend + meanReversion
    const diffusion = volatility * randomShock * Math.sqrt(dt)
    
    currentValue = currentValue * (1 + drift * dt + diffusion)
    path.push(Math.max(0, currentValue)) // Prevent negative values
  }
  
  return path
}

const runMonteCarloSimulation = (config, simulations = 500) => {
  const paths = []
  const years = 10
  const baseProduction = 1000000 // Base production in tons
  
  // Calculate trend based on slider values
  const climateTrend = (config.climateChange - 1) * -0.03 // Negative climate impact
  const populationTrend = (config.populationGrowth - 1) * 0.02 // Population drives demand
  const techTrend = (config.techProgress - 1) * 0.04 // Tech improves efficiency
  const economicTrend = (config.economicGrowth - 1) * 0.015 // Economic growth effect
  
  const totalTrend = climateTrend + populationTrend + techTrend + economicTrend
  
  // Calculate volatility based on uncertainty from factors
  const baseVolatility = 0.1
  const climateVolatility = Math.abs(config.climateChange - 1) * 0.08
  const tradeVolatility = Math.abs(config.economicGrowth - 1) * 0.05
  const totalVolatility = baseVolatility + climateVolatility + tradeVolatility
  
  // Run multiple simulations
  for (let sim = 0; sim < simulations; sim++) {
    const path = calculateStochasticPath(
      baseProduction,
      totalTrend,
      totalVolatility,
      years
    )
    paths.push(path)
  }
  
  
  return paths
}

const calculateConfidenceIntervals = (paths, confidenceLevel = 0.9) => {
  const steps = paths[0].length
  const intervals = []
  
  for (let step = 0; step < steps; step++) {
    const values = paths.map(path => path[step]).sort((a, b) => a - b)
    const lowerIndex = Math.floor((1 - confidenceLevel) / 2 * values.length)
    const upperIndex = Math.floor((1 + confidenceLevel) / 2 * values.length)
    
    intervals.push({
      mean: values.reduce((sum, val) => sum + val, 0) / values.length,
      lower: values[lowerIndex],
      upper: values[upperIndex],
      median: values[Math.floor(values.length / 2)]
    })
  }
  
  return intervals
}

// Methods
const runSimulation = wrapAsync(async () => {
  error.value = null
  isLoading.value = true
  
  try {
    // Get selected scenario for display purposes only
    const scenario = availableScenarios.value.find(s => s.id === selectedScenario.value)
    const scenarioName = scenario ? scenario.name : 'Benutzerdefiniert'
    
    // Simulate some delay for realism
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const config = scenarioConfig.value
    
    // Run Monte Carlo simulation based on current slider values
    const simulationPaths = runMonteCarloSimulation(config)
    const confidenceIntervals = calculateConfidenceIntervals(simulationPaths)
    
    // Create baseline (neutral scenario with all sliders at 1.0)
    const baselineConfig = {
      climateChange: 1.0,
      populationGrowth: 1.0,
      techProgress: 1.0,
      economicGrowth: 1.0
    }
    const baselinePaths = runMonteCarloSimulation(baselineConfig, 100)
    const baselineIntervals = calculateConfidenceIntervals(baselinePaths)
    const baselinePath = baselineIntervals.map(interval => interval.mean)
    
    // Calculate key metrics
    const finalScenario = confidenceIntervals[confidenceIntervals.length - 1].mean
    const finalBaseline = baselinePath[baselinePath.length - 1]
    const productionChange = ((finalScenario - finalBaseline) / finalBaseline * 100)
    
    // Calculate derived metrics with more sophisticated formulas
    const foodSecurity = Math.max(15, Math.min(100, 
      65 + productionChange * 0.3 - 
      Math.abs(config.climateChange - 1) * 20 +
      (config.techProgress - 1) * 15
    ))
    
    const environmentImpact = (
      (config.climateChange - 1) * 30 +
      (config.populationGrowth - 1) * 12 +
      (config.techProgress - 1) * -15 + // Tech reduces impact
      (config.economicGrowth - 1) * 8 +
      (productionChange > 0 ? productionChange * 0.1 : 0) // Intensification
    )
    
    const economicImpact = 
      productionChange * 0.8 + 
      (config.techProgress - 1) * 40 +
      (config.economicGrowth - 1) * 50 -
      Math.abs(environmentImpact) * 0.2 // Environmental costs
    
    // Prepare time series data
    const currentYear = new Date().getFullYear()
    const timeSeriesData = confidenceIntervals.map((interval, index) => ({
      year: currentYear + index,
      baseline: baselinePath[index],
      scenario: interval.mean,
      lower: interval.lower,
      upper: interval.upper
    }))
    
    simulationResults.value = {
      productionChange: Math.round(productionChange * 10) / 10,
      foodSecurity: Math.round(foodSecurity),
      environmentImpact: Math.round(environmentImpact * 10) / 10,
      economicImpact: Math.round(economicImpact * 10) / 10,
      timeSeriesData,
      config: { ...config },
      scenario: scenarioName,
      dataSource: `Monte Carlo Simulation (${simulationPaths.length} Pfade)`,
      simulationDetails: {
        totalPaths: simulationPaths.length,
        confidenceLevel: '90%',
        timeHorizon: '10 Jahre',
        method: 'Geometrische Brownsche Bewegung'
      }
    }
    
    // Update last applied config and reset change indicator
    lastAppliedConfig.value = { ...config }
    hasConfigChanged.value = false
    
  } catch (err) {
    error.value = err
    console.error('Simulation error:', err)
  } finally {
    isLoading.value = false
  }
}, {
  component: 'SimulationPanel',
  operation: 'runSimulation'
})

const resetConfig = () => {
  const resetValues = {
    climateChange: 1.0,
    populationGrowth: 1.0,
    techProgress: 1.0,
    economicGrowth: 1.0
  }
  
  scenarioConfig.value = { ...resetValues }
  lastAppliedConfig.value = { ...resetValues }
  simulationResults.value = null
  hasConfigChanged.value = false
  selectedScenario.value = 'custom'
}

// Watch for slider changes
watch(scenarioConfig, (newConfig) => {
  // Only mark as changed if we have a reference config and values actually differ
  if (lastAppliedConfig.value) {
    const hasActualChanges = Object.keys(newConfig).some(key => {
      return Math.abs(newConfig[key] - lastAppliedConfig.value[key]) > 0.05 // Allow small floating point differences
    })
    
    hasConfigChanged.value = hasActualChanges
    
    if (hasActualChanges) {
      simulationResults.value = null // Clear results when config actually changes
    }
  }
}, { deep: true })

// Load initial data
onMounted(async () => {
  // Pre-select first scenario and apply its preset
  if (availableScenarios.value.length > 0) {
    handleScenarioSelect(availableScenarios.value[0].id)
  }
})

const handleError = (err) => {
  error.value = err
  handleErrorUtil(err, {
    component: 'SimulationPanel',
    action: 'component_error'
  })
}

const handleScenarioSelect = (scenarioId) => {
  selectedScenario.value = scenarioId
  
  // Apply scenario preset to sliders
  const scenario = availableScenarios.value.find(s => s.id === scenarioId)
  if (scenario && scenario.sliderPreset) {
    scenarioConfig.value = { ...scenario.sliderPreset }
    
    // Update last applied config to track changes
    lastAppliedConfig.value = { ...scenario.sliderPreset }
    
    // Clear previous results and reset change indicator
    simulationResults.value = null
    hasConfigChanged.value = false
  }
  
  console.log('Scenario selected:', scenarioId, 'Sliders updated:', scenarioConfig.value)
}

// Helper methods
const formatChange = (value) => {
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)
}

const getChangeClass = (value) => {
  if (value > 0) return 'text-green-600 dark:text-green-400'
  if (value < 0) return 'text-red-600 dark:text-red-400'
  return 'text-gray-600 dark:text-gray-400'
}

const getFoodSecurityClass = (value) => {
  if (value >= 80) return 'text-green-600 dark:text-green-400'
  if (value >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

const getEnvironmentClass = (value) => {
  if (value <= 0) return 'text-green-600 dark:text-green-400'
  if (value <= 10) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

// Description helpers
const getProductionDescription = (value) => {
  if (value > 10) return 'Starke Produktionssteigerung erwartet'
  if (value > 0) return 'Moderate Produktionssteigerung'
  if (value > -10) return 'Leichter Produktionsrückgang'
  return 'Erheblicher Produktionsrückgang'
}

const getFoodSecurityDescription = (value) => {
  if (value >= 80) return 'Hohe Ernährungssicherheit'
  if (value >= 60) return 'Mittlere Ernährungssicherheit'
  if (value >= 40) return 'Niedrige Ernährungssicherheit'
  return 'Kritische Ernährungslage'
}

const getEnvironmentDescription = (value) => {
  if (value <= 0) return 'Positive Umweltauswirkungen'
  if (value <= 5) return 'Geringe Umweltbelastung'
  if (value <= 15) return 'Mäßige Umweltbelastung'
  return 'Hohe Umweltbelastung'
}

const getEconomicDescription = (value) => {
  if (value > 20) return 'Starke wirtschaftliche Vorteile'
  if (value > 0) return 'Positive wirtschaftliche Effekte'
  if (value > -10) return 'Geringe wirtschaftliche Verluste'
  return 'Erhebliche wirtschaftliche Einbußen'
}

const getSliderDescription = (type, value) => {
  switch (type) {
    case 'climate':
      if (value < 0.9) return 'Milde Klimabedingungen'
      if (value > 1.3) return 'Extreme Klimaereignisse'
      return 'Normale Klimabedingungen'
    
    case 'population':
      if (value < 0.9) return 'Schrumpfende Bevölkerung'
      if (value > 1.5) return 'Schnelles Bevölkerungswachstum'
      return 'Stabiles Bevölkerungswachstum'
    
    case 'tech':
      if (value < 0.9) return 'Stagnierende Technologie'
      if (value > 1.5) return 'Durchbruch-Innovationen'
      return 'Stetiger Technologiefortschritt'
    
    case 'economic':
      if (value < 0.8) return 'Wirtschaftskrise'
      if (value > 1.4) return 'Wirtschaftsboom'
      return 'Stabile Wirtschaftslage'
    
    default:
      return ''
  }
}
</script>

<style scoped>
.simulation-panel {
  @apply flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg;
}

.panel-header {
  @apply p-6 border-b border-gray-200 dark:border-gray-700;
}

.panel-title {
  @apply text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2;
}

.panel-description {
  @apply text-gray-600 dark:text-gray-400 mb-6;
}

.simulation-info {
  @apply grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6;
}

.info-section {
  @apply bg-gray-50 dark:bg-gray-900 rounded-lg p-4;
}

.info-title {
  @apply text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3;
}

.info-text {
  @apply text-sm text-gray-700 dark:text-gray-300 leading-relaxed;
}

.info-steps {
  @apply space-y-3;
}

.step {
  @apply flex items-start space-x-3;
}

.step-number {
  @apply flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center;
}

.step-text {
  @apply text-sm text-gray-700 dark:text-gray-300 leading-relaxed;
}

.panel-controls {
  @apply p-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700;
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
  @apply text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4;
}

.config-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-6;
}

.config-item {
  @apply space-y-2;
}

.slider-header {
  @apply flex justify-between items-center;
}

.config-item label {
  @apply text-sm font-medium text-gray-700 dark:text-gray-300;
}

.slider-value {
  @apply text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded;
}

.scenario-section {
  @apply space-y-4 mb-8;
}

.scenario-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-4;
}

.scenario-card {
  @apply p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer transition-all;
  @apply hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md;
}

.scenario-active {
  @apply border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-md;
}

.scenario-icon {
  @apply text-2xl mb-2;
}

.scenario-name {
  @apply font-semibold text-gray-900 dark:text-gray-100 mb-1;
}

.scenario-description {
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.config-actions {
  @apply flex flex-col space-y-3 pt-4;
}

.action-buttons {
  @apply flex space-x-4;
}

.config-changed-indicator {
  @apply text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg border border-orange-200 dark:border-orange-800;
}

.slider-description {
  @apply text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium;
}

.results-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6;
}

.results-header {
  @apply mb-6;
}

.results-meta {
  @apply flex flex-wrap gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400;
}

.meta-item {
  @apply flex items-center gap-1;
}

.result-card {
  @apply bg-gray-50 dark:bg-gray-900 rounded-lg p-4;
}

.result-header {
  @apply flex items-center justify-between mb-3;
}

.result-card h4 {
  @apply text-sm font-medium text-gray-700 dark:text-gray-300;
}

.result-icon {
  @apply text-lg;
}

.result-value {
  @apply text-2xl font-bold mb-2;
}

.result-description {
  @apply text-xs text-gray-500 dark:text-gray-400;
}

.chart-container {
  @apply w-full h-96 bg-gray-50 dark:bg-gray-900 rounded-lg p-4;
}

.error-container,
.loading-container,
.empty-state {
  @apply flex flex-col items-center justify-center h-64;
}

.loading-text {
  @apply mt-4 text-gray-600 dark:text-gray-400;
}

.empty-icon {
  @apply text-6xl mb-4;
}

.empty-state h3 {
  @apply text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2;
}

.empty-state p {
  @apply text-gray-500 dark:text-gray-400;
}
</style>