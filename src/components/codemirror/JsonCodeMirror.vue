<template>
  <div
    ref="editorContainerRef"
    :class="[
      'relative codemirror-editor-container',
      isDarkTheme ? 'json-cm-dark' : 'json-cm-light'
    ]"
    :style="containerStyle"
  >
    <div ref="editorHost" class="h-full w-full" />
    <button
      v-if="showResizeGrip"
      type="button"
      class="json-code-resize-grip absolute bottom-0 right-0 z-10 cursor-nwse-resize"
      aria-label="Resize JSON editor"
      title="Resize JSON editor"
      @mousedown="startResize"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { basicSetup } from 'codemirror'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { openSearchPanel, search, searchKeymap } from '@codemirror/search'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { syntaxTree } from '@codemirror/language'

interface Props {
  modelValue?: string
  readOnly?: boolean
  fillParent?: boolean
  height?: string
  resizable?: boolean
  minHeight?: number
  maxHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  readOnly: false,
  fillParent: false,
  height: '500px',
  resizable: true,
  minHeight: 240,
  maxHeight: 1400
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'save-shortcut'): void
  (e: 'format-shortcut'): void
}>()

const editorContainerRef = ref<HTMLElement | null>(null)
const editorHost = ref<HTMLElement | null>(null)
const editorView = shallowRef<EditorView | null>(null)
const themeStore = useThemeStore()

const readOnlyCompartment = new Compartment()
const themeCompartment = new Compartment()
const editorLayout = EditorView.theme({
  '&': { height: '100%' },
  '.cm-scroller': { overflow: 'auto' }
})

let suppressModelSync = false
const manualHeightPx = ref<number | null>(null)
let resizeMoveListener: ((event: MouseEvent) => void) | null = null
let resizeUpListener: (() => void) | null = null
let isResizing = false

const showResizeGrip = computed(() => props.resizable && !props.fillParent)

const containerStyle = computed(() => {
  if (props.fillParent) {
    return { height: '100%' }
  }

  if (manualHeightPx.value !== null) {
    return { height: `${manualHeightPx.value}px` }
  }

  return { height: props.height }
})

const isDarkTheme = computed(() => {
  if (themeStore.isDark) {
    return true
  }
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark')
  }
  return false
})

