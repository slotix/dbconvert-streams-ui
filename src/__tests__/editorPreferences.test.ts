import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorPreferencesStore } from '@/stores/editorPreferences'
import { STORAGE_KEYS } from '@/constants/storageKeys'

describe('editorPreferences sql lsp toggle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.removeItem(STORAGE_KEYS.SQL_EDITOR_LSP_ENABLED)
    window.ENV = {
      VITE_PORT: '5173',
      VITE_API_URL: '/api',
      VITE_BACKEND_URL: 'http://127.0.0.1:8020/api/v1',
      VITE_SENTRY_DSN: '',
      VITE_SQL_LSP_ENABLED: 'false'
    }
  })

  it('uses runtime env default when no persisted override exists', () => {
    window.ENV.VITE_SQL_LSP_ENABLED = 'true'

    const store = useEditorPreferencesStore()

    expect(store.sqlLspEnabled).toBe(true)
    expect(store.sqlIntelligenceMode).toBe('lsp')
    expect(store.hasCustomSqlLspSetting).toBe(false)
  })

  it('prefers persisted value over runtime env default', () => {
    localStorage.setItem(STORAGE_KEYS.SQL_EDITOR_LSP_ENABLED, JSON.stringify(false))
    window.ENV.VITE_SQL_LSP_ENABLED = 'true'

    const store = useEditorPreferencesStore()

    expect(store.sqlLspEnabled).toBe(false)
    expect(store.sqlIntelligenceMode).toBe('legacy')
    expect(store.hasCustomSqlLspSetting).toBe(true)
  })

  it('persists updates and can reset back to env default', () => {
    const store = useEditorPreferencesStore()

    store.setSqlLspEnabled(true)
    expect(store.sqlLspEnabled).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.SQL_EDITOR_LSP_ENABLED)).toBe('true')

    window.ENV.VITE_SQL_LSP_ENABLED = 'false'
    store.resetSqlLspToDefault()

    expect(store.sqlLspEnabled).toBe(false)
    expect(store.hasCustomSqlLspSetting).toBe(false)
    expect(localStorage.getItem(STORAGE_KEYS.SQL_EDITOR_LSP_ENABLED)).toBeNull()
  })
})
