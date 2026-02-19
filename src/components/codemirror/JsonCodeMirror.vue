<template>
  <div
    :class="[
      'relative codemirror-editor-container',
      isDarkTheme ? 'json-cm-dark' : 'json-cm-light'
    ]"
    :style="containerStyle"
  >
    <div ref="editorHost" class="h-full w-full" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { basicSetup } from 'codemirror'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { syntaxTree } from '@codemirror/language'

interface Props {
  modelValue?: string
  readOnly?: boolean
  fillParent?: boolean
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  readOnly: false,
  fillParent: false,
  height: '500px'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'save-shortcut'): void
  (e: 'format-shortcut'): void
}>()

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

const containerStyle = computed(() => {
  if (props.fillParent) {
    return { height: '100%' }
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
  editorView.value?.destroy()
  editorView.value = null
})

defineExpose({
  focusLine,
  focusOffset,
  focus,
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
  --json-editor-active-line: rgba(15, 23, 42, 0.06);
  --json-editor-selection-bg: rgba(13, 148, 136, 0.24);
  --json-editor-text: #0f172a;
}

.json-cm-dark {
  --json-editor-bg: var(--color-gray-900);
  --json-editor-gutter-bg: var(--color-gray-850);
  --json-editor-border: rgba(148, 163, 184, 0.22);
  --json-editor-active-line: rgba(13, 148, 136, 0.09);
  --json-editor-selection-bg: rgba(20, 184, 166, 0.34);
  --json-editor-text: #e5e7eb;
}

:deep(.cm-editor) {
  font-family: 'JetBrains Mono', 'Fira Code', 'SFMono-Regular', ui-monospace, Menlo, monospace;
  font-size: calc(13.5px * var(--sql-editor-font-scale, 1));
  line-height: 1.5;
  background: var(--json-editor-bg);
  color: var(--json-editor-text);
}

:deep(.cm-content) {
  padding: 10px 0;
}

:deep(.cm-line) {
  padding: 0 14px;
}

:deep(.cm-gutters) {
  border-right: 1px solid var(--json-editor-border);
  background: var(--json-editor-gutter-bg);
}

:deep(.cm-activeLine) {
  background: var(--json-editor-active-line);
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
</style>
