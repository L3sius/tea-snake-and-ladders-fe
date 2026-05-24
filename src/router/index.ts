import { createRouter, createWebHistory } from 'vue-router'
import BoardView from '@/views/BoardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Board',
      component: BoardView,
    },
    {
      path: '/leaderboard',
      name: 'Leaderboard',
      component: () => import('@/views/LeaderboardView.vue'),
    },
    {
      path: '/info',
      name: 'EventInfo',
      component: () => import('@/views/EventInfoView.vue'),
    },
  ],
})

export default router
