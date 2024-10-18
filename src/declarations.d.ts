// src/declarations.d.ts
declare module '*.js'
declare module '../router' {
  import { Router } from 'vue-router'
  const router: Router
  export default router
}
