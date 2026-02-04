/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PORT: string
  readonly VITE_API_URL: string
  readonly VITE_BACKEND_URL: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_LEGACY_SHARED_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Add window.ENV type definition
interface Window {
  ENV?: {
    VITE_PORT: string
    VITE_API_URL: string
    VITE_BACKEND_URL: string
    VITE_SENTRY_DSN: string
    VITE_LEGACY_SHARED_KEY?: string
    [key: string]: unknown // Allow additional properties
  }
  runtime?: {
    EventsOnMultiple: (
      eventName: string,
      callback: (...data: unknown[]) => void,
      maxCallbacks: number
    ) => () => void
    EventsOff: (eventName: string, ...additionalEventNames: string[]) => void
    EventsOffAll: () => void
    EventsEmit?: (...args: unknown[]) => void
    BrowserOpenURL?: (url: string) => void
  }
}
