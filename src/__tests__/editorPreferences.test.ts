import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorPreferencesStore } from '@/stores/editorPreferences'

function setRuntimeEnv(sqlLspEnabled: string) {
  window.ENV = {
    VITE_PORT: '5173',
    VITE_API_URL: '/api',
    VITE_BACKEND_URL: 'http://127.0.0.1:8020/api/v1',
    VITE_SENTRY_DSN: '',
    VITE_SQL_LSP_ENABLED: sqlLspEnabled
  }
}

describe('editorPreferences sql lsp state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setRuntimeEnv('false')
  })

  it('uses runtime env default at store creation', () => {
    setRuntimeEnv('true')
    const store = useEditorPreferencesStore()
    expect(store.sqlLspEnabled).toBe(true)
  })

  it('does not persist lsp mode between store instances', () => {
    setRuntimeEnv('false')
    const firstStore = useEditorPreferencesStore()
    expect(firstStore.sqlLspEnabled).toBe(false)

    setActivePinia(createPinia())
    setRuntimeEnv('true')
    const secondStore = useEditorPreferencesStore()
    expect(secondStore.sqlLspEnabled).toBe(true)
  })
})
