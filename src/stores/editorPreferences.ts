import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isSqlLspEnabled } from '@/composables/useMonacoSqlLspProviders'

export const useEditorPreferencesStore = defineStore('editorPreferences', () => {
  const sqlLspEnabled = ref(isSqlLspEnabled())

  return {
    sqlLspEnabled
  }
})
