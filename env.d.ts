/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  readonly VITE_PORT: string
  readonly VITE_NATS_SERVER: string
  readonly VITE_API_URL: string
  readonly VITE_BACKEND_URL: string
  readonly VITE_SENTRY_DSN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Add window.ENV type definition
interface Window {
  ENV?: {
    VITE_API_KEY: string
    VITE_PORT: string
    VITE_NATS_SERVER: string
    VITE_API_URL: string
    VITE_NATS_WS_TLS: boolean
    VITE_NATS_ALLOW_RECONNECT: boolean
    VITE_NATS_WS_TLS_VERIFY: boolean
    VITE_BACKEND_URL: string
    VITE_SENTRY_DSN: string
  }
}
