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
            class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition-colors"
            title="Dark Mode umschalten"
            @click="uiStore.toggleDarkMode"
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
            class="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition-colors"
            title="Benachrichtigungen"
            @click="showNotifications = !showNotifications"
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
            class="md:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition-colors"
            title="Menü öffnen"
            @click="uiStore.toggleSidebar"
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
          class="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
          :class="{
            'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20': $route.name === route.name
          }"
          @click="uiStore.setSidebarOpen(false)"
        >
          {{ route.label }}
        </router-link>
      </div>
    </div>

    <!-- Notification Dropdown -->
    <div 
      v-if="showNotifications"
      class="absolute right-4 top-16 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-30"
    >
      <!-- Header -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Benachrichtigungen
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ uiStore.notifications.length }} gesamt
              <span v-if="uiStore.unreadNotifications > 0" class="ml-1 text-primary-600 dark:text-primary-400 font-medium">
                • {{ uiStore.unreadNotifications }} ungelesen
              </span>
              <span v-if="uiStore.dismissedNotifications.length > 0" class="ml-1 text-gray-500 dark:text-gray-400">
                • {{ uiStore.dismissedNotifications.length }} abgelaufen
              </span>
            </p>
            
            <!-- View Toggle -->
            <div class="flex mt-2 space-x-1">
              <button
                class="px-2 py-1 text-xs rounded transition-colors"
                :class="viewMode === 'active' 
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
                @click="viewMode = 'active'"
              >
                Aktive ({{ uiStore.activeNotifications.length }})
              </button>
              <button
                class="px-2 py-1 text-xs rounded transition-colors"
                :class="viewMode === 'all' 
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
                @click="viewMode = 'all'"
              >
                Alle ({{ uiStore.notifications.length }})
              </button>
            </div>
          </div>
          <div class="flex space-x-2">
            <button
              v-if="uiStore.unreadNotifications > 0"
              class="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              @click="markAllAsRead"
            >
              Alle lesen
            </button>
            <button
              v-if="hasReadNotifications"
              class="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
              title="Gelesene Benachrichtigungen entfernen"
              @click="uiStore.clearReadNotifications"
            >
              Gelesene löschen
            </button>
            <button
              v-if="uiStore.notifications.length > 0"
              class="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              title="Alle Benachrichtigungen entfernen"
              @click="confirmClearAll"
            >
              Alle löschen
            </button>
          </div>
        </div>
      </div>

      <!-- Notification List -->
      <div class="max-h-96 overflow-y-auto">
        <!-- Empty State -->
        <div
          v-if="displayedNotifications.length === 0"
          class="p-8 text-center"
        >
          <svg 
            class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p class="text-gray-500 dark:text-gray-400 text-sm">
            {{ viewMode === 'active' ? 'Keine aktiven Benachrichtigungen' : 'Keine Benachrichtigungen vorhanden' }}
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {{ viewMode === 'active' 
              ? 'Aktive Benachrichtigungen verschwinden automatisch nach einiger Zeit' 
              : 'Alle Benachrichtigungen des Systems werden hier in der Historie gespeichert'
            }}
          </p>
        </div>

        <!-- Notification Items -->
        <div
          v-for="notification in sortedNotifications"
          :key="notification.id"
          class="p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          :class="{
            'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500': !notification.read && !notification.dismissed && notification.type === 'info',
            'bg-green-50 dark:bg-green-900/20 border-l-2 border-l-green-500': !notification.read && !notification.dismissed && notification.type === 'success',
            'bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-l-yellow-500': !notification.read && !notification.dismissed && notification.type === 'warning',
            'bg-red-50 dark:bg-red-900/20 border-l-2 border-l-red-500': !notification.read && !notification.dismissed && notification.type === 'error',
            'opacity-75': notification.read,
            'opacity-60 border-l-2 border-l-gray-300 dark:border-l-gray-600': notification.dismissed && !notification.read
          }"
        >
          <div class="flex items-start space-x-3">
            <!-- Type Icon -->
            <div class="flex-shrink-0 mt-0.5">
              <div 
                class="w-6 h-6 rounded-full flex items-center justify-center"
                :class="{
                  'bg-blue-100 dark:bg-blue-800': notification.type === 'info',
                  'bg-green-100 dark:bg-green-800': notification.type === 'success',
                  'bg-yellow-100 dark:bg-yellow-800': notification.type === 'warning',
                  'bg-red-100 dark:bg-red-800': notification.type === 'error'
                }"
              >
                <svg 
                  class="w-3.5 h-3.5"
                  :class="{
                    'text-blue-600 dark:text-blue-400': notification.type === 'info',
                    'text-green-600 dark:text-green-400': notification.type === 'success',
                    'text-yellow-600 dark:text-yellow-400': notification.type === 'warning',
                    'text-red-600 dark:text-red-400': notification.type === 'error'
                  }"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    v-if="notification.type === 'success'"
                    stroke-linecap="round" 
                    stroke-linejoin="round" 
                    stroke-width="2" 
                    d="M5 13l4 4L19 7"
                  />
                  <path 
                    v-else-if="notification.type === 'error'"
                    stroke-linecap="round" 
                    stroke-linejoin="round" 
                    stroke-width="2" 
                    d="M6 18L18 6M6 6l12 12"
                  />
                  <path 
                    v-else-if="notification.type === 'warning'"
                    stroke-linecap="round" 
                    stroke-linejoin="round" 
                    stroke-width="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                  <path 
                    v-else
                    stroke-linecap="round" 
                    stroke-linejoin="round" 
                    stroke-width="2" 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                    {{ notification.title || getDefaultTitle(notification.type) }}
                    <span 
                      v-if="notification.dismissed && !notification.read" 
                      class="ml-2 text-xs text-gray-400 dark:text-gray-500"
                      title="Automatisch abgelaufen"
                    >
                      ⏰
                    </span>
                    <span 
                      v-if="notification.read" 
                      class="ml-2 text-xs text-gray-400 dark:text-gray-500"
                      title="Gelesen"
                    >
                      ✓
                    </span>
                  </p>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                    {{ notification.message }}
                  </p>
                  
                  <!-- Timestamp -->
                  <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {{ formatTimestamp(notification.timestamp || Date.now()) }}
                  </p>
                </div>

                <!-- Actions -->
                <div class="flex items-center space-x-1 ml-2">
                  <button
                    v-if="!notification.read"
                    class="p-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title="Als gelesen markieren"
                    @click="markAsRead(notification.id)"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    class="p-1 text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Löschen"
                    @click="uiStore.removeNotification(notification.id)"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div 
        v-if="displayedNotifications.length > 3"
        class="p-3 border-t border-gray-200 dark:border-gray-700 text-center"
      >
        <button
          class="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
          @click="showAllNotifications = !showAllNotifications"
        >
          {{ showAllNotifications ? 'Weniger anzeigen' : `Alle ${displayedNotifications.length} anzeigen` }}
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useUIStore } from '@/stores/useUIStore'

