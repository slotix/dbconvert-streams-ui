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
import { EditorView, keymap } from '@codemirror/view'
import { sql, MySQL, PostgreSQL } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { type Diagnostic, setDiagnostics } from '@codemirror/lint'
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
const LSP_RECONNECT_BASE_DELAY_MS = 600
const LSP_RECONNECT_MAX_DELAY_MS = 8_000
const LSP_RECONNECT_JITTER_RATIO = 0.2
const HOVER_REQUEST_DELAY_MS = 280
const MAX_HOVER_TEXT_CHARS = 4_000

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

interface LspRange {
  start?: LspPosition
  end?: LspPosition
}

interface LspDiagnostic {
  range?: LspRange
  severity?: number
  message?: string
  source?: string
}

interface LspPublishDiagnosticsParams {
  uri?: string
  diagnostics?: LspDiagnostic[]
}

interface LspMarkedStringObject {
  language?: string
  value?: string
}

interface LspMarkupContent {
  kind?: string
  value?: string
}

type LspHoverContents =
  | string
  | LspMarkedStringObject
  | LspMarkupContent
  | Array<string | LspMarkedStringObject>

interface LspHoverResult {
  contents?: LspHoverContents
  range?: LspRange
}

interface EditorDocLineLike {
  number: number
  from: number
  to: number
  length: number
}

interface EditorDocLike {
  length: number
  lines: number
  lineAt: (pos: number) => EditorDocLineLike
  line: (n: number) => EditorDocLineLike
  sliceString: (from: number, to: number) => string
}

interface EditorSelectionMainLike {
  empty: boolean
  from: number
  to: number
}

interface EditorStateLike {
  doc: EditorDocLike
  selection: {
    main: EditorSelectionMainLike
  }
}

interface HoverMarkdownTable {
  headers: string[]
  rows: string[][]
}

type HoverMarkdownBlock =
  | { type: 'heading'; text: string }
  | { type: 'table'; table: HoverMarkdownTable }
  | { type: 'text'; text: string }

interface JsonRpcResponse {
  id?: number | string
  result?: unknown
  error?: {
    code: number
    message: string
  }
}

