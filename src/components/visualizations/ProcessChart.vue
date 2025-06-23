<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useVisualization, useTooltip } from '@/composables/useVisualization'
import { useDataStore } from '@/stores/useDataStore'
import { useVisualizationStore } from '@/stores/useVisualizationStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import * as d3 from 'd3'

interface ProcessFlow {
  process_id: string
  trace_id: string
  activities: Array<{
    name: string
    stage: number
    value: number
    unit: string
    timestamp: string
  }>
  duration_years: number
  total_value: number
}

interface Props {
  data?: ProcessFlow[] | null
  config?: {
    type?: string
    width?: number
    height?: number
    showMetrics?: boolean
    showFrequencies?: boolean
    interactive?: boolean
    darkMode?: boolean
  }
  mode?: 'flow' | 'network' | 'timeline'
  processType?: 'production' | 'supply_chain' | 'consumption'
  timeRange?: 'monthly' | 'yearly'
}

const props = withDefaults(defineProps<Props>(), {
  data: null,
  config: () => ({
    type: 'flow',
    width: 900,
    height: 600,
    showMetrics: true,
    showFrequencies: true,
    interactive: true,
    darkMode: false
  }),
  mode: 'flow',
  processType: 'production',
  timeRange: 'yearly'
})

const emit = defineEmits<{
  processChange: [type: string]
  timeRangeChange: [range: string]
  processStep: [step: any]
  activitySelect: [activity: any]
  pathSelect: [path: any]
  nodeClick: [node: any]
  linkClick: [link: any]
}>()

// Stores
const dataStore = useDataStore()
const vizStore = useVisualizationStore()

// Refs
const containerRef = ref<HTMLDivElement>()

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const isAnalyzing = ref(false)

// Composables
const margin = computed(() => ({
  top: 40,
  right: 40,
  bottom: 40,
  left: 40
}))

const visualization = useVisualization(containerRef, {
  margin: margin.value,
  responsive: true,
  autoResize: true
})

const tooltip = useTooltip({
  className: 'process-tooltip chart-tooltip',
  followMouse: true
})

// Chart configuration
const chartConfig = computed(() => ({
  primaryColor: props.config?.darkMode ? '#60a5fa' : '#3b82f6',
  secondaryColor: props.config?.darkMode ? '#4ade80' : '#10b981',
  accentColor: props.config?.darkMode ? '#fbbf24' : '#f59e0b',
  dangerColor: props.config?.darkMode ? '#f87171' : '#ef4444',
  backgroundColor: props.config?.darkMode ? '#1f2937' : '#ffffff',
  textColor: props.config?.darkMode ? '#f9fafb' : '#111827',
  borderColor: props.config?.darkMode ? '#374151' : '#e5e7eb',
  ...props.config,
  ...vizStore.getVisualizationConfig('process')
}))

// Process types
const processTypes = [
  { id: 'production', name: 'Produktion', description: 'Produktionsprozesse und -effizienz' },
  { id: 'supply_chain', name: 'Lieferkette', description: 'Supply-Chain-Optimierung' },
  { id: 'consumption', name: 'Verbrauch', description: 'Verbrauchsmuster und -trends' }
]

// Time ranges
const timeRanges = [
  { id: 'monthly', name: 'Monatlich', description: 'Monatliche Prozessanalyse' },
  { id: 'yearly', name: 'Jährlich', description: 'Jährliche Prozessanalyse' }
]

// Process the data for visualization
const processedData = computed(() => {
  if (!props.data || !Array.isArray(props.data)) {
    return null
  }
  
  // Extract all unique activities and their frequencies
  const activityCounts = {}
  const processFlows = []
  
  props.data.forEach(flow => {
    flow.activities.forEach(activity => {
      if (!activityCounts[activity.name]) {
        activityCounts[activity.name] = 0
      }
      activityCounts[activity.name]++
    })
    
    // Create flow connections
    for (let i = 0; i < flow.activities.length - 1; i++) {
      const from = flow.activities[i]
      const to = flow.activities[i + 1]
      
      processFlows.push({
        source: from.name,
        target: to.name,
        value: from.value,
        flow_id: flow.process_id
      })
    }
  })
  
  return {
    activities: Object.keys(activityCounts).map(name => ({
      id: name,
      name,
      count: activityCounts[name],
      type: 'activity'
    })),
    flows: processFlows,
    rawData: props.data
  }
})

