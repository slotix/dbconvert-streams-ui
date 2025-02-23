/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BACKEND_URL: string
    readonly VITE_SENTRY_DSN: string
    readonly PACKAGE_VERSION: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
} 