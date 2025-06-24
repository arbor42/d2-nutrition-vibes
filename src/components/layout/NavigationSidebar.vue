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
  'h-screen',
  'bg-white',
  'dark:bg-gray-800',
  'border-r',
  'border-gray-200',
  'dark:border-gray-700',
  'transition-all',
  'duration-300',
  'ease-in-out',
  'z-40', // Higher z-index to overlay content
  'shadow-lg', // Add shadow for overlay effect
  // Responsive width handling
  props.collapsed 
    ? 'w-16' 
    : 'w-64'
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

const toggleDarkModeWithNotification = () => {
  const previousMode = uiStore.darkMode
  uiStore.toggleDarkMode()
  
  uiStore.addNotification({
    type: 'info',
    title: `${uiStore.darkMode ? 'Dunkler' : 'Heller'} Modus`,
    message: `Darstellung zu ${uiStore.darkMode ? 'dunklem' : 'hellem'} Design gewechselt`,
    duration: 2000
  })
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
        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        :title="collapsed ? 'Sidebar erweitern' : 'Sidebar einklappen'"
        @click="emit('toggle')"
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
    <nav class="flex-1 p-2 space-y-1 overflow-y-auto">
      <div
        v-for="item in navigationItems"
        :key="item.path"
        class="relative"
      >
        <button
          :class="[
            'w-full flex items-center rounded-lg transition-all duration-200 group',
            collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2 text-sm font-medium',
            isActive(item.path)
              ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
          ]"
          :title="collapsed ? item.name : ''"
          @click="navigateTo(item.path)"
        >
          <!-- Icon -->
          <svg 
            class="flex-shrink-0"
            :class="collapsed ? 'w-5 h-5' : 'w-4 h-4 mr-3'"
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
            class="truncate text-sm"
          >
            {{ item.name }}
          </span>
          
          <!-- Active Indicator -->
          <div
            v-if="isActive(item.path) && !collapsed"
            class="ml-auto w-1.5 h-1.5 bg-primary-500 rounded-full"
          />
        </button>
        
        <!-- Tooltip for collapsed state -->
        <div
          v-if="collapsed"
          class="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap"
        >
          {{ item.name }}
          <div class="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      </div>
    </nav>
    
    <!-- Sidebar Footer -->
    <div class="p-2 border-t border-gray-200 dark:border-gray-700">
      <!-- Dark Mode Toggle -->
      <button
        :class="[
          'w-full flex items-center rounded-lg transition-all duration-200',
          collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2 text-sm font-medium',
          'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        ]"
        :title="collapsed ? (uiStore.darkMode ? 'Hell-Modus' : 'Dunkel-Modus') : ''"
        @click="toggleDarkModeWithNotification"
      >
        <svg 
          class="flex-shrink-0"
          :class="collapsed ? 'w-5 h-5' : 'w-4 h-4 mr-3'"
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
        
        <span v-if="!collapsed" class="text-sm">
          {{ uiStore.darkMode ? 'Hell-Modus' : 'Dunkel-Modus' }}
        </span>
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

/* Ensure sidebar doesn't cause horizontal overflow */
aside {
  min-width: 4rem; /* Minimum width for collapsed state */
  max-width: 16rem; /* Maximum width for expanded state */
  flex-shrink: 0; /* Prevent shrinking */
  /* Stellen Sie sicher, dass erweiterte Sidebar über dem Content liegt */
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
}

/* Hide scrollbar completely or make it very minimal */
nav {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

nav::-webkit-scrollbar {
  display: none; /* Chrome/Safari/WebKit */
}

/* Alternative: Very thin scrollbar if needed */
nav.show-scrollbar::-webkit-scrollbar {
  width: 2px;
}

nav.show-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

nav.show-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.3);
  border-radius: 1px;
}

.dark nav.show-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.3);
}

/* Hover effects for navigation items */
.group:hover .opacity-0 {
  opacity: 1;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  aside {
    /* Auf kleineren Bildschirmen als slide-in overlay */
    transform: translateX(-100%);
    transition: transform 0.3s ease-in-out;
    z-index: 50;
  }
  
  aside:not(.collapsed) {
    transform: translateX(0);
  }
  
  /* Backdrop für mobile overlay wenn expanded */
  aside:not(.collapsed)::after {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: -1;
    pointer-events: auto;
  }
}

/* Prevent text selection on navigation items */
nav button {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
</style>