// Initialize chart
const initializeChart = async () => {
  if (!visualization.isReady.value || !processedData.value) return

  try {
    isLoading.value = true
    error.value = null

    visualization.queueUpdate(setupChart, processedData.value, true)

  } catch (err) {
    error.value = 'Fehler beim Initialisieren der Prozessanalyse'
    console.error('Process analysis initialization error:', err)
  } finally {
    isLoading.value = false
  }
}

// Setup chart with D3.js
const setupChart = (data) => {
  const { width, height } = visualization.dimensions.value
  const innerWidth = width - margin.value.left - margin.value.right
  const innerHeight = height - margin.value.top - margin.value.bottom

  // Create SVG
  const { svg, g } = visualization.createSVG({
    width,
    height,
    className: 'process-svg',
    margin: margin.value
  })

  // Apply dark mode styles
  svg.style('background-color', chartConfig.value.backgroundColor)

  // Create visualization based on mode
  if (props.mode === 'flow') {
    createProcessFlow(g, data, innerWidth, innerHeight)
  } else if (props.mode === 'network') {
    createNetworkDiagram(g, data, innerWidth, innerHeight)
  } else if (props.mode === 'timeline') {
    createTimelineView(g, data, innerWidth, innerHeight)
  }

  // Set chart instance
  vizStore.setChartInstance('process', svg.node())
}

// Create process flow diagram with real data
const createProcessFlow = (container, data, width, height) => {
  if (!data || !data.activities || data.activities.length === 0) {
    showNoDataMessage(container, width, height)
    return
  }

  // Position activities in a flow layout
  const activities = data.activities.map((activity, i) => ({
    ...activity,
    x: (width / (data.activities.length + 1)) * (i + 1),
    y: height / 2,
    radius: Math.min(40, Math.max(20, Math.sqrt(activity.count) * 3))
  }))

  // Create arrow marker
  const defs = container.append('defs')
  defs.append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 8)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', chartConfig.value.secondaryColor)

  // Group flows by source-target pairs
  const flowGroups = d3.group(data.flows, d => `${d.source}-${d.target}`)
  
  // Draw flow connections
  Array.from(flowGroups.entries()).forEach(([key, flows]) => {
    const [sourceName, targetName] = key.split('-')
    const sourceActivity = activities.find(a => a.name === sourceName)
    const targetActivity = activities.find(a => a.name === targetName)
    
    if (sourceActivity && targetActivity) {
      const flowWidth = Math.min(8, Math.max(1, flows.length / 2))
      
      container.append('line')
        .attr('x1', sourceActivity.x)
        .attr('y1', sourceActivity.y)
        .attr('x2', targetActivity.x)
        .attr('y2', targetActivity.y)
        .attr('stroke', chartConfig.value.secondaryColor)
        .attr('stroke-width', flowWidth)
        .attr('opacity', 0.7)
        .attr('marker-end', 'url(#arrow)')
        .style('cursor', 'pointer')
        .on('click', () => emit('linkClick', { source: sourceName, target: targetName, flows }))
    }
  })

  // Draw activity nodes
  const activityGroups = container.selectAll('.activity-node')
    .data(activities)
    .enter()
    .append('g')
    .attr('class', 'activity-node')
    .attr('transform', d => `translate(${d.x}, ${d.y})`)
    .style('cursor', 'pointer')
    .on('click', (event, d) => emit('activitySelect', d))
    .on('mouseover', function(event, d) {
      tooltip.show(event, `
        <div class="font-semibold">${d.name}</div>
        <div class="text-sm">Vorkommen: ${d.count}</div>
      `)
    })
    .on('mouseout', () => tooltip.hide())

  // Activity circles
  activityGroups.append('circle')
    .attr('r', d => d.radius)
    .attr('fill', chartConfig.value.primaryColor)
    .attr('stroke', chartConfig.value.backgroundColor)
    .attr('stroke-width', 3)
    .transition()
    .duration(500)
    .attr('r', d => d.radius)

  // Activity labels
  activityGroups.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .style('fill', 'white')
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .text(d => d.name.length > 10 ? d.name.substring(0, 10) + '...' : d.name)

  // Activity count badges
  activityGroups.append('circle')
    .attr('cx', d => d.radius * 0.7)
    .attr('cy', d => -d.radius * 0.7)
    .attr('r', 12)
    .attr('fill', chartConfig.value.accentColor)
    .attr('stroke', chartConfig.value.backgroundColor)
    .attr('stroke-width', 2)

  activityGroups.append('text')
    .attr('x', d => d.radius * 0.7)
    .attr('y', d => -d.radius * 0.7)
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .style('fill', 'white')
    .style('font-size', '10px')
    .style('font-weight', 'bold')
    .text(d => d.count)
}

