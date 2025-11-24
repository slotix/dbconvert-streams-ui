<!-- Read-only SQL viewer with syntax highlighting and copy functionality -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import CopyButton from '@/components/common/CopyButton.vue'

interface Props {
  code: string
  title?: string
  index?: number | string
  dialect?: string
  compact?: boolean
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'SQL',
  dialect: 'sql',
  compact: false,
  height: '300px'
})

const editorRef = ref<InstanceType<typeof MonacoEditor>>()

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
const editorOptions = computed<Record<string, any>>(() => ({
  readOnly: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 14,
  lineNumbers: 'on',
  glyphMargin: false,
  folding: true,
  lineDecorationsWidth: 10,
  lineNumbersMinChars: 3,
  renderLineHighlight: 'none',
  scrollbar: {
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
    useShadows: false
  },
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  overviewRulerBorder: false,
  wordWrap: props.compact ? 'off' : 'on',
  contextmenu: false
}))

const handleEditorMount = (editor: any) => {
  // Format SQL on mount
  setTimeout(() => {
    editor.getAction('editor.action.formatDocument')?.run()
  }, 100)
}
</script>

<template>
  <div
    class="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
    >
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ index ? `${title} ${index}` : title }}
      </span>
      <CopyButton :text="code" />
    </div>

    <!-- Monaco Editor -->
    <div class="bg-white dark:bg-gray-900">
      <MonacoEditor
        ref="editorRef"
        :model-value="code"
        :language="monacoLanguage"
        :height="height"
        :read-only="true"
        :options="editorOptions"
        @mount="handleEditorMount"
      />
    </div>
  </div>
</template>
