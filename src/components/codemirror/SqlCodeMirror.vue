<template>
  <div
    :class="[
      'relative rounded-lg overflow-hidden border',
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useCommonStore } from '@/stores/common'
import { useEditorPreferencesStore } from '@/stores/editorPreferences'
import {
  buildSqlLspWebSocketUrl,
  getSqlLspConnectionContextSignature,
  type SqlLspConnectionContext
} from '@/composables/useSqlLspProviders'
import { getBackendUrl } from '@/utils/environment'
import { getOrCreateInstallId } from '@/utils/installId'
import { basicSetup } from 'codemirror'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { sql, MySQL, PostgreSQL } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import {
  autocompletion,
  startCompletion,
  type CompletionContext,
  type CompletionResult
} from '@codemirror/autocomplete'

const REQUEST_TIMEOUT_MS = 8000
const MAX_COMPLETION_ITEMS = 200
const DID_CHANGE_DEBOUNCE_MS = 150
const MAX_LSP_MESSAGE_CHARS = 250_000
const LSP_TRIGGER_KIND_INVOKED = 1
const LSP_TRIGGER_KIND_TRIGGER_CHARACTER = 2

interface LspPosition {
  line: number
  character: number
}

interface LspCompletionItem {
  label?: string
  kind?: number
  detail?: string
  insertText?: string
  textEdit?: {
    newText?: string
  }
}

interface LspCompletionList {
  items?: LspCompletionItem[]
}

interface LspCompletionContext {
  triggerKind: number
  triggerCharacter?: string
}

interface JsonRpcResponse {
  id?: number | string
  result?: unknown
  error?: {
    code: number
    message: string
  }
}

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

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
  enableSqlProviders: true
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'execute', selectedSql?: string): void
  (e: 'selection-change', hasSelection: boolean): void
  (e: 'format'): void
}>()

const editorHost = ref<HTMLElement | null>(null)
const editorView = ref<EditorView | null>(null)
const themeStore = useThemeStore()
const commonStore = useCommonStore()
const editorPreferencesStore = useEditorPreferencesStore()

const languageCompartment = new Compartment()
const readOnlyCompartment = new Compartment()
const themeCompartment = new Compartment()
const lspCompartment = new Compartment()
const editorLayout = EditorView.theme({
  '&': { height: '100%' },
  '.cm-scroller': { overflow: 'auto' }
})

let suppressModelSync = false
let cachedSelectionRange: {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
} | null = null
let lastSelectionState: boolean | null = null
let lspSocket: WebSocket | null = null
let lspReady = false
let lspSessionToken = 0
let lspNextRequestID = 0
let lspDocumentVersion = 1
let lspDidChangeTimer: ReturnType<typeof setTimeout> | null = null
let lspDidChangeText = ''
let lspDidChangeVersion = 1
let lspUnavailableWarningShown = false
const pendingRequests = new Map<number | string, PendingRequest>()
const textDocumentUri = `inmemory://sql/${Date.now()}-${Math.random().toString(36).slice(2)}`

const lspContextSignature = computed(() => getSqlLspConnectionContextSignature(props.lspContext))
const shouldEnableLsp = computed(
  () =>
    props.enableSqlProviders &&
    editorPreferencesStore.sqlLspEnabled &&
    Boolean(lspContextSignature.value)
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
  return isDark ? oneDark : []
}

function normalizeCompletionItems(
  response: LspCompletionItem[] | LspCompletionList | null | undefined
) {
  if (!response) {
    return []
  }
  if (Array.isArray(response)) {
    return response
  }
  return Array.isArray(response.items) ? response.items : []
}

function mapCompletionType(kind: number | undefined): string {
  switch (kind) {
    case 2:
    case 3:
      return 'function'
    case 5:
    case 6:
    case 10:
      return 'variable'
    case 17:
      return 'keyword'
    case 22:
      return 'snippet'
    default:
      return 'text'
  }
}

