import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/components/layout/PanelView.vue'),
        meta: {
          title: 'OpenFoodMap',
          preload: true
        }
      },
      {
        path: '/dashboard',
        redirect: { path: '/', query: { pnl: 'dashboard' } }
      },
      {
        path: '/timeseries',
        redirect: { path: '/', query: { pnl: 'timeseries' } }
      },
      {
        path: '/simulation',
        redirect: { path: '/', query: { pnl: 'simulation' } }
      },
      {
        path: '/ml-predictions',
        redirect: { path: '/', query: { pnl: 'ml-predictions' } }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import(/* webpackChunkName: "not-found" */ '@/components/layout/NotFound.vue'),
    meta: {
      title: 'Seite nicht gefunden - OpenFoodMap'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 1. Browser-Back/Forward: gespeicherte Position wiederherstellen
    if (savedPosition) {
      return savedPosition
    }

    // 2. Nur Query-Änderung (z. B. durch UrlStateService) → Position beibehalten
    const onlyQueryChanged = to.path === from.path && to.hash === from.hash
    if (onlyQueryChanged) {
      return false // Kein Scrollen
    }

    // 3. Normale Navigation → nach oben
    return { top: 0 }
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