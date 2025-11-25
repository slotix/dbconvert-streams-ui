<!-- Editable SQL editor with autocomplete, formatting, and validation -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import { useMonacoSqlProviders, type SchemaContext } from '@/composables/useMonacoSqlProviders'

interface Props {
  modelValue: string
  dialect?: string
  height?: string
  placeholder?: string
  showFormatButton?: boolean
  schemaContext?: SchemaContext
}

const props = withDefaults(defineProps<Props>(), {
  dialect: 'sql',
  height: '200px',
  placeholder: '',
  showFormatButton: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'execute'): void
  (e: 'format'): void
}>()

const editorRef = ref<InstanceType<typeof MonacoEditor>>()
const localValue = ref(props.modelValue)
const monacoInstance = ref<any>()

// Sync local value with prop changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== localValue.value) {
      localValue.value = newValue
    }
  }
)

// Re-register providers when schema context changes
watch(
  () => props.schemaContext,
  (newSchemaContext) => {
    if (monacoInstance.value) {
      console.log('Schema context updated, re-registering providers:', {
        tables: newSchemaContext?.tables?.length || 0,
        dialect: sqlDialect.value
      })
      useMonacoSqlProviders(
        monacoInstance.value,
        monacoLanguage,
        sqlDialect.value,
        newSchemaContext
      )
    }
  },
  { deep: true }
)

// Emit changes to parent
watch(localValue, (newValue) => {
  emit('update:modelValue', newValue)
})

// Monaco only supports 'sql' language - dialect is used for SQL-specific features
const monacoLanguage = 'sql'

// Determine SQL dialect for autocomplete features
const sqlDialect = computed<'mysql' | 'pgsql' | 'sql'>(() => {
  const dialect = props.dialect.toLowerCase()
  if (dialect.includes('mysql')) return 'mysql'
  if (dialect.includes('pgsql') || dialect.includes('postgres')) return 'pgsql'
  return 'sql'
})

// Monaco editor options for editable SQL
const editorOptions = computed<Record<string, any>>(() => ({
  readOnly: false,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 14,
  lineNumbers: 'on',
  glyphMargin: false,
  folding: true,
  lineDecorationsWidth: 5,
  lineNumbersMinChars: 3,
  renderLineHighlight: 'line',
  scrollbar: {
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
    useShadows: false
  },
  wordWrap: 'on',
  contextmenu: true,
  quickSuggestions: {
    other: true,
    comments: false,
    strings: false
  },
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  tabCompletion: 'on',
  formatOnPaste: true,
  formatOnType: true,
  suggest: {
    showKeywords: true,
    showSnippets: true,
    showClasses: true,
    showFunctions: true,
    showFields: true
  }
}))

const handleEditorMount = (editor: any, monaco: any) => {
  // Store monaco instance for later use (when schema updates)
  monacoInstance.value = monaco

  // Register Monaco SQL providers (autocomplete, hover, validation)
  // Always use 'sql' as language, pass dialect for SQL-specific features
  useMonacoSqlProviders(monaco, monacoLanguage, sqlDialect.value, props.schemaContext)

  // Add keyboard shortcut for execute (Ctrl+Enter)
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    emit('execute')
  })

  // Add keyboard shortcut for format (Shift+Alt+F - Monaco's default)
  // Note: Ctrl+Shift+F conflicts with browser search
  editor.addAction({
    id: 'format-sql',
    label: 'Format SQL',
    keybindings: [
      monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF
    ],
    run: () => {
      formatQuery()
    }
  })
}

const formatQuery = () => {
  const editor = editorRef.value?.editor
  if (editor) {
    editor.getAction('editor.action.formatDocument')?.run()
    emit('format')
  }
}

// Expose methods for parent components
defineExpose({
  formatQuery
})
</script>

<template>
  <div
    class="rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden focus-within:ring-2 focus-within:ring-slate-600 dark:focus-within:ring-emerald-400 focus-within:border-transparent"
    :style="{ height: height }"
  >
    <MonacoEditor
      ref="editorRef"
      v-model="localValue"
      :language="monacoLanguage"
      :height="height"
      :read-only="false"
      :options="editorOptions"
      @mount="handleEditorMount"
    />
  </div>
</template>
