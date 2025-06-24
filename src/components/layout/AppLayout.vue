<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
    <!-- Sidebar Navigation -->
    <NavigationSidebar 
      :collapsed="sidebarCollapsed"
      @toggle="toggleSidebar"
    />
    
    <!-- Main Content Wrapper -->
    <div 
      class="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out"
      :class="[
        // Mobile: no margin (sidebar is overlay)
        // Desktop: margin based on sidebar state
        sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
      ]"
    >
      <!-- Main Content Area -->
      <main class="flex-1 overflow-y-auto overflow-x-hidden">
        <div class="min-h-full px-6 py-6">
          <!-- Main Panels Container -->
          <PanelsContainer />
        </div>
      </main>
    </div>
    
    <!-- Global Loading Overlay -->
    <div
      v-if="uiStore.globalLoading"
      class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
        <div class="flex items-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <div class="ml-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
              Lädt...
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ uiStore.loadingMessage || 'Bitte warten Sie einen Moment.' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUIStore } from '@/stores/useUIStore'
import NavigationSidebar from './NavigationSidebar.vue'
import PanelsContainer from './PanelsContainer.vue'

const uiStore = useUIStore()

const sidebarCollapsed = ref(false)


const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<style scoped>
/* Animation for sliding notifications */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in-right {
  animation: slideInRight 0.3s ease-out;
}
</style>