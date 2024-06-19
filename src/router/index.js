import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import ConnectionsView from "../views/ConnectionsView.vue";
import StreamsView from "../views/StreamsView.vue";
import ManageStreamView from "../views/ManageStreamView.vue";
import MonitorStreamView from "../views/MonitorStreamView.vue";
import NotFound from "../views/NotFound.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/connections",
      name: "Connections",
      component: ConnectionsView,
    },
    {
      path: "/streams",
      name: "Streams",
      component: StreamsView,
    },
    {
      path: "/streams/:mode",
      name: "ManageStream",
      component: ManageStreamView,
      props: true,
    },
    {
      path: "/monitor",
      name: "MonitorStream",
      component: MonitorStreamView,
      props: true,
    },
    {
      path: "/:catchAll(.*)",
      component: NotFound,
    },
  ],
});

export default router;
