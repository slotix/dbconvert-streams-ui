import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  STORAGE_KEYS,
  getStorageValue,
  removeStorageValue,
  setStorageValue
} from '@/constants/storageKeys'
import { isSqlLspEnabled } from '@/composables/useMonacoSqlLspProviders'

type SqlIntelligenceMode = 'lsp' | 'legacy'

export const useEditorPreferencesStore = defineStore('editorPreferences', () => {
  const storedSqlLspEnabled = getStorageValue<boolean | null>(
    STORAGE_KEYS.SQL_EDITOR_LSP_ENABLED,
    null
  )
  const sqlLspEnabled = ref(storedSqlLspEnabled === null ? isSqlLspEnabled() : storedSqlLspEnabled)
  const hasCustomSqlLspSetting = ref(storedSqlLspEnabled !== null)

  const sqlIntelligenceMode = computed<SqlIntelligenceMode>(() =>
    sqlLspEnabled.value ? 'lsp' : 'legacy'
  )

  function setSqlLspEnabled(enabled: boolean): void {
    sqlLspEnabled.value = enabled
    hasCustomSqlLspSetting.value = true
    setStorageValue(STORAGE_KEYS.SQL_EDITOR_LSP_ENABLED, enabled)
  }

  function toggleSqlLspEnabled(): void {
    setSqlLspEnabled(!sqlLspEnabled.value)
  }

  function resetSqlLspToDefault(): void {
    hasCustomSqlLspSetting.value = false
    removeStorageValue(STORAGE_KEYS.SQL_EDITOR_LSP_ENABLED)
    sqlLspEnabled.value = isSqlLspEnabled()
  }

  return {
    sqlLspEnabled,
    sqlIntelligenceMode,
    hasCustomSqlLspSetting,
    setSqlLspEnabled,
    toggleSqlLspEnabled,
    resetSqlLspToDefault
  }
})
