<template>
  <div
    :class="[
      'relative rounded-lg border codemirror-editor-container',
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
  buildSqlLspWebSocketUrl,
  getSqlLspConnectionContextSignature,
  type SqlLspConnectionContext
} from '@/composables/useSqlLspProviders'
import { getBackendUrl } from '@/utils/environment'
import { getOrCreateInstallId } from '@/utils/installId'
import { basicSetup } from 'codemirror'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap, type ViewUpdate } from '@codemirror/view'
import { sql, MySQL, PostgreSQL } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { type Diagnostic, setDiagnostics } from '@codemirror/lint'
import {
  autocompletion,
  startCompletion,
  type CompletionContext,
  type CompletionResult
} from '@codemirror/autocomplete'
import {
  buildLspCompletionContext,
  clamp,
  fromLspPosition,
  getCompletionBoost,
  mapCompletionType,
  normalizeCompletionItems,
  toCodeMirrorDiagnostic,
  toLspPosition
} from './sqlCodeMirrorLspUtils'
import {
  getWordRangeAtPosition,
  renderHoverTooltipContent,
  toHoverText
} from './sqlCodeMirrorHoverUtils'
import type {
  EditorStateLike,
  JsonRpcNotification,
  JsonRpcResponse,
  LspCompletionItem,
  LspCompletionList,
  LspDiagnostic,
  LspFormattingOptions,
  LspHoverResult,
  LspLocation,
  LspLocationLink,
  LspPublishDiagnosticsParams,
  LspSignatureHelpResult,
  LspTextEdit,
  PendingRequest
} from './sqlCodeMirrorTypes'

const REQUEST_TIMEOUT_MS = 8000
const MAX_COMPLETION_ITEMS = 200
const DID_CHANGE_DEBOUNCE_MS = 150
const MAX_LSP_MESSAGE_CHARS = 250_000
const LSP_TRIGGER_KIND_INVOKED = 1
const LSP_TRIGGER_KIND_TRIGGER_CHARACTER = 2
const LSP_RECONNECT_BASE_DELAY_MS = 600
const LSP_RECONNECT_MAX_DELAY_MS = 8_000
const LSP_RECONNECT_JITTER_RATIO = 0.2
const HOVER_REQUEST_DELAY_MS = 150
const HOVER_HIDE_DELAY_MS = 200
const MAX_HOVER_TEXT_CHARS = 4_000
const SIGNATURE_HIDE_DELAY_MS = 6_000

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
let lspReconnectTimer: ReturnType<typeof setTimeout> | null = null
let lspReconnectAttempt = 0
let lspUnavailableWarningShown = false
let hoverTimer: ReturnType<typeof setTimeout> | null = null
let hoverHideTimer: ReturnType<typeof setTimeout> | null = null
let hoverRequestToken = 0
let hoverTooltipEl: HTMLDivElement | null = null
let hoverActiveKey = ''
let hoverTooltipHovered = false
let hoverMouseOverListener: ((event: MouseEvent) => void) | null = null
let hoverMouseLeaveListener: (() => void) | null = null
let hoverMouseDownListener: (() => void) | null = null
let definitionMouseDownListener: ((event: MouseEvent) => void) | null = null
let signatureTooltipEl: HTMLDivElement | null = null
let signatureHideTimer: ReturnType<typeof setTimeout> | null = null
const pendingRequests = new Map<number | string, PendingRequest>()
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
  return isDark ? oneDark : []
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

function clearHoverTimer() {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
}

function clearHoverHideTimer() {
  if (!hoverHideTimer) {
    return
  }
  clearTimeout(hoverHideTimer)
  hoverHideTimer = null
}

function scheduleHideHoverTooltip() {
  clearHoverTimer()
  clearHoverHideTimer()
  hoverHideTimer = setTimeout(() => {
    hoverHideTimer = null
    if (hoverTooltipHovered) {
      return
    }
    hideHoverTooltip()
  }, HOVER_HIDE_DELAY_MS)
}

function clearSignatureHideTimer() {
  if (!signatureHideTimer) {
    return
  }
  clearTimeout(signatureHideTimer)
  signatureHideTimer = null
}

function hideHoverTooltip(resetKey = true) {
  clearHoverTimer()
  clearHoverHideTimer()
  hoverRequestToken += 1
  if (resetKey) {
    hoverActiveKey = ''
  }
  hoverTooltipHovered = false
  if (!hoverTooltipEl) {
    return
  }
  hoverTooltipEl.remove()
  hoverTooltipEl = null
}

function hideSignatureTooltip() {
  clearSignatureHideTimer()
  if (!signatureTooltipEl) {
    return
  }
  signatureTooltipEl.remove()
  signatureTooltipEl = null
}

function ensureHoverTooltipElement(): HTMLDivElement | null {
  const container = editorHost.value?.parentElement
  if (!container) {
    return null
  }

  if (!hoverTooltipEl) {
    const el = document.createElement('div')
    el.className = 'sql-hover-tooltip-floating'
    el.addEventListener('mouseenter', () => {
      hoverTooltipHovered = true
      clearHoverHideTimer()
    })
    el.addEventListener('mouseleave', () => {
      hoverTooltipHovered = false
      scheduleHideHoverTooltip()
    })
    container.appendChild(el)
    hoverTooltipEl = el
  } else if (hoverTooltipEl.parentElement !== container) {
    hoverTooltipEl.remove()
    container.appendChild(hoverTooltipEl)
  }

  return hoverTooltipEl
}

