// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

// Static imports for stability during development
import HomeView from '@/views/HomeView.vue'
import StreamsView from '@/views/StreamsView.vue'
import ConnectionsView from '@/views/ConnectionsView.vue'
import ManageStreamView from '@/views/ManageStreamView.vue'
import MonitorStreamView from '@/views/MonitorStreamView.vue'
import DatabaseMetadataView from '@/views/DatabaseMetadataView.vue'
import DatabaseExplorerView from '@/views/DatabaseExplorerView.vue'
import NotFound from '@/views/NotFound.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/connections',
    name: 'Connections',
    component: ConnectionsView
  },
  {
    path: '/connections/add',
    name: 'AddConnection',
    component: () => import('@/views/AddConnectionView.vue')
  },
  {
    path: '/connections/edit/:id',
    name: 'EditConnection',
    component: () => import('@/views/EditConnectionView.vue'),
    props: true
  },
  {
    path: '/explorer',
    name: 'DatabaseExplorer',
    component: DatabaseExplorerView,
    children: [
      {
        path: ':id',
        name: 'DatabaseMetadata',
        component: DatabaseMetadataView,
        props: true
      }
    ]
  },
  {
    path: '/streams',
    name: 'Streams',
    component: StreamsView
  },
  {
    path: '/streams/:mode',
    name: 'ManageStream',
    component: ManageStreamView,
    props: true
  },
  {
    path: '/monitor',
    name: 'MonitorStream',
    component: MonitorStreamView,
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
