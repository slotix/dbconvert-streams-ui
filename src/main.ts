import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { clerkPlugin } from 'vue-clerk';

import './assets/style.css';
import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(clerkPlugin, {
  publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
  // clerkJSVariant: 'headless'
});

app.mount('#app');