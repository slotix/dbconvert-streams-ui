<template>
  <div
    :class="[
      'relative border codemirror-editor-container',
      props.rounded ? 'rounded-lg' : 'rounded-none',
      isDarkTheme ? 'sql-cm-dark' : 'sql-cm-light',
      props.readOnly
        ? 'border-gray-200 dark:border-gray-700'
        : 'border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-slate-600 dark:focus-within:ring-emerald-400 focus-within:border-transparent'
    ]"
    :style="containerStyle"
  >
    <div ref="editorHost" class="h-full w-full" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useCommonStore } from '@/stores/common'
import {
  getSqlLspConnectionContextSignature,
  type SqlLspConnectionContext
} from '@/composables/useSqlLspProviders'
import { basicSetup } from 'codemirror'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { sql, MySQL, PostgreSQL } from '@codemirror/lang-sql'
import { sqlDarkThemeExtension, sqlLightThemeExtension } from './sqlHighlightStyle'
import { type Diagnostic, setDiagnostics } from '@codemirror/lint'
import {
  autocompletion,
  startCompletion,
  type CompletionContext,
  type CompletionResult
} from '@codemirror/autocomplete'
import {
  buildLspCompletionContext,
  fromLspPosition,
  getCompletionBoost,
  mapCompletionType,
  normalizeCompletionItems,
  toCodeMirrorDiagnostic,
  toLspPosition
} from './sqlCodeMirrorLspUtils'
import {
  getDuckDBReadOptionCompletionRange,
  getDuckDBReadPathCompletionRange,
  getSignatureHelpTriggerCharacter,
  shouldAllowClauseCompletion,
  shouldTriggerClauseCompletion,
  shouldTriggerDuckDBReadArgumentCompletion
} from './sqlCodeMirrorCompletionUtils'
import { useSqlCodeMirrorLspSession } from './useSqlCodeMirrorLspSession'
import { useSqlCodeMirrorTooltips } from './useSqlCodeMirrorTooltips'
import type {
  EditorStateLike,
  JsonRpcNotification,
  LspCompletionItem,
  LspCompletionList,
  LspDiagnostic,
  LspFormattingOptions,
  LspPublishDiagnosticsParams,
  LspTextEdit,
  SqlCodeMirrorSelectionRange
} from './sqlCodeMirrorTypes'

const MAX_COMPLETION_ITEMS = 200
const LSP_TRIGGER_KIND_INVOKED = 1
const LSP_TRIGGER_KIND_TRIGGER_CHARACTER = 2

interface Props {
  modelValue?: string
  dialect?: string
  readOnly?: boolean
  enableExecute?: boolean
  enableFormatAction?: boolean
  fillParent?: boolean
  height?: string
  lspContext?: SqlLspConnectionContext
  enableSqlProviders?: boolean
  rounded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  dialect: 'sql',
  readOnly: false,
  enableExecute: false,
  enableFormatAction: false,
  fillParent: false,
  height: '200px',
  lspContext: undefined,
  enableSqlProviders: true,
  rounded: true
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'execute', selectedSql?: string): void
  (e: 'selection-change', hasSelection: boolean): void
  (e: 'format'): void
}>()

const editorHost = ref<HTMLElement | null>(null)
const editorView = shallowRef<EditorView | null>(null)
const themeStore = useThemeStore()
const commonStore = useCommonStore()

const languageCompartment = new Compartment()
const readOnlyCompartment = new Compartment()
const themeCompartment = new Compartment()
const lspCompartment = new Compartment()
const editorLayout = EditorView.theme({
  '&': { height: '100%' },
  '.cm-scroller': { overflow: 'auto' }
})

let suppressModelSync = false
let cachedSelectionRange: SqlCodeMirrorSelectionRange | null = null
let lastSelectionState: boolean | null = null
let lspUnavailableWarningShown = false
const textDocumentUri = `inmemory://sql/${Date.now()}-${Math.random().toString(36).slice(2)}`

const lspContextSignature = computed(() => getSqlLspConnectionContextSignature(props.lspContext))
const shouldEnableLsp = computed(
  () => props.enableSqlProviders && Boolean(lspContextSignature.value)
)

