import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/components/panels/DashboardPanel.vue'),
        meta: {
          title: 'D2 Nutrition Vibes - Home',
          preload: true
        }
      },
      {
        path: '/dashboard',
        name: 'dashboard',
        component: () => import('@/components/panels/DashboardPanel.vue'),
        meta: {
          title: 'Dashboard - D2 Nutrition Vibes',
          preload: true
        }
      },
      {
        path: '/timeseries',
        name: 'timeseries',
        component: () => import('@/components/panels/TimeseriesPanel.vue'),
        meta: {
          title: 'Zeitreihen - D2 Nutrition Vibes'
        }
      },
      {
        path: '/simulation',
        name: 'simulation',
        component: () => import('@/components/panels/SimulationPanel.vue'),
        meta: {
          title: 'Simulation - D2 Nutrition Vibes'
        }
      },
      {
        path: '/ml-predictions',
        name: 'ml-predictions',
        component: () => import('@/components/panels/MLPanel.vue'),
        meta: {
          title: 'ML Prognosen - D2 Nutrition Vibes'
        }
      }
    ]
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
const preloadRoutes = []
routes.forEach(route => {
  if (route.component && route.meta?.preload) {
    preloadRoutes.push(route.component)
  }
  if (route.children) {
    route.children.forEach(childRoute => {
      if (childRoute.meta?.preload && route.component) {
        preloadRoutes.push(route.component)
      }
    })
  }
})

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