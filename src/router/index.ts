// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import StreamsView from '@/views/StreamsView.vue'
import PricingView from '@/views/PricingView.vue'
import ConnectionsView from '@/views/ConnectionsView.vue'
import ManageStreamView from '@/views/ManageStreamView.vue'
import MonitorStreamView from '@/views/MonitorStreamView.vue'
import ApiKeyView from '@/views/ApiKeyView.vue' // Import the new ApiKeyView component
import NotFound from '@/views/NotFound.vue'
import UsageView from '@/views/UsageView.vue'

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
    path: '/api-key',
    name: 'ApiKey',
    component: ApiKeyView 
  },
  {
    path: '/usage',
    name: 'Usage',
    component: UsageView
  },
  {
    path: '/pricing',
    name: 'Pricing',
    component: PricingView
  },
  {
    path: '/:catchAll(.*)',
    component: NotFound
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes
})

export default router