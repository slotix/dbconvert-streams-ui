/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  readonly VITE_PORT: string
  readonly VITE_API_URL: string
  readonly VITE_BACKEND_URL: string
  readonly VITE_SENTRY_DSN: string
  readonly PACKAGE_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  ENV?: {
    VITE_API_KEY: string
    VITE_PORT: string
    VITE_API_URL: string
    VITE_BACKEND_URL: string
    VITE_SENTRY_DSN: string
    [key: string]: any
  }
}
