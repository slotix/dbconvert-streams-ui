interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_SQL_LSP_ENABLED?: string
  readonly PACKAGE_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