const containerStyle = computed(() => {
  if (props.fillParent) {
    return { height: '100%' }
  }
  return { height: props.height }
})

const isDarkTheme = computed(() => resolveDarkMode())

function getLanguageExtension() {
  const dialect = props.dialect.toLowerCase()
  if (dialect.includes('mysql')) {
    return sql({ dialect: MySQL })
  }
  if (dialect.includes('pgsql') || dialect.includes('postgres')) {
    return sql({ dialect: PostgreSQL })
  }
  return sql()
}

function resolveDarkMode(): boolean {
  if (themeStore.isDark) {
    return true
  }
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark')
  }
  return false
}

function getThemeExtension(isDark: boolean) {
  return isDark ? sqlDarkThemeExtension : sqlLightThemeExtension
}

function applyLspDiagnostics(diagnostics: LspDiagnostic[]) {
  const view = editorView.value
  if (!view) {
    return
  }

  const mapped = diagnostics
    .map((diagnostic) => toCodeMirrorDiagnostic(view.state, diagnostic))
    .filter((diagnostic): diagnostic is Diagnostic => diagnostic !== null)

  view.dispatch(setDiagnostics(view.state, mapped))
}

function clearLspDiagnostics() {
  applyLspDiagnostics([])
}

function handleLspPublishDiagnostics(params: unknown) {
  const parsed = params as LspPublishDiagnosticsParams
  if (!parsed || parsed.uri !== textDocumentUri) {
    return
  }
  applyLspDiagnostics(Array.isArray(parsed.diagnostics) ? parsed.diagnostics : [])
}

function handleLspNotification(notification: JsonRpcNotification) {
  switch (notification.method) {
    case 'textDocument/publishDiagnostics':
      handleLspPublishDiagnostics(notification.params)
      break
    default:
      break
  }
}

function reportLspUnavailable(error: unknown) {
  if (!shouldEnableLsp.value) {
    return
  }
  if (!lspUnavailableWarningShown) {
    commonStore.showNotification(
      'SQL LSP unavailable. Autocomplete and hover are disabled until LSP becomes available.',
      'warning'
    )
    lspUnavailableWarningShown = true
  }
  console.warn('SQL LSP unavailable:', error)
}

const {
  lspReady,
  sendLspRequest,
  scheduleDidChangeNotification,
  flushPendingDidChangeNotification,
  connectLspSession,
  disconnectLspSession
} = useSqlCodeMirrorLspSession({
  shouldEnableLsp,
  connectionContext: computed(() => props.lspContext),
  textDocumentUri,
  getDocumentText: () => editorView.value?.state.doc.toString() ?? props.modelValue ?? '',
  getApiKey: () => commonStore.apiKey || commonStore.userApiKey || '',
  onNotification: handleLspNotification,
  onUnavailable: reportLspUnavailable,
  onSessionDisposed: clearLspDiagnostics
})

async function goToDefinitionAtPosition(pos: number) {
  const view = editorView.value
  if (!view || !shouldEnableLsp.value || !lspReady.value) {
    return false
  }

  flushPendingDidChangeNotification()
  const response = await sendLspRequest('textDocument/definition', {
    textDocument: { uri: textDocumentUri },
    position: toLspPosition(view.state, pos)
  }).catch(() => null)

  const target = normalizeDefinitionTarget(response)
  if (!target?.range?.start || target.uri !== textDocumentUri) {
    return false
  }

  const cursorPos = fromLspPosition(view.state, target.range.start)
  view.dispatch({
    selection: { anchor: cursorPos },
    effects: EditorView.scrollIntoView(cursorPos, { y: 'center' })
  })
  view.focus()
  hideHoverTooltip()
  hideSignatureTooltip()
  return true
}

const {
  hideHoverTooltip,
  hideSignatureTooltip,
  requestSignatureHelpAtPosition,
  attachHoverDomListeners,
  detachHoverDomListeners,
  normalizeDefinitionTarget,
  dispose: disposeTooltips
} = useSqlCodeMirrorTooltips({
  editorHost,
  shouldEnableLsp,
  lspReady,
  readOnly: computed(() => props.readOnly),
  textDocumentUri,
  sendLspRequest,
  flushPendingDidChangeNotification,
  onGoToDefinitionAtPosition: (pos) => {
    void goToDefinitionAtPosition(pos)
  }
})