const uiStore = useUIStore()
const showNotifications = ref(false)
const showAllNotifications = ref(false)
const viewMode = ref('active') // 'active' or 'all'

const navigationRoutes = [
  { name: 'home', path: '/', label: 'Home' },
  { name: 'dashboard', path: '/dashboard', label: 'Dashboard' },
  { name: 'timeseries', path: '/timeseries', label: 'Zeitreihen' },
  { name: 'simulation', path: '/simulation', label: 'Simulation' },
  { name: 'ml-predictions', path: '/ml-predictions', label: 'ML Prognosen' },
  { name: 'structural', path: '/structural', label: 'Strukturanalyse' },
  { name: 'process-mining', path: '/process-mining', label: 'Process Mining' }
]

// Enhanced notification management
const displayedNotifications = computed(() => {
  return viewMode.value === 'active' 
    ? uiStore.activeNotifications 
    : uiStore.notifications
})

const sortedNotifications = computed(() => {
  const notifications = [...displayedNotifications.value]
  
  // Sort by timestamp (newest first) and read status (unread first)
  notifications.sort((a, b) => {
    // Unread notifications first
    if (a.read !== b.read) {
      return a.read ? 1 : -1
    }
    // Then by timestamp (newest first)
    const timestampA = a.timestamp || 0
    const timestampB = b.timestamp || 0
    return timestampB - timestampA
  })
  
  // Limit display if not showing all
  return showAllNotifications.value ? notifications : notifications.slice(0, 5)
})

// Computed for read notifications
const hasReadNotifications = computed(() => {
  return uiStore.notifications.some(n => n.read)
})

// Helper functions
const getDefaultTitle = (type: string) => {
  const titles: Record<string, string> = {
    info: 'Information',
    success: 'Erfolgreich',
    warning: 'Warnung',
    error: 'Fehler'
  }
  return titles[type] || 'Benachrichtigung'
}

const formatTimestamp = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return 'Gerade eben'
  if (minutes < 60) return `vor ${minutes} Min`
  if (hours < 24) return `vor ${hours} Std`
  if (days < 7) return `vor ${days} Tag${days === 1 ? '' : 'en'}`
  
  return new Date(timestamp).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const markAsRead = (notificationId: string | number) => {
  uiStore.markNotificationAsRead(notificationId)
}

const markAllAsRead = () => {
  uiStore.markAllNotificationsAsRead()
}

const confirmClearAll = () => {
  if (confirm('Möchten Sie wirklich alle Benachrichtigungen aus der Historie löschen?')) {
    uiStore.clearNotifications()
  }
}

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