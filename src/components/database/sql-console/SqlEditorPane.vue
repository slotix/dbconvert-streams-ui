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
        <Play class="h-3.5 w-3.5 mr-1.5" />
        {{ isExecuting ? 'Running...' : 'Run' }}
      </button>

      <button
        class="inline-flex items-center px-2 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        title="Format SQL (Shift+Alt+F)"
        @click="$emit('format')"
      >
        <Code class="h-3.5 w-3.5" />
      </button>

      <!-- Divider -->
      <div class="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>

      <!-- Templates Dropdown -->
      <div v-if="templates.length > 0" class="relative">
        <button
          class="inline-flex items-center px-2 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          @click="showTemplates = !showTemplates"
        >
          <FileText class="h-3.5 w-3.5 mr-1" />
          Templates
          <ChevronDown class="h-3 w-3 ml-1" />
        </button>
        <div
          v-if="showTemplates"
          class="absolute left-0 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          <div class="py-1">
            <button
              v-for="template in templates"
              :key="template.name"
              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
              @click="selectTemplate(template.query)"
            >
              <div class="font-medium text-gray-700 dark:text-gray-300">{{ template.name }}</div>
              <div class="text-gray-500 dark:text-gray-400 truncate font-mono text-[10px]">
                {{ template.query.split('\n')[0] }}
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- History Dropdown -->
      <div class="relative">
        <button
          class="inline-flex items-center px-2 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          :disabled="history.length === 0"
          :class="{ 'opacity-50 cursor-not-allowed': history.length === 0 }"
          @click="showHistory = !showHistory"
        >
          <Clock class="h-3.5 w-3.5 mr-1" />
          History
          <span v-if="history.length > 0" class="ml-1 text-gray-400"> ({{ history.length }}) </span>
        </button>
        <div
          v-if="showHistory && history.length > 0"
          class="absolute left-0 mt-1 w-96 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50"
        >
          <div class="py-1">
            <button
              v-for="(item, index) in history"
              :key="index"
              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
              @click="selectHistoryItem(item)"
            >
              <div class="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">
                {{ formatHistoryTime(item.timestamp) }}
              </div>
              <div class="text-gray-700 dark:text-gray-300 font-mono truncate">
                {{ item.query }}
              </div>
            </button>
          </div>
        </div>
      </div>

      <span class="text-xs text-gray-400 dark:text-gray-500 ml-2">Ctrl+Enter</span>

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
import { ref, onMounted, onUnmounted } from 'vue'
import { SqlEditor } from '@/components/monaco'
import type { SchemaContext } from '@/composables/useMonacoSqlProviders'
import { ChevronDown, Clock, Code, FileText, Play } from 'lucide-vue-next'

interface HistoryItem {
  query: string
  timestamp: number
}

interface Template {
  name: string
  query: string
}

const props = defineProps<{
  modelValue: string
  dialect: string
  schemaContext: SchemaContext
  isExecuting: boolean
  stats: { rowCount: number; duration: number } | null
  templates?: Template[]
  history?: HistoryItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  execute: []
  format: []
  'select-template': [query: string]
  'select-history': [item: HistoryItem]
}>()

// Use defaults for optional props
const templates = computed(() => props.templates || [])
const history = computed(() => props.history || [])

const sqlEditorRef = ref()
const showTemplates = ref(false)
const showHistory = ref(false)

function selectTemplate(query: string) {
  emit('select-template', query)
  showTemplates.value = false
}

function selectHistoryItem(item: HistoryItem) {
  emit('select-history', item)
  showHistory.value = false
}

function formatHistoryTime(timestamp: number): string {
  const now = new Date()
  const date = new Date(timestamp)
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (isToday) return `Today ${time}`
  if (isYesterday) return `Yesterday ${time}`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` ${time}`
}

// Close dropdowns when clicking outside
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.relative')) {
    showTemplates.value = false
    showHistory.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Expose editor ref for parent to access if needed
defineExpose({
  editorRef: sqlEditorRef
})
</script>

<script lang="ts">
import { computed } from 'vue'
</script>