function getThemeExtension(isDark: boolean) {
  return isDark ? oneDark : []
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function parsePxHeight(value: string): number | null {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function cleanupResizeListeners() {
  if (resizeMoveListener) {
    window.removeEventListener('mousemove', resizeMoveListener)
    resizeMoveListener = null
  }
  if (resizeUpListener) {
    window.removeEventListener('mouseup', resizeUpListener)
    resizeUpListener = null
  }
}

function stopResize() {
  if (!isResizing) return
  isResizing = false
  cleanupResizeListeners()
  if (typeof document !== 'undefined') {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
}

function startResize(event: MouseEvent) {
  if (!showResizeGrip.value) return
  event.preventDefault()

  const computedHeightValue =
    editorContainerRef.value && typeof window !== 'undefined' && typeof document !== 'undefined'
      ? parsePxHeight(getComputedStyle(editorContainerRef.value).height)
      : null
  const effectiveHeightValue = parsePxHeight(props.height)

  const startHeight = manualHeightPx.value ?? computedHeightValue ?? effectiveHeightValue ?? 500
  const startY = event.clientY
  const minHeight = props.minHeight
  const maxHeight = props.maxHeight
  manualHeightPx.value = clamp(startHeight, minHeight, maxHeight)

  resizeMoveListener = (moveEvent: MouseEvent) => {
    const delta = moveEvent.clientY - startY
    manualHeightPx.value = clamp(startHeight + delta, minHeight, maxHeight)
  }
  resizeUpListener = () => stopResize()
  window.addEventListener('mousemove', resizeMoveListener)
  window.addEventListener('mouseup', resizeUpListener)

  if (typeof document !== 'undefined') {
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }
  isResizing = true
}

function syncEditorValue(nextValue: string) {
  const view = editorView.value
  if (!view) {
    return
  }
  const currentValue = view.state.doc.toString()
  if (currentValue === nextValue) {
    return
  }

  suppressModelSync = true
  view.dispatch({
    changes: {
      from: 0,
      to: currentValue.length,
      insert: nextValue
    }
  })
  suppressModelSync = false
}

function getLineNumberInRange(lineNumber: number, maxLines: number): number {
  if (!Number.isFinite(lineNumber)) return 1
  return Math.max(1, Math.min(Math.floor(lineNumber), maxLines))
}

function focusLine(lineNumber: number) {
  const view = editorView.value
  if (!view) {
    return
  }

  const safeLine = getLineNumberInRange(lineNumber, view.state.doc.lines)
  const line = view.state.doc.line(safeLine)

  view.dispatch({
    selection: { anchor: line.from },
    effects: EditorView.scrollIntoView(line.from, { y: 'center' })
  })
  view.focus()
}

function focusOffset(offset: number) {
  const view = editorView.value
  if (!view) {
    return
  }

  const safeOffset = Math.max(0, Math.min(offset, view.state.doc.length))
  view.dispatch({
    selection: { anchor: safeOffset },
    effects: EditorView.scrollIntoView(safeOffset, { y: 'center' })
  })
  view.focus()
}

function focus() {
  editorView.value?.focus()
}

function openSearch() {
  const view = editorView.value
  if (!view) return
  openSearchPanel(view)
  view.focus()
}

function getFirstSyntaxErrorLine(): number | undefined {
  const offset = getFirstSyntaxErrorOffset()
  const view = editorView.value
  if (!view || offset === undefined) {
    return undefined
  }
  return view.state.doc.lineAt(offset).number
}

function getFirstSyntaxErrorOffset(): number | undefined {
  const view = editorView.value
  if (!view) {
    return undefined
  }

  const cursor = syntaxTree(view.state).cursor()
  do {
    if (cursor.type.isError || cursor.name === '⚠') {
      return cursor.from
    }
  } while (cursor.next())

  return undefined
}

function getLikelySyntaxIssueHint(): string | undefined {
  const view = editorView.value
  const errorOffset = getFirstSyntaxErrorOffset()
  if (!view || errorOffset === undefined) {
    return undefined
  }

  const doc = view.state.doc
  const errorLine = doc.lineAt(errorOffset)
  const errorLineText = errorLine.text.trim()
  const keyMatch = errorLineText.match(/^"([^"]+)"\s*:/)
  if (!keyMatch) {
    return undefined
  }

  let previousLineNumber = errorLine.number - 1
  while (previousLineNumber > 0) {
    const candidate = doc.line(previousLineNumber).text.trim()
    if (candidate.length > 0) {
      const looksLikeMissingComma =
        !candidate.endsWith(',') &&
        !candidate.endsWith('{') &&
        !candidate.endsWith('[') &&
        !candidate.endsWith(':')
      if (looksLikeMissingComma) {
        return `Likely missing ',' before "${keyMatch[1]}".`
      }
      return undefined
    }
    previousLineNumber--
  }

  return undefined
}

function mountEditor() {
  if (!editorHost.value || editorView.value) {
    return
  }

  const shortcuts = keymap.of([
    {
      key: 'Mod-f',
      preventDefault: true,
      run: (view) => {
        openSearchPanel(view)
        return true
      }
    },
    ...searchKeymap,
    {
      key: 'Mod-s',
      preventDefault: true,
      run: () => {
        emit('save-shortcut')
        return true
      }
    },
    {
      key: 'Mod-Shift-f',
      preventDefault: true,
      run: () => {
        emit('format-shortcut')
        return true
      }
    },
    indentWithTab
  ])

  const state = EditorState.create({
    doc: props.modelValue ?? '',
    extensions: [
      shortcuts,
      basicSetup,
      search(),
      json(),
      editorLayout,
      readOnlyCompartment.of(EditorState.readOnly.of(props.readOnly)),
      themeCompartment.of(getThemeExtension(isDarkTheme.value)),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged || suppressModelSync) {
          return
        }
        emit('update:modelValue', update.state.doc.toString())
      })
    ]
  })

  editorView.value = new EditorView({
    state,
    parent: editorHost.value
  })
}

onMounted(() => {
  mountEditor()
})

watch(
  () => props.modelValue,
  (nextValue) => {
    syncEditorValue(nextValue ?? '')
  }
)

watch(
  () => props.readOnly,
  (nextReadOnly) => {
    const view = editorView.value
    if (!view) {
      return
    }
    view.dispatch({
      effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(nextReadOnly))
    })
  }
)

watch(isDarkTheme, (darkModeEnabled) => {
  const view = editorView.value
  if (!view) {
    return
  }
  view.dispatch({
    effects: themeCompartment.reconfigure(getThemeExtension(darkModeEnabled))
  })
})

onBeforeUnmount(() => {
  stopResize()
  editorView.value?.destroy()
  editorView.value = null
})

defineExpose({
  focusLine,
  focusOffset,
  focus,
  openSearch,
  getFirstSyntaxErrorLine,
  getFirstSyntaxErrorOffset,
  getLikelySyntaxIssueHint
})
</script>

