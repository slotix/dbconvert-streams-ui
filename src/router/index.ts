// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

// Static imports for stability during development
import HomeView from '@/views/HomeView.vue'
import StreamsView from '@/views/StreamsView.vue'
import DatabaseExplorerView from '@/views/DatabaseExplorerView.vue'
import NotFound from '@/views/NotFound.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/explorer/add',
    name: 'AddConnection',
    component: () => import('@/views/AddConnectionView.vue')
  },
  {
    path: '/explorer/edit/:id',
    name: 'EditConnection',
    alias: ['/connections/edit/:id'],
    component: () => import('@/views/EditConnectionView.vue'),
    props: true
  },
  {
    path: '/explorer/edit-json/:id',
    name: 'EditConnectionJson',
    component: () => import('@/views/EditConnectionJsonView.vue'),
    props: true
  },
  {
    path: '/explorer',
    name: 'DatabaseExplorer',
    component: DatabaseExplorerView
  },
  {
    path: '/explorer/:id',
    name: 'DatabaseMetadata',
    component: DatabaseExplorerView,
    props: true
  },
  {
    path: '/streams',
    name: 'Streams',
    component: StreamsView
  },
  {
    path: '/streams/create',
    name: 'CreateStream',
    component: () => import('@/views/CreateStreamView.vue')
  },
  {
    path: '/streams/edit/:id',
    name: 'EditStream',
    component: () => import('@/views/CreateStreamView.vue'),
    props: true
  },
  {
    path: '/streams/edit-json/:id',
    name: 'EditStreamJson',
    component: () => import('@/views/EditStreamJsonView.vue'),
    props: true
  },
  {
    path: '/sql-console',
    name: 'SqlConsole',
    component: () => import('@/views/SqlConsoleView.vue')
  },
  {
    path: '/:catchAll(.*)',
    component: NotFound
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
