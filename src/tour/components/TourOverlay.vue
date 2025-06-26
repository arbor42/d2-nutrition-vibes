<template>
  <Teleport to="body">
    <div 
      v-if="tourStore.overlayVisible" 
      class="tour-overlay"
    >
      <!-- Semi-transparent backdrop -->
      <div 
        class="tour-backdrop"
        @click="handleBackdropClick"
      >
      </div>
      
      <!-- Spotlight cutout for highlighted element -->
      <TourSpotlight 
        v-if="tourStore.spotlightBounds"
        :bounds="tourStore.spotlightBounds"
        :target="tourStore.highlightedElement"
      />
      
      
      
      <!-- Tour controls (minimize/maximize) -->
      <div ref="controlsRef" class="tour-controls-container" :style="controlsStyle">
        <button
          class="tour-control-btn bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white p-2 rounded-lg shadow-lg transition-colors"
          title="Tour pausieren"
          @click="handlePause"
        >
          <svg v-if="!tourStore.isPaused" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.5 3.5A1.5 1.5 0 017 2h6a1.5 1.5 0 011.5 1.5v13a1.5 1.5 0 01-1.5 1.5H7A1.5 1.5 0 015.5 16.5v-13zM7 4v12h2V4H7zm4 0v12h2V4h-2z"/>
          </svg>
          <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
          </svg>
        </button>
        
        <button
          class="tour-control-btn bg-red-600 hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600 text-white p-2 rounded-lg shadow-lg transition-colors"
          title="Tour beenden"
          @click="handleClose"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
  
  <!-- Tour tooltip - separate teleport to be above everything -->
  <TourTooltip
    v-if="tourStore.tooltipVisible && tourStore.currentStep"
    :step="tourStore.currentStep"
    :position="tourStore.tooltipPosition"
    :current-step="tourStore.currentStepIndex + 1"
    :total-steps="tourStore.totalSteps"
    :can-go-previous="tourStore.canGoPrevious"
    :can-go-next="tourStore.canGoNext"
    :is-last-step="tourStore.isLastStep"
    :is-loading="tourStore.isLoading"
    @next="handleNext"
    @previous="handlePrevious"
    @skip="handleSkip"
    @close="handleClose"
    @pause="handlePause"
  />
</template>

<script setup>
import { inject, ref, computed } from 'vue'
import { useTourStore } from '../stores/useTourStore'
import { useDraggable } from '../composables/useDraggable'
import TourSpotlight from './TourSpotlight.vue'
import TourTooltip from './TourTooltip.vue'

const tourStore = useTourStore()
const tourService = inject('tourService')
const controlsRef = ref(null)

// Initialize draggable controls
const { position: controlsPosition } = useDraggable(controlsRef, {
  bounds: 'viewport',
  initialPosition: { x: window.innerWidth - 200, y: 20 }
})

const controlsStyle = computed(() => ({
  position: 'fixed',
  top: `${controlsPosition.value.y}px`,
  left: `${controlsPosition.value.x}px`,
  zIndex: 9996,
  display: 'flex',
  gap: '0.5rem'
}))

const handleNext = () => {
  tourService.nextStep()
}

const handlePrevious = () => {
  tourService.previousStep()
}

const handleSkip = () => {
  tourService.stopTour('skipped')
}

const handleClose = () => {
  tourService.stopTour('user_closed')
}

const handlePause = () => {
  if (tourStore.isPaused) {
    tourService.resumeTour()
  } else {
    tourService.pauseTour()
  }
}


const handleBackdropClick = (event) => {
  // Only close on backdrop click if click is actually on backdrop
  if (event.target === event.currentTarget) {
    handleClose()
  }
}
</script>

<style scoped>
/* Tour components use styles from tour.css */
.tour-controls-container {
  @apply bg-gray-900 bg-opacity-90 rounded-lg p-2 shadow-lg;
  cursor: move;
}

.tour-control-btn {
  transition: all 0.2s ease;
}

.tour-control-btn:hover {
  transform: scale(1.05);
}

@keyframes tourFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>