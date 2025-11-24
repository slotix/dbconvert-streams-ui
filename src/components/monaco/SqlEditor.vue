<!-- Editable SQL editor with autocomplete, formatting, and validation -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import MonacoEditor from './MonacoEditor.vue'

interface Props {
  modelValue: string
  dialect?: string
  height?: string
  placeholder?: string
  showFormatButton?: boolean
  tableSuggestions?: string[]
  columnSuggestions?: Record<string, string[]>
}

const props = withDefaults(defineProps<Props>(), {
  dialect: 'sql',
  height: '200px',
  placeholder: '',
  showFormatButton: false,
  tableSuggestions: () => [],
  columnSuggestions: () => ({})
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'execute'): void
  (e: 'format'): void
}>()

const editorRef = ref<InstanceType<typeof MonacoEditor>>()
const localValue = ref(props.modelValue)

// Sync local value with prop changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== localValue.value) {
      localValue.value = newValue
    }
  }
)

// Emit changes to parent
watch(localValue, (newValue) => {
  emit('update:modelValue', newValue)
})

// Determine Monaco language based on dialect
const monacoLanguage = computed(() => {
  const dialect = props.dialect.toLowerCase()
  if (dialect.includes('mysql')) return 'mysql'
  if (dialect.includes('pgsql') || dialect.includes('postgres')) return 'pgsql'
  if (dialect.includes('mssql') || dialect.includes('sqlserver')) return 'sql'
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
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  tabCompletion: 'on',
  formatOnPaste: true,
  formatOnType: true
}))

const handleEditorMount = (editor: any, monaco: any) => {
  // Register autocomplete provider if suggestions are provided
  if (props.tableSuggestions.length > 0 || Object.keys(props.columnSuggestions).length > 0) {
    registerCompletionProvider(monaco, monacoLanguage.value)
  }

  // Add keyboard shortcut for execute (Ctrl+Enter)
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    emit('execute')
  })

  // Add keyboard shortcut for format (Ctrl+Shift+F)
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
    formatQuery()
  })
}

const registerCompletionProvider = (monaco: any, language: string) => {
  monaco.languages.registerCompletionItemProvider(language, {
    provideCompletionItems: (model: any, position: any) => {
      const suggestions: any[] = []

      // Add table suggestions
      props.tableSuggestions.forEach((table) => {
        suggestions.push({
          label: table,
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: table,
          detail: `Table: ${table}`
        })
      })

      // Add column suggestions for each table
      Object.entries(props.columnSuggestions).forEach(([table, columns]) => {
        columns.forEach((column) => {
          suggestions.push({
            label: `${table}.${column}`,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: column,
            detail: `Column from ${table}`
          })
        })
      })

      return { suggestions }
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
