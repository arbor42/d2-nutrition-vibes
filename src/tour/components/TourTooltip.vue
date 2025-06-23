<template>
  <Teleport to="body">
    <div 
      ref="tooltipRef"
      class="tour-tooltip"
      :style="tooltipStyle"
    >
    <!-- Drag handle -->
    <div class="tour-tooltip-handle">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 00-2 2v1a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zM5 9a2 2 0 012-2h6a2 2 0 012 2v1a2 2 0 01-2 2H7a2 2 0 01-2-2V9zM7 13a2 2 0 00-2 2v1a2 2 0 002 2h6a2 2 0 002-2v-1a2 2 0 00-2-2H7z"/>
          </svg>
          <span class="text-xs text-gray-500 dark:text-gray-400">Ziehen zum Verschieben</span>
        </div>
      </div>
    </div>
    
    <!-- Step header -->
    <div class="mb-4 mt-2">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {{ step.title }}
        </h3>
        <span class="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {{ currentStep }} / {{ totalSteps }}
        </span>
      </div>
      
      <!-- Tour progress indicator -->
      <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-2">
        <div 
          class="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
          :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
        ></div>
      </div>
    </div>
    
    <!-- Step content -->
    <div class="mb-6">
      <p class="text-gray-700 dark:text-gray-300 leading-relaxed" v-html="step.content"></p>
      
      <!-- Data highlight box -->
      <div 
        v-if="step.dataHighlight" 
        class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
      >
        <div class="flex items-start space-x-2">
          <svg class="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
          </svg>
          <div class="flex-1">
            <p class="text-sm font-medium text-blue-900 dark:text-blue-100">
              {{ step.dataHighlight.label }}
            </p>
            <p class="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {{ step.dataHighlight.value }}
            </p>
          </div>
        </div>
      </div>
      
      <!-- Additional insights -->
      <div 
        v-if="step.insights && step.insights.length" 
        class="mt-4 space-y-2"
      >
        <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">
          💡 Wussten Sie schon?
        </h4>
        <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li v-for="insight in step.insights" :key="insight" class="flex items-start space-x-2">
            <span class="text-primary-500 mt-1">•</span>
            <span>{{ insight }}</span>
          </li>
        </ul>
      </div>
    </div>
    
    <!-- Navigation controls -->
    <div class="flex justify-between items-center">
      <!-- Previous button -->
      <button 
        v-if="canGoPrevious"
        @click="$emit('previous')"
        :disabled="isLoading"
        class="btn btn-secondary flex items-center space-x-2 disabled:opacity-50"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>
        <span>Zurück</span>
      </button>
      <div v-else></div>
      
      <!-- Action buttons -->
      <div class="flex space-x-2">
        <!-- Skip tour button -->
        <button 
          @click="$emit('skip')"
          class="btn btn-ghost text-sm"
          :disabled="isLoading"
        >
          Tour überspringen
        </button>
        
        <!-- Next/Finish button -->
        <button 
          @click="$emit('next')"
          :disabled="isLoading"
          class="btn btn-primary flex items-center space-x-2 disabled:opacity-50"
        >
          <span v-if="isLoading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
          <span>{{ isLastStep ? 'Tour beenden' : 'Weiter' }}</span>
          <svg v-if="!isLastStep && !isLoading" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
          </svg>
          <svg v-else-if="isLastStep && !isLoading" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Keyboard shortcuts hint -->
    <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <p class="text-xs text-gray-500 dark:text-gray-400 text-center">
        <kbd class="kbd-hint">←</kbd> Zurück • 
        <kbd class="kbd-hint">→</kbd> Weiter • 
        <kbd class="kbd-hint">Esc</kbd> Beenden
      </p>
    </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, inject, watch } from 'vue'
import { useDraggable } from '../composables/useDraggable'

const props = defineProps({
  step: {
    type: Object,
    required: true
  },
  position: {
    type: Object,
    required: true
  },
  currentStep: {
    type: Number,
    required: true
  },
  totalSteps: {
    type: Number,
    required: true
  },
  canGoPrevious: {
    type: Boolean,
    default: false
  },
  canGoNext: {
    type: Boolean,
    default: true
  },
  isLastStep: {
    type: Boolean,
    default: false
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['next', 'previous', 'skip', 'close', 'pause'])

const tooltipRef = ref(null)
const tourService = inject('tourService')

// Initialize draggable functionality
const { position: dragPosition, isDragging, hasMoved } = useDraggable(tooltipRef, {
  handle: '.tour-tooltip-handle',
  bounds: 'viewport',
  initialPosition: { x: props.position.left, y: props.position.top },
  onDragEnd: (newPosition) => {
    // Store the user's manual position
    if (tourService) {
      tourService.setManualTooltipPosition(newPosition)
    }
  }
})

// Watch for position changes from props (when auto-positioned)
watch(() => props.position, (newPosition) => {
  if (!hasMoved.value) {
    dragPosition.value = { x: newPosition.left, y: newPosition.top }
  }
})

const tooltipStyle = computed(() => {
  return {
    position: 'fixed',
    top: `${dragPosition.value.y}px`,
    left: `${dragPosition.value.x}px`,
    zIndex: '9999 !important',
    transition: isDragging.value ? 'none' : 'all 0.3s ease'
  }
})
</script>

<style scoped>
/* Tooltip animation */
@keyframes tourTooltipAppear {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Button styles */
.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.btn-primary {
  @apply bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500;
}

.btn-secondary {
  @apply bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 focus:ring-gray-500;
}

.btn-ghost {
  @apply text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 focus:ring-gray-500;
}

.btn:disabled {
  @apply cursor-not-allowed;
}

/* Keyboard hint styling */
.kbd-hint {
  @apply inline-block bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1 py-0.5 rounded text-xs font-mono;
}

/* Tour tooltip specific overrides */
.tour-tooltip {
  @apply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700;
  max-width: 400px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  z-index: 9999 !important; /* Ensure tooltip is always on top */
  position: relative;
}

/* Drag handle styling */
.tour-tooltip-handle {
  @apply px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700;
  cursor: grab;
  user-select: none;
  flex-shrink: 0;
}

.tour-tooltip-handle:active {
  cursor: grabbing;
}

/* Content area with padding and scroll */
.tour-tooltip > *:not(.tour-tooltip-handle) {
  @apply px-6;
}

.tour-tooltip > div:last-child {
  @apply pb-6;
}

/* Scrollable content area */
.tour-tooltip {
  display: flex;
  flex-direction: column;
}

.tour-tooltip > div:nth-child(2),
.tour-tooltip > div:nth-child(3) {
  overflow-y: auto;
  flex: 1;
}

/* Dark mode shadow adjustment */
.dark .tour-tooltip {
  box-shadow: 
    0 20px 25px -5px rgba(0, 0, 0, 0.3),
    0 10px 10px -5px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.1);
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .tour-tooltip {
    max-width: calc(100vw - 2rem);
  }
}
</style>