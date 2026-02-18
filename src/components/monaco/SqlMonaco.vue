<!-- Shared SQL Monaco editor for read-only and editable modes -->
<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import CopyButton from '@/components/common/CopyButton.vue'
import type { SchemaContext } from '@/types/sqlSchemaContext'
import {
  createMonacoSqlLspSession,
  getSqlLspConnectionContextSignature,
  type MonacoSqlLspSession,
  type SqlLspConnectionContext
} from '@/composables/useMonacoSqlLspProviders'
import { useCommonStore } from '@/stores/common'
import { useEditorPreferencesStore } from '@/stores/editorPreferences'
import { getOrCreateInstallId } from '@/utils/installId'

import type * as MonacoTypes from 'monaco-editor'

type MonacoApi = typeof import('monaco-editor')

interface Props {
  modelValue?: string
  dialect?: string
  height?: string
  readOnly?: boolean
  compact?: boolean
  showHeader?: boolean
  title?: string
  index?: number | string
  autoResize?: boolean
  minHeight?: number
  maxHeight?: number
  showCopy?: boolean
  formatOnMount?: boolean
  enableSqlProviders?: boolean
  schemaContext?: SchemaContext
  lspContext?: SqlLspConnectionContext
  enableExecute?: boolean
  enableFormatAction?: boolean
  fillParent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  dialect: 'sql',
  height: '200px',
  readOnly: false,
  compact: false,
  showHeader: false,
  title: 'SQL',
  autoResize: false,
  minHeight: 96,
  maxHeight: 480,
  showCopy: true,
  formatOnMount: false,
  enableSqlProviders: false,
  enableExecute: false,
  enableFormatAction: false,
  fillParent: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'execute', selectedSql?: string): void
  (e: 'selection-change', hasSelection: boolean): void
  (e: 'format'): void
  (e: 'mount', editor: MonacoTypes.editor.IStandaloneCodeEditor, monaco: MonacoApi): void
}>()

const editorRef = ref<InstanceType<typeof MonacoEditor>>()
const editorHeight = ref(props.height)
const localValue = ref(props.modelValue || '')
const editorInstance = ref<MonacoTypes.editor.IStandaloneCodeEditor>()
const monacoInstance = ref<MonacoApi>()
const commonStore = useCommonStore()
const editorPreferencesStore = useEditorPreferencesStore()
let cachedSelectionRange: MonacoTypes.IRange | null = null
let selectionEmitRafId: number | null = null
let lastSelectionState: boolean | null = null
let lspSession: MonacoSqlLspSession | null = null
let lspUnavailableWarningShown = false
let sqlProviderInitToken = 0
let lastSqlProviderConfigSignature = ''

const disposeSqlProviders = () => {
  sqlProviderInitToken += 1
  lspSession?.dispose()
  lspSession = null
}

const lspContextSignature = computed(() => getSqlLspConnectionContextSignature(props.lspContext))

const initializeSqlProviders = (
  editor: MonacoTypes.editor.IStandaloneCodeEditor,
  monaco: MonacoApi
) => {
  const usesLsp =
    props.enableSqlProviders &&
    editorPreferencesStore.sqlLspEnabled &&
    Boolean(lspContextSignature.value)
  const nextConfigSignature = usesLsp
    ? `lsp:${lspContextSignature.value}`
    : `disabled:${props.enableSqlProviders}:${editorPreferencesStore.sqlLspEnabled}`

  if (nextConfigSignature === lastSqlProviderConfigSignature) {
    if (usesLsp && lspSession) {
      return
    }
    if (!usesLsp && !lspSession) {
      return
    }
  }

  disposeSqlProviders()
  lastSqlProviderConfigSignature = nextConfigSignature

  if (!usesLsp) {
    return
  }

  const apiKey = commonStore.apiKey || commonStore.userApiKey || ''
  const installId = getOrCreateInstallId()
  const initToken = ++sqlProviderInitToken
  lspSession = createMonacoSqlLspSession({
    monaco,
    editor,
    language: 'sql',
    apiKey,
    installId,
    connectionContext: props.lspContext,
    onError: (error) => {
      lspSession = null
      if (initToken !== sqlProviderInitToken) {
        return
      }
      if (!editorPreferencesStore.sqlLspEnabled) {
        return
      }
      console.warn('SQL LSP unavailable:', error)
      if (!lspUnavailableWarningShown) {
        commonStore.showNotification(
          'SQL LSP unavailable. Autocomplete is disabled until LSP becomes available.',
          'warning'
        )
        lspUnavailableWarningShown = true
      }
    }
  })
}

watch(
  () => props.height,
  (newHeight) => {
    if (!props.autoResize) {
      editorHeight.value = newHeight
    }
  }
)

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== localValue.value) {
      localValue.value = newValue || ''
      cachedSelectionRange = null
      lastSelectionState = null
    }
  }
)

