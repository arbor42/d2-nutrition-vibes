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
      <!-- Application Header -->
      <AppHeader 
        :sidebar-collapsed="sidebarCollapsed"
        @toggle-sidebar="toggleSidebar"
      />
      
      <!-- Main Content Area -->
      <main class="flex-1 overflow-y-auto overflow-x-hidden">
        <div class="min-h-full pt-4">
          <!-- Page Content Container -->
          <div class="px-6 py-6 w-full">
            <!-- Breadcrumb Navigation -->
            <nav class="mb-6" aria-label="Breadcrumb">
              <ol class="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <li>
                  <router-link 
                    to="/" 
                    class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    Dashboard
                  </router-link>
                </li>
                <li v-if="$route.name !== 'home'" class="flex items-center">
                  <svg class="w-4 h-4 mx-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                  </svg>
                  <span class="capitalize">{{ $route.name }}</span>
                </li>
              </ol>
            </nav>
            
            <!-- Page Title -->
            <div class="mb-6">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                D2 Nutrition Vibes
              </h1>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Analyse und Visualisierung von Ernährungsdaten
              </p>
            </div>
            
            <!-- Main Panels Container -->
            <PanelsContainer />
          </div>
        </div>
      </main>
    </div>
    
    <!-- Global Notifications -->
    <NotificationContainer />
    
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
import { ref, computed } from 'vue'
import { useUIStore } from '@/stores/useUIStore'
import AppHeader from './AppHeader.vue'
import NavigationSidebar from './NavigationSidebar.vue'
import PanelsContainer from './PanelsContainer.vue'
import NotificationContainer from '@/components/ui/NotificationContainer.vue'

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