<style scoped>
.json-cm-light {
  --json-editor-bg: #ffffff;
  --json-editor-gutter-bg: #f8fafc;
  --json-editor-border: rgba(148, 163, 184, 0.25);
  --json-editor-popup-bg: #ffffff;
  --json-editor-popup-border: rgba(148, 163, 184, 0.35);
  --json-editor-active-line: rgba(15, 23, 42, 0.06);
  --json-editor-selected-item: rgba(13, 148, 136, 0.18);
  --json-editor-selection-bg: rgba(13, 148, 136, 0.24);
  --json-editor-text: #0f172a;
  --json-editor-gutter-text: #64748b;
  --json-editor-active-gutter-text: #0f766e;
  --json-editor-active-gutter-bg: rgba(20, 184, 166, 0.16);
  --json-search-panel-bg: var(--json-editor-popup-bg);
  --json-search-panel-border: rgba(148, 163, 184, 0.15);
  --json-search-input-bg: #ffffff;
  --json-search-input-border: rgba(148, 163, 184, 0.35);
  --json-search-input-text: #0f172a;
  --json-search-input-focus: rgba(139, 92, 246, 0.7);
  --json-search-input-focus-ring: rgba(139, 92, 246, 0.18);
  --json-search-button-bg: rgba(0, 0, 0, 0.05);
  --json-search-button-border: rgba(148, 163, 184, 0.35);
  --json-search-button-hover: rgba(20, 184, 166, 0.12);
  --json-search-checkbox-border: rgba(100, 116, 139, 0.6);
  --json-search-muted: #64748b;
}

.json-cm-dark {
  --json-editor-bg: var(--color-gray-900);
  --json-editor-gutter-bg: var(--color-gray-850);
  --json-editor-border: rgba(148, 163, 184, 0.22);
  --json-editor-popup-bg: var(--color-gray-850);
  --json-editor-popup-border: rgba(148, 163, 184, 0.28);
  --json-editor-active-line: rgba(13, 148, 136, 0.09);
  --json-editor-selected-item: rgba(13, 148, 136, 0.25);
  --json-editor-selection-bg: rgba(20, 184, 166, 0.34);
  --json-editor-text: #e5e7eb;
  --json-editor-gutter-text: #6b7280;
  --json-editor-active-gutter-text: #5eead4;
  --json-editor-active-gutter-bg: rgba(20, 184, 166, 0.18);
  --json-search-panel-bg: var(--json-editor-popup-bg);
  --json-search-panel-border: rgba(148, 163, 184, 0.1);
  --json-search-input-bg: #ffffff;
  --json-search-input-border: rgba(148, 163, 184, 0.2);
  --json-search-input-text: #0f172a;
  --json-search-input-focus: rgba(139, 92, 246, 0.7);
  --json-search-input-focus-ring: rgba(139, 92, 246, 0.2);
  --json-search-button-bg: rgba(255, 255, 255, 0.08);
  --json-search-button-border: rgba(148, 163, 184, 0.28);
  --json-search-button-hover: rgba(20, 184, 166, 0.18);
  --json-search-checkbox-border: rgba(148, 163, 184, 0.45);
  --json-search-muted: #9ca3af;
}

:deep(.cm-editor) {
  --json-ui-scale: var(--sql-editor-font-scale, 1);
  font-family: 'JetBrains Mono', 'Fira Code', 'SFMono-Regular', ui-monospace, Menlo, monospace;
  font-size: calc(13.5px * var(--json-ui-scale));
  line-height: 1.5;
  caret-color: #2dd4bf;
  background: var(--json-editor-bg);
  color: var(--json-editor-text);
}

:deep(.cm-cursor, .cm-dropCursor) {
  border-left-color: #2dd4bf !important;
}

:deep(.cm-content) {
  padding: calc(10px * var(--json-ui-scale)) 0;
  background: var(--json-editor-bg);
}

:deep(.cm-line) {
  padding: 0 calc(14px * var(--json-ui-scale));
}

:deep(.cm-gutters) {
  border-right: 1px solid var(--json-editor-border);
  background: var(--json-editor-gutter-bg);
}

:deep(.cm-lineNumbers .cm-gutterElement) {
  color: var(--json-editor-gutter-text);
}

:deep(.cm-activeLine) {
  background: var(--json-editor-active-line);
}

:deep(.cm-activeLineGutter) {
  color: var(--json-editor-active-gutter-text) !important;
  background: var(--json-editor-active-gutter-bg) !important;
}

:deep(.cm-selectionLayer) {
  mix-blend-mode: normal !important;
  z-index: 9 !important;
}

:deep(.cm-selectionLayer .cm-selectionBackground) {
  background: var(--json-editor-selection-bg) !important;
  border-radius: 2px;
}

:deep(.cm-content ::selection) {
  background: var(--json-editor-selection-bg);
  color: inherit;
}

