import { createApp } from 'vue'
import { createPinia } from 'pinia'
import store from "./store";

import './assets/style.css'
import App from './App.vue'
import router from './router'


const app = createApp(App)

app.use(createPinia())
app.use(store)
app.use(router)

app.mount('#app')