// Create network diagram
const createNetworkDiagram = (container, data, width, height) => {
  if (!data || !data.activities || data.activities.length === 0) {
    showNoDataMessage(container, width, height)
    return
  }

  // Create force simulation
  const simulation = d3.forceSimulation(data.activities)
    .force('link', d3.forceLink(data.flows).id(d => d.name).strength(0.1))
    .force('charge', d3.forceManyBody().strength(-100))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => Math.sqrt(d.count) * 5 + 5))

  // Draw links
  const links = container.selectAll('.link')
    .data(data.flows)
    .enter()
    .append('line')
    .attr('class', 'link')
    .attr('stroke', chartConfig.value.borderColor)
    .attr('stroke-width', 2)
    .attr('opacity', 0.6)

  // Draw nodes
  const nodes = container.selectAll('.node')
    .data(data.activities)
    .enter()
    .append('g')
    .attr('class', 'node')
    .style('cursor', 'pointer')
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended))
    .on('click', (event, d) => emit('nodeClick', d))

  nodes.append('circle')
    .attr('r', d => Math.sqrt(d.count) * 3 + 10)
    .attr('fill', chartConfig.value.primaryColor)
    .attr('stroke', chartConfig.value.backgroundColor)
    .attr('stroke-width', 2)

  nodes.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .style('fill', 'white')
    .style('font-size', '10px')
    .style('font-weight', 'bold')
    .text(d => d.name.length > 8 ? d.name.substring(0, 8) + '...' : d.name)

  // Update positions on simulation tick
  simulation.on('tick', () => {
    links
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)

    nodes.attr('transform', d => `translate(${d.x}, ${d.y})`)
  })

  // Drag functions
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart()
    d.fx = d.x
    d.fy = d.y
  }

  function dragged(event, d) {
    d.fx = event.x
    d.fy = event.y
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0)
    d.fx = null
    d.fy = null
  }
}

// Create timeline view
const createTimelineView = (container, data, width, height) => {
  if (!data || !data.rawData || data.rawData.length === 0) {
    showNoDataMessage(container, width, height)
    return
  }

  // Extract timeline data from flows
  const timelineData = []
  data.rawData.forEach(flow => {
    flow.activities.forEach((activity, index) => {
      timelineData.push({
        ...activity,
        flow_id: flow.process_id,
        order: index,
        duration: flow.duration_years
      })
    })
  })

  // Group by timestamp/stage
  const stageGroups = d3.group(timelineData, d => d.stage)
  const stages = Array.from(stageGroups.keys()).sort((a, b) => a - b)
  
  const stageWidth = width / stages.length
  const maxActivitiesPerStage = Math.max(...Array.from(stageGroups.values()).map(group => group.length))
  
  // Draw stage columns
  stages.forEach((stage, stageIndex) => {
    const stageActivities = stageGroups.get(stage)
    const x = stageIndex * stageWidth + stageWidth / 2
    
    // Stage header
    container.append('text')
      .attr('x', x)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('fill', chartConfig.value.textColor)
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text(`Stage ${stage}`)
    
    // Draw activities in this stage
    stageActivities.forEach((activity, activityIndex) => {
      const y = 60 + (activityIndex * (height - 100) / maxActivitiesPerStage)
      
      const activityGroup = container.append('g')
        .attr('transform', `translate(${x}, ${y})`)
        .style('cursor', 'pointer')
        .on('click', () => emit('activitySelect', activity))
      
      activityGroup.append('rect')
        .attr('x', -60)
        .attr('y', -15)
        .attr('width', 120)
        .attr('height', 30)
        .attr('rx', 5)
        .attr('fill', chartConfig.value.primaryColor)
        .attr('stroke', chartConfig.value.backgroundColor)
        .attr('stroke-width', 2)
      
      activityGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('fill', 'white')
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .text(activity.name.length > 12 ? activity.name.substring(0, 12) + '...' : activity.name)
    })
  })
}

