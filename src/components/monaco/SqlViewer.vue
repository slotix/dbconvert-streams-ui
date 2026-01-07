<!-- Read-only SQL viewer with syntax highlighting and copy functionality -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import CopyButton from '@/components/common/CopyButton.vue'

import type * as MonacoTypes from 'monaco-editor'

type MonacoApi = typeof import('monaco-editor')

interface Props {
  code: string
  title?: string
  index?: number | string
  dialect?: string
  compact?: boolean
  height?: string
  showHeader?: boolean
  autoResize?: boolean
  minHeight?: number
  maxHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: 'SQL',
  dialect: 'sql',
  compact: false,
  showHeader: true,
  height: '200px',
  autoResize: false,
  minHeight: 96,
  maxHeight: 480
})

const editorRef = ref<InstanceType<typeof MonacoEditor>>()
const editorHeight = ref<string>(props.height)

watch(
  () => props.height,
  (newHeight) => {
    if (!props.autoResize) {
      editorHeight.value = newHeight
    }
  }
)

// Determine Monaco language based on dialect
const monacoLanguage = computed(() => {
  const dialect = props.dialect.toLowerCase()

  // Monaco supports these SQL dialects
  if (dialect.includes('mysql')) return 'mysql'
  if (dialect.includes('pgsql') || dialect.includes('postgres')) return 'pgsql'
  if (dialect.includes('mssql') || dialect.includes('sqlserver')) return 'sql'

  // Default to generic SQL
  return 'sql'
})

// Monaco editor options for read-only SQL viewing
const editorOptions = computed<MonacoTypes.editor.IEditorOptions>(() => ({
  readOnly: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 14,
  padding: { top: 12 },
  lineNumbers: 'on',
  glyphMargin: false,
  folding: true,
  lineDecorationsWidth: 10,
  lineNumbersMinChars: 3,
  renderLineHighlight: 'none',
  scrollbar: {
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
    alwaysConsumeMouseWheel: false
  },
  wordWrap: props.compact ? 'off' : 'on',
  contextmenu: true,
  automaticLayout: true
}))

const clampHeight = (rawHeight: number, lineHeight = 20, lineCount = 1) => {
  const contentBasedMin = (Math.max(lineCount, 1) + 1) * lineHeight + 12
  const min = Math.max(80, props.minHeight, contentBasedMin)
  const max = Math.max(min, props.maxHeight)
  const clamped = Math.min(max, Math.max(min, Math.round(rawHeight)))
  editorHeight.value = `${clamped}px`
}

const handleEditorMount = (
  editor: MonacoTypes.editor.IStandaloneCodeEditor,
  monacoInstance?: MonacoApi
) => {
  const updateHeight = (contentHeight?: number) => {
    if (!props.autoResize) return

    const model = editor.getModel()
    const editorOptions = monacoInstance?.editor?.EditorOption
    const optionValue = editorOptions ? editor.getOption(editorOptions.lineHeight) : null
    const lineHeight = typeof optionValue === 'number' && optionValue > 0 ? optionValue : 20
    const lineCount = model?.getLineCount() || 1
    const measuredHeight =
      typeof contentHeight === 'number' ? contentHeight : lineCount * lineHeight

    clampHeight(measuredHeight + 16, lineHeight, lineCount)
    editor.layout()
  }

  // Format SQL and blur to prevent focus stealing
  setTimeout(() => {
    editor.getAction('editor.action.formatDocument')?.run()
    // Blur the editor to prevent focus stealing - use DOM element
    const domNode = editor.getDomNode()
    if (domNode) {
      ;(document.activeElement as HTMLElement)?.blur()
    }
    updateHeight()
  }, 50)

  // Keep height in sync with content size (word wrap, formatting, etc.)
  editor.onDidContentSizeChange((event: MonacoTypes.editor.IContentSizeChangedEvent) =>
    updateHeight(event.contentHeight)
  )
  updateHeight()
}
</script>

<template>
  <div
    class="group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30"
  >
    <!-- Header -->
    <div
      v-if="showHeader"
      class="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
    >
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ index ? `${title} ${index}` : title }}
      </span>
    </div>

    <!-- Monaco Editor -->
    <div class="relative bg-white dark:bg-gray-900">
      <div
        class="absolute right-3 top-3 z-10 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
      >
        <CopyButton
          :text="code"
          button-class="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-200 bg-white/90 dark:bg-gray-850/90 border border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-sm"
          icon-class="text-gray-500 dark:text-gray-400"
        >
          Copy
        </CopyButton>
      </div>
      <MonacoEditor
        ref="editorRef"
        :model-value="code"
        :language="monacoLanguage"
        :height="editorHeight"
        :read-only="true"
        :options="editorOptions"
        @mount="handleEditorMount"
      />
    </div>
  </div>
</template>
