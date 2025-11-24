<!-- Read-only JSON viewer with syntax highlighting, folding, and copy functionality -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import CopyButton from '@/components/common/CopyButton.vue'

interface Props {
  json: string | object
  title?: string
  height?: string
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'JSON',
  height: '300px',
  compact: false
})

const editorRef = ref<InstanceType<typeof MonacoEditor>>()

// Convert object to formatted JSON string
const jsonString = computed(() => {
  if (typeof props.json === 'string') {
    try {
      // Try to parse and re-stringify to ensure valid JSON
      const parsed = JSON.parse(props.json)
      return JSON.stringify(parsed, null, 2)
    } catch {
      // If parsing fails, return as-is
      return props.json
    }
  }
  return JSON.stringify(props.json, null, 2)
})

// Monaco editor options for read-only JSON viewing
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
  // Auto-fold to level 1 for compact view
  if (props.compact) {
    setTimeout(() => {
      editor.getAction('editor.foldLevel1')?.run()
    }, 100)
  }
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
        {{ title }}
      </span>
      <CopyButton :text="jsonString" />
    </div>

    <!-- Monaco Editor -->
    <div class="bg-white dark:bg-gray-900">
      <MonacoEditor
        ref="editorRef"
        :model-value="jsonString"
        language="json"
        :height="height"
        :read-only="true"
        :options="editorOptions"
        @mount="handleEditorMount"
      />
    </div>
  </div>
</template>