// Show no data message
const showNoDataMessage = (container, width, height) => {
  container.append('text')
    .attr('x', width / 2)
    .attr('y', height / 2)
    .attr('text-anchor', 'middle')
    .style('fill', chartConfig.value.textColor)
    .style('font-size', '16px')
    .text('Keine Prozessdaten verfügbar')
  
  container.append('text')
    .attr('x', width / 2)
    .attr('y', height / 2 + 25)
    .attr('text-anchor', 'middle')
    .style('fill', chartConfig.value.textColor)
    .style('font-size', '12px')
    .text('Laden Sie Daten oder starten Sie eine Prozessanalyse')
}

// Start process analysis
const startAnalysis = async () => {
  if (isAnalyzing.value) return

  isAnalyzing.value = true
  
  // Simulate analysis process
  setTimeout(() => {
    isAnalyzing.value = false
    // Emit process completion
    emit('processStep', { 
      type: props.processType, 
      timeRange: props.timeRange,
      completed: true 
    })
  }, 2000)
}

// Change process type
const changeProcessType = (type: string) => {
  emit('processChange', type)
  if (visualization.isReady.value) {
    initializeChart()
  }
}

// Change time range
const changeTimeRange = (range: string) => {
  emit('timeRangeChange', range)
}

// Initialize when visualization is ready
watch(() => visualization.isReady.value, (isReady) => {
  if (isReady) {
    initializeChart()
  }
})

// Reinitialize when data changes
watch(() => props.data, () => {
  if (visualization.isReady.value) {
    initializeChart()
  }
}, { deep: true })

// Reinitialize when mode changes
watch(() => props.mode, () => {
  if (visualization.isReady.value) {
    initializeChart()
  }
})

// Reinitialize when config changes
watch(() => props.config, () => {
  if (visualization.isReady.value) {
    initializeChart()
  }
}, { deep: true })

// Cleanup on unmount
watch(() => visualization.isDestroyed.value, (isDestroyed) => {
  if (isDestroyed) {
    tooltip.destroy()
    vizStore.removeChartInstance('process')
  }
})

// Exposed methods
defineExpose({
  startAnalysis,
  changeProcessType,
  changeTimeRange
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
      text="Lädt Prozessanalyse..."
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

    <!-- Process controls -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Process Mining
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ processTypes.find(t => t.id === props.processType)?.description }}
          </p>
        </div>
        
        <BaseButton
          @click="startAnalysis"
          :disabled="isAnalyzing"
          variant="primary"
          size="sm"
        >
          {{ isAnalyzing ? 'Analysiert...' : 'Analyse starten' }}
        </BaseButton>
      </div>

      <div class="flex items-center justify-between">
        <!-- Process type selection -->
        <div class="flex space-x-2">
          <BaseButton
            v-for="process in processTypes"
            :key="process.id"
            :variant="props.processType === process.id ? 'primary' : 'secondary'"
            size="sm"
            @click="changeProcessType(process.id)"
          >
            {{ process.name }}
          </BaseButton>
        </div>

        <!-- Time range selection -->
        <div class="flex space-x-2">
          <BaseButton
            v-for="range in timeRanges"
            :key="range.id"
            :variant="props.timeRange === range.id ? 'primary' : 'secondary'"
            size="sm"
            @click="changeTimeRange(range.id)"
          >
            {{ range.name }}
          </BaseButton>
        </div>
      </div>

      <!-- Analysis progress -->
      <div v-if="isAnalyzing" class="mt-4">
        <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Prozessanalyse läuft...</span>
          <span>Mining Patterns...</span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div class="bg-primary-500 h-2 rounded-full animate-pulse w-full" />
        </div>
      </div>
    </div>

    <!-- Chart SVG Container -->
    <div class="p-4 min-h-[400px]" />

    <!-- Process info -->
    <div class="absolute bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm max-w-xs">
      <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
        {{ processTypes.find(t => t.id === props.processType)?.name }}-Mining
      </h4>
      <p class="text-xs text-gray-600 dark:text-gray-400">
        {{ timeRanges.find(r => r.id === props.timeRange)?.description }}
      </p>
    </div>
  </div>
</template>