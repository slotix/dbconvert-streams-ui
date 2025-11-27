<template>
  <div class="flex flex-col min-h-0 h-full">
    <!-- Toolbar -->
    <div
      class="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-1.5 flex items-center gap-2"
    >
      <button
        :disabled="isExecuting"
        class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="$emit('execute')"
      >
        <PlayIcon class="h-3.5 w-3.5 mr-1.5" />
        {{ isExecuting ? 'Running...' : 'Run' }}
      </button>

      <button
        class="inline-flex items-center px-2 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        title="Format SQL (Shift+Alt+F)"
        @click="$emit('format')"
      >
        <CodeBracketIcon class="h-3.5 w-3.5" />
      </button>

      <span class="text-xs text-gray-400 dark:text-gray-500">Ctrl+Enter</span>

      <div class="flex-1"></div>

      <!-- Query Stats -->
      <div v-if="stats" class="flex items-center gap-3 text-xs">
        <span class="text-gray-500 dark:text-gray-400">
          <span class="font-medium text-gray-700 dark:text-gray-300">{{ stats.rowCount }}</span>
          rows
        </span>
        <span class="text-gray-500 dark:text-gray-400">
          <span class="font-medium text-gray-700 dark:text-gray-300">{{ stats.duration }}ms</span>
        </span>
      </div>
    </div>

    <!-- SQL Editor -->
    <div class="flex-1 overflow-hidden bg-white dark:bg-gray-900">
      <SqlEditor
        ref="sqlEditorRef"
        :model-value="modelValue"
        :dialect="dialect"
        height="100%"
        :schema-context="schemaContext"
        @update:model-value="$emit('update:modelValue', $event)"
        @execute="$emit('execute')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SqlEditor } from '@/components/monaco'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'
import { PlayIcon, CodeBracketIcon } from '@heroicons/vue/24/outline'

defineProps<{
  modelValue: string
  dialect: string
  schemaContext: SchemaContext
  isExecuting: boolean
  stats: { rowCount: number; duration: number } | null
}>()

defineEmits<{
  'update:modelValue': [value: string]
  execute: []
  format: []
}>()

const sqlEditorRef = ref()

// Expose editor ref for parent to access if needed
defineExpose({
  editorRef: sqlEditorRef
})
</script>
