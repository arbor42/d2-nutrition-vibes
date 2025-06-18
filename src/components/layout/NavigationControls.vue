<template>
  <nav class="nav-controls bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
    <div class="flex flex-wrap gap-4 items-center">
      <!-- Analysis Menu -->
      <div class="relative">
        <button 
          @click="uiStore.toggleAnalysisMenu"
          class="btn-primary flex items-center space-x-2"
          :aria-expanded="uiStore.showAnalysisMenu"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Analysen</span>
          <svg 
            class="w-4 h-4 transition-transform"
            :class="{ 'rotate-180': uiStore.showAnalysisMenu }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <!-- Analysis Dropdown Menu -->
        <div 
          v-show="uiStore.showAnalysisMenu"
          class="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20"
        >
          <div class="py-2">
            <router-link
              v-for="panel in analysisOptions"
              :key="panel.route"
              :to="panel.route"
              @click="handlePanelSelect(panel)"
              class="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :class="{
                'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300': $route.name === panel.name
              }"
            >
              <component :is="panel.icon" class="w-4 h-4 mr-3" />
              {{ panel.label }}
            </router-link>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="flex items-center space-x-2">
        <button
          @click="exportData"
          class="btn-secondary flex items-center space-x-2"
          title="Daten exportieren"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="hidden sm:inline">Export</span>
        </button>

        <button
          @click="refreshData"
          :disabled="dataStore.isLoading"
          class="btn-secondary flex items-center space-x-2"
          :class="{ 'opacity-50 cursor-not-allowed': dataStore.isLoading }"
          title="Daten aktualisieren"
        >
          <svg 
            class="w-4 h-4"
            :class="{ 'animate-spin': dataStore.isLoading }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span class="hidden sm:inline">Aktualisieren</span>
        </button>

        <button
          @click="resetView"
          class="btn-secondary flex items-center space-x-2"
          title="Ansicht zurücksetzen"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span class="hidden sm:inline">Reset</span>
        </button>
      </div>

      <!-- Current Filters Display -->
      <div class="flex items-center space-x-4 ml-auto text-sm text-gray-600 dark:text-gray-400">
        <div v-if="uiStore.selectedCountry" class="flex items-center space-x-1">
          <span class="font-medium">Land:</span>
          <span class="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 rounded">
            {{ uiStore.selectedCountry }}
          </span>
        </div>
        <div class="flex items-center space-x-1">
          <span class="font-medium">Produkt:</span>
          <span class="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
            {{ formatProductName(uiStore.selectedProduct) }}
          </span>
        </div>
        <div class="flex items-center space-x-1">
          <span class="font-medium">Jahr:</span>
          <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
            {{ uiStore.selectedYear }}
          </span>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '@/stores/useDataStore'
import { useUIStore } from '@/stores/useUIStore'

const router = useRouter()
const dataStore = useDataStore()
const uiStore = useUIStore()

// Analysis panel options
const analysisOptions = [
  {
    name: 'dashboard',
    route: '/dashboard',
    label: 'Dashboard',
    icon: 'DashboardIcon'
  },
  {
    name: 'timeseries',
    route: '/timeseries',
    label: 'Zeitreihen',
    icon: 'TimeseriesIcon'
  },
  {
    name: 'simulation',
    route: '/simulation',
    label: 'Simulation',
    icon: 'SimulationIcon'
  },
  {
    name: 'ml-predictions',
    route: '/ml-predictions',
    label: 'ML Prognosen',
    icon: 'MLIcon'
  },
  {
    name: 'structural',
    route: '/structural',
    label: 'Strukturanalyse',
    icon: 'StructuralIcon'
  },
  {
    name: 'process-mining',
    route: '/process-mining',
    label: 'Process Mining',
    icon: 'ProcessIcon'
  }
]

// Format product names for display
const formatProductName = (productCode: string) => {
  const productNames = {
    'cassava_and_products': 'Kassava',
    'fruits_-_excluding_wine': 'Früchte',
    'maize_and_products': 'Mais',
    'milk_-_excluding_butter': 'Milch',
    'nuts_and_products': 'Nüsse',
    'potatoes_and_products': 'Kartoffeln',
    'pulses': 'Hülsenfrüchte',
    'rice_and_products': 'Reis',
    'sugar_and_sweeteners': 'Zucker',
    'vegetables': 'Gemüse',
    'wheat_and_products': 'Weizen'
  }
  return productNames[productCode] || productCode
}

// Handle panel selection
const handlePanelSelect = (panel: any) => {
  uiStore.setCurrentPanel(panel.name)
  uiStore.showPanel(panel.name)
  uiStore.toggleAnalysisMenu() // Close menu after selection
}

// Export current data
const exportData = () => {
  uiStore.addNotification({
    type: 'info',
    title: 'Export',
    message: 'Export-Funktionalität wird entwickelt...',
    duration: 3000
  })
}

// Refresh current data
const refreshData = async () => {
  if (dataStore.isLoading) return
  
  try {
    uiStore.addLoadingMessage('Aktualisiere Daten...')
    await dataStore.initializeApp()
    
    uiStore.addNotification({
      type: 'success',
      title: 'Erfolgreich',
      message: 'Daten wurden aktualisiert.',
      duration: 3000
    })
  } catch (error) {
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: 'Daten konnten nicht aktualisiert werden.',
      duration: 5000
    })
  } finally {
    uiStore.clearLoadingMessages()
  }
}

// Reset view to defaults
const resetView = () => {
  uiStore.resetUI()
  router.push('/')
  
  uiStore.addNotification({
    type: 'info',
    title: 'Zurückgesetzt',
    message: 'Ansicht wurde zurückgesetzt.',
    duration: 2000
  })
}

// Simple icon components (inline SVGs)
const DashboardIcon = () => (
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const TimeseriesIcon = () => (
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
  </svg>
)

const SimulationIcon = () => (
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)

const MLIcon = () => (
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const StructuralIcon = () => (
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
)

const ProcessIcon = () => (
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
</script>