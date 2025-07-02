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
  />
  
  <!-- Tour Progress Bar -->
  <TourProgressBar
    v-if="tourStore.isActive && !tourStore.isPaused"
    :progress="tourStore.progress"
    :current="tourStore.currentStepIndex + 1"
    :total="tourStore.totalSteps"
    :tour-title="tourStore.currentTour?.title"
    @step-click="handleStepClick"
  />
</template>

<script setup>
import { inject } from 'vue'
import { useTourStore } from '../stores/useTourStore'
import TourSpotlight from './TourSpotlight.vue'
import TourTooltip from './TourTooltip.vue'
import TourProgressBar from './TourProgressBar.vue'

const tourStore = useTourStore()
const tourService = inject('tourService')

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

const handleBackdropClick = (event) => {
  // Only close on backdrop click if click is actually on backdrop
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

const handleStepClick = (stepIndex) => {
  tourService.goToStep(stepIndex)
}
</script>

<style scoped>
/* Tour components use styles from tour.css */
@keyframes tourFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>