function positionHoverTooltip(el: HTMLDivElement, view: EditorView, from: number, to: number) {
  const container = editorHost.value?.parentElement
  if (!container) {
    return
  }

  const anchor = view.coordsAtPos(from) || view.coordsAtPos(to)
  if (!anchor) {
    return
  }

  const containerRect = container.getBoundingClientRect()
  el.style.left = '0px'
  el.style.top = '0px'
  el.style.visibility = 'hidden'
  el.style.display = 'block'

  const margin = 8
  const preferredLeft = anchor.left - containerRect.left
  const preferredTop = anchor.bottom - containerRect.top + margin

  const maxLeft = Math.max(margin, container.clientWidth - el.offsetWidth - margin)
  let left = clamp(preferredLeft, margin, maxLeft)

  let top = preferredTop
  if (top + el.offsetHeight + margin > container.clientHeight) {
    top = Math.max(margin, anchor.top - containerRect.top - el.offsetHeight - margin)
  }

  if (left + el.offsetWidth + margin > container.clientWidth) {
    left = Math.max(margin, container.clientWidth - el.offsetWidth - margin)
  }

  el.style.left = `${left}px`
  el.style.top = `${top}px`
  el.style.visibility = 'visible'
}

function showHoverTooltip(
  text: string,
  view: EditorView,
  from: number,
  to: number,
  hoveredToken?: string
) {
  const el = ensureHoverTooltipElement()
  if (!el) {
    return
  }
  hoverTooltipHovered = false
  clearHoverHideTimer()
  renderHoverTooltipContent(el, text, { hoveredToken })
  positionHoverTooltip(el, view, from, to)
}

function ensureSignatureTooltipElement(): HTMLDivElement | null {
  const container = editorHost.value?.parentElement
  if (!container) {
    return null
  }

  if (!signatureTooltipEl) {
    const el = document.createElement('div')
    el.className = 'sql-signature-tooltip-floating'
    container.appendChild(el)
    signatureTooltipEl = el
  } else if (signatureTooltipEl.parentElement !== container) {
    signatureTooltipEl.remove()
    container.appendChild(signatureTooltipEl)
  }

  return signatureTooltipEl
}

function positionSignatureTooltip(el: HTMLDivElement, view: EditorView, pos: number) {
  const container = editorHost.value?.parentElement
  if (!container) {
    return
  }

  const anchor = view.coordsAtPos(pos)
  if (!anchor) {
    return
  }

  const containerRect = container.getBoundingClientRect()
  const margin = 8
  const preferredLeft = anchor.left - containerRect.left
  const preferredTop = anchor.bottom - containerRect.top + margin

  el.style.left = '0px'
  el.style.top = '0px'
  el.style.visibility = 'hidden'
  el.style.display = 'block'

  const maxLeft = Math.max(margin, container.clientWidth - el.offsetWidth - margin)
  let left = clamp(preferredLeft, margin, maxLeft)

  let top = preferredTop
  if (top + el.offsetHeight + margin > container.clientHeight) {
    top = Math.max(margin, anchor.top - containerRect.top - el.offsetHeight - margin)
  }
  if (left + el.offsetWidth + margin > container.clientWidth) {
    left = Math.max(margin, container.clientWidth - el.offsetWidth - margin)
  }

  el.style.left = `${left}px`
  el.style.top = `${top}px`
  el.style.visibility = 'visible'
}

function toPlainLspText(value: unknown, maxChars = 240): string {
  if (!value) {
    return ''
  }
  if (typeof value === 'string') {
    return value.slice(0, maxChars)
  }
  if (typeof value === 'object') {
    const markupValue = (value as { value?: unknown }).value
    if (typeof markupValue === 'string') {
      return markupValue.slice(0, maxChars)
    }
  }
  return ''
}

function createSignatureLabelNode(
  signatureLabel: string,
  activeParameterLabel?: string | [number, number]
): HTMLDivElement {
  const labelEl = document.createElement('div')
  labelEl.className = 'sql-signature-tooltip-label'

  const appendText = (text: string) => {
    if (!text) {
      return
    }
    labelEl.appendChild(document.createTextNode(text))
  }

  if (Array.isArray(activeParameterLabel) && activeParameterLabel.length === 2) {
    const from = clamp(activeParameterLabel[0], 0, signatureLabel.length)
    const to = clamp(activeParameterLabel[1], from, signatureLabel.length)
    appendText(signatureLabel.slice(0, from))
    const activeParamEl = document.createElement('span')
    activeParamEl.className = 'sql-signature-tooltip-param'
    activeParamEl.textContent = signatureLabel.slice(from, to)
    labelEl.appendChild(activeParamEl)
    appendText(signatureLabel.slice(to))
    return labelEl
  }

  if (typeof activeParameterLabel === 'string' && activeParameterLabel) {
    const index = signatureLabel.indexOf(activeParameterLabel)
    if (index >= 0) {
      appendText(signatureLabel.slice(0, index))
      const activeParamEl = document.createElement('span')
      activeParamEl.className = 'sql-signature-tooltip-param'
      activeParamEl.textContent = activeParameterLabel
      labelEl.appendChild(activeParamEl)
      appendText(signatureLabel.slice(index + activeParameterLabel.length))
      return labelEl
    }
  }

  labelEl.textContent = signatureLabel
  return labelEl
}