watch(localValue, (newValue) => {
  if (newValue !== props.modelValue) {
    emit('update:modelValue', newValue)
  }
})

const displayTitle = computed(() => {
  if (props.index) {
    return `${props.title} ${props.index}`
  }
  return props.title || 'SQL'
})

const containerStyle = computed(() => {
  if (props.fillParent) {
    return { height: '100%', display: 'flex', flexDirection: 'column' }
  }
  if (props.autoResize) return {}

  const style: Record<string, string> = { height: props.height }
  if (!props.readOnly) {
    style.minHeight = '300px'
  }
  return style
})

const monacoLanguage = computed(() => {
  if (props.enableSqlProviders) return 'sql'

  const dialect = props.dialect.toLowerCase()
  if (dialect.includes('mysql')) return 'mysql'
  if (dialect.includes('pgsql') || dialect.includes('postgres')) return 'pgsql'
  if (dialect.includes('mssql') || dialect.includes('sqlserver')) return 'sql'
  return 'sql'
})

const editorOptions = computed<MonacoTypes.editor.IEditorOptions>(() => {
  const baseOptions: MonacoTypes.editor.IEditorOptions = {
    readOnly: props.readOnly,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    padding: { top: 12 },
    lineNumbers: 'on',
    glyphMargin: false,
    folding: true,
    lineNumbersMinChars: 3,
    automaticLayout: true
  }

  if (props.readOnly) {
    return {
      ...baseOptions,
      lineDecorationsWidth: 10,
      renderLineHighlight: 'none',
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        alwaysConsumeMouseWheel: false
      },
      wordWrap: props.compact ? 'off' : 'on'
    }
  }

  return {
    ...baseOptions,
    lineDecorationsWidth: 5,
    renderLineHighlight: 'line',
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      useShadows: false
    },
    wordWrap: 'on',
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false
    },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    tabCompletion: 'on',
    snippetSuggestions: 'bottom',
    formatOnPaste: true,
    formatOnType: true,
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showClasses: true,
      showFunctions: true,
      showFields: true
    }
  }
})

const clampHeight = (rawHeight: number, lineHeight = 20, lineCount = 1) => {
  const contentBasedMin = (Math.max(lineCount, 1) + 1) * lineHeight + 12
  const min = Math.max(80, props.minHeight, contentBasedMin)
  const max = Math.max(min, props.maxHeight)
  const clamped = Math.min(max, Math.max(min, Math.round(rawHeight)))
  editorHeight.value = `${clamped}px`
}

const updateAutoHeight = (
  editor: MonacoTypes.editor.IStandaloneCodeEditor,
  monaco: MonacoApi | undefined,
  contentHeight?: number
) => {
  if (!props.autoResize) return

  const model = editor.getModel()
  const editorOptions = monaco?.editor?.EditorOption
  const optionValue = editorOptions ? editor.getOption(editorOptions.lineHeight) : null
  const lineHeight = typeof optionValue === 'number' && optionValue > 0 ? optionValue : 20
  const lineCount = model?.getLineCount() || 1
  const measuredHeight = typeof contentHeight === 'number' ? contentHeight : lineCount * lineHeight

  clampHeight(measuredHeight + 16, lineHeight, lineCount)
  editor.layout()
}

const formatQuery = () => {
  const editor = editorRef.value?.editor
  if (editor) {
    editor.getAction('editor.action.formatDocument')?.run()
    emit('format')
  }
}

const getSelectedSql = () => {
  const editor = editorInstance.value
  if (!editor) return ''

  const selection = editor.getSelection()
  if (!selection || selection.isEmpty()) return ''

  return editor.getModel()?.getValueInRange(selection)?.trim() || ''
}

const setCachedSelectionRange = (selection?: MonacoTypes.Selection | null) => {
  if (!selection) {
    cachedSelectionRange = null
    return false
  }

  cachedSelectionRange = {
    startLineNumber: selection.startLineNumber,
    startColumn: selection.startColumn,
    endLineNumber: selection.endLineNumber,
    endColumn: selection.endColumn
  }
  return !selection.isEmpty()
}

const hasSelection = () => {
  const editor = editorInstance.value
  if (!editor) return false

  const selection = editor.getSelection()
  return Boolean(selection && !selection.isEmpty())
}

const getCachedSelectionRange = () => cachedSelectionRange

const emitSelectionState = () => {
  const selected = hasSelection()
  if (lastSelectionState === selected) return
  lastSelectionState = selected
  emit('selection-change', selected)
}

