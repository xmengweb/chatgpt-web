import type { App } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHashHistory } from 'vue-router'
import { setupPageGuard } from './permission'
import { ChatLayout } from '@/views/chat/layout'
import Admin from '@/views/admin/index.vue'
import login from '@/views/login/login.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Root',
    component: ChatLayout,
    redirect: '/chat',
    children: [
      {
        path: '/chat/:uuid?',
        name: 'Chat',
        component: () => import('@/views/chat/index.vue'),
      },
      {
        path: '/draw/:uuid?',
        name: 'Draw',
        component: () => import('@/views/chat/draw/draw.vue'),
      },
    ],
  },
  {
    path: '/Admin',
    name: 'admin',
    component: Admin,
    redirect: '/Admin/charge',
    children: [
      {
        path: 'charge',
        name: 'Charge',
        component: () => import('@/views/admin/mainCharge.vue'),
      },
      {
        path: 'arguments',
        name: 'Arguments',
        component: () => import('@/views/admin/arguments.vue'),
      },
    ],
  },
  {
    path: '/login',
    name: 'login',
    component: login,
  },
  {
    path: '/404',
    name: '404',
    component: () => import('@/views/exception/404/index.vue'),
  },

  {
    path: '/500',
    name: '500',
    component: () => import('@/views/exception/500/index.vue'),
  },

  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    redirect: '/404',
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ left: 0, top: 0 }),
})

setupPageGuard(router)

export async function setupRouter(app: App) {
  app.use(router)
  await router.isReady()
}