interface JsonRpcNotification {
  method?: string
  params?: unknown
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
let hoverRequestToken = 0
let hoverTooltipEl: HTMLDivElement | null = null
let hoverActiveKey = ''
let hoverMouseOverListener: ((event: MouseEvent) => void) | null = null
let hoverMouseLeaveListener: (() => void) | null = null
let hoverMouseDownListener: (() => void) | null = null
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

function toLspPosition(state: EditorStateLike, position: number): LspPosition {
  const line = state.doc.lineAt(position)
  return {
    line: Math.max(line.number - 1, 0),
    character: Math.max(position - line.from, 0)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function fromLspPosition(state: EditorStateLike, pos: LspPosition): number {
  const safeLine = clamp(pos.line + 1, 1, Math.max(state.doc.lines, 1))
  const line = state.doc.line(safeLine)
  const safeCharacter = clamp(pos.character, 0, line.length)
  return line.from + safeCharacter
}

function mapLspSeverity(severity: number | undefined): Diagnostic['severity'] {
  switch (severity) {
    case 1:
      return 'error'
    case 2:
      return 'warning'
    default:
      return 'info'
  }
}

function toCodeMirrorDiagnostic(
  state: EditorStateLike,
  diagnostic: LspDiagnostic
): Diagnostic | null {
  if (!diagnostic.range?.start || !diagnostic.range?.end || !diagnostic.message) {
    return null
  }

  const from = fromLspPosition(state, diagnostic.range.start)
  const to = Math.max(from, fromLspPosition(state, diagnostic.range.end))

  return {
    from,
    to,
    severity: mapLspSeverity(diagnostic.severity),
    message: diagnostic.message,
    source: diagnostic.source
  }
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

function decodeHoverHtmlEntities(value: string): string {
  if (!value.includes('&')) {
    return value
  }

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = value
    return textarea.value
  }

  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
}

function normalizeHoverText(value: string): string {
  if (!value) {
    return ''
  }
  const decoded = decodeHoverHtmlEntities(value)
  const normalized = decoded.split('\r\n').join('\n').replaceAll('\u00a0', ' ').trim()
  if (normalized.length <= MAX_HOVER_TEXT_CHARS) {
    return normalized
  }
  return `${normalized.slice(0, MAX_HOVER_TEXT_CHARS)}...`
}

function toHoverText(contents: LspHoverContents | undefined): string {
  if (!contents) {
    return ''
  }
  if (typeof contents === 'string') {
    return normalizeHoverText(contents)
  }
  if (Array.isArray(contents)) {
    return normalizeHoverText(
      contents
        .map((entry) => {
          if (typeof entry === 'string') {
            return entry
          }
          return entry.value || ''
        })
        .filter(Boolean)
        .join('\n\n')
    )
  }
  if (typeof contents.value === 'string') {
    return normalizeHoverText(contents.value)
  }
  return ''
}

function normalizeMarkdownInline(value: string): string {
  let normalized = value.trim()
  if (normalized.startsWith('`') && normalized.endsWith('`') && normalized.length >= 2) {
    normalized = normalized.slice(1, -1)
  }
  return normalized.replaceAll('\\|', '|').replace(/`([^`]+)`/g, '$1')
}

function parseMarkdownTableRow(line: string): string[] {
  let normalized = line.trim()
  if (normalized.startsWith('|')) {
    normalized = normalized.slice(1)
  }
  if (normalized.endsWith('|')) {
    normalized = normalized.slice(0, -1)
  }
  return normalized.split('|').map((cell) => normalizeMarkdownInline(cell.trim()))
}

function isMarkdownTableRow(line: string): boolean {
  return line.includes('|')
}

function isMarkdownTableDivider(line: string): boolean {
  const cells = parseMarkdownTableRow(line)
  if (!cells.length) {
    return false
  }
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.replaceAll(' ', '')))
}

function parseMarkdownBlocks(text: string): HoverMarkdownBlock[] {
  const lines = text.split('\n')
  const blocks: HoverMarkdownBlock[] = []
  let i = 0

  while (i < lines.length) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      i += 1
      continue
    }

    const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        text: normalizeMarkdownInline(headingMatch[1])
      })
      i += 1
      continue
    }

    if (
      i + 1 < lines.length &&
      isMarkdownTableRow(trimmed) &&
      isMarkdownTableDivider(lines[i + 1])
    ) {
      const headers = parseMarkdownTableRow(trimmed)
      const rows: string[][] = []
      i += 2

      while (i < lines.length) {
        const rowLine = lines[i].trim()
        if (!rowLine || !isMarkdownTableRow(rowLine)) {
          break
        }
        rows.push(parseMarkdownTableRow(rowLine))
        i += 1
      }

      blocks.push({
        type: 'table',
        table: { headers, rows }
      })
      continue
    }

    const paragraph: string[] = []
    while (i < lines.length) {
      const line = lines[i]
      const lineTrimmed = line.trim()
      if (!lineTrimmed) {
        i += 1
        if (paragraph.length) {
          break
        }
        continue
      }

      const nextIsHeading = /^#{1,6}\s+/.test(lineTrimmed)
      const nextIsTable =
        i + 1 < lines.length &&
        isMarkdownTableRow(lineTrimmed) &&
        isMarkdownTableDivider(lines[i + 1])
      if (nextIsHeading || nextIsTable) {
        if (!paragraph.length) {
          break
        }
        break
      }

      paragraph.push(line)
      i += 1
    }

    if (paragraph.length) {
      blocks.push({
        type: 'text',
        text: paragraph.join('\n').trim()
      })
      continue
    }

    i += 1
  }

  return blocks
}

function createHoverTextBlock(text: string): HTMLElement {
  const pre = document.createElement('pre')
  pre.className = 'sql-hover-tooltip-text'
  pre.textContent = text
  return pre
}

function createHoverTableBlock(tableData: HoverMarkdownTable): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'sql-hover-tooltip-table-wrap'

  const table = document.createElement('table')
  table.className = 'sql-hover-tooltip-table'

  const columnCount = Math.max(
    tableData.headers.length,
    ...tableData.rows.map((row) => row.length),
    0
  )

  if (tableData.headers.length) {
    const thead = document.createElement('thead')
    const headerRow = document.createElement('tr')
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const th = document.createElement('th')
      th.textContent = tableData.headers[columnIndex] || ''
      headerRow.appendChild(th)
    }
    thead.appendChild(headerRow)
    table.appendChild(thead)
  }

  const tbody = document.createElement('tbody')
  for (const row of tableData.rows) {
    const tr = document.createElement('tr')
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const td = document.createElement('td')
      td.textContent = row[columnIndex] || ''
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
  table.appendChild(tbody)

  wrapper.appendChild(table)
  return wrapper
}

function renderHoverTooltipContent(container: HTMLDivElement, text: string) {
  container.textContent = ''

  const root = document.createElement('div')
  root.className = 'sql-hover-tooltip-content'

  const blocks = parseMarkdownBlocks(text)
  if (!blocks.length) {
    root.appendChild(createHoverTextBlock(text))
    container.appendChild(root)
    return
  }

  for (const block of blocks) {
    if (block.type === 'heading') {
      const heading = document.createElement('div')
      heading.className = 'sql-hover-tooltip-heading'
      heading.textContent = block.text
      root.appendChild(heading)
      continue
    }
    if (block.type === 'table') {
      root.appendChild(createHoverTableBlock(block.table))
      continue
    }
    root.appendChild(createHoverTextBlock(block.text))
  }

  container.appendChild(root)
}

function isWordCharacter(char: string): boolean {
  return /[\w$]/.test(char)
}

function getWordRangeAtPosition(state: EditorStateLike, pos: number) {
  const docLength = state.doc.length
  if (docLength === 0) {
    return null
  }

  const clampedPos = clamp(pos, 0, docLength)
  let from = clampedPos
  let to = clampedPos

  while (from > 0 && isWordCharacter(state.doc.sliceString(from - 1, from))) {
    from -= 1
  }
  while (to < docLength && isWordCharacter(state.doc.sliceString(to, to + 1))) {
    to += 1
  }

  if (from === to) {
    return null
  }

  return {
    from,
    to,
    text: state.doc.sliceString(from, to)
  }
}

function clearHoverTimer() {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
}

function hideHoverTooltip(resetKey = true) {
  clearHoverTimer()
  hoverRequestToken += 1
  if (resetKey) {
    hoverActiveKey = ''
  }
  if (!hoverTooltipEl) {
    return
  }
  hoverTooltipEl.remove()
  hoverTooltipEl = null
}

function ensureHoverTooltipElement(): HTMLDivElement | null {
  const container = editorHost.value?.parentElement
  if (!container) {
    return null
  }

  if (!hoverTooltipEl) {
    const el = document.createElement('div')
    el.className = 'sql-hover-tooltip-floating'
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

function showHoverTooltip(text: string, view: EditorView, from: number, to: number) {
  const el = ensureHoverTooltipElement()
  if (!el) {
    return
  }
  renderHoverTooltipContent(el, text)
  positionHoverTooltip(el, view, from, to)
}

async function requestHoverAtPosition(view: EditorView, pos: number, hoverKey: string) {
  const token = ++hoverRequestToken
  flushPendingDidChangeNotification()

  const response = await sendLspRequest('textDocument/hover', {
    textDocument: { uri: textDocumentUri },
    position: toLspPosition(view.state, pos)
  }).catch(() => null)

  if (token !== hoverRequestToken || hoverKey !== hoverActiveKey) {
    return
  }

  const hover = response as LspHoverResult | null
  const text = toHoverText(hover?.contents)
  if (!text) {
    hideHoverTooltip(false)
    return
  }

  const fallbackRange = getWordRangeAtPosition(view.state, pos)
  const start = hover?.range?.start
    ? fromLspPosition(view.state, hover.range.start)
    : (fallbackRange?.from ?? pos)
  const end = hover?.range?.end
    ? fromLspPosition(view.state, hover.range.end)
    : (fallbackRange?.to ?? pos)
  showHoverTooltip(text, view, Math.min(start, end), Math.max(start, end))
}

function handleHoverMouseMove(event: MouseEvent, view: EditorView): boolean {
  if (!shouldEnableLsp.value || !lspReady || props.readOnly) {
    hideHoverTooltip()
    return false
  }
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
}

function attachHoverDomListeners(view: EditorView) {
  detachHoverDomListeners(view)
  hoverMouseOverListener = (event: MouseEvent) => {
    void handleHoverMouseMove(event, view)
  }
  hoverMouseLeaveListener = () => {
    hideHoverTooltip()
  }
  hoverMouseDownListener = () => {
    hideHoverTooltip()
  }

  view.dom.addEventListener('mouseover', hoverMouseOverListener, { passive: true })
  view.dom.addEventListener('mouseleave', hoverMouseLeaveListener)
  view.dom.addEventListener('mousedown', hoverMouseDownListener)
}

function getHasSelection(state: EditorStateLike): boolean {
  return !state.selection.main.empty
}

function toMonacoLikeRange(state: EditorStateLike) {
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
      lspCompartment.of(getLspEditorExtensions()),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !suppressModelSync) {
          emit('update:modelValue', update.state.doc.toString())
        }
        if (update.selectionSet) {
          hideHoverTooltip()
        }
        if (update.docChanged) {
          scheduleDidChangeNotification(update.state.doc.toString())
          hideHoverTooltip()
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
  detachHoverDomListeners(editorView.value)
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
  --sql-hover-card-border: var(--sql-editor-popup-border);
  --sql-hover-heading: var(--sql-editor-text);
  --sql-hover-table-header-bg: rgba(15, 23, 42, 0.045);
  --sql-hover-table-row-alt: rgba(15, 23, 42, 0.02);
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
  --sql-hover-card-border: var(--sql-editor-popup-border);
  --sql-hover-heading: var(--sql-editor-text);
  --sql-hover-table-header-bg: rgba(148, 163, 184, 0.1);
  --sql-hover-table-row-alt: rgba(148, 163, 184, 0.04);
}

:deep(.cm-editor) {
  font-family: 'JetBrains Mono', 'Fira Code', 'SFMono-Regular', ui-monospace, Menlo, monospace;
  font-size: calc(13.5px * var(--sql-editor-font-scale, 1));
  line-height: 1.5;
  caret-color: #2dd4bf;
  background: var(--sql-editor-bg);
  color: var(--sql-editor-text);
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
  z-index: 120;
}

:deep(.sql-hover-tooltip-floating) {
  position: absolute;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
  border-radius: 10px;
  border: 1px solid var(--sql-hover-card-border);
  background: var(--sql-hover-card-bg);
  color: var(--sql-editor-text);
  box-shadow: 0 10px 35px rgba(0, 0, 0, 0.45);
  max-width: min(720px, 82vw);
  max-height: min(420px, 58vh);
  overflow: auto;
  scrollbar-width: thin;
  z-index: 130;
  font-size: 13px;
  line-height: 1.45;
  padding: 10px 12px;
}

:deep(.sql-hover-tooltip-content) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

:deep(.sql-hover-tooltip-heading) {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--sql-hover-heading);
}

:deep(.sql-hover-tooltip-text) {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--sql-editor-text);
}

:deep(.sql-hover-tooltip-table-wrap) {
  overflow: auto;
  border: 1px solid var(--sql-hover-card-border);
  border-radius: 8px;
  background: transparent;
}

:deep(.sql-hover-tooltip-table) {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: auto;
  font-size: 12px;
  line-height: 1.4;
}

:deep(.sql-hover-tooltip-table th),
:deep(.sql-hover-tooltip-table td) {
  padding: 7px 10px;
  border-bottom: 1px solid var(--sql-editor-border);
  border-right: 1px solid var(--sql-editor-border);
  text-align: left;
  vertical-align: top;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  max-width: 280px;
  color: var(--sql-editor-text);
}

:deep(.sql-hover-tooltip-table th:last-child),
:deep(.sql-hover-tooltip-table td:last-child) {
  border-right: none;
}

:deep(.sql-hover-tooltip-table tr:last-child td) {
  border-bottom: none;
}

:deep(.sql-hover-tooltip-table th) {
  font-weight: 600;
  background: var(--sql-hover-table-header-bg);
  color: var(--sql-hover-heading);
}

:deep(.sql-hover-tooltip-table tbody tr:nth-child(even) td) {
  background: var(--sql-hover-table-row-alt);
}

:deep(.sql-hover-tooltip-floating::-webkit-scrollbar) {
  width: 8px;
}

:deep(.sql-hover-tooltip-floating::-webkit-scrollbar-thumb) {
  background: rgba(148, 163, 184, 0.4);
  border-radius: 999px;
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