function renderSignatureTooltipContent(el: HTMLDivElement, result: LspSignatureHelpResult) {
  el.textContent = ''

  const signatures = Array.isArray(result.signatures) ? result.signatures : []
  if (!signatures.length) {
    return
  }

  const activeSignatureIndex = clamp(result.activeSignature ?? 0, 0, signatures.length - 1)
  const activeSignature = signatures[activeSignatureIndex]
  const signatureLabel = activeSignature?.label?.trim() || ''
  if (!signatureLabel) {
    return
  }

  const wrapper = document.createElement('div')
  wrapper.className = 'sql-signature-tooltip-content'

  const activeParameterIndex = clamp(
    result.activeParameter ?? 0,
    0,
    Math.max((activeSignature.parameters?.length ?? 1) - 1, 0)
  )
  const activeParameter = activeSignature.parameters?.[activeParameterIndex]
  wrapper.appendChild(createSignatureLabelNode(signatureLabel, activeParameter?.label))

  const signatureDoc = toPlainLspText(activeSignature.documentation, 360).trim()
  const parameterDoc = toPlainLspText(activeParameter?.documentation, 240).trim()
  const docText = parameterDoc || signatureDoc
  if (docText) {
    const docEl = document.createElement('div')
    docEl.className = 'sql-signature-tooltip-doc'
    docEl.textContent = docText
    wrapper.appendChild(docEl)
  }

  el.appendChild(wrapper)
}

function showSignatureTooltip(result: LspSignatureHelpResult, view: EditorView, pos: number) {
  const el = ensureSignatureTooltipElement()
  if (!el) {
    return
  }

  renderSignatureTooltipContent(el, result)
  if (!el.textContent) {
    hideSignatureTooltip()
    return
  }
  positionSignatureTooltip(el, view, pos)
}

async function requestHoverAtPosition(view: EditorView, pos: number, hoverKey: string) {
  const token = ++hoverRequestToken
  flushPendingDidChangeNotification()
  const fallbackRange = getWordRangeAtPosition(view.state, pos)

  const response = await sendLspRequest('textDocument/hover', {
    textDocument: { uri: textDocumentUri },
    position: toLspPosition(view.state, pos)
  }).catch(() => null)

  if (token !== hoverRequestToken || hoverKey !== hoverActiveKey) {
    return
  }

  const hover = response as LspHoverResult | null
  const text = toHoverText(hover?.contents, MAX_HOVER_TEXT_CHARS)
  if (!text) {
    hideHoverTooltip(false)
    return
  }

  const start = hover?.range?.start
    ? fromLspPosition(view.state, hover.range.start)
    : (fallbackRange?.from ?? pos)
  const end = hover?.range?.end
    ? fromLspPosition(view.state, hover.range.end)
    : (fallbackRange?.to ?? pos)
  showHoverTooltip(text, view, Math.min(start, end), Math.max(start, end), fallbackRange?.text)
}

async function requestSignatureHelpAtPosition(
  view: EditorView,
  pos: number,
  triggerCharacter?: string,
  explicit = false
) {
  if (!shouldEnableLsp.value || !lspReady || props.readOnly) {
    hideSignatureTooltip()
    return false
  }

  flushPendingDidChangeNotification()
  const triggerKind = explicit ? LSP_TRIGGER_KIND_INVOKED : LSP_TRIGGER_KIND_TRIGGER_CHARACTER
  const response = await sendLspRequest('textDocument/signatureHelp', {
    textDocument: { uri: textDocumentUri },
    position: toLspPosition(view.state, pos),
    context: triggerCharacter
      ? {
          triggerKind,
          triggerCharacter
        }
      : {
          triggerKind: LSP_TRIGGER_KIND_INVOKED
        }
  }).catch(() => null)

  const signatureHelp = response as LspSignatureHelpResult | null
  if (!signatureHelp?.signatures?.length) {
    hideSignatureTooltip()
    return false
  }

  hideHoverTooltip(false)
  showSignatureTooltip(signatureHelp, view, pos)
  clearSignatureHideTimer()
  signatureHideTimer = setTimeout(() => {
    hideSignatureTooltip()
  }, SIGNATURE_HIDE_DELAY_MS)
  return true
}

function normalizeDefinitionTarget(
  response: unknown
): { uri: string; range: NonNullable<LspLocation['range']> } | null {
  if (!response) {
    return null
  }

  const first = Array.isArray(response) ? response[0] : response
  if (!first || typeof first !== 'object') {
    return null
  }

  const link = first as LspLocationLink
  const location = first as LspLocation

  if (typeof link.targetUri === 'string' && (link.targetSelectionRange || link.targetRange)) {
    return {
      uri: link.targetUri,
      range: (link.targetSelectionRange || link.targetRange) as NonNullable<LspLocation['range']>
    }
  }

  if (typeof location.uri === 'string' && location.range) {
    return {
      uri: location.uri,
      range: location.range as NonNullable<LspLocation['range']>
    }
  }

  return null
}

