<template>
  <div ref="containerRef" class="network-visualization w-full h-full">
    <svg ref="svgRef" class="w-full h-full"></svg>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'
import { useVisualization, useTooltip } from '@/composables/useVisualization'
import { formatTooltipValue } from '@/utils/formatters'

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  layout: {
    type: String,
    default: 'force'
  }
})

const emit = defineEmits(['node-click', 'node-hover'])

// Refs
const containerRef = ref(null)
const svgRef = ref(null)

// Composables
const tooltip = useTooltip({
  className: 'network-tooltip',
  followMouse: true
})

// D3 references
let svg = null
let g = null
let simulation = null
let nodes = null
let links = null

// Initialize visualization
const initVisualization = () => {
  if (!svgRef.value || !props.data) return

  // Clear previous visualization
  d3.select(svgRef.value).selectAll('*').remove()

  // Get dimensions
  const rect = containerRef.value.getBoundingClientRect()
  const width = rect.width
  const height = rect.height

  // Create SVG
  svg = d3.select(svgRef.value)
    .attr('width', width)
    .attr('height', height)

  // Create container group
  g = svg.append('g')

  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
    })

  svg.call(zoom)

  // Create visualization based on layout
  if (props.layout === 'force') {
    createForceLayout(width, height)
  } else if (props.layout === 'circular') {
    createCircularLayout(width, height)
  }
}

// Force-directed layout
const createForceLayout = (width, height) => {
  const nodeData = props.data.nodes.map(d => ({ ...d }))
  const linkData = props.data.links.map(d => ({ ...d }))

  // Create simulation with reduced forces for calmer movement
  simulation = d3.forceSimulation(nodeData)
    .force('link', d3.forceLink(linkData).id(d => d.id).distance(150).strength(0.3))
    .force('charge', d3.forceManyBody().strength(-200).distanceMax(300))
    .force('center', d3.forceCenter(width / 2, height / 2).strength(0.02))
    .force('collision', d3.forceCollide().radius(d => Math.sqrt(d.total_trade_volume / 1000) + 10).strength(0.8))
    .force('x', d3.forceX(width / 2).strength(0.01))
    .force('y', d3.forceY(height / 2).strength(0.01))
    .alphaDecay(0.02)
    .velocityDecay(0.5)

  // Create links
  links = g.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(linkData)
    .enter().append('line')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', d => Math.sqrt(d.value))

  // Create nodes
  const nodeGroup = g.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodeData)
    .enter().append('g')
    .attr('class', 'node')
    .call(drag(simulation))

  // Add circles
  nodes = nodeGroup.append('circle')
    .attr('r', d => Math.sqrt(d.total_trade_volume / 1000) + 5)
    .attr('fill', d => d.trade_balance > 0 ? '#10b981' : '#ef4444')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .on('click', (event, d) => emit('node-click', d))
    .on('mouseover', (event, d) => {
      emit('node-hover', d)
      tooltip.show({
        content: `
          <strong>${d.name}</strong><br>
          Volume: ${formatTooltipValue(d.total_trade_volume, '1000 t')}<br>
          Balance: ${formatTooltipValue(d.trade_balance, '1000 t')}
        `,
        event
      })
    })
    .on('mouseout', () => tooltip.hide())

  // Add labels for major nodes
  nodeGroup.filter(d => d.total_trade_volume > 50000)
    .append('text')
    .text(d => d.name)
    .attr('x', 0)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', '#374151')
    .attr('class', 'node-label')

  // Update positions on tick
  simulation.on('tick', () => {
    links
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)

    nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`)
  })
}

// Circular layout
const createCircularLayout = (width, height) => {
  const nodeData = props.data.nodes.map(d => ({ ...d }))
  const linkData = props.data.links.map(d => ({ ...d }))

  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) * 0.4

  // Position nodes in a circle
  nodeData.forEach((d, i) => {
    const angle = (i / nodeData.length) * 2 * Math.PI
    d.x = centerX + radius * Math.cos(angle)
    d.y = centerY + radius * Math.sin(angle)
  })

  // Create links
  links = g.append('g')
    .attr('class', 'links')
    .selectAll('path')
    .data(linkData)
    .enter().append('path')
    .attr('d', d => {
      const source = nodeData.find(n => n.id === d.source)
      const target = nodeData.find(n => n.id === d.target)
      return `M${source.x},${source.y} Q${centerX},${centerY} ${target.x},${target.y}`
    })
    .attr('fill', 'none')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.3)
    .attr('stroke-width', d => Math.sqrt(d.value))

  // Create nodes
  const nodeGroup = g.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodeData)
    .enter().append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.x},${d.y})`)

  // Add circles
  nodes = nodeGroup.append('circle')
    .attr('r', d => Math.sqrt(d.total_trade_volume / 1000) + 5)
    .attr('fill', d => d.trade_balance > 0 ? '#10b981' : '#ef4444')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .on('click', (event, d) => emit('node-click', d))
    .on('mouseover', (event, d) => {
      emit('node-hover', d)
      tooltip.show({
        content: `
          <strong>${d.name}</strong><br>
          Volume: ${formatTooltipValue(d.total_trade_volume, '1000 t')}<br>
          Balance: ${formatTooltipValue(d.trade_balance, '1000 t')}
        `,
        event
      })
    })
    .on('mouseout', () => tooltip.hide())

  // Add labels
  nodeGroup.append('text')
    .text(d => d.name)
    .attr('x', d => d.x < centerX ? -15 : 15)
    .attr('y', 4)
    .attr('text-anchor', d => d.x < centerX ? 'end' : 'start')
    .style('font-size', '10px')
    .style('fill', '#374151')
    .attr('class', 'node-label')
}


// Drag behavior with smoother interaction
const drag = (simulation) => {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.1).restart()
    d.fx = d.x
    d.fy = d.y
  }

  function dragged(event, d) {
    d.fx = event.x
    d.fy = event.y
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0)
    // Keep node fixed for a moment to prevent bouncing
    setTimeout(() => {
      d.fx = null
      d.fy = null
    }, 300)
  }

  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended)
}

// Watchers
watch(() => props.data, () => {
  initVisualization()
})

watch(() => props.layout, () => {
  initVisualization()
})

// Lifecycle
onMounted(() => {
  initVisualization()
})

onUnmounted(() => {
  if (simulation) simulation.stop()
  tooltip.destroy()
})
</script>

<style scoped>
.network-visualization {
  @apply relative;
}

:deep(.node) {
  @apply cursor-pointer;
}

:deep(.node:hover circle) {
  @apply opacity-80;
}

:deep(.links line),
:deep(.links path) {
  @apply pointer-events-none;
}

:deep(.node-label) {
  @apply fill-gray-700 dark:fill-gray-300;
}

/* Tooltip styles */
:global(.network-tooltip) {
  @apply absolute bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3;
  @apply border border-gray-200 dark:border-gray-700;
  @apply text-sm text-gray-900 dark:text-gray-100;
  @apply pointer-events-none z-50;
  @apply max-w-xs;
}
</style>