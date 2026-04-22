// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public routes: no login needed
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresGuest: true }, 
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { requiresGuest: true },
    },

    // Protected routes: must be logged in
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/pay',
      name: 'pay',
      component: () => import('@/views/PayView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/HistoryView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/merchant/setup',
      name: 'merchant.setup',
      component: () => import('@/views/MerchantSetupView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/transactions/:id',
      name: 'transaction.show',
      component: () => import('@/views/TransactionDetailView.vue'),
      meta: { requiresAuth: true },
    },

    // Catch-all: redirect unknown routes to dashboard
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

/**
 * State flag to track if the application has completed its initial auth handshake.
 */
let isBootstrapped = false;

/**
 * Navigation guard: runs before every route change.
 * Asynchronously checks auth state on initial boot, then relies on memory.
 */
router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  // RACE CONDITION FIX:
  // If this is the very first route resolution after a hard refresh or initial load,
  // we pause the router and ask the backend for the source of truth.
  if (!isBootstrapped) {
    await authStore.fetchUser()
    isBootstrapped = true
  }

  // Route requires login but user is not logged in
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  // If logged in but no merchant profile, force merchant setup
  if (
    authStore.isAuthenticated &&
    !authStore.hasMerchant &&
    to.name !== 'merchant.setup' &&
    to.name !== 'login' &&
    to.name !== 'register'
  ) {
    return { name: 'merchant.setup' }
  }

  // Route is for guests only but user is already logged in
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

/**
 * Global Error Handler for Dynamic Import Failures
 */
router.onError((error, to) => {
  const isChunkLoadFailed = error.message.includes('Failed to fetch dynamically imported module') || 
                            error.message.includes('Importing a module script failed');

  if (isChunkLoadFailed) {
    const hasAttemptedReload = localStorage.getItem('chunk_failed_reload');

    if (!hasAttemptedReload) {
      localStorage.setItem('chunk_failed_reload', 'true');
      console.warn('Chunk load failed. Forcing a hard reload to fetch latest assets.');
      window.location.assign(to.fullPath);
    } else {
      console.error('Fatal system error: Chunk still missing after hard reload.', error);
      localStorage.removeItem('chunk_failed_reload');
    }
  }
});

/**
 * Clean up the reload flag on successful route resolutions.
 */
router.beforeResolve(() => {
  if (localStorage.getItem('chunk_failed_reload')) {
    localStorage.removeItem('chunk_failed_reload');
  }
});

export default router