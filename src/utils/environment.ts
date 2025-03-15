/**
 * Environment utility functions
 * 
 * This file provides utility functions for accessing environment variables
 * in a consistent way across the application. It prioritizes runtime configuration
 * (window.ENV) over build-time configuration (import.meta.env).
 */

/**
 * Get the NATS server URL from environment variables
 * Prioritizes window.ENV (runtime) over import.meta.env (build time)
 */
export function getNatsServerUrl(): string {
    // First try to get from window.ENV (runtime config)
    const runtimeUrl = window.ENV?.VITE_NATS_SERVER;
    console.log('[DEBUG] getNatsServerUrl - window.ENV?.VITE_NATS_SERVER:', runtimeUrl);

    if (runtimeUrl) {
        console.log('[DEBUG] getNatsServerUrl - Using runtime URL:', runtimeUrl);
        return runtimeUrl;
    }

    // Then try import.meta.env (build time config)
    const buildTimeUrl = import.meta.env.VITE_NATS_SERVER;
    console.log('[DEBUG] getNatsServerUrl - import.meta.env.VITE_NATS_SERVER:', buildTimeUrl);

    if (buildTimeUrl) {
        console.log('[DEBUG] getNatsServerUrl - Using build time URL:', buildTimeUrl);
        return buildTimeUrl;
    }

    // Fallback to a default for development (should never be used in production)
    if (import.meta.env.DEV) {
        console.warn('[DEBUG] getNatsServerUrl - No NATS server URL configured. Using default for development: ws://localhost:8081');
        return 'ws://localhost:8081';
    }

    throw new Error('NATS server URL is not configured. Please set VITE_NATS_SERVER environment variable.');
}

/**
 * Get the API URL from environment variables
 * Prioritizes window.ENV (runtime) over import.meta.env (build time)
 */
export function getApiUrl(): string {
    // First try to get from window.ENV (runtime config)
    const runtimeUrl = window.ENV?.VITE_API_URL;
    if (runtimeUrl) {
        return runtimeUrl;
    }

    // Then try import.meta.env (build time config)
    const buildTimeUrl = import.meta.env.VITE_API_URL;
    if (buildTimeUrl) {
        return buildTimeUrl;
    }

    // Fallback to a default for development (should never be used in production)
    if (import.meta.env.DEV) {
        console.warn('No API URL configured. Using default for development: /api/v1');
        return '/api/v1';
    }

    throw new Error('API URL is not configured. Please set VITE_API_URL environment variable.');
}

/**
 * Get the backend URL from environment variables
 * Prioritizes window.ENV (runtime) over import.meta.env (build time)
 */
export function getBackendUrl(): string {
    // First try to get from window.ENV (runtime config)
    const runtimeUrl = window.ENV?.VITE_BACKEND_URL;
    if (runtimeUrl) {
        return runtimeUrl;
    }

    // Then try import.meta.env (build time config)
    const buildTimeUrl = import.meta.env.VITE_BACKEND_URL;
    if (buildTimeUrl) {
        return buildTimeUrl;
    }

    // Fallback to a default for development (should never be used in production)
    if (import.meta.env.DEV) {
        console.warn('No backend URL configured. Using default for development: http://localhost:8020/api/v1');
        return 'http://localhost:8020/api/v1';
    }

    throw new Error('Backend URL is not configured. Please set VITE_BACKEND_URL environment variable.');
}

/**
 * Get the Sentry DSN from environment variables
 * Prioritizes window.ENV (runtime) over import.meta.env (build time)
 */
export function getSentryDsn(): string {
    // First try to get from window.ENV (runtime config)
    const runtimeDsn = window.ENV?.VITE_SENTRY_DSN;
    if (runtimeDsn) {
        return runtimeDsn;
    }

    // Then try import.meta.env (build time config)
    const buildTimeDsn = import.meta.env.VITE_SENTRY_DSN;
    if (buildTimeDsn) {
        return buildTimeDsn;
    }

    return '';  // Sentry is optional, so return empty string if not configured
}

/**
 * Get the API key from environment variables
 * Prioritizes window.ENV (runtime) over import.meta.env (build time)
 */
export function getApiKey(): string {
    // First try to get from window.ENV (runtime config)
    const runtimeKey = window.ENV?.VITE_API_KEY;
    if (runtimeKey) {
        return runtimeKey;
    }

    // Then try import.meta.env (build time config)
    const buildTimeKey = import.meta.env.VITE_API_KEY;
    if (buildTimeKey) {
        return buildTimeKey;
    }

    return '';  // API key might be provided later by the user
}

/**
 * Get a boolean environment variable
 * @param name The name of the environment variable
 * @param defaultValue The default value if the variable is not set
 */
export function getBooleanEnv(name: string, defaultValue: boolean = false): boolean {
    // First try to get from window.ENV (runtime config)
    const runtimeValue = window.ENV?.[name];
    if (runtimeValue !== undefined) {
        return runtimeValue === true || runtimeValue === 'true';
    }

    // Then try import.meta.env (build time config)
    const buildTimeValue = (import.meta.env as any)[name];
    if (buildTimeValue !== undefined) {
        return buildTimeValue === true || buildTimeValue === 'true';
    }

    return defaultValue;
}

/**
 * Get a string environment variable
 * @param name The name of the environment variable
 * @param defaultValue The default value if the variable is not set
 */
export function getStringEnv(name: string, defaultValue: string = ''): string {
    // First try to get from window.ENV (runtime config)
    const runtimeValue = window.ENV?.[name];
    if (runtimeValue !== undefined) {
        return String(runtimeValue);
    }

    // Then try import.meta.env (build time config)
    const buildTimeValue = (import.meta.env as any)[name];
    if (buildTimeValue !== undefined) {
        return String(buildTimeValue);
    }

    return defaultValue;
}

/**
 * Validate a WebSocket URL
 * @param url The URL to validate
 * @returns The validated URL object
 * @throws Error if the URL is invalid
 */
export function validateWebSocketUrl(url: string): URL {
    try {
        const serverUrl = new URL(url);
        if (!serverUrl.protocol.startsWith('ws')) {
            throw new Error(`NATS server URL must use WebSocket protocol (ws:// or wss://). Got: ${serverUrl.protocol}`);
        }
        return serverUrl;
    } catch (error) {
        const urlError = error as Error;
        throw new Error(`Invalid NATS server URL: ${url}. Error: ${urlError.message}`);
    }
}

/**
 * Log all environment variables for debugging
 */
export function logEnvironment(): void {
    console.log('[Environment] Configuration:', {
        natsServer: getNatsServerUrl(),
        backendUrl: getBackendUrl(),
        sentryDsn: getSentryDsn(),
        apiKey: getApiKey() ? '[REDACTED]' : '[NOT SET]',
        isDev: import.meta.env.DEV,
        mode: import.meta.env.MODE,
        natsWsTls: getBooleanEnv('VITE_NATS_WS_TLS'),
        natsAllowReconnect: getBooleanEnv('VITE_NATS_ALLOW_RECONNECT', true),
        natsWsTlsVerify: getBooleanEnv('VITE_NATS_WS_TLS_VERIFY')
    });
} 