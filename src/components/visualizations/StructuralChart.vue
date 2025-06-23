<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useVisualization, useTooltip } from '@/composables/useVisualization'
import { useDataStore } from '@/stores/useDataStore'
import { useVisualizationStore } from '@/stores/useVisualizationStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import * as d3 from 'd3'

interface Props {
  data?: any
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
const svgContainerRef = ref<HTMLDivElement>()

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const isInitialized = ref(false)

// Composables
const margin = computed(() => ({
  top: 20,
  right: 20,
  bottom: 20,
  left: 20
}))

const visualization = useVisualization(svgContainerRef, {
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
  nodeColor: '#27ae60', // primary-500
  linkColor: '#6b7280', // gray-500
  highlightColor: '#ef4444', // error-500
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
  if (!visualization.isReady.value || isInitialized.value) return

  try {
    isLoading.value = true
    error.value = null

    await setupChart()
    isInitialized.value = true

  } catch (err) {
    error.value = 'Fehler beim Initialisieren der Strukturanalyse'
    console.error('Structural analysis initialization error:', err)
  } finally {
    isLoading.value = false
  }
}

// Update chart when data changes
const updateChart = async () => {
  if (!visualization.isReady.value || !isInitialized.value) return
  
  try {
    await setupChart()
  } catch (err) {
    console.error('Error updating chart:', err)
  }
}

// Setup chart with D3.js
const setupChart = () => {
  if (!svgContainerRef.value) {
    console.error('❌ StructuralChart: No SVG container reference')
    return
  }
  
  const { width, height } = visualization.dimensions.value
  
  // Ensure we use full container size
  const containerRect = svgContainerRef.value.getBoundingClientRect()
  const svgWidth = containerRect.width || width
  const svgHeight = containerRect.height || height || 600

  // Create SVG
  const { svg, g } = visualization.createSVG({
    width: svgWidth,
    height: svgHeight,
    className: 'structural-svg',
    margin: margin.value
  })
  
  if (!svg || !g) {
    console.error('❌ StructuralChart: Failed to create SVG')
    return
  }

  // Add placeholder content based on analysis type
  const centerX = (svgWidth - margin.value.left - margin.value.right) / 2
  const centerY = (svgHeight - margin.value.top - margin.value.bottom) / 2

  if (props.analysisType === 'network' && props.data) {
    // Use actual network data with performance optimizations
    const allNodes = props.data.nodes || []
    const allLinks = props.data.links || []
    
    // PERFORMANCE: Limit to top 50 nodes by trade volume for smooth performance
    const nodeData = allNodes
      .sort((a, b) => (b.total_trade_volume || 0) - (a.total_trade_volume || 0))
      .slice(0, 50)
      .map(d => ({ ...d })) // Clone to avoid mutation
    
    // PERFORMANCE: Only include links between visible nodes
    const nodeIds = new Set(nodeData.map(d => d.id))
    const linkData = allLinks
      .filter(link => nodeIds.has(link.source) && nodeIds.has(link.target))
      .slice(0, 100) // Limit links for performance
      .map(d => ({ ...d })) // Clone to avoid mutation
    
    // Random initial positions for natural movement
    nodeData.forEach((d, i) => {
      d.x = centerX + (Math.random() - 0.5) * (svgWidth * 0.8)
      d.y = centerY + (Math.random() - 0.5) * (svgHeight * 0.8)
      // No fixed positions - let them move freely
    })
    
    // Natural force simulation for organic movement
    const simulation = d3.forceSimulation(nodeData)
      .force('link', d3.forceLink(linkData).id(d => d.id).distance(120).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-800).distanceMax(300))
      .force('center', d3.forceCenter(centerX, centerY).strength(0.05))
      .force('collision', d3.forceCollide().radius(d => Math.sqrt(d.total_trade_volume / 20000) + 12))
      .alpha(1) // Full energy for dynamic movement
      .alphaDecay(0.02) // Slower decay for longer movement
      .velocityDecay(0.4) // Lower friction for more fluid movement
    
    // Create links with performance optimizations
    const links = g.selectAll('.link')
      .data(linkData)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#6b7280') // Direct color instead of computed
      .attr('stroke-opacity', 0.4) // Lighter for better performance
      .attr('stroke-width', 1) // Fixed width for performance
      .attr('x1', d => d.source.x || centerX)
      .attr('y1', d => d.source.y || centerY) 
      .attr('x2', d => d.target.x || centerX)
      .attr('y2', d => d.target.y || centerY)
    
    // Create nodes
    const nodes = g.selectAll('.node')
      .data(nodeData)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .on('click', (event, d) => emit('nodeClick', d))
    
    // Add circles for nodes with green theme and entrance animation
    nodes.append('circle')
      .attr('r', 0) // Start with radius 0 for animation
      .attr('fill', '#27ae60') // Primary green
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .transition()
      .duration(500)
      .delay((d, i) => i * 10) // Staggered animation
      .attr('r', d => Math.max(Math.sqrt(d.total_trade_volume / 20000) + 4, 6))
    
    // Set initial positions
    nodes.attr('transform', d => `translate(${d.x},${d.y})`)
    
    // Add labels (only for larger nodes to reduce DOM elements)
    nodes.filter(d => d.total_trade_volume > 50000)
      .append('text')
      .text(d => d.id.length > 12 ? d.id.substring(0, 12) + '...' : d.id)
      .attr('x', 0)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', '#1a6e41') // Primary green dark
      .style('font-weight', '600')
      .style('pointer-events', 'none')
    
    // Add tooltip on hover
    nodes.on('mouseover', (event, d) => {
      tooltip.show({
        content: `
          <strong>${d.id}</strong><br>
          Trade Volume: ${d.total_trade_volume?.toLocaleString() || 'N/A'}
        `,
        event
      })
    })
    .on('mouseout', () => tooltip.hide())
    
    // Smooth simulation updates for natural movement
    let tickCount = 0
    simulation.on('tick', () => {
      tickCount++
      
      // Update positions on every tick for smooth movement
      links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
      
      nodes.attr('transform', d => `translate(${d.x},${d.y})`)
      
      // Let simulation run longer for better settling
      if (simulation.alpha() < 0.005 || tickCount > 1000) {
        simulation.stop()
      }
    })
    
    // Enhanced drag behavior for smooth interaction
    const drag = d3.drag()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
        // Visual feedback on drag start
        d3.select(event.sourceEvent.target)
          .transition()
          .duration(100)
          .attr('r', d => (Math.max(Math.sqrt(d.total_trade_volume / 20000) + 4, 6)) * 1.2)
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        // Release node but keep some momentum
        setTimeout(() => {
          d.fx = null
          d.fy = null
        }, 100)
        // Reset visual feedback
        d3.select(event.sourceEvent.target)
          .transition()
          .duration(200)
          .attr('r', d => Math.max(Math.sqrt(d.total_trade_volume / 20000) + 4, 6))
      })
    
