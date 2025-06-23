<template>
  <div 
    v-if="visibleNotifications.length > 0"
    class="fixed top-20 right-4 z-50 space-y-3 max-w-sm w-full"
  >
    <transition-group 
      name="notification" 
      tag="div" 
      class="space-y-3"
    >
      <div
        v-for="notification in visibleNotifications"
        :key="notification.id"
        :class="[
          'notification',
          `notification-${notification.type}`,
          'transform transition-all duration-300 ease-out'
        ]"
        @mouseover="pauseAutoRemove(notification.id)"
        @mouseleave="resumeAutoRemove(notification.id)"
      >
        <div class="p-4">
          <div class="flex items-start">
            <!-- Notification Icon -->
            <div class="flex-shrink-0">
              <svg 
                v-if="notification.type === 'success'"
                class="h-5 w-5 text-success-500" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <svg 
                v-else-if="notification.type === 'error'"
                class="h-5 w-5 text-error-500" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <svg 
                v-else-if="notification.type === 'warning'"
                class="h-5 w-5 text-warning-500" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <svg 
                v-else
                class="h-5 w-5 text-secondary-500" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            
            <!-- Notification Content -->
            <div class="ml-3 w-0 flex-1">
              <p 
                v-if="notification.title"
                class="text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                {{ notification.title }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ notification.message }}
              </p>
              
              <!-- Progress bar for auto-dismiss -->
              <div 
                v-if="notification.duration > 0 && !notification.dismissed"
                class="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
              >
                <div 
                  class="h-full bg-current opacity-50 transition-all ease-linear"
                  :style="{ 
                    width: `${getProgressWidth(notification)}%`,
                    animationDuration: `${notification.duration}ms`
                  }"
                />
              </div>
            </div>
            
            <!-- Close Button -->
            <div class="ml-4 flex-shrink-0 flex">
              <button
                class="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                title="Schließen"
                @click="dismissNotification(notification.id)"
              >
                <span class="sr-only">Schließen</span>
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useUIStore } from '@/stores/useUIStore'

const uiStore = useUIStore()
const activeTimers = ref<Map<string | number, number>>(new Map())

// Only show non-dismissed notifications
const visibleNotifications = computed(() => {
  return uiStore.notifications.filter(n => !n.dismissed)
})

const getProgressWidth = (notification: any) => {
  if (!notification.startTime || notification.dismissed) return 0
  
  const elapsed = Date.now() - notification.startTime
  const progress = Math.max(0, Math.min(100, (elapsed / notification.duration) * 100))
  return 100 - progress
}

const pauseAutoRemove = (id: string | number) => {
  const timer = activeTimers.value.get(id)
  if (timer) {
    clearTimeout(timer)
    activeTimers.value.delete(id)
  }
}

const resumeAutoRemove = (id: string | number) => {
  const notification = uiStore.notifications.find(n => n.id === id)
  if (notification && notification.duration > 0 && !notification.dismissed) {
    startAutoRemove(notification)
  }
}

const startAutoRemove = (notification: any) => {
  if (notification.duration <= 0) return
  
  // Cancel existing timer if any
  pauseAutoRemove(notification.id)
  
  // Set start time for progress calculation
  if (!notification.startTime) {
    notification.startTime = Date.now()
  }
  
  const timer = setTimeout(() => {
    uiStore.dismissNotification(notification.id)
    activeTimers.value.delete(notification.id)
  }, notification.duration)
  
  activeTimers.value.set(notification.id, timer)
}

const dismissNotification = (id: string | number) => {
  pauseAutoRemove(id)
  uiStore.dismissNotification(id)
}

// Watch for new notifications and start timers
const setupNotificationTimers = () => {
  visibleNotifications.value.forEach(notification => {
    if (notification.duration > 0 && !activeTimers.value.has(notification.id)) {
      startAutoRemove(notification)
    }
  })
}

onMounted(() => {
  setupNotificationTimers()
  
  // Watch for new notifications
  const unwatch = uiStore.$onAction(({ name, after }) => {
    if (name === 'addNotification') {
      after(() => {
        setupNotificationTimers()
      })
    }
  })
  
  onBeforeUnmount(() => {
    unwatch()
    // Clear all timers
    activeTimers.value.forEach(timer => clearTimeout(timer))
    activeTimers.value.clear()
  })
})
</script>

<style scoped>
/* Notification transitions */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease-out;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease-out;
}

/* Progress bar animation */
@keyframes progress {
  from { width: 100%; }
  to { width: 0%; }
}
</style>