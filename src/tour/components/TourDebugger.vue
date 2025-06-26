<template>
  <Teleport to="body">
    <div 
      v-if="showDebugger && tourStore.isActive"
      class="tour-debugger"
    >
      <div class="tour-debugger-header">
        <h3>Tour Debugger</h3>
        <button @click="showDebugger = false" class="close-btn">×</button>
      </div>
      
      <div class="tour-debugger-content">
        <!-- Current Step Info -->
        <div class="debug-section">
          <h4>Current Step</h4>
          <div class="debug-info">
            <div><strong>ID:</strong> {{ tourStore.currentStep?.id || 'N/A' }}</div>
            <div><strong>Title:</strong> {{ tourStore.currentStep?.title || 'N/A' }}</div>
            <div><strong>Target:</strong> {{ tourStore.currentStep?.target || 'N/A' }}</div>
            <div><strong>Route:</strong> {{ tourStore.currentStep?.route || 'N/A' }}</div>
            <div><strong>Step:</strong> {{ tourStore.currentStepIndex + 1 }} / {{ tourStore.totalSteps }}</div>
          </div>
        </div>
        
        <!-- Target Element Status -->
        <div class="debug-section">
          <h4>Target Element</h4>
          <div class="debug-info">
            <div><strong>Exists:</strong> {{ targetElementExists ? '✅ Yes' : '❌ No' }}</div>
            <div v-if="targetElementBounds">
              <strong>Bounds:</strong>
              <div class="bounds-info">
                <span>Top: {{ Math.round(targetElementBounds.top) }}</span>
                <span>Left: {{ Math.round(targetElementBounds.left) }}</span>
                <span>Width: {{ Math.round(targetElementBounds.width) }}</span>
                <span>Height: {{ Math.round(targetElementBounds.height) }}</span>
              </div>
            </div>
            <div v-if="targetElementStyles">
              <strong>Z-Index:</strong> {{ targetElementStyles.zIndex || 'auto' }}
            </div>
          </div>
        </div>
        
        <!-- Tooltip Position -->
        <div class="debug-section">
          <h4>Tooltip</h4>
          <div class="debug-info">
            <div><strong>Visible:</strong> {{ tourStore.tooltipVisible ? '✅ Yes' : '❌ No' }}</div>
            <div><strong>Position:</strong> 
              Top: {{ Math.round(tourStore.tooltipPosition.top) }}, 
              Left: {{ Math.round(tourStore.tooltipPosition.left) }}
            </div>
            <div><strong>Dimensions:</strong> 
              {{ tourStore.tooltipDimensions.width }} × {{ tourStore.tooltipDimensions.height }}
            </div>
            <div><strong>Floating Mode:</strong> {{ tourStore.floatingMode ? '✅ Yes' : '❌ No' }}</div>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="debug-section">
          <h4>Actions</h4>
          <div class="debug-actions">
            <button @click="refreshTargetInfo" class="debug-btn">Refresh Info</button>
            <button @click="recalculatePosition" class="debug-btn">Recalculate Position</button>
            <button @click="logDebugInfo" class="debug-btn">Log to Console</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted, onUnmounted } from 'vue'
import { useTourStore } from '../stores/useTourStore'

const tourStore = useTourStore()
const tourService = inject('tourService')

const showDebugger = ref(false)
const targetElementExists = ref(false)
const targetElementBounds = ref(null)
const targetElementStyles = ref(null)

// Check if debug mode is enabled
const isDebugMode = computed(() => {
  return import.meta.env.DEV || localStorage.getItem('tour-debug') === 'true'
})

// Update target element info
const updateTargetInfo = () => {
  if (!tourStore.currentStep?.target) {
    targetElementExists.value = false
    targetElementBounds.value = null
    targetElementStyles.value = null
    return
  }
  
  const element = document.querySelector(tourStore.currentStep.target)
  targetElementExists.value = !!element
  
  if (element) {
    const bounds = element.getBoundingClientRect()
    targetElementBounds.value = {
      top: bounds.top,
      left: bounds.left,
      width: bounds.width,
      height: bounds.height,
      bottom: bounds.bottom,
      right: bounds.right
    }
    
    const styles = window.getComputedStyle(element)
    targetElementStyles.value = {
      zIndex: styles.zIndex,
      position: styles.position,
      overflow: styles.overflow
    }
  } else {
    targetElementBounds.value = null
    targetElementStyles.value = null
  }
}

// Actions
const refreshTargetInfo = () => {
  updateTargetInfo()
  console.log('[TourDebugger] Target info refreshed')
}

const recalculatePosition = () => {
  if (tourService) {
    tourService.forcePositionRecalculation('debug')
  }
}

const logDebugInfo = () => {
  console.group('[TourDebugger] Debug Information')
  console.log('Tour Store State:', {
    isActive: tourStore.isActive,
    currentTourId: tourStore.currentTourId,
    currentStepIndex: tourStore.currentStepIndex,
    currentStep: tourStore.currentStep,
    tooltipPosition: tourStore.tooltipPosition,
    tooltipDimensions: tourStore.tooltipDimensions,
    floatingMode: tourStore.floatingMode,
    positioningMetadata: tourStore.positioningMetadata
  })
  console.log('Target Element:', {
    exists: targetElementExists.value,
    bounds: targetElementBounds.value,
    styles: targetElementStyles.value
  })
  if (tourService) {
    console.log('Positioning Debug:', tourService.getPositioningDebugInfo())
  }
  console.groupEnd()
}

// Watch for step changes
watch(() => tourStore.currentStep, () => {
  updateTargetInfo()
})

// Keyboard shortcut to toggle debugger
const handleKeydown = (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    showDebugger.value = !showDebugger.value
  }
}

onMounted(() => {
  if (isDebugMode.value) {
    document.addEventListener('keydown', handleKeydown)
    showDebugger.value = true
  }
  updateTargetInfo()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.tour-debugger {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 350px;
  max-height: 500px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 10000;
  font-family: monospace;
  font-size: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tour-debugger-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.tour-debugger-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.tour-debugger-content {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.debug-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.debug-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.debug-section h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #60a5fa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.debug-info {
  space-y: 4px;
}

.debug-info > div {
  margin-bottom: 4px;
  line-height: 1.4;
}

.debug-info strong {
  color: #fbbf24;
}

.bounds-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
  font-size: 11px;
  color: #9ca3af;
}

.bounds-info span {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.debug-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.debug-btn {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.4);
  color: #60a5fa;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.debug-btn:hover {
  background: rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.6);
}
</style>