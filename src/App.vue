<template>
  <div id="app" class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
    <!-- Global Loading Overlay -->
    <div 
      v-if="uiStore.isLoading" 
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
        <div class="flex items-center space-x-3">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
          <div>
            <p class="text-gray-900 dark:text-gray-100 font-medium">Lädt...</p>
            <p class="text-gray-600 dark:text-gray-400 text-sm mt-1">
              {{ uiStore.loadingMessages[0]?.message || 'Daten werden geladen...' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Notifications -->
    <div class="fixed top-4 right-4 z-40 space-y-2">
      <div
        v-for="notification in uiStore.notifications"
        :key="notification.id"
        class="bg-white dark:bg-gray-800 border-l-4 p-4 rounded-lg shadow-lg max-w-sm"
        :class="{
          'border-blue-500': notification.type === 'info',
          'border-green-500': notification.type === 'success',
          'border-yellow-500': notification.type === 'warning',
          'border-red-500': notification.type === 'error'
        }"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <p class="text-gray-900 dark:text-gray-100 font-medium">
              {{ notification.title }}
            </p>
            <p class="text-gray-600 dark:text-gray-400 text-sm mt-1">
              {{ notification.message }}
            </p>
          </div>
          <button
            class="ml-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            @click="uiStore.removeNotification(notification.id)"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- Main App Content -->
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'

// Stores
const dataStore = useDataStore()
const uiStore = useUIStore()

// Initialize app
onMounted(async () => {
  console.log('D2 Nutrition Vibes Vue.js App initialized')
  
  // Initialize UI settings
  uiStore.initializeUI()
  
  // Initialize critical data
  try {
    uiStore.addLoadingMessage('Initialisiere Anwendung...')
    await dataStore.initializeApp()
    
    uiStore.addNotification({
      type: 'success',
      title: 'Willkommen!',
      message: 'D2 Nutrition Vibes wurde erfolgreich geladen.',
      duration: 3000
    })
  } catch (error) {
    console.error('App initialization failed:', error)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler beim Laden',
      message: 'Einige Daten konnten nicht geladen werden.',
      duration: 8000
    })
  } finally {
    uiStore.clearLoadingMessages()
  }
})

// Save preferences before unmount
onBeforeUnmount(() => {
  uiStore.savePreferences()
})

// Handle keyboard shortcuts
const handleKeydown = (event) => {
  // Toggle dark mode with Ctrl/Cmd + D
  if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
    event.preventDefault()
    uiStore.toggleDarkMode()
  }
  
  // Toggle sidebar with Ctrl/Cmd + S
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    uiStore.toggleSidebar()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style>
/* Global app styles */
#app {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-800;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-300 dark:bg-gray-600 rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400 dark:bg-gray-500;
}

/* Selection color */
::selection {
  @apply bg-primary-500 text-white;
}

/* Focus outline */
.focus-outline {
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
}
</style>