async function goToDefinitionAtPosition(pos: number) {
  const view = editorView.value
  if (!view || !shouldEnableLsp.value || !lspReady) {
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

function handleHoverMouseMove(event: MouseEvent, view: EditorView): boolean {
  if (!shouldEnableLsp.value || !lspReady || props.readOnly) {
    hideHoverTooltip()
    return false
  }
  clearHoverHideTimer()
  if (event.buttons !== 0) {
    clearHoverTimer()
    return false
  }

  let pos: number | null = null
  const target = event.target
  if (target instanceof Node && view.dom.contains(target)) {
    try {
      pos = view.posAtDOM(target, 0)
    } catch {
      pos = null
    }
  }
  if (pos === null) {
    pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  }
  if (pos === null) {
    hideHoverTooltip()
    return false
  }

  const wordRange = getWordRangeAtPosition(view.state, pos)
  if (!wordRange) {
    hideHoverTooltip()
    return false
  }

  const hoverKey = `${wordRange.from}:${wordRange.to}:${wordRange.text}`
  if (hoverKey === hoverActiveKey) {
    // Keep the pending/visible tooltip request alive for the same token under cursor.
    // Without this guard, frequent mousemove events continuously reset the debounce timer
    // and hover requests may never be sent.
    if (hoverTimer || hoverTooltipEl) {
      return false
    }
  }

  hoverActiveKey = hoverKey
  clearHoverTimer()
  hoverTimer = setTimeout(() => {
    hoverTimer = null
    void requestHoverAtPosition(view, pos, hoverKey)
  }, HOVER_REQUEST_DELAY_MS)

  return false
}

function detachHoverDomListeners(view: EditorView | null) {
  if (!view) {
    return
  }

  if (hoverMouseOverListener) {
    view.dom.removeEventListener('mouseover', hoverMouseOverListener)
    hoverMouseOverListener = null
  }
  if (hoverMouseLeaveListener) {
    view.dom.removeEventListener('mouseleave', hoverMouseLeaveListener)
    hoverMouseLeaveListener = null
  }
  if (hoverMouseDownListener) {
    view.dom.removeEventListener('mousedown', hoverMouseDownListener)
    hoverMouseDownListener = null
  }
  if (definitionMouseDownListener) {
    view.dom.removeEventListener('mousedown', definitionMouseDownListener)
    definitionMouseDownListener = null
  }
}

function attachHoverDomListeners(view: EditorView) {
  detachHoverDomListeners(view)
  hoverMouseOverListener = (event: MouseEvent) => {
    clearHoverHideTimer()
    void handleHoverMouseMove(event, view)
  }
  hoverMouseLeaveListener = () => {
    scheduleHideHoverTooltip()
    hideSignatureTooltip()
  }
  hoverMouseDownListener = () => {
    hideHoverTooltip()
    hideSignatureTooltip()
  }
  definitionMouseDownListener = (event: MouseEvent) => {
    if (event.button !== 0 || !(event.metaKey || event.ctrlKey)) {
      return
    }
    if (!shouldEnableLsp.value || !lspReady) {
      return
    }

    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pos === null) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    void goToDefinitionAtPosition(pos)
  }

  view.dom.addEventListener('mouseover', hoverMouseOverListener, { passive: true })
  view.dom.addEventListener('mouseleave', hoverMouseLeaveListener)
  view.dom.addEventListener('mousedown', hoverMouseDownListener)
  view.dom.addEventListener('mousedown', definitionMouseDownListener)
}

function getHasSelection(state: EditorStateLike): boolean {
  return !state.selection.main.empty
}

function toEditorSelectionRange(state: EditorStateLike) {
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

  // Apply from tail to head to keep offsets stable.
  changes.sort((a, b) => (a.from === b.from ? b.to - a.to : b.from - a.from))
  return changes
}

async function formatDocumentWithLsp() {
  const view = editorView.value
  if (!view || !shouldEnableLsp.value || !lspReady || props.readOnly) {
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
  if (!view || !shouldEnableLsp.value || !lspReady) {
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
      'SQL LSP unavailable. Autocomplete and hover are disabled until LSP becomes available.',
      'warning'
    )
    lspUnavailableWarningShown = true
  }
  console.warn('SQL LSP unavailable:', error)
}

function isActiveLspSession(token: number): boolean {
  return token === lspSessionToken
}

function clearLspReconnectTimer() {
  if (!lspReconnectTimer) {
    return
  }
  clearTimeout(lspReconnectTimer)
  lspReconnectTimer = null
}

function scheduleLspReconnect(sessionToken: number) {
  if (!isActiveLspSession(sessionToken) || !shouldEnableLsp.value) {
    return
  }

  clearLspReconnectTimer()

  lspReconnectAttempt += 1
  const exponentialDelay = Math.min(
    LSP_RECONNECT_BASE_DELAY_MS * 2 ** (lspReconnectAttempt - 1),
    LSP_RECONNECT_MAX_DELAY_MS
  )
  const jitterBound = Math.floor(exponentialDelay * LSP_RECONNECT_JITTER_RATIO)
  const jitter = jitterBound > 0 ? Math.floor(Math.random() * (jitterBound + 1)) : 0
  const reconnectDelay = exponentialDelay + jitter

  lspReconnectTimer = setTimeout(() => {
    lspReconnectTimer = null
    if (!isActiveLspSession(sessionToken) || !shouldEnableLsp.value) {
      return
    }
    connectLspSession(false)
  }, reconnectDelay)
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
  if (!shouldEnableLsp.value) {
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

  if (!lspReady) {
    return null
  }

  // Ensure completion request is evaluated against the latest editor text.
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

function getLspEditorExtensions() {
  return [getLspAutocompletionExtension()]
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

  const notification = parsed as JsonRpcNotification
  if (typeof notification.method === 'string') {
    handleLspNotification(notification)
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
          },
          hover: {
            contentFormat: ['markdown', 'plaintext']
          },
          signatureHelp: {
            signatureInformation: {
              parameterInformation: {
                labelOffsetSupport: true
              }
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
    refreshLspCompartment()
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
    if (lspSocket && lspSocket.readyState === WebSocket.OPEN) {
      try {
        lspSocket.close()
        return
      } catch {
        // Fall through to reconnect scheduling.
      }
    }
    scheduleLspReconnect(sessionToken)
  }
}

function disconnectLspSession(resetReconnectBackoff = true) {
  clearLspReconnectTimer()
  if (resetReconnectBackoff) {
    lspReconnectAttempt = 0
  }

  lspSessionToken += 1
  lspReady = false
  hideHoverTooltip()
  hideSignatureTooltip()

  if (lspDidChangeTimer) {
    clearTimeout(lspDidChangeTimer)
    lspDidChangeTimer = null
  }

  rejectPendingRequests('SQL LSP session disposed')
  clearLspDiagnostics()

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
    effects: lspCompartment.reconfigure(getLspEditorExtensions())
  })
}

function connectLspSession(resetReconnectBackoff = true) {
  disconnectLspSession(resetReconnectBackoff)
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
    if (!isActiveLspSession(sessionToken)) {
      return
    }
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
    clearLspDiagnostics()
    if (event.code !== 1000) {
      const reason = event.reason ? `: ${event.reason}` : ''
      reportLspUnavailable(
        new Error(
          `SQL LSP websocket closed with code ${event.code}${reason} (url=${new URL(wsUrl).pathname})`
        )
      )
    }
    lspSocket = null
    scheduleLspReconnect(sessionToken)
  }
  socket.onopen = () => {
    lspReconnectAttempt = 0
    void initializeLspSession(sessionToken)
  }

  refreshLspCompartment()
}

function getSignatureHelpTriggerCharacter(update: ViewUpdate): string | null {
  if (!update.docChanged) {
    return null
  }
  const hasTypingEvent = update.transactions.some((transaction) =>
    transaction.isUserEvent('input.type')
  )
  if (!hasTypingEvent) {
    return null
  }

  let insertedText = ''
  let hasNonSimpleInsert = false
  update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    if (fromA !== toA) {
      hasNonSimpleInsert = true
      return
    }
    const text = inserted.toString()
    if (text.length !== 1) {
      hasNonSimpleInsert = true
      return
    }
    insertedText += text
  })

  if (hasNonSimpleInsert || insertedText.length !== 1) {
    return null
  }
  if (insertedText !== '(' && insertedText !== ',') {
    return null
  }
  return insertedText
}

