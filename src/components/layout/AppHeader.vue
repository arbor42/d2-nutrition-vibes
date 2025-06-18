<template>
  <header class="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo and Title -->
        <div class="flex items-center">
          <router-link to="/" class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">D2</span>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                D2 Nutrition Vibes
              </h1>
              <p class="text-xs text-gray-600 dark:text-gray-400">
                Agricultral Data Visualization
              </p>
            </div>
          </router-link>
        </div>

        <!-- Navigation -->
        <nav class="hidden md:flex items-center space-x-8">
          <router-link
            v-for="route in navigationRoutes"
            :key="route.name"
            :to="route.path"
            class="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="{
              'text-primary-600 dark:text-primary-400': $route.name === route.name
            }"
          >
            {{ route.label }}
          </router-link>
        </nav>

        <!-- Actions -->
        <div class="flex items-center space-x-4">
          <!-- Dark Mode Toggle -->
          <button
            @click="uiStore.toggleDarkMode"
            class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition-colors"
            title="Dark Mode umschalten"
          >
            <svg v-if="!uiStore.darkMode" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>

          <!-- Notification Bell -->
          <button
            @click="showNotifications = !showNotifications"
            class="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition-colors"
            title="Benachrichtigungen"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span 
              v-if="uiStore.hasNotifications"
              class="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"
            ></span>
          </button>

          <!-- Mobile Menu Button -->
          <button
            @click="uiStore.toggleSidebar"
            class="md:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition-colors"
            title="Menü öffnen"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation -->
    <div 
      v-if="uiStore.sidebarOpen"
      class="md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
    >
      <div class="px-2 pt-2 pb-3 space-y-1">
        <router-link
          v-for="route in navigationRoutes"
          :key="route.name"
          :to="route.path"
          @click="uiStore.setSidebarOpen(false)"
          class="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
          :class="{
            'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20': $route.name === route.name
          }"
        >
          {{ route.label }}
        </router-link>
      </div>
    </div>

    <!-- Notification Dropdown -->
    <div 
      v-if="showNotifications"
      class="absolute right-4 top-16 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-30"
    >
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Benachrichtigungen
          </h3>
          <button
            @click="uiStore.clearNotifications"
            class="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            Alle löschen
          </button>
        </div>
      </div>
      <div class="max-h-96 overflow-y-auto">
        <div
          v-if="uiStore.notifications.length === 0"
          class="p-4 text-center text-gray-500 dark:text-gray-400"
        >
          Keine neuen Benachrichtigungen
        </div>
        <div
          v-for="notification in uiStore.notifications"
          :key="notification.id"
          class="p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ notification.title }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {{ notification.message }}
              </p>
            </div>
            <button
              @click="uiStore.removeNotification(notification.id)"
              class="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useUIStore } from '@/stores/useUIStore'

const uiStore = useUIStore()
const showNotifications = ref(false)

const navigationRoutes = [
  { name: 'home', path: '/', label: 'Home' },
  { name: 'dashboard', path: '/dashboard', label: 'Dashboard' },
  { name: 'timeseries', path: '/timeseries', label: 'Zeitreihen' },
  { name: 'simulation', path: '/simulation', label: 'Simulation' },
  { name: 'ml-predictions', path: '/ml-predictions', label: 'ML Prognosen' },
  { name: 'structural', path: '/structural', label: 'Strukturanalyse' },
  { name: 'process-mining', path: '/process-mining', label: 'Process Mining' }
]

// Close notifications when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as Element
  if (!target.closest('.relative')) {
    showNotifications.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>