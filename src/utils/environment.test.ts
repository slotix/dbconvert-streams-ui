import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
    getNatsServerUrl,
    getBackendUrl,
    getSentryDsn,
    getApiKey,
    getBooleanEnv,
    getStringEnv,
    validateWebSocketUrl
} from './environment'

describe('Environment Utilities', () => {
    // Save original window.ENV and import.meta.env
    const originalWindowENV = window.ENV
    const originalImportMeta = { ...import.meta.env }

    // Mock window.ENV and import.meta.env before each test
    beforeEach(() => {
        // Clear window.ENV
        window.ENV = undefined

        // Mock import.meta.env
        vi.stubGlobal('import.meta', {
            env: {
                DEV: true,
                MODE: 'development',
                VITE_NATS_SERVER: undefined,
                VITE_BACKEND_URL: undefined,
                VITE_SENTRY_DSN: undefined,
                VITE_API_KEY: undefined
            }
        })
    })

    // Restore original values after each test
    afterEach(() => {
        window.ENV = originalWindowENV
        vi.stubGlobal('import.meta', { env: originalImportMeta })
    })

    describe('getNatsServerUrl', () => {
        it('should return window.ENV value if available', () => {
            window.ENV = {
                VITE_NATS_SERVER: 'ws://test-window.example.com:8081',
                VITE_API_KEY: '',
                VITE_PORT: '',
                VITE_API_URL: '',
                VITE_NATS_WS_TLS: false,
                VITE_NATS_ALLOW_RECONNECT: true,
                VITE_NATS_WS_TLS_VERIFY: false,
                VITE_BACKEND_URL: '',
                VITE_SENTRY_DSN: ''
            }

            expect(getNatsServerUrl()).toBe('ws://test-window.example.com:8081')
        })

        it('should return import.meta.env value if window.ENV is not available', () => {
            vi.stubGlobal('import.meta', {
                env: {
                    ...import.meta.env,
                    VITE_NATS_SERVER: 'ws://test-import.example.com:8081'
                }
            })

            expect(getNatsServerUrl()).toBe('ws://test-import.example.com:8081')
        })

        it('should return default value in development mode if no value is available', () => {
            expect(getNatsServerUrl()).toBe('ws://localhost:8081')
        })
    })

    describe('validateWebSocketUrl', () => {
        it('should validate a correct WebSocket URL', () => {
            const url = 'ws://example.com:8081'
            const result = validateWebSocketUrl(url)
            expect(result.href).toBe(url + '/')
        })

        it('should validate a correct secure WebSocket URL', () => {
            const url = 'wss://example.com:8081'
            const result = validateWebSocketUrl(url)
            expect(result.href).toBe(url + '/')
        })

        it('should throw an error for non-WebSocket URLs', () => {
            expect(() => validateWebSocketUrl('http://example.com')).toThrow('NATS server URL must use WebSocket protocol')
        })

        it('should throw an error for invalid URLs', () => {
            expect(() => validateWebSocketUrl('not-a-url')).toThrow('Invalid NATS server URL')
        })
    })

    describe('getBooleanEnv', () => {
        it('should return true for "true" string value', () => {
            window.ENV = {
                TEST_BOOL: 'true',
                VITE_API_KEY: '',
                VITE_PORT: '',
                VITE_NATS_SERVER: '',
                VITE_API_URL: '',
                VITE_NATS_WS_TLS: false,
                VITE_NATS_ALLOW_RECONNECT: true,
                VITE_NATS_WS_TLS_VERIFY: false,
                VITE_BACKEND_URL: '',
                VITE_SENTRY_DSN: ''
            }

            expect(getBooleanEnv('TEST_BOOL')).toBe(true)
        })

        it('should return true for true boolean value', () => {
            window.ENV = {
                TEST_BOOL: true,
                VITE_API_KEY: '',
                VITE_PORT: '',
                VITE_NATS_SERVER: '',
                VITE_API_URL: '',
                VITE_NATS_WS_TLS: false,
                VITE_NATS_ALLOW_RECONNECT: true,
                VITE_NATS_WS_TLS_VERIFY: false,
                VITE_BACKEND_URL: '',
                VITE_SENTRY_DSN: ''
            }

            expect(getBooleanEnv('TEST_BOOL')).toBe(true)
        })

        it('should return false for other values', () => {
            window.ENV = {
                TEST_BOOL: 'false',
                VITE_API_KEY: '',
                VITE_PORT: '',
                VITE_NATS_SERVER: '',
                VITE_API_URL: '',
                VITE_NATS_WS_TLS: false,
                VITE_NATS_ALLOW_RECONNECT: true,
                VITE_NATS_WS_TLS_VERIFY: false,
                VITE_BACKEND_URL: '',
                VITE_SENTRY_DSN: ''
            }

            expect(getBooleanEnv('TEST_BOOL')).toBe(false)
        })

        it('should return the default value if not set', () => {
            expect(getBooleanEnv('TEST_BOOL', true)).toBe(true)
            expect(getBooleanEnv('TEST_BOOL', false)).toBe(false)
        })
    })
}) 