    nodes.call(drag)
  } else if (props.analysisType === 'network') {
    // Fallback to sample nodes if no data
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
  if (isInitialized.value) {
    updateChart()
  }
})

// Reinitialize when data changes
watch(() => props.data, () => {
  if (isInitialized.value) {
    updateChart()
  }
}, { deep: true })

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
    class="chart-container relative w-full h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
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
      <div class="flex gap-2">
        <BaseButton
          v-for="analysis in analysisTypes"
          :key="analysis.id"
          :variant="props.analysisType === analysis.id ? 'primary' : 'outline-primary'"
          size="sm"
          @click="changeAnalysisType(analysis.id)"
        >
          {{ analysis.name }}
        </BaseButton>
      </div>
    </div>

    <!-- Chart SVG Container -->
    <div ref="svgContainerRef" class="chart-svg-container flex-1 bg-gray-50 dark:bg-gray-900" />

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

<style scoped>
/* D3 SVG Styles */
:deep(.structural-svg) {
  @apply w-full h-full;
}

:deep(.node) {
  @apply transition-all duration-200;
}

:deep(.node:hover) {
  @apply opacity-80;
}

:deep(.node text) {
  @apply pointer-events-none select-none;
  font-family: inherit;
}

:deep(.link) {
  @apply pointer-events-none;
}

:deep(.chart-title) {
  @apply fill-current text-gray-900 dark:text-gray-100;
}

/* Tooltip styles */
:global(.structural-tooltip) {
  @apply absolute bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3;
  @apply border border-gray-200 dark:border-gray-700;
  @apply text-sm text-gray-900 dark:text-gray-100;
  @apply pointer-events-none z-50;
  @apply max-w-xs;
}
</style>