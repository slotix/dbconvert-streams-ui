/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KOBBLE_DOMAIN: string
  readonly VITE_KOBBLE_CLIENT_ID: string
  readonly VITE_KOBBLE_REDIRECT_URI: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