const scheduleSelectionStateEmit = () => {
  if (typeof window === 'undefined') {
    emitSelectionState()
    return
  }

  if (selectionEmitRafId !== null) {
    window.cancelAnimationFrame(selectionEmitRafId)
  }

  selectionEmitRafId = window.requestAnimationFrame(() => {
    selectionEmitRafId = null
    emitSelectionState()
  })
}

const insertTextAtCursor = (text: string) => {
  const editor = editorInstance.value
  if (!editor || props.readOnly) return

  const liveSelection = editor.getSelection()
  const model = editor.getModel()
  const fallbackRange =
    cachedSelectionRange ||
    (model
      ? {
          startLineNumber: model.getLineCount(),
          startColumn: model.getLineMaxColumn(model.getLineCount()),
          endLineNumber: model.getLineCount(),
          endColumn: model.getLineMaxColumn(model.getLineCount())
        }
      : null)
  const selection = liveSelection || fallbackRange
  if (!selection) return

  editor.executeEdits('sql-monaco-insert', [
    {
      range: selection,
      text,
      forceMoveMarkers: true
    }
  ])

  if (typeof window !== 'undefined') {
    window.requestAnimationFrame(() => editor.focus())
  } else {
    editor.focus()
  }
}

const getSelectedSqlIfAny = () => {
  if (!hasSelection()) return undefined

  const selectedSql = getSelectedSql()
  return selectedSql || undefined
}

const handleEditorMount = (editor: MonacoTypes.editor.IStandaloneCodeEditor, monaco: MonacoApi) => {
  editorInstance.value = editor
  monacoInstance.value = monaco

  initializeSqlProviders(editor, monaco)

  if (props.enableExecute) {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      emit('execute', getSelectedSqlIfAny())
    })
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      emit('execute', getSelectedSqlIfAny())
    })
  }

  editor.onDidChangeCursorSelection((event) => {
    setCachedSelectionRange(event.selection)
    scheduleSelectionStateEmit()
  })
  emitSelectionState()

  if (props.enableFormatAction) {
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

  if (props.formatOnMount) {
    setTimeout(() => {
      editor.getAction('editor.action.formatDocument')?.run()
      if (props.readOnly) {
        ;(document.activeElement as HTMLElement)?.blur()
      }
      if (props.autoResize) {
        updateAutoHeight(editor, monaco)
      }
    }, 50)
  }

  if (props.autoResize) {
    editor.onDidContentSizeChange((event: MonacoTypes.editor.IContentSizeChangedEvent) =>
      updateAutoHeight(editor, monaco, event.contentHeight)
    )
    updateAutoHeight(editor, monaco)
  }

  emit('mount', editor, monaco)
}

watch(
  () => editorPreferencesStore.sqlLspEnabled,
  () => {
    const editor = editorInstance.value
    const monaco = monacoInstance.value
    if (!editor || !monaco || !props.enableSqlProviders) {
      return
    }
    initializeSqlProviders(editor, monaco)
  }
)

watch(lspContextSignature, () => {
  const editor = editorInstance.value
  const monaco = monacoInstance.value
  if (!editor || !monaco || !props.enableSqlProviders || !editorPreferencesStore.sqlLspEnabled) {
    return
  }
  initializeSqlProviders(editor, monaco)
})

onUnmounted(() => {
  disposeSqlProviders()
  if (selectionEmitRafId !== null && typeof window !== 'undefined') {
    window.cancelAnimationFrame(selectionEmitRafId)
    selectionEmitRafId = null
  }
})

defineExpose({
  editor: editorInstance,
  monaco: monacoInstance,
  formatQuery,
  getSelectedSql,
  getCachedSelectionRange,
  hasSelection,
  insertTextAtCursor
})
</script>

<template>
  <div
    :class="[
      'group relative rounded-lg overflow-hidden border',
      props.readOnly
        ? 'border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30'
        : 'border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-slate-600 dark:focus-within:ring-emerald-400 focus-within:border-transparent'
    ]"
    :style="containerStyle"
  >
    <div
      v-if="showHeader"
      class="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
    >
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ displayTitle }}
      </span>
    </div>
    <div :class="['relative bg-white dark:bg-gray-900', props.fillParent ? 'flex-1 min-h-0' : '']">
      <div
        v-if="showCopy"
        class="absolute right-3 top-3 z-10 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
      >
        <CopyButton
          :text="localValue"
          button-class="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-200 bg-white/90 dark:bg-gray-850/90 border border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-sm"
          icon-class="text-gray-500 dark:text-gray-400"
        >
          Copy
        </CopyButton>
      </div>
      <MonacoEditor
        ref="editorRef"
        v-model="localValue"
        :language="monacoLanguage"
        :height="props.fillParent ? '100%' : editorHeight"
        :read-only="props.readOnly"
        :options="editorOptions"
        :fill-parent="props.fillParent"
        @mount="handleEditorMount"
      />
    </div>
  </div>
</template>
