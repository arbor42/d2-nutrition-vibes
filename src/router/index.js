import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: {
      title: 'D2 Nutrition Vibes - Home',
      preload: true
    }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import(/* webpackChunkName: "dashboard" */ '@/components/panels/DashboardPanel.vue'),
    meta: {
      title: 'Dashboard - D2 Nutrition Vibes',
      preload: true
    }
  },
  {
    path: '/timeseries',
    name: 'timeseries',
    component: () => import(/* webpackChunkName: "timeseries" */ '@/components/panels/TimeseriesPanel.vue'),
    meta: {
      title: 'Zeitreihen - D2 Nutrition Vibes'
    }
  },
  {
    path: '/simulation',
    name: 'simulation',
    component: () => import(/* webpackChunkName: "simulation" */ '@/components/panels/SimulationPanel.vue'),
    meta: {
      title: 'Simulation - D2 Nutrition Vibes'
    }
  },
  {
    path: '/ml-predictions',
    name: 'ml-predictions',
    component: () => import(/* webpackChunkName: "ml-predictions" */ '@/components/panels/MLPanel.vue'),
    meta: {
      title: 'ML Prognosen - D2 Nutrition Vibes'
    }
  },
  {
    path: '/structural',
    name: 'structural',
    component: () => import(/* webpackChunkName: "structural" */ '@/components/panels/StructuralPanel.vue'),
    meta: {
      title: 'Strukturanalyse - D2 Nutrition Vibes'
    }
  },
  {
    path: '/process-mining',
    name: 'process-mining',
    component: () => import(/* webpackChunkName: "process-mining" */ '@/components/panels/ProcessPanel.vue'),
    meta: {
      title: 'Process Mining - D2 Nutrition Vibes'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import(/* webpackChunkName: "not-found" */ '@/components/layout/NotFound.vue'),
    meta: {
      title: 'Seite nicht gefunden - D2 Nutrition Vibes'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Preloader for critical routes
const preloadRoutes = routes
  .filter(route => route.meta?.preload)
  .map(route => route.component)

Promise.all(preloadRoutes.map(componentLoader => componentLoader()))
  .catch(err => console.warn('Failed to preload some routes:', err))

// Navigation guards
router.beforeEach(async (to, from, next) => {
  // Set page title
  if (to.meta.title) {
    document.title = to.meta.title
  }
  
  // Show loading indicator for route transitions
  if (from.name && to.name && from.name !== to.name) {
    const loadingEvent = new CustomEvent('route-loading', { detail: { loading: true } })
    window.dispatchEvent(loadingEvent)
  }
  
  next()
})

router.afterEach(() => {
  // Hide loading indicator after route transition
  const loadingEvent = new CustomEvent('route-loading', { detail: { loading: false } })
  window.dispatchEvent(loadingEvent)
})

export default router