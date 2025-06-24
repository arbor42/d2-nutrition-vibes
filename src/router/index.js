import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        meta: {
          title: 'D2 Nutrition Vibes - Home',
          preload: true
        }
      },
      {
        path: '/dashboard',
        name: 'dashboard',
        meta: {
          title: 'Dashboard - D2 Nutrition Vibes',
          preload: true
        }
      },
      {
        path: '/timeseries',
        name: 'timeseries',
        meta: {
          title: 'Zeitreihen - D2 Nutrition Vibes'
        }
      },
      {
        path: '/simulation',
        name: 'simulation',
        meta: {
          title: 'Simulation - D2 Nutrition Vibes'
        }
      },
      {
        path: '/ml-predictions',
        name: 'ml-predictions',
        meta: {
          title: 'ML Prognosen - D2 Nutrition Vibes'
        }
      },
      {
        path: '/structural',
        name: 'structural',
        meta: {
          title: 'Strukturanalyse - D2 Nutrition Vibes'
        }
      },
      {
        path: '/process-mining',
        name: 'process-mining',
        meta: {
          title: 'Process Mining - D2 Nutrition Vibes'
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