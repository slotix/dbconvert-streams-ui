/// <reference types="vite/client" />

interface ImportMetaEnv {
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
    VITE_PORT: string
    VITE_API_URL: string
    VITE_BACKEND_URL: string
    VITE_SENTRY_DSN: string
    VITE_DESKTOP_MODE?: string
    [key: string]: unknown
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
    WindowReload?: () => void
    WindowReloadApp?: () => void
  }
}
