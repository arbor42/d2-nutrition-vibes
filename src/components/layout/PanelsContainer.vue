<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUIStore } from '@/stores/useUIStore'
import { useDataStore } from '@/stores/useDataStore'
import DashboardPanel from '@/components/panels/DashboardPanel.vue'
import TimeseriesPanel from '@/components/panels/TimeseriesPanel.vue'
import SimulationPanel from '@/components/panels/SimulationPanel.vue'
import MLPanel from '@/components/panels/MLPanel.vue'
import ProductSelector from '@/components/ui/ProductSelector.vue'

const route = useRoute()
const uiStore = useUIStore()
const dataStore = useDataStore()

const currentComponent = computed(() => {
  const componentMap: Record<string, any> = {
    '/': DashboardPanel,
    '/dashboard': DashboardPanel,
    '/timeseries': TimeseriesPanel,
    '/simulation': SimulationPanel,
    '/ml-predictions': MLPanel,
  }
  
  return componentMap[route.path] || DashboardPanel
})

const isDashboard = computed(() => {
  return route.path === '/' || route.path === '/dashboard'
})

const containerClasses = computed(() => [
  'w-full',
  'space-y-6',
  'animate-fade-in'
].join(' '))

const panelTitle = computed(() => {
  const titleMap: Record<string, string> = {
    '/': 'Dashboard',
    '/dashboard': 'Dashboard',
    '/timeseries': 'Zeitreihenanalyse',
    '/simulation': 'Simulationen',
    '/ml-predictions': 'ML Prognosen',
  }
  
  return titleMap[route.path] || 'Dashboard'
})

const panelDescription = computed(() => {
  const descriptionMap: Record<string, string> = {
    '/': 'Überblick über alle wichtigen Metriken und Visualisierungen',
    '/dashboard': 'Überblick über alle wichtigen Metriken und Visualisierungen',
    '/timeseries': 'Zeitliche Entwicklung von Produktions- und Verbrauchsdaten',
    '/simulation': 'Szenario-basierte Simulationen und Prognosen',
    '/ml-predictions': 'Machine Learning gestützte Vorhersagen und Analysen',
  }
  
  return descriptionMap[route.path] || 'Überblick über alle wichtigen Metriken und Visualisierungen'
})
</script>

<template>
  <div :class="containerClasses">
    <!-- Page Header -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6" data-tour="dashboard-overview">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
            {{ panelTitle }}
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {{ panelDescription }}
          </p>
        </div>
        
        <!-- Quick Stats -->
        <div class="flex items-center space-x-6 text-sm" data-tour="dashboard-stats">
          <div class="text-center">
            <p class="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {{ dataStore.availableYears?.length || 0 }}
            </p>
            <p class="text-gray-600 dark:text-gray-400">Jahre</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
              {{ dataStore.availableProducts?.length || 0 }}
            </p>
            <p class="text-gray-600 dark:text-gray-400">Produkte</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-success-600 dark:text-success-400">
              {{ dataStore.geoData?.features?.length || 0 }}
            </p>
            <p class="text-gray-600 dark:text-gray-400">Länder</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Global Controls Panel - Only show on Dashboard -->
    <div v-if="isDashboard" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Globale Steuerung
      </h3>
      
      <ProductSelector />
    </div>
    
    <!-- Dynamic Content Panel -->
    <div class="min-h-96">
      <Suspense>
        <component :is="currentComponent" />
        
        <template #fallback>
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
            <div class="flex items-center justify-center">
              <div class="text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p class="text-gray-600 dark:text-gray-400">
                  Lädt {{ panelTitle }}...
                </p>
              </div>
            </div>
          </div>
        </template>
      </Suspense>
    </div>
    
    <!-- Data Status Footer -->
    <div class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div class="flex items-center justify-between text-sm">
        <div class="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
          <span>
            Letzte Aktualisierung: 
            {{ dataStore.lastUpdated ? new Date(dataStore.lastUpdated).toLocaleString('de-DE') : 'Nie' }}
          </span>
          <span class="h-4 border-l border-gray-300 dark:border-gray-600"></span>
          <span>
            Status: 
            <span 
              :class="dataStore.loading 
                ? 'text-warning-600 dark:text-warning-400' 
                : 'text-success-600 dark:text-success-400'"
            >
              {{ dataStore.loading ? 'Lädt...' : 'Bereit' }}
            </span>
          </span>
        </div>
        
        <div class="text-gray-500 dark:text-gray-400">
          D2 Nutrition Vibes v2.0.0
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Fade in animation for panel transitions */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

/* Grid responsive utilities */
@media (max-width: 768px) {
  .grid-cols-1.md\:grid-cols-2.lg\:grid-cols-4 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .grid-cols-1.md\:grid-cols-2.lg\:grid-cols-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1025px) {
  .grid-cols-1.md\:grid-cols-2.lg\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>