:deep(.cm-panels) {
  background: var(--json-search-panel-bg);
  color: var(--json-editor-text);
  border-top: 1px solid var(--json-search-panel-border);
}

:deep(.cm-panels-bottom) {
  border-top: 1px solid var(--json-search-panel-border);
}

:deep(.cm-panel.cm-search) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: calc(6px * var(--json-ui-scale));
  padding: calc(8px * var(--json-ui-scale)) calc(12px * var(--json-ui-scale));
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  font-size: calc(12px * var(--json-ui-scale));
}

:deep(.cm-panel.cm-search br) {
  flex-basis: 100%;
  height: 0;
  margin: 0;
}

:deep(.cm-panel.cm-search label) {
  display: inline-flex;
  align-items: center;
  gap: calc(5px * var(--json-ui-scale));
  color: var(--json-search-muted);
  font-size: calc(11.5px * var(--json-ui-scale));
  cursor: pointer;
}

:deep(.cm-panel.cm-search input[type='text']) {
  min-width: calc(160px * var(--json-ui-scale));
  height: calc(27px * var(--json-ui-scale));
  padding: 0 9px;
  border-radius: 7px !important;
  border: 1px solid var(--json-search-input-border);
  background: var(--json-search-input-bg);
  color: var(--json-search-input-text);
  outline: none;
  font-size: calc(12px * var(--json-ui-scale));
  font-family: 'JetBrains Mono', 'Fira Code', 'SFMono-Regular', ui-monospace, Menlo, monospace;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

:deep(.cm-panel.cm-search input[type='text']:focus) {
  border-color: var(--json-search-input-focus);
  border-radius: 7px !important;
  box-shadow: 0 0 0 2px var(--json-search-input-focus-ring);
}

:deep(.cm-panel.cm-search input[type='checkbox']) {
  appearance: none;
  -webkit-appearance: none;
  width: calc(14px * var(--json-ui-scale));
  height: calc(14px * var(--json-ui-scale));
  margin: 0;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid var(--json-search-checkbox-border);
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
  background-size: calc(9px * var(--json-ui-scale));
  background-position: center;
  background-repeat: no-repeat;
}

:deep(.cm-panel.cm-search input[type='checkbox']:focus-visible) {
  outline: 2px solid rgba(20, 184, 166, 0.45);
  outline-offset: 1px;
}

:deep(.cm-panel.cm-search .cm-button) {
  height: calc(27px * var(--json-ui-scale));
  padding: 0 calc(10px * var(--json-ui-scale));
  border-radius: calc(7px * var(--json-ui-scale));
  border: 1px solid var(--json-search-button-border);
  background: var(--json-search-button-bg);
  color: var(--json-editor-text);
  cursor: pointer;
  font-size: calc(12px * var(--json-ui-scale));
  transition:
    background 0.15s,
    border-color 0.15s;
}

:deep(.cm-panel.cm-search .cm-button:hover) {
  background: var(--json-search-button-hover);
  border-color: rgba(20, 184, 166, 0.4);
}

:deep(.cm-panel.cm-search [name='close']) {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  width: calc(26px * var(--json-ui-scale));
  min-width: calc(26px * var(--json-ui-scale));
  height: calc(26px * var(--json-ui-scale));
  padding: 0;
  border: none;
  background: transparent;
  border-radius: calc(5px * var(--json-ui-scale));
  color: var(--json-search-muted);
  font-size: calc(16px * var(--json-ui-scale));
  line-height: 1;
  transition:
    color 0.15s,
    background 0.15s;
}

:deep(.cm-panel.cm-search [name='close']:hover) {
  color: var(--json-editor-text);
  background: rgba(148, 163, 184, 0.1);
}

.json-code-resize-grip {
  width: calc(18px * var(--sql-editor-font-scale, 1));
  height: calc(18px * var(--sql-editor-font-scale, 1));
  border: 0;
  border-radius: 0;
  background: transparent;
  color: rgba(107, 114, 128, 0.85);
}

.json-code-resize-grip::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(135deg, transparent 0 58%, currentColor 58% 62%, transparent 62% 100%),
    linear-gradient(135deg, transparent 0 70%, currentColor 70% 74%, transparent 74% 100%),
    linear-gradient(135deg, transparent 0 82%, currentColor 82% 86%, transparent 86% 100%);
  pointer-events: none;
}

.json-code-resize-grip:hover {
  color: rgba(20, 184, 166, 0.9);
}

:global(.dark) .json-code-resize-grip {
  color: rgba(156, 163, 175, 0.9);
}

:global(.dark) .json-code-resize-grip:hover {
  color: rgba(45, 212, 191, 0.95);
}
</style>
