/**
 * Environment utility functions
 *
 * This file provides utility functions for accessing environment variables
 * in a consistent way across the application. It prioritizes runtime configuration
 * (window.ENV) over build-time configuration (import.meta.env).
 */

/**
 * Get the backend URL from environment variables
 * Prioritizes window.ENV (runtime) over import.meta.env (build time)
 */
export function getBackendUrl(): string {
  // First try to get from window.ENV (runtime config)
  const runtimeUrl = window.ENV?.VITE_BACKEND_URL
  if (runtimeUrl) {
    return runtimeUrl
  }

  // Then try import.meta.env (build time config)
  const buildTimeUrl = import.meta.env.VITE_BACKEND_URL
  if (buildTimeUrl) {
    return buildTimeUrl
  }

  // Fallback to a default for development (should never be used in production)
  if (import.meta.env.DEV) {
    // Check if we're running on localhost
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

    // If we're on localhost, assume direct API access on port 8020
    // Otherwise, assume Nginx proxy is in place
    const fallbackUrl = isLocalhost ? 'http://localhost:8020/api/v1' : '/api'

    console.warn(`No backend URL configured. Using default for development: ${fallbackUrl}`)
    return fallbackUrl
  }

  throw new Error(
    'Backend URL is not configured. Please set VITE_BACKEND_URL environment variable.'
  )
}

/**
 * Get the Sentry DSN from environment variables
 * Prioritizes window.ENV (runtime) over import.meta.env (build time)
 */
export function getSentryDsn(): string {
  // First try to get from window.ENV (runtime config)
  const runtimeDsn = window.ENV?.VITE_SENTRY_DSN
  if (runtimeDsn) {
    return runtimeDsn
  }

  // Then try import.meta.env (build time config)
  const buildTimeDsn = import.meta.env.VITE_SENTRY_DSN
  if (buildTimeDsn) {
    return buildTimeDsn
  }

  return '' // Sentry is optional, so return empty string if not configured
}

/**
 * Get the API key from environment variables
 * Prioritizes window.ENV (runtime) over import.meta.env (build time)
 */
export function getApiKey(): string {
  // First try to get from window.ENV (runtime config)
  const runtimeKey = window.ENV?.VITE_API_KEY
  if (runtimeKey) {
    return runtimeKey
  }

  // Then try import.meta.env (build time config)
  const buildTimeKey = import.meta.env.VITE_API_KEY
  if (buildTimeKey) {
    return buildTimeKey
  }

  return '' // API key might be provided later by the user
}

/**
 * Log all environment variables for debugging
 */
export function logEnvironment(): void {
  console.log('[Environment] Configuration:', {
    backendUrl: getBackendUrl(),
    sentryDsn: getSentryDsn(),
    apiKey: getApiKey() ? '[REDACTED]' : '[NOT SET]',
    mode: import.meta.env.MODE
  })
}