function buildLspCompletionContext(
  prevChar: string,
  explicit: boolean
): LspCompletionContext | undefined {
  if (prevChar === '.' || prevChar === '"' || prevChar === '`') {
    return {
      triggerKind: LSP_TRIGGER_KIND_TRIGGER_CHARACTER,
      triggerCharacter: prevChar
    }
  }

  if (explicit) {
    return { triggerKind: LSP_TRIGGER_KIND_INVOKED }
  }

  return undefined
}

function getCompletionBoost(label: string, prefix: string): number {
  if (!prefix) {
    return 0
  }

  const normalizedLabel = label.toLowerCase()
  const normalizedPrefix = prefix.toLowerCase()
  if (normalizedLabel.startsWith(normalizedPrefix)) {
    return 100
  }
  if (normalizedLabel.includes(normalizedPrefix)) {
    return 25
  }
  return 0
}

function toLspPosition(state: EditorState, position: number): LspPosition {
  const line = state.doc.lineAt(position)
  return {
    line: Math.max(line.number - 1, 0),
    character: Math.max(position - line.from, 0)
  }
}

function getHasSelection(state: EditorState): boolean {
  return !state.selection.main.empty
}

function toMonacoLikeRange(state: EditorState) {
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

function emitSelectionState(state: EditorState) {
  const selected = getHasSelection(state)
  if (selected) {
    cachedSelectionRange = toMonacoLikeRange(state)
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

function handleFormatShortcut() {
  if (!props.enableFormatAction) {
    return false
  }
  emit('format')
  return true
}

function rejectPendingRequests(message: string) {
  pendingRequests.forEach((pending) => {
    clearTimeout(pending.timeoutId)
    pending.reject(new Error(message))
  })
  pendingRequests.clear()
}

function reportLspUnavailable(error: unknown) {
  if (!shouldEnableLsp.value) {
    return
  }
  if (!lspUnavailableWarningShown) {
    commonStore.showNotification(
      'SQL LSP unavailable. Autocomplete is disabled until LSP becomes available.',
      'warning'
    )
    lspUnavailableWarningShown = true
  }
  console.warn('SQL LSP unavailable:', error)
}

function isActiveLspSession(token: number): boolean {
  return token === lspSessionToken
}

function sendLspNotification(method: string, params?: unknown): void {
  if (!lspSocket || lspSocket.readyState !== WebSocket.OPEN) {
    return
  }
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    method,
    params
  })
  if (payload.length > MAX_LSP_MESSAGE_CHARS) {
    throw new Error(`SQL LSP notification too large (${payload.length} chars)`)
  }
  lspSocket.send(payload)
}

function sendLspRequest(method: string, params?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!lspSocket || lspSocket.readyState !== WebSocket.OPEN) {
      reject(new Error('SQL LSP socket is not open'))
      return
    }

    const requestId = ++lspNextRequestID
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    })
    if (payload.length > MAX_LSP_MESSAGE_CHARS) {
      reject(new Error(`SQL LSP request too large (${payload.length} chars)`))
      return
    }

    const timeoutId = setTimeout(() => {
      pendingRequests.delete(requestId)
      reject(new Error(`SQL LSP request timed out: ${method}`))
    }, REQUEST_TIMEOUT_MS)

    pendingRequests.set(requestId, { resolve, reject, timeoutId })
    lspSocket.send(payload)
  })
}

function scheduleDidChangeNotification(text: string) {
  if (!lspReady || !lspSocket || lspSocket.readyState !== WebSocket.OPEN) {
    return
  }

  lspDidChangeText = text
  lspDidChangeVersion += 1
  const versionToSend = lspDidChangeVersion
  const sessionToken = lspSessionToken

  if (lspDidChangeTimer) {
    clearTimeout(lspDidChangeTimer)
  }

  lspDidChangeTimer = setTimeout(() => {
    lspDidChangeTimer = null
    if (!isActiveLspSession(sessionToken)) {
      return
    }
    sendLspNotification('textDocument/didChange', {
      textDocument: {
        uri: textDocumentUri,
        version: versionToSend
      },
      contentChanges: [{ text: lspDidChangeText }]
    })
  }, DID_CHANGE_DEBOUNCE_MS)
}

