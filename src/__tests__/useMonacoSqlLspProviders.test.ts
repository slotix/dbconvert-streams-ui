import { describe, expect, it } from 'vitest'
import { buildSqlLspWebSocketUrl, isSqlLspEnabled } from '@/composables/useMonacoSqlLspProviders'

describe('isSqlLspEnabled', () => {
  it('prefers runtime flag when provided', () => {
    expect(isSqlLspEnabled('true', 'false')).toBe(true)
    expect(isSqlLspEnabled('off', 'true')).toBe(false)
  })

  it('falls back to build-time flag', () => {
    expect(isSqlLspEnabled(undefined, '1')).toBe(true)
    expect(isSqlLspEnabled(undefined, 'false')).toBe(false)
  })
})

describe('buildSqlLspWebSocketUrl', () => {
  it('builds ws URL for http backend base path', () => {
    const raw = buildSqlLspWebSocketUrl({
      backendUrl: 'http://127.0.0.1:8020/api/v1',
      apiKey: 'key-1',
      installId: 'install-1'
    })

    const url = new URL(raw)
    expect(url.protocol).toBe('ws:')
    expect(url.host).toBe('127.0.0.1:8020')
    expect(url.pathname).toBe('/api/v1/lsp/ws')
    expect(url.searchParams.get('api_key')).toBe('key-1')
    expect(url.searchParams.get('install_id')).toBe('install-1')
  })

  it('builds wss URL for https backend with trailing slash', () => {
    const raw = buildSqlLspWebSocketUrl({
      backendUrl: 'https://streams.example.com/api/v1/',
      apiKey: 'key-2',
      installId: 'install-2'
    })

    const url = new URL(raw)
    expect(url.protocol).toBe('wss:')
    expect(url.host).toBe('streams.example.com')
    expect(url.pathname).toBe('/api/v1/lsp/ws')
    expect(url.searchParams.get('api_key')).toBe('key-2')
    expect(url.searchParams.get('install_id')).toBe('install-2')
  })

  it('includes connection context query params when provided', () => {
    const raw = buildSqlLspWebSocketUrl({
      backendUrl: 'http://127.0.0.1:8020/api/v1',
      apiKey: 'key-3',
      installId: 'install-3',
      connectionContext: {
        connectionId: 'conn_123',
        database: 'sakila',
        dialect: 'mysql'
      }
    })

    const url = new URL(raw)
    expect(url.searchParams.get('connection_id')).toBe('conn_123')
    expect(url.searchParams.get('database')).toBe('sakila')
    expect(url.searchParams.get('dialect')).toBe('mysql')
  })

  it('omits auth query params when values are empty', () => {
    const raw = buildSqlLspWebSocketUrl({
      backendUrl: 'http://127.0.0.1:8020/api/v1',
      apiKey: '   ',
      installId: '',
      connectionContext: {
        connectionId: 'conn_123',
        database: 'sakila'
      }
    })

    const url = new URL(raw)
    expect(url.searchParams.has('api_key')).toBe(false)
    expect(url.searchParams.has('install_id')).toBe(false)
    expect(url.searchParams.get('connection_id')).toBe('conn_123')
    expect(url.searchParams.get('database')).toBe('sakila')
  })
})
