// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

import NotFound from '@/views/NotFound.vue'

const routes = [
  {
    path: '/',
    name: 'Overview',
    component: () => import('@/views/HomeView.vue')
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
    component: () => import('@/views/DatabaseExplorerView.vue')
  },
  {
    path: '/federated',
    redirect: '/explorer'
  },
  {
    path: '/streams',
    name: 'Streams',
    component: () => import('@/views/StreamsView.vue')
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
    path: '/:catchAll(.*)',
    component: NotFound
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
