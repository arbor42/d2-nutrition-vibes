<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useVisualization, useTooltip } from '@/composables/useVisualization'
import { useDataStore } from '@/stores/useDataStore'
import { useVisualizationStore } from '@/stores/useVisualizationStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import * as d3 from 'd3'

interface Props {
  width?: number
  height?: number
  selectedScenario?: string
  simulationRuns?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 500,
  selectedScenario: 'climate_change',
  simulationRuns: 100
})

const emit = defineEmits<{
  scenarioChange: [scenario: string]
  runSimulation: []
}>()

// Stores
const dataStore = useDataStore()
const vizStore = useVisualizationStore()

// Refs
const containerRef = ref<HTMLDivElement>()

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const isSimulating = ref(false)
const simulationProgress = ref(0)

// Composables
const margin = computed(() => ({
  top: 20,
  right: 30,
  bottom: 40,
  left: 60
}))

const visualization = useVisualization(containerRef, {
  margin: margin.value,
  responsive: true,
  autoResize: true
})

const tooltip = useTooltip({
  className: 'simulation-tooltip chart-tooltip',
  followMouse: true
})

// Chart configuration
const chartConfig = computed(() => ({
  baselineColor: vizStore.getColorScheme('simulation')[0] || '#6b7280',
  scenarioColor: vizStore.getColorScheme('simulation')[1] || '#ef4444',
  ...vizStore.getVisualizationConfig('simulation')
}))

// Available scenarios
const scenarios = [
  { id: 'climate_change', name: 'Klimawandel', description: 'Auswirkungen des Klimawandels auf die Produktion' },
  { id: 'population_growth', name: 'Bevölkerungswachstum', description: 'Erhöhter Bedarf durch Bevölkerungswachstum' },
  { id: 'technology_advancement', name: 'Technologiefortschritt', description: 'Effizienzsteigerungen durch neue Technologien' },
  { id: 'market_disruption', name: 'Marktdisruption', description: 'Auswirkungen von Marktveränderungen' }
]

// Initialize chart
const initializeChart = async () => {
  if (!visualization.isReady.value) return

  try {
    isLoading.value = true
    error.value = null

    visualization.queueUpdate(setupChart, null, true)

  } catch (err) {
    error.value = 'Fehler beim Initialisieren der Simulation'
    console.error('Simulation initialization error:', err)
  } finally {
    isLoading.value = false
  }
}

// Setup chart with D3.js
const setupChart = (container) => {
  const { width, height } = visualization.dimensions.value

  // Create SVG
  const { svg, g } = visualization.createSVG({
    width,
    height,
    className: 'simulation-svg',
    margin: margin.value
  })

  // Add placeholder content
  g.append('text')
    .attr('class', 'chart-title')
    .attr('x', (width - margin.value.left - margin.value.right) / 2)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .style('fill', 'currentColor')
    .text('Szenario-Simulation')

  // Set chart instance
  vizStore.setChartInstance('simulation', svg.node())
}

// Run simulation
const runSimulation = async () => {
  if (isSimulating.value) return

  try {
    isSimulating.value = true
    simulationProgress.value = 0

    // Simulate progress
    const progressInterval = setInterval(() => {
      simulationProgress.value += Math.random() * 10
      if (simulationProgress.value >= 100) {
        simulationProgress.value = 100
        clearInterval(progressInterval)
        isSimulating.value = false
        emit('runSimulation')
      }
    }, 100)

  } catch (err) {
    error.value = 'Fehler beim Ausführen der Simulation'
    console.error('Simulation error:', err)
    isSimulating.value = false
  }
}

// Initialize when visualization is ready
watch(() => visualization.isReady.value, (isReady) => {
  if (isReady) {
    initializeChart()
  }
})

// Cleanup on unmount
watch(() => visualization.isDestroyed.value, (isDestroyed) => {
  if (isDestroyed) {
    tooltip.destroy()
    vizStore.removeChartInstance('simulation')
  }
})

// Exposed methods
defineExpose({
  runSimulation
})
</script>

<template>
  <div 
    ref="containerRef"
    class="chart-container relative w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
  >
    <!-- Loading overlay -->
    <LoadingSpinner
      v-if="isLoading"
      :overlay="true"
      :centered="true"
      text="Lädt Simulation..."
      size="md"
    />

    <!-- Error message -->
    <div
      v-if="error"
      class="absolute inset-0 bg-error-50 dark:bg-error-900/20 flex items-center justify-center z-10"
    >
      <div class="text-center">
        <p class="text-error-600 dark:text-error-400 mb-3">{{ error }}</p>
        <BaseButton
          @click="initializeChart"
          variant="danger"
          size="sm"
        >
          Erneut versuchen
        </BaseButton>
      </div>
    </div>

    <!-- Simulation controls -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Szenario-Simulation
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Monte-Carlo-Simulation mit {{ props.simulationRuns }} Durchläufen
          </p>
        </div>
        
        <BaseButton
          @click="runSimulation"
          :disabled="isSimulating"
          variant="primary"
          size="sm"
        >
          {{ isSimulating ? 'Simuliert...' : 'Simulation starten' }}
        </BaseButton>
      </div>

      <!-- Scenario selection -->
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="scenario in scenarios"
          :key="scenario.id"
          class="p-3 rounded-lg border cursor-pointer transition-colors"
          :class="[
            props.selectedScenario === scenario.id
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          ]"
          @click="$emit('scenarioChange', scenario.id)"
        >
          <h4 class="font-medium text-gray-900 dark:text-gray-100">{{ scenario.name }}</h4>
          <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">{{ scenario.description }}</p>
        </div>
      </div>

      <!-- Progress bar when simulating -->
      <div v-if="isSimulating" class="mt-4">
        <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Simulation läuft...</span>
          <span>{{ Math.round(simulationProgress) }}%</span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            class="bg-primary-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${simulationProgress}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Chart SVG Container -->
    <div class="p-4 min-h-[400px]" />

    <!-- Placeholder content -->
    <div class="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400 pointer-events-none">
      <div class="text-center">
        <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p>Szenario-Simulation</p>
        <p class="text-xs mt-1">Wählen Sie ein Szenario und starten Sie die Simulation</p>
      </div>
    </div>
  </div>
</template>