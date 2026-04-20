// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public routes — no login needed
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresGuest: true }, // redirect to dashboard if already logged in
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { requiresGuest: true },
    },

    // Protected routes — must be logged in
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
      path: '/transactions/:id',
      name: 'transaction.show',
      component: () => import('@/views/TransactionDetailView.vue'),
      meta: { requiresAuth: true },
    },

    // Catch-all — redirect unknown routes to dashboard
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

/**
 * Navigation guard — runs before every route change.
 * Checks auth state and redirects if needed.
 */
router.beforeEach((to) => {
  const token = localStorage.getItem('auth_token')

  // Route requires login but user is not logged in
  if (to.meta.requiresAuth && !token) {
    return { name: 'login' }
  }

  // Route is for guests only but user is already logged in
  if (to.meta.requiresGuest && token) {
    return { name: 'dashboard' }
  }
})
/**
 * Global Error Handler for Dynamic Import Failures
 * Forces a hard reload if a chunk goes missing (usually due to a new deployment).
 */
router.onError((error, to) => {
  const isChunkLoadFailed = error.message.includes('Failed to fetch dynamically imported module') || 
                            error.message.includes('Importing a module script failed');

  if (isChunkLoadFailed) {
    // We use a localStorage flag to prevent infinite reload loops 
    // in case the network is genuinely down or the file is permanently corrupted.
    const hasAttemptedReload = localStorage.getItem('chunk_failed_reload');

    if (!hasAttemptedReload) {
      localStorage.setItem('chunk_failed_reload', 'true');
      console.warn('Chunk load failed. Forcing a hard reload to fetch latest assets.');
      // Force the browser to reload the target page directly from the server
      window.location.assign(to.fullPath);
    } else {
      console.error('Fatal system error: Chunk still missing after hard reload.', error);
      // Clean up the flag so the user isn't permanently locked out of retrying later
      localStorage.removeItem('chunk_failed_reload');
      
      // Ideally, trigger your UI error state here (e.g., a toast notification)
      // alert('A new version of the app is available, but we cannot load it. Please clear your cache.');
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