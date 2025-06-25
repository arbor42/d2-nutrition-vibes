<template>
  <div class="tour-progress-bar fixed top-0 left-0 right-0 pointer-events-auto" style="z-index: 9998;">
    <!-- Main progress bar -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
      <div class="flex items-center justify-between">
        <!-- Tour info -->
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
            </svg>
            <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ tourTitle || 'Tour' }}
            </span>
          </div>
          
          <div class="text-sm text-gray-600 dark:text-gray-400">
            Schritt {{ current }} von {{ total }}
          </div>
        </div>
        
        <!-- Progress percentage -->
        <div class="text-sm font-medium text-primary-600 dark:text-primary-400">
          {{ Math.round(progress) }}%
        </div>
      </div>
      
      <!-- Progress bar -->
      <div class="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          class="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500 ease-out"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
      
      <!-- Step indicators (for shorter tours) -->
      <div v-if="total <= 10" class="flex justify-between mt-3">
        <button
          v-for="(step, index) in stepIndicators"
          :key="index"
          class="step-indicator relative"
          :class="{
            'completed': index < current - 1,
            'current': index === current - 1,
            'upcoming': index > current - 1
          }"
          :title="`Zu Schritt ${index + 1} springen`"
          @click="$emit('step-click', index)"
        >
          <div class="step-circle">
            <!-- Completed step -->
            <svg v-if="index < current - 1" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            <!-- Current step -->
            <div v-else-if="index === current - 1" class="w-2 h-2 bg-white rounded-full"></div>
            <!-- Upcoming step -->
            <span v-else class="text-xs font-medium">{{ index + 1 }}</span>
          </div>
          
          <!-- Step connector line -->
          <div 
            v-if="index < total - 1"
            class="step-connector"
            :class="{ 'completed': index < current - 1 }"
          ></div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  progress: {
    type: Number,
    default: 0
  },
  current: {
    type: Number,
    default: 1
  },
  total: {
    type: Number,
    default: 1
  },
  tourTitle: {
    type: String,
    default: ''
  }
})

defineEmits(['step-click'])

const stepIndicators = computed(() => {
  return Array.from({ length: props.total }, (_, index) => ({
    step: index + 1,
    completed: index < props.current - 1,
    current: index === props.current - 1
  }))
})
</script>

<style scoped>
.tour-progress-bar {
  animation: slideDown 0.3s ease-out;
  backdrop-filter: blur(10px);
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Step indicators */
.step-indicator {
  @apply relative flex items-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-full;
}

.step-circle {
  @apply w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all duration-200;
}

.step-indicator.completed .step-circle {
  @apply bg-primary-500 border-primary-500 text-white;
}

.step-indicator.current .step-circle {
  @apply bg-primary-500 border-primary-500 text-primary-500 ring-4 ring-primary-200 dark:ring-primary-800;
}

.step-indicator.upcoming .step-circle {
  @apply bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600;
}

.step-connector {
  @apply absolute top-4 left-8 w-full h-0.5 bg-gray-300 dark:bg-gray-600 -z-10 transition-colors duration-200;
}

.step-connector.completed {
  @apply bg-primary-500;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .tour-progress-bar {
    padding: 0.75rem 1rem;
  }
  
  .step-circle {
    @apply w-6 h-6 text-xs;
  }
  
  .step-connector {
    @apply top-3 left-6;
  }
}

/* Progress bar enhancements */
.bg-gradient-to-r {
  background-image: linear-gradient(to right, var(--tw-gradient-stops));
  position: relative;
  overflow: hidden;
}

.bg-gradient-to-r::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}
</style>