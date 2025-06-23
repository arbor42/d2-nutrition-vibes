<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Application Header -->
    <AppHeader 
      :sidebar-collapsed="sidebarCollapsed"
      @toggle-sidebar="toggleSidebar"
    />
    
    <!-- Sidebar Navigation -->
    <NavigationSidebar 
      :collapsed="sidebarCollapsed"
      @toggle="toggleSidebar"
    />
    
    <!-- Main Content Area -->
    <main :class="mainClasses">
      <div class="min-h-screen pt-16">
        <!-- Page Content Container -->
        <div class="container-fluid py-6">
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
    
    <!-- Global Notifications -->
    <div 
      v-if="uiStore.notifications.length > 0"
      class="fixed top-20 right-4 z-50 space-y-3"
    >
      <div
        v-for="notification in uiStore.notifications"
        :key="notification.id"
        :class="[
          'notification',
          `notification-${notification.type}`,
          'animate-slide-in-right'
        ]"
      >
        <div class="p-4">
          <div class="flex items-start">
            <!-- Notification Icon -->
            <div class="flex-shrink-0">
              <svg 
                v-if="notification.type === 'success'"
                class="h-5 w-5 text-success-400" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <svg 
                v-else-if="notification.type === 'error'"
                class="h-5 w-5 text-error-400" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <svg 
                v-else-if="notification.type === 'warning'"
                class="h-5 w-5 text-warning-400" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <svg 
                v-else
                class="h-5 w-5 text-secondary-400" 
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
            </div>
            
            <!-- Close Button -->
            <div class="ml-4 flex-shrink-0 flex">
              <button
                class="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                @click="uiStore.removeNotification(notification.id)"
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
import { ref, computed } from 'vue'
import { useUIStore } from '@/stores/useUIStore'
import AppHeader from './AppHeader.vue'
import NavigationSidebar from './NavigationSidebar.vue'
import PanelsContainer from './PanelsContainer.vue'

const uiStore = useUIStore()

const sidebarCollapsed = ref(false)

const mainClasses = computed(() => [
  'flex-1',
  'transition-all',
  'duration-300',
  'ease-in-out',
  sidebarCollapsed.value ? 'ml-16' : 'ml-64'
].join(' '))

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<style scoped>
/* Custom transitions for sidebar */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

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