// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

import NotFound from '@/views/NotFound.vue'

const loadHomeView = () => import('@/views/HomeView.vue')
const loadStreamsView = () => import('@/views/StreamsView.vue')
const loadDatabaseExplorerView = () => import('@/views/DatabaseExplorerView.vue')
const loadManifestsView = () => import('@/views/ManifestsView.vue')

const routes = [
  {
    path: '/',
    name: 'Overview',
    component: loadHomeView
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
    component: loadDatabaseExplorerView
  },
  {
    path: '/federated',
    redirect: '/explorer'
  },
  {
    path: '/streams',
    name: 'Streams',
    component: loadStreamsView
  },
  {
    path: '/manifests',
    name: 'Manifests',
    component: loadManifestsView
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

let workspaceViewsPrefetched = false

export function prefetchWorkspaceViews(activeRouteName?: string | symbol | null): void {
  if (workspaceViewsPrefetched || typeof window === 'undefined') {
    return
  }

  workspaceViewsPrefetched = true

  const loaders = [
    { name: 'Streams', load: loadStreamsView },
    { name: 'DatabaseExplorer', load: loadDatabaseExplorerView },
    { name: 'Manifests', load: loadManifestsView }
  ]

  window.setTimeout(() => {
    for (const loader of loaders) {
      if (loader.name === activeRouteName) {
        continue
      }
      void loader.load()
    }
  }, 200)
}

export default router