function getHasSelection(state: EditorStateLike): boolean {
  return !state.selection.main.empty
}

function toEditorSelectionRange(state: EditorStateLike): SqlCodeMirrorSelectionRange {
  const selection = state.selection.main
  const startLine = state.doc.lineAt(selection.from)
  const endLine = state.doc.lineAt(selection.to)
  return {
    startLineNumber: startLine.number,
    startColumn: selection.from - startLine.from + 1,
    endLineNumber: endLine.number,
    endColumn: selection.to - endLine.from + 1
  }
}

function emitSelectionState(state: EditorStateLike) {
  const selected = getHasSelection(state)
  if (selected) {
    cachedSelectionRange = toEditorSelectionRange(state)
  } else {
    cachedSelectionRange = null
  }
  if (lastSelectionState === selected) {
    return
  }
  lastSelectionState = selected
  emit('selection-change', selected)
}

function getSelectedSql(): string {
  const view = editorView.value
  if (!view) {
    return ''
  }
  const selection = view.state.selection.main
  if (selection.empty) {
    return ''
  }
  return view.state.doc.sliceString(selection.from, selection.to).trim()
}

function getSelectedSqlIfAny() {
  const selected = getSelectedSql()
  return selected || undefined
}

function handleExecuteShortcut() {
  if (!props.enableExecute) {
    return false
  }
  emit('execute', getSelectedSqlIfAny())
  return true
}

function handleClearSelectionShortcut(view: EditorView) {
  const selection = view.state.selection.main
  if (selection.empty) {
    return false
  }

  view.dispatch({ selection: { anchor: selection.to } })
  return true
}

function handleFormatShortcut() {
  if (!props.enableFormatAction) {
    return false
  }
  emit('format')
  return true
}

function normalizeLspTextEdits(
  view: EditorView,
  edits: LspTextEdit[]
): Array<{ from: number; to: number; insert: string }> {
  const changes = edits
    .map((edit) => {
      if (!edit.range?.start || !edit.range?.end) {
        return null
      }
      const from = fromLspPosition(view.state, edit.range.start)
      const to = Math.max(from, fromLspPosition(view.state, edit.range.end))
      return {
        from,
        to,
        insert: edit.newText ?? ''
      }
    })
    .filter((change): change is { from: number; to: number; insert: string } => change !== null)

  changes.sort((a, b) => (a.from === b.from ? b.to - a.to : b.from - a.from))
  return changes
}

async function formatDocumentWithLsp() {
  const view = editorView.value
  if (!view || !shouldEnableLsp.value || !lspReady.value || props.readOnly) {
    return false
  }

  flushPendingDidChangeNotification()
  const options: LspFormattingOptions = {
    tabSize: 2,
    insertSpaces: true,
    trimTrailingWhitespace: true
  }

  const response = await sendLspRequest('textDocument/formatting', {
    textDocument: { uri: textDocumentUri },
    options
  }).catch(() => null)

  if (!Array.isArray(response)) {
    return false
  }
  const edits = response as LspTextEdit[]
  if (!edits.length) {
    return true
  }

  const changes = normalizeLspTextEdits(view, edits)
  if (!changes.length) {
    return false
  }

  view.dispatch({ changes })
  hideHoverTooltip()
  hideSignatureTooltip()
  return true
}

function handleDefinitionShortcut() {
  const view = editorView.value
  if (!view || !shouldEnableLsp.value || !lspReady.value) {
    return false
  }
  void goToDefinitionAtPosition(view.state.selection.main.to)
  return true
}

function handleSignatureHelpShortcut() {
  const view = editorView.value
  if (!view) {
    return false
  }
  void requestSignatureHelpAtPosition(view, view.state.selection.main.to, undefined, true)
  return true
}

function handleLspFormatShortcut() {
  if (!props.enableFormatAction) {
    return false
  }
  void formatDocumentWithLsp()
  return true
}

