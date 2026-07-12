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
      path: '/activity',
      name: 'Activity',
      component: () => import('@/views/ActivityView.vue'),
    },
  ],
})

export default router
