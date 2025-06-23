<template>
  <div 
    v-if="bounds"
    class="tour-spotlight"
    :style="spotlightStyle"
  >
    <!-- Spotlight effect with clean borders -->
    <div class="tour-spotlight-glow"></div>
    
    <!-- Highlight ring for the element -->
    <div 
      v-if="!skipAnimations"
      class="tour-highlight-ring"
    ></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTourStore } from '../stores/useTourStore'

const props = defineProps({
  bounds: {
    type: Object,
    required: true
  },
  target: {
    type: String,
    default: ''
  }
})

const tourStore = useTourStore()

const skipAnimations = computed(() => tourStore.skipAnimations)

const spotlightStyle = computed(() => {
  if (!props.bounds) return {}
  
  return {
    top: `${props.bounds.top}px`,
    left: `${props.bounds.left}px`,
    width: `${props.bounds.width}px`,
    height: `${props.bounds.height}px`,
    transition: skipAnimations.value ? 'none' : 'all 0.3s ease',
    zIndex: 9998
  }
})
</script>

<style scoped>
/* All styles are now in tour.css for consistency */
</style>