function flushPendingDidChangeNotification() {
  if (!lspDidChangeTimer) {
    return
  }
  clearTimeout(lspDidChangeTimer)
  lspDidChangeTimer = null

  if (!lspReady || !lspSocket || lspSocket.readyState !== WebSocket.OPEN) {
    return
  }

  sendLspNotification('textDocument/didChange', {
    textDocument: {
      uri: textDocumentUri,
      version: lspDidChangeVersion
    },
    contentChanges: [{ text: lspDidChangeText }]
  })
}

async function provideLspCompletions(context: CompletionContext): Promise<CompletionResult | null> {
  if (!shouldEnableLsp.value || !lspReady) {
    return null
  }

  const prefix = context.matchBefore(/[\w$]+/)
  const prevChar = context.pos > 0 ? context.state.sliceDoc(context.pos - 1, context.pos) : ''
  const hasWordPrefix = Boolean(prefix?.text?.length)
  const allowBroadCompletion = prevChar === '.' || prevChar === '"' || prevChar === '`'
  const allowExplicitCompletion = context.explicit
  if (!hasWordPrefix && !allowBroadCompletion && !allowExplicitCompletion) {
    return null
  }

  // Ensure completion request is evaluated against the latest editor text.
  flushPendingDidChangeNotification()

  const lspCompletionContext = buildLspCompletionContext(prevChar, allowExplicitCompletion)
  const response = await sendLspRequest('textDocument/completion', {
    textDocument: { uri: textDocumentUri },
    position: toLspPosition(context.state, context.pos),
    context: lspCompletionContext
  }).catch(() => null)

  const items = normalizeCompletionItems(response as LspCompletionItem[] | LspCompletionList | null)
  if (!items.length) {
    return null
  }

  const prefixText = prefix?.text || ''

  return {
    from: prefix?.from ?? context.pos,
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

function handleSocketMessage(rawData: unknown) {
  if (typeof rawData !== 'string') {
    return
  }
  if (rawData.length > MAX_LSP_MESSAGE_CHARS) {
    reportLspUnavailable(new Error(`SQL LSP message too large (${rawData.length} chars)`))
    disconnectLspSession()
    return
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawData)
  } catch (error) {
    reportLspUnavailable(error)
    return
  }

  const response = parsed as JsonRpcResponse
  if (response.id === undefined) {
    return
  }

  const pending = pendingRequests.get(response.id)
  if (!pending) {
    return
  }

  pendingRequests.delete(response.id)
  clearTimeout(pending.timeoutId)

  if (response.error) {
    pending.reject(new Error(response.error.message || 'SQL LSP request failed'))
    return
  }

  pending.resolve(response.result)
}

async function initializeLspSession(sessionToken: number) {
  if (!isActiveLspSession(sessionToken)) {
    return
  }

  try {
    const documentText = editorView.value?.state.doc.toString() ?? props.modelValue ?? ''
    await sendLspRequest('initialize', {
      processId: null,
      clientInfo: { name: 'dbconvert-streams-ui', version: '1.0.0' },
      rootUri: null,
      capabilities: {
        textDocument: {
          completion: {
            completionItem: {
              snippetSupport: true
            }
          }
        }
      }
    })

    if (!isActiveLspSession(sessionToken)) {
      return
    }

    sendLspNotification('initialized', {})
    lspDocumentVersion = 1
    lspDidChangeVersion = lspDocumentVersion
    sendLspNotification('textDocument/didOpen', {
      textDocument: {
        uri: textDocumentUri,
        languageId: 'sql',
        version: lspDocumentVersion,
        text: documentText
      }
    })
    lspReady = true
    lspUnavailableWarningShown = false
  } catch (error) {
    if (!isActiveLspSession(sessionToken)) {
      return
    }
    lspReady = false
    reportLspUnavailable(error)
  }
}

function disconnectLspSession() {
  lspSessionToken += 1
  lspReady = false

  if (lspDidChangeTimer) {
    clearTimeout(lspDidChangeTimer)
    lspDidChangeTimer = null
  }

  rejectPendingRequests('SQL LSP session disposed')

  if (lspSocket) {
    try {
      if (lspSocket.readyState === WebSocket.OPEN) {
        sendLspNotification('textDocument/didClose', {
          textDocument: { uri: textDocumentUri }
        })
      }
      lspSocket.close()
    } catch {
      // Ignore close failures from stale/closing sockets.
    }
  }

  lspSocket = null
}

function refreshLspCompartment() {
  const view = editorView.value
  if (!view) {
    return
  }
  view.dispatch({
    effects: lspCompartment.reconfigure(getLspAutocompletionExtension())
  })
}

function connectLspSession() {
  disconnectLspSession()
  if (!shouldEnableLsp.value) {
    refreshLspCompartment()
    return
  }

  const apiKey = commonStore.apiKey || commonStore.userApiKey || ''
  const installId = getOrCreateInstallId()
  const sessionToken = ++lspSessionToken
  const wsUrl = buildSqlLspWebSocketUrl({
    backendUrl: getBackendUrl(),
    apiKey,
    installId,
    connectionContext: props.lspContext
  })

  const socket = new WebSocket(wsUrl)
  lspSocket = socket

  socket.onmessage = (event) => {
    handleSocketMessage(event.data)
  }
  socket.onerror = () => {
    if (!isActiveLspSession(sessionToken)) {
      return
    }
    reportLspUnavailable(
      new Error(
        `SQL LSP websocket error (url=${new URL(wsUrl).pathname}, readyState=${socket.readyState})`
      )
    )
  }
  socket.onclose = (event) => {
    if (!isActiveLspSession(sessionToken)) {
      return
    }
    lspReady = false
    rejectPendingRequests('SQL LSP websocket closed')
    if (event.code !== 1000) {
      const reason = event.reason ? `: ${event.reason}` : ''
      reportLspUnavailable(
        new Error(
          `SQL LSP websocket closed with code ${event.code}${reason} (url=${new URL(wsUrl).pathname})`
        )
      )
    }
    lspSocket = null
  }
  socket.onopen = () => {
    void initializeLspSession(sessionToken)
  }

  refreshLspCompartment()
}

function createEditorState() {
  const keymaps = keymap.of([
    { key: 'Mod-Enter', run: handleExecuteShortcut },
    { key: 'Shift-Enter', run: handleExecuteShortcut },
    { key: 'Shift-Alt-f', run: handleFormatShortcut },
    { key: 'Mod-Shift-f', run: handleFormatShortcut },
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
      lspCompartment.of(getLspAutocompletionExtension()),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !suppressModelSync) {
          emit('update:modelValue', update.state.doc.toString())
        }
        if (update.docChanged) {
          scheduleDidChangeNotification(update.state.doc.toString())
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

  editorView.value?.destroy()
  editorView.value = new EditorView({
    state: createEditorState(),
    parent: editorHost.value
  })

  emitSelectionState(editorView.value.state)
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

watch(shouldEnableLsp, () => {
  connectLspSession()
})

watch(lspContextSignature, () => {
  connectLspSession()
})

watch(
  () => [commonStore.apiKey, commonStore.userApiKey],
  () => {
    connectLspSession()
  }
)

onMounted(() => {
  recreateEditor()
  connectLspSession()
})

onBeforeUnmount(() => {
  disconnectLspSession()
  editorView.value?.destroy()
  editorView.value = null
})

function hasSelection(): boolean {
  const view = editorView.value
  return Boolean(view && !view.state.selection.main.empty)
}

function getCachedSelectionRange() {
  return cachedSelectionRange
}

function insertTextAtCursor(text: string) {
  const view = editorView.value
  if (!view || props.readOnly) {
    return
  }
  const selection = view.state.selection.main
  const from = selection.from
  view.dispatch({
    changes: {
      from: selection.from,
      to: selection.to,
      insert: text
    },
    selection: {
      anchor: from + text.length
    }
  })
  view.focus()
}

defineExpose({
  hasSelection,
  getSelectedSql,
  getCachedSelectionRange,
  insertTextAtCursor
})
</script>

<style scoped>
:deep(.cm-editor) {
  --sql-editor-bg: #ffffff;
  --sql-editor-gutter-bg: #f8fafc;
  --sql-editor-border: rgba(148, 163, 184, 0.25);
  --sql-editor-popup-bg: #ffffff;
  --sql-editor-popup-border: rgba(148, 163, 184, 0.35);
  --sql-editor-active-line: rgba(15, 23, 42, 0.06);
  --sql-editor-selected-item: rgba(13, 148, 136, 0.18);
  --sql-editor-selection-bg: rgba(13, 148, 136, 0.24);
  --sql-editor-text: #0f172a;
  --sql-editor-detail: #64748b;
  font-family: 'JetBrains Mono', 'Fira Code', 'SFMono-Regular', ui-monospace, Menlo, monospace;
  font-size: 13.5px;
  line-height: 1.5;
  caret-color: #2dd4bf;
  background: var(--sql-editor-bg);
  color: var(--sql-editor-text);
}

.sql-cm-dark :deep(.cm-editor) {
  --sql-editor-bg: var(--color-gray-900);
  --sql-editor-gutter-bg: var(--color-gray-850);
  --sql-editor-border: rgba(148, 163, 184, 0.22);
  --sql-editor-popup-bg: var(--color-gray-850);
  --sql-editor-popup-border: rgba(148, 163, 184, 0.28);
  --sql-editor-active-line: rgba(13, 148, 136, 0.09);
  --sql-editor-selected-item: rgba(13, 148, 136, 0.25);
  --sql-editor-selection-bg: rgba(20, 184, 166, 0.34);
  --sql-editor-text: #e5e7eb;
  --sql-editor-detail: #9ca3af;
}

:deep(.cm-content) {
  padding: 10px 0;
  background: var(--sql-editor-bg);
}

:deep(.cm-line) {
  padding: 0 14px;
}

:deep(.cm-gutters) {
  border-right: 1px solid var(--sql-editor-border);
  background: var(--sql-editor-gutter-bg);
}

:deep(.cm-activeLine) {
  background: var(--sql-editor-active-line);
}

:deep(.cm-tooltip.cm-tooltip-autocomplete) {
  border-radius: 10px;
  border: 1px solid var(--sql-editor-popup-border);
  background: var(--sql-editor-popup-bg);
  color: var(--sql-editor-text);
  box-shadow: 0 10px 35px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

:deep(.cm-tooltip-autocomplete ul li[aria-selected='true']) {
  background: var(--sql-editor-selected-item);
  color: var(--sql-editor-text);
}

:deep(.cm-tooltip-autocomplete ul li) {
  padding: 6px 10px;
  border-bottom: 1px solid var(--sql-editor-border);
}

:deep(.cm-tooltip-autocomplete ul li:last-child) {
  border-bottom: none;
}

:deep(.cm-tooltip-autocomplete ul) {
  max-height: 320px;
  scrollbar-width: thin;
}

:deep(.cm-completionDetail) {
  color: var(--sql-editor-detail);
  opacity: 0.9;
  font-size: 12px;
}

:deep(.cm-tooltip-autocomplete ul::-webkit-scrollbar) {
  width: 10px;
}

:deep(.cm-tooltip-autocomplete ul::-webkit-scrollbar-thumb) {
  background: rgba(148, 163, 184, 0.4);
  border-radius: 999px;
}

:deep(.cm-selectionLayer) {
  mix-blend-mode: normal !important;
  z-index: 9 !important;
}

:deep(.cm-selectionLayer .cm-selectionBackground) {
  background: var(--sql-editor-selection-bg) !important;
  border-radius: 2px;
}

:deep(.cm-content ::selection) {
  background: var(--sql-editor-selection-bg);
  color: inherit;
}
</style>
