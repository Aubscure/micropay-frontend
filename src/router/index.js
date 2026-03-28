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

export default router