function createEditorState() {
  const keymaps = keymap.of([
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
  hideSignatureTooltip()
  detachHoverDomListeners(editorView.value)
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

<style scoped>
.sql-cm-light {
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
  --sql-hover-card-bg: var(--sql-editor-popup-bg);
  --sql-hover-card-border: transparent;
  --sql-hover-heading: #0f172a;
  --sql-hover-meta: #94a3b8;
  --sql-hover-type: #334155;
  --sql-hover-badge-text: #94a3b8;
  --sql-hover-badge-bg: rgba(0, 0, 0, 0.05);
  --sql-hover-row-accent: rgba(20, 184, 166, 0.65);
  --sql-hover-name-active: #f1f5f9;
  --sql-hover-more: #94a3b8;
  --sql-type-keyword: #2563eb;
  --sql-type-muted: #94a3b8;
  --sql-search-panel-bg: var(--sql-editor-popup-bg);
  --sql-search-panel-border: rgba(148, 163, 184, 0.15);
  --sql-search-input-bg: #ffffff;
  --sql-search-input-border: rgba(148, 163, 184, 0.35);
  --sql-search-input-focus: rgba(139, 92, 246, 0.7);
  --sql-search-input-focus-ring: rgba(139, 92, 246, 0.18);
  --sql-search-button-bg: rgba(0, 0, 0, 0.05);
  --sql-search-button-border: rgba(148, 163, 184, 0.35);
  --sql-search-button-hover: rgba(20, 184, 166, 0.12);
  --sql-search-checkbox-border: rgba(100, 116, 139, 0.6);
  --sql-search-muted: #94a3b8;
}

.sql-cm-dark {
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
  --sql-hover-card-bg: var(--sql-editor-popup-bg);
  --sql-hover-card-border: transparent;
  --sql-hover-heading: #f3f4f6;
  --sql-hover-meta: #6b7280;
  --sql-hover-type: #d1d5db;
  --sql-hover-badge-text: #9ca3af;
  --sql-hover-badge-bg: rgba(0, 0, 0, 0.22);
  --sql-hover-row-accent: rgba(45, 212, 191, 0.85);
  --sql-hover-name-active: #f9fafb;
  --sql-hover-more: #6b7280;
  --sql-type-keyword: #93c5fd;
  --sql-type-muted: #6b7280;
  --sql-search-panel-bg: var(--sql-editor-popup-bg);
  --sql-search-panel-border: rgba(148, 163, 184, 0.1);
  --sql-search-input-bg: #101722;
  --sql-search-input-border: rgba(148, 163, 184, 0.2);
  --sql-search-input-focus: rgba(139, 92, 246, 0.7);
  --sql-search-input-focus-ring: rgba(139, 92, 246, 0.2);
  --sql-search-button-bg: rgba(255, 255, 255, 0.08);
  --sql-search-button-border: rgba(148, 163, 184, 0.28);
  --sql-search-button-hover: rgba(20, 184, 166, 0.18);
  --sql-search-checkbox-border: rgba(148, 163, 184, 0.45);
  --sql-search-muted: #9ca3af;
}

:deep(.cm-editor) {
  --sql-ui-scale: var(--sql-editor-font-scale, 1);
  font-family: 'JetBrains Mono', 'Fira Code', 'SFMono-Regular', ui-monospace, Menlo, monospace;
  font-size: calc(13.5px * var(--sql-ui-scale));
  line-height: 1.5;
  caret-color: #2dd4bf;
  background: var(--sql-editor-bg);
  color: var(--sql-editor-text);
}

:deep(.cm-content) {
  padding: calc(10px * var(--sql-ui-scale)) 0;
  background: var(--sql-editor-bg);
}

:deep(.cm-line) {
  padding: 0 calc(14px * var(--sql-ui-scale));
}

:deep(.cm-gutters) {
  border-right: 1px solid var(--sql-editor-border);
  background: var(--sql-editor-gutter-bg);
}

:deep(.cm-activeLine) {
  background: var(--sql-editor-active-line);
}

:deep(.cm-tooltip.cm-tooltip-autocomplete) {
  border-radius: calc(10px * var(--sql-ui-scale));
  border: none;
  background: var(--sql-editor-popup-bg);
  color: var(--sql-editor-text);
  box-shadow:
    0 calc(12px * var(--sql-ui-scale)) calc(36px * var(--sql-ui-scale)) rgba(0, 0, 0, 0.55),
    0 calc(2px * var(--sql-ui-scale)) calc(8px * var(--sql-ui-scale)) rgba(0, 0, 0, 0.3);
  overflow: hidden;
  z-index: 120;
  font-size: calc(13px * var(--sql-ui-scale));
}

.sql-cm-dark :deep(.cm-tooltip.cm-tooltip-autocomplete)::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: calc(10px * var(--sql-ui-scale)) calc(10px * var(--sql-ui-scale)) 0 0;
  pointer-events: none;
}

:deep(.cm-panels) {
  background: var(--sql-search-panel-bg);
  color: var(--sql-editor-text);
  border-top: 1px solid var(--sql-search-panel-border);
}

:deep(.cm-panels-bottom) {
  border-top: 1px solid var(--sql-search-panel-border);
}

:deep(.cm-panel.cm-search) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: calc(6px * var(--sql-ui-scale));
  padding: calc(8px * var(--sql-ui-scale)) calc(12px * var(--sql-ui-scale));
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  font-size: calc(12px * var(--sql-ui-scale));
}

:deep(.cm-panel.cm-search br) {
  flex-basis: 100%;
  height: 0;
  margin: 0;
}

:deep(.cm-panel.cm-search label) {
  display: inline-flex;
  align-items: center;
  gap: calc(5px * var(--sql-ui-scale));
  color: var(--sql-search-muted);
  font-size: calc(11.5px * var(--sql-ui-scale));
  cursor: pointer;
}

:deep(.cm-panel.cm-search input[type='text']) {
  min-width: calc(160px * var(--sql-ui-scale));
  height: calc(27px * var(--sql-ui-scale));
  padding: 0 9px;
  border-radius: 7px !important;
  border: 1px solid var(--sql-search-input-border);
  background: var(--sql-search-input-bg);
  color: var(--sql-editor-text);
  outline: none;
  font-size: calc(12px * var(--sql-ui-scale));
  font-family: 'JetBrains Mono', 'Fira Code', 'SFMono-Regular', ui-monospace, Menlo, monospace;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

:deep(.cm-panel.cm-search input[type='text']:focus) {
  border-color: var(--sql-search-input-focus);
  border-radius: 7px !important;
  box-shadow: 0 0 0 2px var(--sql-search-input-focus-ring);
}

:deep(.cm-panel.cm-search input[type='checkbox']) {
  appearance: none;
  -webkit-appearance: none;
  width: calc(14px * var(--sql-ui-scale));
  height: calc(14px * var(--sql-ui-scale));
  margin: 0;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid var(--sql-search-checkbox-border);
  background: rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
  transition:
    border-color 0.15s,
    background 0.15s;
}

:deep(.cm-panel.cm-search input[type='checkbox']:checked) {
  background: #14b8a6;
  border-color: #14b8a6;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' d='M2 6l3 3 5-5'/%3E%3C/svg%3E");
  background-size: calc(9px * var(--sql-ui-scale));
  background-position: center;
  background-repeat: no-repeat;
}

:deep(.cm-panel.cm-search input[type='checkbox']:focus-visible) {
  outline: 2px solid rgba(20, 184, 166, 0.45);
  outline-offset: 1px;
}

:deep(.cm-panel.cm-search .cm-button) {
  height: calc(27px * var(--sql-ui-scale));
  padding: 0 calc(10px * var(--sql-ui-scale));
  border-radius: calc(7px * var(--sql-ui-scale));
  border: 1px solid var(--sql-search-button-border);
  background: var(--sql-search-button-bg);
  color: var(--sql-editor-text);
  cursor: pointer;
  font-size: calc(12px * var(--sql-ui-scale));
  transition:
    background 0.15s,
    border-color 0.15s;
}

:deep(.cm-panel.cm-search .cm-button:hover) {
  background: var(--sql-search-button-hover);
  border-color: rgba(20, 184, 166, 0.4);
}

:deep(.cm-panel.cm-search [name='close']) {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  width: calc(26px * var(--sql-ui-scale));
  min-width: calc(26px * var(--sql-ui-scale));
  height: calc(26px * var(--sql-ui-scale));
  padding: 0;
  border: none;
  background: transparent;
  border-radius: calc(5px * var(--sql-ui-scale));
  color: var(--sql-search-muted);
  font-size: calc(16px * var(--sql-ui-scale));
  line-height: 1;
  transition:
    color 0.15s,
    background 0.15s;
}

:deep(.cm-panel.cm-search [name='close']:hover) {
  color: var(--sql-editor-text);
  background: rgba(148, 163, 184, 0.1);
}

:deep(.sql-hover-tooltip-floating) {
  --sql-ui-scale: var(--sql-editor-font-scale, 1);
  position: absolute;
  pointer-events: auto;
  user-select: text;
  -webkit-user-select: text;
  border-radius: calc(10px * var(--sql-ui-scale));
  border: none;
  background: var(--sql-hover-card-bg);
  color: var(--sql-editor-text);
  box-shadow:
    0 calc(12px * var(--sql-ui-scale)) calc(36px * var(--sql-ui-scale)) rgba(0, 0, 0, 0.55),
    0 calc(2px * var(--sql-ui-scale)) calc(8px * var(--sql-ui-scale)) rgba(0, 0, 0, 0.3);
  width: clamp(300px, 38vw, 460px);
  min-width: min(300px, calc(100% - 16px));
  max-width: min(460px, calc(100% - 16px));
  overflow: hidden;
  z-index: 130;
  font-size: calc(12.5px * var(--sql-ui-scale));
  line-height: 1.4;
  padding: calc(11px * var(--sql-ui-scale)) calc(12px * var(--sql-ui-scale));
}

.sql-cm-dark :deep(.sql-hover-tooltip-floating)::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: calc(10px * var(--sql-ui-scale)) calc(10px * var(--sql-ui-scale)) 0 0;
  pointer-events: none;
}

:deep(.sql-signature-tooltip-floating) {
  --sql-ui-scale: var(--sql-editor-font-scale, 1);
  position: absolute;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
  border-radius: calc(8px * var(--sql-ui-scale));
  border: 1px solid var(--sql-hover-card-border);
  background: var(--sql-hover-card-bg);
  color: var(--sql-editor-text);
  box-shadow: 0 calc(10px * var(--sql-ui-scale)) calc(35px * var(--sql-ui-scale))
    rgba(0, 0, 0, 0.45);
  max-width: min(calc(680px * var(--sql-ui-scale)), 78vw);
  z-index: 135;
  font-size: calc(14px * var(--sql-ui-scale));
  line-height: 1.45;
  padding: calc(9px * var(--sql-ui-scale)) calc(11px * var(--sql-ui-scale));
}

:deep(.sql-signature-tooltip-content) {
  display: flex;
  flex-direction: column;
  gap: calc(6px * var(--sql-ui-scale));
}

:deep(.sql-signature-tooltip-label) {
  font-size: calc(14px * var(--sql-ui-scale));
  line-height: 1.4;
  color: var(--sql-editor-text);
  white-space: pre-wrap;
  word-break: break-word;
}

:deep(.sql-signature-tooltip-param) {
  color: #14b8a6;
  font-weight: 700;
}

:deep(.sql-signature-tooltip-doc) {
  font-size: calc(14px * var(--sql-ui-scale));
  line-height: 1.45;
  color: var(--sql-editor-detail);
  white-space: pre-wrap;
  word-break: break-word;
}

:deep(.sql-hover-tooltip-content) {
  display: flex;
  flex-direction: column;
  gap: calc(8px * var(--sql-ui-scale));
}

:deep(.sql-hover-tooltip-heading) {
  font-size: calc(15px * var(--sql-ui-scale));
  font-weight: 700;
  line-height: 1.3;
  color: var(--sql-hover-heading);
}

:deep(.sql-hover-tooltip-text) {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: calc(12px * var(--sql-ui-scale));
  line-height: 1.45;
  color: var(--sql-editor-text);
}

:deep(.sql-hover-tooltip-table-wrap) {
  width: 100%;
  background: transparent;
  padding: calc(2px * var(--sql-ui-scale)) 0;
}

:deep(.sql-hover-schema-card) {
  display: flex;
  flex-direction: column;
  gap: calc(8px * var(--sql-ui-scale));
}

:deep(.sql-hover-schema-header) {
  display: block;
}

:deep(.sql-hover-schema-header-line) {
  display: flex;
  align-items: baseline;
  gap: calc(6px * var(--sql-ui-scale));
  min-width: 0;
}

:deep(.sql-hover-schema-title) {
  color: var(--sql-hover-heading);
  font-size: calc(12.5px * var(--sql-ui-scale));
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.sql-hover-schema-meta) {
  flex: 1 1 auto;
  color: var(--sql-hover-meta);
  font-size: calc(10px * var(--sql-ui-scale));
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.sql-hover-schema-body) {
  display: flex;
  flex-direction: column;
  gap: calc(7px * var(--sql-ui-scale));
}

:deep(.sql-hover-schema-row) {
  position: relative;
  display: block;
  min-height: calc(24px * var(--sql-ui-scale));
  padding: calc(1px * var(--sql-ui-scale)) calc(2px * var(--sql-ui-scale))
    calc(1px * var(--sql-ui-scale)) calc(4px * var(--sql-ui-scale));
}

:deep(.sql-hover-schema-row-active) {
  padding-left: calc(9px * var(--sql-ui-scale));
}

:deep(.sql-hover-schema-row-active)::before {
  content: '';
  position: absolute;
  left: 0;
  top: calc(2px * var(--sql-ui-scale));
  bottom: calc(2px * var(--sql-ui-scale));
  width: calc(1.5px * var(--sql-ui-scale));
  border-radius: 999px;
  background: var(--sql-hover-row-accent);
}

:deep(.sql-hover-schema-top) {
  display: grid;
  grid-template-columns: minmax(0, calc(140px * var(--sql-ui-scale))) minmax(0, 1fr);
  align-items: center;
  column-gap: calc(8px * var(--sql-ui-scale));
  min-width: 0;
}

:deep(.sql-hover-schema-name) {
  display: block;
  font-size: calc(12px * var(--sql-ui-scale));
  line-height: 1.3;
  color: var(--sql-editor-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.sql-hover-schema-row-active .sql-hover-schema-name) {
  color: var(--sql-hover-name-active);
}

:deep(.sql-hover-schema-right) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: calc(6px * var(--sql-ui-scale));
  min-width: 0;
}

:deep(.sql-hover-schema-type) {
  display: block;
  max-width: min(48vw, calc(430px * var(--sql-ui-scale)));
  font-size: calc(11.5px * var(--sql-ui-scale));
  line-height: 1.3;
  color: var(--sql-hover-type);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.sql-hover-schema-badges) {
  display: inline-flex;
  align-items: center;
  gap: calc(3px * var(--sql-ui-scale));
  flex: 0 0 auto;
  margin-left: calc(4px * var(--sql-ui-scale));
}

:deep(.sql-hover-schema-badge) {
  display: inline-flex;
  align-items: center;
  padding: calc(1.5px * var(--sql-ui-scale)) calc(5px * var(--sql-ui-scale));
  border-radius: 3px;
  border: none;
  background: var(--sql-hover-badge-bg);
  color: var(--sql-hover-badge-text);
  font-size: calc(9.5px * var(--sql-ui-scale));
  font-weight: 500;
  opacity: 0.85;
}

:deep(.sql-type-keyword) {
  color: var(--sql-type-keyword);
}

:deep(.sql-type-precision) {
  color: var(--sql-type-muted);
}

:deep(.sql-type-modifier) {
  color: var(--sql-type-muted);
}

:deep(.sql-hover-schema-more) {
  appearance: none;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--sql-hover-more);
  font-size: calc(11px * var(--sql-ui-scale));
  line-height: 1.2;
  text-align: left;
  cursor: pointer;
}

:deep(.sql-hover-schema-more:hover) {
  color: var(--sql-editor-text);
}

:deep(.cm-tooltip-autocomplete ul li[aria-selected='true']) {
  background: var(--sql-editor-selected-item);
  color: var(--sql-editor-text);
  box-shadow: inset 1.5px 0 0 var(--sql-hover-row-accent);
}

:deep(.cm-tooltip-autocomplete ul li) {
  padding: calc(5px * var(--sql-ui-scale)) calc(10px * var(--sql-ui-scale));
  border-bottom: none;
}

:deep(.cm-tooltip-autocomplete ul) {
  max-height: calc(320px * var(--sql-ui-scale));
  scrollbar-width: thin;
}

:deep(.cm-completionDetail) {
  color: var(--sql-editor-detail);
  opacity: 0.85;
  font-size: calc(11.5px * var(--sql-ui-scale));
}

:deep(.cm-tooltip-autocomplete ul::-webkit-scrollbar) {
  width: calc(6px * var(--sql-ui-scale));
}

:deep(.cm-tooltip-autocomplete ul::-webkit-scrollbar-thumb) {
  background: rgba(148, 163, 184, 0.3);
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
