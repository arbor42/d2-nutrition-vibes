<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDataStore } from '@/stores/useDataStore'
import * as d3 from 'd3'

// Props
interface Props {
  width?: number
  height?: number
  selectedProduct?: string
  selectedYear?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 500,
  selectedProduct: 'maize_and_products',
  selectedYear: 2022
})

// Refs
const containerRef = ref<HTMLDivElement>()
const dataStore = useDataStore()

// State
const isLoading = ref(false)
const error = ref<string | null>(null)

// Initialize map
const initializeMap = async () => {
  console.log('🚀 SimpleWorldMap: Starting initialization...')
  
  if (!containerRef.value) {
    console.error('❌ SimpleWorldMap: No container ref')
    return
  }

  try {
    isLoading.value = true
    error.value = null

    // Load geographic data
    console.log('📡 SimpleWorldMap: Loading geo data...')
    const geoData = await dataStore.loadGeoData('geo')
    console.log('✅ SimpleWorldMap: Geo data loaded, features:', geoData?.features?.length)

    if (!geoData?.features) {
      throw new Error('No geographic features found')
    }

    // Create map
    createMap(geoData.features)

  } catch (err) {
    error.value = 'Fehler beim Laden der Karte'
    console.error('❌ SimpleWorldMap: Error:', err)
  } finally {
    isLoading.value = false
  }
}

// Create map with D3
const createMap = (features) => {
  console.log('🗺️ SimpleWorldMap: Creating map with', features.length, 'features')
  
  const container = d3.select(containerRef.value)
  
  // Clear existing content
  container.selectAll('*').remove()
  
  // Get dimensions
  const containerRect = containerRef.value.getBoundingClientRect()
  const width = containerRect.width || props.width
  const height = containerRect.height || props.height
  
  console.log('📐 SimpleWorldMap: Dimensions:', width, 'x', height)
  
  // Create SVG
  const svg = container
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('background', '#f0f9ff')
  
  console.log('✅ SimpleWorldMap: SVG created')
  
  // Create projection
  const projection = d3.geoNaturalEarth1()
    .scale(width / 6.5)
    .translate([width / 2, height / 2])
  
  const path = d3.geoPath().projection(projection)
  
  console.log('✅ SimpleWorldMap: Projection created')
  
  // Draw countries
  const countries = svg.selectAll('.country')
    .data(features)
    .enter()
    .append('path')
    .attr('class', 'country')
    .attr('d', path)
    .attr('fill', '#e5e7eb')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 0.5)
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this).attr('fill', '#cbd5e1')
    })
    .on('mouseout', function(event, d) {
      d3.select(this).attr('fill', '#e5e7eb')
    })
  
  console.log('✅ SimpleWorldMap: Countries drawn, count:', countries.size())
  
  if (countries.size() === 0) {
    console.error('❌ SimpleWorldMap: No countries were rendered!')
  } else {
    console.log('🎉 SimpleWorldMap: Map creation successful!')
  }
}

// Initialize on mount
onMounted(() => {
  console.log('🔧 SimpleWorldMap: Component mounted')
  setTimeout(initializeMap, 100)
})

</script>

<template>
  <div 
    ref="containerRef"
    class="simple-world-map w-full h-96 bg-white border border-gray-200 rounded-lg overflow-hidden"
  >
    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center h-full">
      <div class="text-gray-500">Lädt Karte...</div>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="flex items-center justify-center h-full">
      <div class="text-red-500">{{ error }}</div>
    </div>
    
    <!-- Debug info -->
    <div class="absolute top-2 left-2 bg-blue-100 p-2 text-xs rounded z-10">
      <div>Container: {{ containerRef ? 'Ready' : 'Not Ready' }}</div>
      <div>Loading: {{ isLoading }}</div>
      <div>Error: {{ error || 'None' }}</div>
    </div>
  </div>
</template>

<style scoped>
.simple-world-map {
  position: relative;
}
</style>