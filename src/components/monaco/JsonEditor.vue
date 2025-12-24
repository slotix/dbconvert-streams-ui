<!-- Editable JSON editor with schema validation, formatting, and error highlighting -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import MonacoEditor from './MonacoEditor.vue'

import type * as MonacoTypes from 'monaco-editor'

type MonacoApi = typeof import('monaco-editor')

interface Props {
  modelValue: string | object
  schema?: object
  height?: string
  placeholder?: string
  showFormatButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  schema: undefined,
  height: '400px',
  placeholder: '',
  showFormatButton: true
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'valid', isValid: boolean): void
  (e: 'format'): void
}>()

const editorRef = ref<InstanceType<typeof MonacoEditor>>()
const localValue = ref('')

// Convert initial value to JSON string
const initializeValue = () => {
  if (typeof props.modelValue === 'string') {
    localValue.value = props.modelValue
  } else {
    localValue.value = JSON.stringify(props.modelValue, null, 2)
  }
}

// Initialize on mount
initializeValue()

// Watch for external changes
watch(
  () => props.modelValue,
  () => {
    initializeValue()
  }
)

// Emit changes to parent
watch(localValue, (newValue) => {
  emit('update:modelValue', newValue)

  // Validate JSON
  try {
    JSON.parse(newValue)
    emit('valid', true)
  } catch {
    emit('valid', false)
  }
})

// Monaco editor options for editable JSON
const editorOptions = computed<MonacoTypes.editor.IEditorOptions>(() => ({
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
  formatOnType: false, // Disable auto-format on type for JSON
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always'
}))

const handleEditorMount = (editor: MonacoTypes.editor.IStandaloneCodeEditor, monaco: MonacoApi) => {
  // Configure JSON language options with schema if provided
  if (props.schema) {
    type JsonDiagnosticsOptions = {
      validate: boolean
      schemas: Array<{
        uri: string
        fileMatch: string[]
        schema: object
      }>
    }

    type JsonDefaults = {
      setDiagnosticsOptions: (options: JsonDiagnosticsOptions) => void
    }

    const jsonDefaults = (
      monaco.languages as unknown as {
        json?: {
          jsonDefaults?: {
            setDiagnosticsOptions?: JsonDefaults['setDiagnosticsOptions']
          }
        }
      }
    ).json?.jsonDefaults

    const setDiagnosticsOptions = jsonDefaults?.setDiagnosticsOptions
    if (typeof setDiagnosticsOptions === 'function') {
      setDiagnosticsOptions({
        validate: true,
        schemas: [
          {
            uri: 'http://internal/schema.json',
            fileMatch: ['*'],
            schema: props.schema
          }
        ]
      })
    } else {
      // Monaco JSON language support may not be loaded in minimal bundles
      console.warn('Monaco JSON diagnostics API is not available')
    }
  }

  // Add keyboard shortcut for format (Ctrl+Shift+F)
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
    formatJson()
  })

  // Format on mount
  setTimeout(() => {
    editor.getAction('editor.action.formatDocument')?.run()
  }, 100)
}

const formatJson = () => {
  const editor = editorRef.value?.editor
  if (editor) {
    editor.getAction('editor.action.formatDocument')?.run()
    emit('format')
  }
}

// Expose methods for parent components
defineExpose({
  formatJson
})
</script>

<template>
  <div
    class="rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden focus-within:ring-2 focus-within:ring-slate-600 dark:focus-within:ring-emerald-400 focus-within:border-transparent"
  >
    <MonacoEditor
      ref="editorRef"
      v-model="localValue"
      language="json"
      :height="height"
      :read-only="false"
      :options="editorOptions"
      @mount="handleEditorMount"
    />
  </div>
</template>
