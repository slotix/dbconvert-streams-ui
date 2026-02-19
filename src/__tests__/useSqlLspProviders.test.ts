import { describe, expect, it } from 'vitest'
import {
  buildSqlLspWebSocketUrl,
  getSqlLspConnectionContextSignature
} from '@/composables/useSqlLspProviders'

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
        database: 'sakila'
      }
    })

    const url = new URL(raw)
    expect(url.searchParams.get('connection_id')).toBe('conn_123')
    expect(url.searchParams.get('database')).toBe('sakila')
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

describe('getSqlLspConnectionContextSignature', () => {
  it('returns empty signature when connectionId or database is missing', () => {
    expect(getSqlLspConnectionContextSignature()).toBe('')
    expect(
      getSqlLspConnectionContextSignature({
        connectionId: 'conn_1',
        database: ''
      })
    ).toBe('')
    expect(
      getSqlLspConnectionContextSignature({
        connectionId: '',
        database: 'db1'
      })
    ).toBe('')
  })

  it('normalizes and stabilizes signature from meaningful fields', () => {
    expect(
      getSqlLspConnectionContextSignature({
        connectionId: ' conn_1 ',
        database: ' db1 '
      })
    ).toBe('conn_1::db1')

    expect(
      getSqlLspConnectionContextSignature({
        connectionId: 'conn_1',
        database: 'db1'
      })
    ).toBe('conn_1::db1')
  })
})
