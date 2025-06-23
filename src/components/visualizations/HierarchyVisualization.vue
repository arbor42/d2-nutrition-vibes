<template>
  <div ref="containerRef" class="hierarchy-visualization w-full h-full">
    <svg ref="svgRef" class="w-full h-full"></svg>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'
import { useTooltip } from '@/composables/useVisualization'
import { formatTooltipValue } from '@/utils/formatters'

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  viewType: {
    type: String,
    default: 'tree'
  }
})

const emit = defineEmits(['node-click'])

// Refs
const containerRef = ref(null)
const svgRef = ref(null)

// Composables
const tooltip = useTooltip({
  className: 'hierarchy-tooltip',
  followMouse: true
})

// D3 references
let svg = null
let g = null

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

  // Create visualization based on type
  if (props.viewType === 'tree') {
    createTreeLayout(width, height)
  } else if (props.viewType === 'sunburst') {
    createSunburstLayout(width, height)
  } else if (props.viewType === 'treemap') {
    createTreemapLayout(width, height)
  }
}

// Tree layout
const createTreeLayout = (width, height) => {
  const margin = { top: 40, right: 20, bottom: 40, left: 20 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  g.attr('transform', `translate(${margin.left},${margin.top})`)

  // Create hierarchy
  const root = d3.hierarchy(props.data)
    .sum(d => d.value || 1)
    .sort((a, b) => b.value - a.value)

  // Create tree layout
  const treeLayout = d3.tree()
    .size([innerWidth, innerHeight])

  treeLayout(root)

  // Create links
  const links = g.append('g')
    .attr('class', 'links')
    .selectAll('path')
    .data(root.links())
    .enter().append('path')
    .attr('d', d3.linkVertical()
      .x(d => d.x)
      .y(d => d.y))
    .attr('fill', 'none')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', 1.5)

  // Create nodes
  const nodes = g.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(root.descendants())
    .enter().append('g')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .on('click', (event, d) => emit('node-click', d.data))

  // Add circles
  nodes.append('circle')
    .attr('r', d => d.children ? 8 : 6)
    .attr('fill', d => d.children ? '#4f46e5' : '#10b981')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .on('mouseover', (event, d) => {
      tooltip.show({
        content: `
          <strong>${d.data.name}</strong><br>
          ${d.value ? `Wert: ${formatTooltipValue(d.value, '1000 t')}` : ''}
        `,
        event
      })
    })
    .on('mouseout', () => tooltip.hide())

  // Add labels
  nodes.append('text')
    .attr('dy', '.35em')
    .attr('x', d => d.children ? -10 : 10)
    .style('text-anchor', d => d.children ? 'end' : 'start')
    .style('font-size', '12px')
    .style('fill', '#374151')
    .attr('class', 'node-label')
    .text(d => d.data.name)
}

// Sunburst layout
const createSunburstLayout = (width, height) => {
  const radius = Math.min(width, height) / 2

  g.attr('transform', `translate(${width / 2},${height / 2})`)

  // Create hierarchy
  const root = d3.hierarchy(props.data)
    .sum(d => d.value || 1)
    .sort((a, b) => b.value - a.value)

  // Create partition layout
  const partition = d3.partition()
    .size([2 * Math.PI, radius])

  partition(root)

  // Create color scale
  const color = d3.scaleOrdinal(d3.schemeCategory10)

  // Create arc generator
  const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .innerRadius(d => d.y0)
    .outerRadius(d => d.y1)

  // Create paths
  const paths = g.append('g')
    .selectAll('path')
    .data(root.descendants().filter(d => d.depth))
    .enter().append('path')
    .attr('d', arc)
    .style('fill', d => color(d.data.name))
    .style('stroke', '#fff')
    .style('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('click', (event, d) => emit('node-click', d.data))
    .on('mouseover', (event, d) => {
      tooltip.show({
        content: `
          <strong>${d.data.name}</strong><br>
          ${d.value ? `Wert: ${formatTooltipValue(d.value, '1000 t')}` : ''}
        `,
        event
      })
    })
    .on('mouseout', () => tooltip.hide())

  // Add center text
  g.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '.35em')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .style('fill', '#374151')
    .attr('class', 'center-label')
    .text(root.data.name)
}

// Treemap layout
const createTreemapLayout = (width, height) => {
  // Create hierarchy
  const root = d3.hierarchy(props.data)
    .sum(d => d.value || 1)
    .sort((a, b) => b.value - a.value)

  // Create treemap layout
  const treemap = d3.treemap()
    .size([width, height])
    .padding(2)
    .round(true)

  treemap(root)

  // Create color scale
  const color = d3.scaleOrdinal(d3.schemeCategory10)

  // Create cells
  const cells = g.selectAll('g')
    .data(root.leaves())
    .enter().append('g')
    .attr('transform', d => `translate(${d.x0},${d.y0})`)

  // Add rectangles
  cells.append('rect')
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0)
    .attr('fill', d => color(d.parent.data.name))
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .style('cursor', 'pointer')
    .on('click', (event, d) => emit('node-click', d.data))
    .on('mouseover', (event, d) => {
      tooltip.show({
        content: `
          <strong>${d.data.name}</strong><br>
          Wert: ${formatTooltipValue(d.value, '1000 t')}<br>
          Parent: ${d.parent.data.name}
        `,
        event
      })
    })
    .on('mouseout', () => tooltip.hide())

  // Add labels for larger cells
  cells.filter(d => (d.x1 - d.x0) > 50 && (d.y1 - d.y0) > 30)
    .append('text')
    .attr('x', 4)
    .attr('y', 16)
    .style('font-size', '12px')
    .style('fill', '#fff')
    .style('font-weight', 'bold')
    .text(d => d.data.name)

  // Add value labels
  cells.filter(d => (d.x1 - d.x0) > 50 && (d.y1 - d.y0) > 45)
    .append('text')
    .attr('x', 4)
    .attr('y', 32)
    .style('font-size', '10px')
    .style('fill', '#fff')
    .style('opacity', 0.8)
    .text(d => formatTooltipValue(d.value, '1000 t'))
}

// Watchers
watch(() => props.data, () => {
  initVisualization()
})

watch(() => props.viewType, () => {
  initVisualization()
})

// Lifecycle
onMounted(() => {
  initVisualization()
})

onUnmounted(() => {
  tooltip.destroy()
})
</script>

<style scoped>
.hierarchy-visualization {
  @apply relative;
}

:deep(.nodes g) {
  @apply cursor-pointer;
}

:deep(.nodes g:hover circle) {
  @apply opacity-80;
}

:deep(.node-label) {
  @apply fill-gray-700 dark:fill-gray-300;
}

:deep(.center-label) {
  @apply fill-gray-900 dark:fill-gray-100;
}

/* Tooltip styles */
:global(.hierarchy-tooltip) {
  @apply absolute bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3;
  @apply border border-gray-200 dark:border-gray-700;
  @apply text-sm text-gray-900 dark:text-gray-100;
  @apply pointer-events-none z-50;
  @apply max-w-xs;
}
</style>