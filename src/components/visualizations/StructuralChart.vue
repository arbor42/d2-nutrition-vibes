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
  analysisType?: 'network' | 'hierarchy' | 'flow'
  selectedRegion?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 600,
  analysisType: 'network',
  selectedRegion: 'global'
})

const emit = defineEmits<{
  analysisChange: [type: string]
  nodeClick: [node: any]
}>()

// Stores
const dataStore = useDataStore()
const vizStore = useVisualizationStore()

// Refs
const containerRef = ref<HTMLDivElement>()

// State
const isLoading = ref(false)
const error = ref<string | null>(null)

// Composables
const margin = computed(() => ({
  top: 20,
  right: 20,
  bottom: 20,
  left: 20
}))

const visualization = useVisualization(containerRef, {
  margin: margin.value,
  responsive: true,
  autoResize: true
})

const tooltip = useTooltip({
  className: 'structural-tooltip chart-tooltip',
  followMouse: true
})

// Chart configuration
const chartConfig = computed(() => ({
  nodeColor: vizStore.getColorScheme('structural')[0] || '#3b82f6',
  linkColor: vizStore.getColorScheme('structural')[1] || '#6b7280',
  highlightColor: vizStore.getColorScheme('structural')[2] || '#ef4444',
  ...vizStore.getVisualizationConfig('structural')
}))

// Analysis types
const analysisTypes = [
  { id: 'network', name: 'Netzwerk', description: 'Handelsbeziehungen zwischen Ländern' },
  { id: 'hierarchy', name: 'Hierarchie', description: 'Strukturelle Abhängigkeiten' },
  { id: 'flow', name: 'Fluss', description: 'Handelsströme und -richtungen' }
]

// Initialize chart
const initializeChart = async () => {
  if (!visualization.isReady.value) return

  try {
    isLoading.value = true
    error.value = null

    visualization.queueUpdate(setupChart, null, true)

  } catch (err) {
    error.value = 'Fehler beim Initialisieren der Strukturanalyse'
    console.error('Structural analysis initialization error:', err)
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
    className: 'structural-svg',
    margin: margin.value
  })

  // Add placeholder content based on analysis type
  const centerX = (width - margin.value.left - margin.value.right) / 2
  const centerY = (height - margin.value.top - margin.value.bottom) / 2

  if (props.analysisType === 'network') {
    // Create sample network nodes
    const nodes = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: centerX + Math.cos(i * 0.314) * 100,
      y: centerY + Math.sin(i * 0.314) * 100,
      radius: Math.random() * 10 + 5
    }))

    g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'node')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.radius)
      .attr('fill', chartConfig.value.nodeColor)
      .attr('stroke', chartConfig.value.linkColor)
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
  }

  g.append('text')
    .attr('class', 'chart-title')
    .attr('x', centerX)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .style('fill', 'currentColor')
    .text(`${analysisTypes.find(t => t.id === props.analysisType)?.name}-Analyse`)

  // Set chart instance
  vizStore.setChartInstance('structural', svg.node())
}

// Change analysis type
const changeAnalysisType = (type: string) => {
  emit('analysisChange', type)
  // Reinitialize chart with new type
  if (visualization.isReady.value) {
    initializeChart()
  }
}

// Initialize when visualization is ready
watch(() => visualization.isReady.value, (isReady) => {
  if (isReady) {
    initializeChart()
  }
})

// Reinitialize when analysis type changes
watch(() => props.analysisType, () => {
  if (visualization.isReady.value) {
    initializeChart()
  }
})

// Cleanup on unmount
watch(() => visualization.isDestroyed.value, (isDestroyed) => {
  if (isDestroyed) {
    tooltip.destroy()
    vizStore.removeChartInstance('structural')
  }
})

// Exposed methods
defineExpose({
  changeAnalysisType
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
      text="Lädt Strukturanalyse..."
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

    <!-- Analysis controls -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Strukturanalyse
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ analysisTypes.find(t => t.id === props.analysisType)?.description }}
          </p>
        </div>
      </div>

      <!-- Analysis type selection -->
      <div class="flex space-x-2">
        <BaseButton
          v-for="analysis in analysisTypes"
          :key="analysis.id"
          :variant="props.analysisType === analysis.id ? 'primary' : 'secondary'"
          size="sm"
          @click="changeAnalysisType(analysis.id)"
        >
          {{ analysis.name }}
        </BaseButton>
      </div>
    </div>

    <!-- Chart SVG Container -->
    <div class="p-4 min-h-[500px]" />

    <!-- Analysis info -->
    <div class="absolute bottom-4 left-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm max-w-xs">
      <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
        {{ analysisTypes.find(t => t.id === props.analysisType)?.name }}-Analyse
      </h4>
      <p class="text-xs text-gray-600 dark:text-gray-400">
        {{ analysisTypes.find(t => t.id === props.analysisType)?.description }}
      </p>
    </div>
  </div>
</template>