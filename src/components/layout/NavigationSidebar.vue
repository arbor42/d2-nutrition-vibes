<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore } from '@/stores/useUIStore'

interface Props {
  collapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false
})

const emit = defineEmits<{
  toggle: []
}>()

const route = useRoute()
const router = useRouter()
const uiStore = useUIStore()

const navigationItems = [
  {
    name: 'Dashboard',
    path: '/',
    icon: 'home',
    description: 'Übersicht und Hauptsteuerung'
  },
  {
    name: 'Zeitreihen',
    path: '/timeseries',
    icon: 'chart-line',
    description: 'Zeitreihenanalyse und Trends'
  },
  {
    name: 'Simulation',
    path: '/simulation',
    icon: 'cog',
    description: 'Szenario-Simulationen'
  },
  {
    name: 'ML Prognosen',
    path: '/ml-predictions',
    icon: 'brain',
    description: 'Machine Learning Vorhersagen'
  },
  {
    name: 'Strukturanalyse',
    path: '/structural',
    icon: 'network',
    description: 'Strukturelle Datenanalyse'
  },
  {
    name: 'Process Mining',
    path: '/process-mining',
    icon: 'flow',
    description: 'Prozessanalyse und -optimierung'
  }
]

const sidebarClasses = computed(() => [
  'fixed',
  'top-0',
  'left-0',
  'h-full',
  'bg-white',
  'dark:bg-gray-800',
  'border-r',
  'border-gray-200',
  'dark:border-gray-700',
  'transition-all',
  'duration-300',
  'ease-in-out',
  'z-30',
  props.collapsed ? 'w-16' : 'w-64'
].join(' '))

const isActive = (path: string) => {
  return route.path === path
}

const navigateTo = (path: string) => {
  router.push(path)
}

const getIconSvg = (iconName: string) => {
  const icons: Record<string, string> = {
    home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    'chart-line': 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
    cog: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4',
    brain: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z',
    network: 'M19 11H5m14-7v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2h10a2 2 0 012 2zM9 11h6',
    flow: 'M13 10V3L4 14h7v7l9-11h-7z'
  }
  return icons[iconName] || icons.home
}
</script>

<template>
  <aside :class="sidebarClasses">
    <!-- Sidebar Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 h-16">
      <div v-if="!collapsed" class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            D2 Nutrition
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Vibes
          </p>
        </div>
      </div>
      
      <!-- Toggle Button -->
      <button
        @click="emit('toggle')"
        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        :title="collapsed ? 'Sidebar erweitern' : 'Sidebar einklappen'"
      >
        <svg 
          class="w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform"
          :class="{ 'rotate-180': collapsed }"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>
    </div>
    
    <!-- Navigation Menu -->
    <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
      <div
        v-for="item in navigationItems"
        :key="item.path"
        class="relative"
      >
        <button
          @click="navigateTo(item.path)"
          :class="[
            'w-full flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group',
            isActive(item.path)
              ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
          ]"
          :title="collapsed ? item.description : ''"
        >
          <!-- Icon -->
          <svg 
            class="w-5 h-5 flex-shrink-0"
            :class="collapsed ? 'mx-auto' : 'mr-3'"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              :d="getIconSvg(item.icon)"
            />
          </svg>
          
          <!-- Label -->
          <span 
            v-if="!collapsed"
            class="truncate"
          >
            {{ item.name }}
          </span>
          
          <!-- Active Indicator -->
          <div
            v-if="isActive(item.path) && !collapsed"
            class="ml-auto w-2 h-2 bg-primary-500 rounded-full"
          />
        </button>
        
        <!-- Tooltip for collapsed state -->
        <div
          v-if="collapsed"
          class="absolute left-full top-0 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap"
        >
          {{ item.name }}
          <div class="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      </div>
    </nav>
    
    <!-- Sidebar Footer -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700">
      <!-- Dark Mode Toggle -->
      <button
        @click="uiStore.toggleDarkMode"
        :class="[
          'w-full flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        ]"
        :title="collapsed ? (uiStore.darkMode ? 'Hell-Modus' : 'Dunkel-Modus') : ''"
      >
        <svg 
          class="w-5 h-5 flex-shrink-0"
          :class="collapsed ? 'mx-auto' : 'mr-3'"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            v-if="uiStore.darkMode"
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
          <path 
            v-else
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
        
        <span v-if="!collapsed">
          {{ uiStore.darkMode ? 'Hell-Modus' : 'Dunkel-Modus' }}
        </span>
      </button>
      
      <!-- User Settings (placeholder) -->
      <button
        v-if="!collapsed"
        class="w-full flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 mt-2"
      >
        <svg 
          class="w-5 h-5 mr-3 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>Einstellungen</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* Smooth transitions for all elements */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

/* Custom scrollbar for navigation */
nav::-webkit-scrollbar {
  width: 4px;
}

nav::-webkit-scrollbar-track {
  background: transparent;
}

nav::-webkit-scrollbar-thumb {
  background: theme('colors.gray.300');
  border-radius: 2px;
}

.dark nav::-webkit-scrollbar-thumb {
  background: theme('colors.gray.600');
}

/* Hover effects for navigation items */
.group:hover .opacity-0 {
  opacity: 1;
}
</style>