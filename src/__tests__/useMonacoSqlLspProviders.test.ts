import { describe, expect, it, vi } from 'vitest'
import {
  buildSqlLspWebSocketUrl,
  createMonacoSqlLspSession,
  getSqlLspConnectionContextSignature,
  isSqlLspEnabled
} from '@/composables/useMonacoSqlLspProviders'

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
        database: ' db1 ',
        dialect: ' pgsql '
      })
    ).toBe('conn_1::db1::pgsql')

    expect(
      getSqlLspConnectionContextSignature({
        connectionId: 'conn_1',
        database: 'db1'
      })
    ).toBe('conn_1::db1::')
  })
})

describe('createMonacoSqlLspSession', () => {
  it('ignores stale startup errors after session dispose', async () => {
    class FailingWebSocket extends EventTarget {
      static readonly OPEN = 1
      static readonly CLOSED = 3

      readyState = 0

      constructor(_url: string) {
        super()
        setTimeout(() => {
          this.readyState = FailingWebSocket.CLOSED
          this.dispatchEvent(new CloseEvent('close', { code: 1006 }))
        }, 0)
      }

      send(_data: string) {}

      close() {
        this.readyState = FailingWebSocket.CLOSED
      }
    }

    vi.stubGlobal('WebSocket', FailingWebSocket as unknown as typeof WebSocket)

    const onError = vi.fn()
    const model = {
      uri: {
        toString: () => 'inmemory://sql/test'
      },
      onDidChangeContent: () => ({ dispose: () => {} }),
      getValue: () => ''
    }
    const editor = {
      getModel: () => model
    }
    const monaco = {
      editor: {
        setModelMarkers: () => {}
      },
      languages: {
        registerCompletionItemProvider: () => ({ dispose: () => {} }),
        registerHoverProvider: () => ({ dispose: () => {} }),
        CompletionItemInsertTextRule: {
          InsertAsSnippet: 1
        },
        CompletionItemKind: {
          Text: 0
        }
      },
      MarkerSeverity: {
        Error: 1,
        Warning: 2,
        Info: 3,
        Hint: 4
      }
    }

    const session = createMonacoSqlLspSession({
      monaco: monaco as never,
      editor: editor as never,
      language: 'sql',
      apiKey: '',
      installId: '',
      onError
    })

    expect(session).not.toBeNull()
    session?.dispose()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(onError).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('does not register providers when disposed before websocket opens', async () => {
    class DelayedOpenWebSocket extends EventTarget {
      static readonly OPEN = 1
      static readonly CLOSED = 3

      readyState = 0

      constructor(_url: string) {
        super()
        setTimeout(() => {
          this.readyState = DelayedOpenWebSocket.OPEN
          this.dispatchEvent(new Event('open'))
        }, 10)
      }

      send(_data: string) {}

      close() {
        this.readyState = DelayedOpenWebSocket.CLOSED
      }
    }

    vi.stubGlobal('WebSocket', DelayedOpenWebSocket as unknown as typeof WebSocket)

    const onError = vi.fn()
    const registerCompletionItemProvider = vi.fn(() => ({ dispose: () => {} }))
    const registerHoverProvider = vi.fn(() => ({ dispose: () => {} }))

    const model = {
      uri: {
        toString: () => 'inmemory://sql/test'
      },
      onDidChangeContent: () => ({ dispose: () => {} }),
      getValue: () => ''
    }
    const editor = {
      getModel: () => model
    }
    const monaco = {
      editor: {
        setModelMarkers: () => {}
      },
      languages: {
        registerCompletionItemProvider,
        registerHoverProvider,
        CompletionItemInsertTextRule: {
          InsertAsSnippet: 1
        },
        CompletionItemKind: {
          Text: 0
        }
      },
      MarkerSeverity: {
        Error: 1,
        Warning: 2,
        Info: 3,
        Hint: 4
      }
    }

    const session = createMonacoSqlLspSession({
      monaco: monaco as never,
      editor: editor as never,
      language: 'sql',
      apiKey: '',
      installId: '',
      onError
    })

    expect(session).not.toBeNull()
    session?.dispose()
    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(registerCompletionItemProvider).not.toHaveBeenCalled()
    expect(registerHoverProvider).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
