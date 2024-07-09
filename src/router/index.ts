// src/router/index.ts
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import ConnectionsView from '../views/ConnectionsView.vue';
import StreamsView from '../views/StreamsView.vue';
import ManageStreamView from '../views/ManageStreamView.vue';
import MonitorStreamView from '../views/MonitorStreamView.vue';
import ApiKeyView from '../views/ApiKeyView.vue'; // Import the new ApiKeyView component
import NotFound from '../views/NotFound.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/connections',
    name: 'Connections',
    component: ConnectionsView,
  },
  {
    path: '/streams',
    name: 'Streams',
    component: StreamsView,
  },
  {
    path: '/streams/:mode',
    name: 'ManageStream',
    component: ManageStreamView,
    props: true,
  },
  {
    path: '/monitor',
    name: 'MonitorStream',
    component: MonitorStreamView,
    props: true,
  },
  {
    path: '/api-key',
    name: 'ApiKey',
    component: ApiKeyView, // Define the route for the API Key page
  },
  {
    path: '/:catchAll(.*)',
    component: NotFound,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes,
});

export default router;