async function provideLspCompletions(context: CompletionContext): Promise<CompletionResult | null> {
  if (!shouldEnableLsp.value) {
    return null
  }

  const prefix = context.matchBefore(/[\w$]+/)
  const prevChar = context.pos > 0 ? context.state.sliceDoc(context.pos - 1, context.pos) : ''
  const duckdbPathRange = getDuckDBReadPathCompletionRange(context.state, context.pos)
  const duckdbOptionRange = getDuckDBReadOptionCompletionRange(context.state, context.pos)
  const hasWordPrefix = Boolean(prefix?.text?.length)
  const allowBroadCompletion = prevChar === '.' || prevChar === '"' || prevChar === '`'
  const allowDuckDBPathCompletion = Boolean(duckdbPathRange)
  const allowDuckDBOptionCompletion = Boolean(duckdbOptionRange)
  const allowClauseCompletion =
    /\s/.test(prevChar) && shouldAllowClauseCompletion(context.state, context.pos)
  const allowExplicitCompletion = context.explicit
  if (
    !hasWordPrefix &&
    !allowBroadCompletion &&
    !allowDuckDBPathCompletion &&
    !allowDuckDBOptionCompletion &&
    !allowClauseCompletion &&
    !allowExplicitCompletion
  ) {
    return null
  }

  if (!lspReady.value) {
    return null
  }

  flushPendingDidChangeNotification()

  const lspCompletionContext = buildLspCompletionContext(
    prevChar,
    allowExplicitCompletion,
    LSP_TRIGGER_KIND_INVOKED,
    LSP_TRIGGER_KIND_TRIGGER_CHARACTER
  )
  const response = await sendLspRequest('textDocument/completion', {
    textDocument: { uri: textDocumentUri },
    position: toLspPosition(context.state, context.pos),
    context: lspCompletionContext
  }).catch(() => null)

  const items = normalizeCompletionItems(response as LspCompletionItem[] | LspCompletionList | null)
  if (!items.length) {
    return null
  }

  const completionRange = duckdbOptionRange ?? duckdbPathRange
  const prefixText = completionRange
    ? context.state.sliceDoc(completionRange.from, completionRange.to)
    : prefix?.text || ''

  return {
    from: completionRange?.from ?? prefix?.from ?? context.pos,
    options: items.slice(0, MAX_COMPLETION_ITEMS).map((item) => {
      const insertText = item.textEdit?.newText || item.insertText || item.label || ''
      const label = item.label || insertText
      return {
        label,
        detail: item.detail,
        type: mapCompletionType(item.kind),
        apply: insertText,
        boost: getCompletionBoost(label, prefixText)
      }
    }),
    filter: Boolean(prefixText)
  }
}

function getLspAutocompletionExtension() {
  if (!shouldEnableLsp.value) {
    return autocompletion({
      override: [],
      activateOnTyping: false
    })
  }
  return autocompletion({
    override: [provideLspCompletions],
    activateOnTyping: true,
    maxRenderedOptions: 80,
    closeOnBlur: true
  })
}

function getLspEditorExtensions() {
  return [getLspAutocompletionExtension()]
}

function refreshLspCompartment() {
  const view = editorView.value
  if (!view) {
    return
  }
  view.dispatch({
    effects: lspCompartment.reconfigure(getLspEditorExtensions())
  })
}

function createEditorState() {
  const keymaps = keymap.of([
    { key: 'Escape', run: handleClearSelectionShortcut },
    { key: 'F12', run: handleDefinitionShortcut },
    { key: 'Mod-Enter', run: handleExecuteShortcut },
    { key: 'Shift-Enter', run: handleExecuteShortcut },
    { key: 'Shift-Alt-f', run: handleFormatShortcut },
    { key: 'Mod-Shift-f', run: handleFormatShortcut },
    { key: 'Mod-Alt-f', run: handleLspFormatShortcut },
    { key: 'Mod-Shift-Space', run: handleSignatureHelpShortcut },
    {
      key: 'Mod-Space',
      run: (view) => {
        startCompletion(view)
        return true
      }
    }
  ])

  return EditorState.create({
    doc: props.modelValue || '',
    extensions: [
      basicSetup,
      editorLayout,
      keymaps,
      languageCompartment.of(getLanguageExtension()),
      readOnlyCompartment.of(EditorState.readOnly.of(props.readOnly)),
      themeCompartment.of(getThemeExtension(resolveDarkMode())),
      lspCompartment.of(getLspEditorExtensions()),
      EditorView.updateListener.of((update) => {
        const signatureTrigger = getSignatureHelpTriggerCharacter(update)
        const shouldTriggerCompletion = shouldTriggerClauseCompletion(update, {
          shouldEnableLsp: shouldEnableLsp.value,
          lspReady: lspReady.value,
          readOnly: props.readOnly
        })
        const shouldTriggerReadArgCompletion = shouldTriggerDuckDBReadArgumentCompletion(update, {
          shouldEnableLsp: shouldEnableLsp.value,
          lspReady: lspReady.value,
          readOnly: props.readOnly
        })

        if (update.docChanged && !suppressModelSync) {
          emit('update:modelValue', update.state.doc.toString())
        }
        if (update.selectionSet) {
          hideHoverTooltip()
          hideSignatureTooltip()
        }
        if (update.docChanged) {
          scheduleDidChangeNotification(update.state.doc.toString())
          hideHoverTooltip()
          if (!signatureTrigger) {
            hideSignatureTooltip()
          }
        }
        if (signatureTrigger) {
          void requestSignatureHelpAtPosition(
            update.view,
            update.state.selection.main.to,
            signatureTrigger
          )
        }
        if (shouldTriggerCompletion || shouldTriggerReadArgCompletion) {
          startCompletion(update.view)
        }
        if (update.selectionSet || update.docChanged) {
          emitSelectionState(update.state)
        }
      })
    ]
  })
}

function recreateEditor() {
  if (!editorHost.value) {
    return
  }

  detachHoverDomListeners(editorView.value)
  editorView.value?.destroy()
  const view = new EditorView({
    state: createEditorState(),
    parent: editorHost.value
  })
  editorView.value = view
  attachHoverDomListeners(view)

  emitSelectionState(view.state)
}

watch(
  () => props.modelValue,
  (newValue) => {
    const view = editorView.value
    if (!view) {
      return
    }
    const current = view.state.doc.toString()
    const nextValue = newValue || ''
    if (current === nextValue) {
      return
    }

    suppressModelSync = true
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: nextValue
      }
    })
    suppressModelSync = false
    emitSelectionState(view.state)
  }
)

watch(
  () => props.dialect,
  () => {
    const view = editorView.value
    if (!view) {
      return
    }
    view.dispatch({
      effects: languageCompartment.reconfigure(getLanguageExtension())
    })
  }
)

watch(
  () => props.readOnly,
  (value) => {
    const view = editorView.value
    if (!view) {
      return
    }
    view.dispatch({
      effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(value))
    })
  }
)

watch(
  () => themeStore.isDark,
  (isDark) => {
    const view = editorView.value
    if (!view) {
      return
    }

    view.dispatch({
      effects: themeCompartment.reconfigure(getThemeExtension(isDark))
    })
  }
)

watch(
  () => [
    shouldEnableLsp.value,
    lspContextSignature.value,
    commonStore.apiKey,
    commonStore.userApiKey
  ],
  () => {
    connectLspSession()
    refreshLspCompartment()
  }
)

watch(lspReady, (ready) => {
  if (ready) {
    lspUnavailableWarningShown = false
    refreshLspCompartment()
  } else {
    hideHoverTooltip()
    hideSignatureTooltip()
  }
})

onMounted(() => {
  recreateEditor()
  connectLspSession()
  refreshLspCompartment()
})

onBeforeUnmount(() => {
  disconnectLspSession()
  disposeTooltips(editorView.value)
  editorView.value?.destroy()
  editorView.value = null
})

function getCachedSelectionRange() {
  return cachedSelectionRange
}

defineExpose({
  getSelectedSql,
  getCachedSelectionRange,
  formatDocumentWithLsp,
  goToDefinitionAtPosition
})
</script>

<style scoped src="./sqlCodeMirror.css"></style>
