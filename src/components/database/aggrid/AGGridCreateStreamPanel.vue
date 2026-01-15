<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SlideOverPanel from '@/components/common/SlideOverPanel.vue'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import { useConnectionsStore } from '@/stores/connections'
import { useToast } from 'vue-toastification'
import {
  buildExportStreamName,
  useStreamExport,
  type StreamExportFormat
} from '@/composables/useStreamExport'
import type { FilterConfig, SortConfig } from '@/stores/objectTabState'

const props = defineProps<{
  open: boolean
  connectionId: string
  connectionName?: string
  database: string
  schema?: string | null
  objectName: string
  objectKey: string
  allColumns: string[]
  isView?: boolean
  dialect: 'mysql' | 'pgsql' | 'sql'
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const tabStateStore = useObjectTabStateStore()
const connectionsStore = useConnectionsStore()
const toast = useToast()

const format = ref<StreamExportFormat>('csv')
const runImmediately = ref(true)
const streamName = ref('')
const streamNameTouched = ref(false)
const compression = ref<'none' | 'gzip' | 'zstd' | 'snappy'>('none')
const targetBasePath = ref('')
const showOptions = ref(false)

const { createStreamFromView, getExportConnectionId, isExporting } = useStreamExport()

const filterState = computed(() => tabStateStore.getFilterPanelState(props.objectKey))

const selectedColumns = computed(() => {
  const selected = filterState.value?.selectedColumns || []
  return selected.length > 0 ? selected : props.allColumns
})

const filters = computed<FilterConfig[]>(() => filterState.value?.filters || [])
const sorts = computed<SortConfig[]>(() => filterState.value?.sorts || [])
const limit = computed(() => filterState.value?.limit ?? null)

const sourceLabel = computed(() => {
  const parts = [props.connectionName || 'Connection', props.database]
  if (props.schema) parts.push(props.schema)
  parts.push(props.objectName)
  return parts.filter(Boolean).join(' / ')
})

const selectedColumnsLabel = computed(() => {
  if (selectedColumns.value.length === props.allColumns.length) {
    return `All columns (${props.allColumns.length})`
  }
  return `${selectedColumns.value.length} columns selected`
})

const currentExportBasePath = computed(() => {
  const id = getExportConnectionId()
  if (!id) return ''
  const connection = connectionsStore.connectionByID(id)
  return connection?.spec?.files?.basePath || ''
})

const compressionOptions = computed(() => {
  if (format.value === 'parquet') {
    return [
      { value: 'none', label: 'None' },
      { value: 'zstd', label: 'Zstd' },
      { value: 'snappy', label: 'Snappy' },
      { value: 'gzip', label: 'Gzip' }
    ]
  }

  return [
    { value: 'none', label: 'None' },
    { value: 'gzip', label: 'Gzip' },
    { value: 'zstd', label: 'Zstd' }
  ]
})

function generateStreamName(): string {
  return buildExportStreamName(props.objectName, format.value)
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    format.value = 'csv'
    runImmediately.value = true
    compression.value = 'none'
    targetBasePath.value = ''
    showOptions.value = false
    streamNameTouched.value = false
    streamName.value = generateStreamName()
  }
)

watch(format, () => {
  if (!streamNameTouched.value) {
    streamName.value = generateStreamName()
  }
  // No-op: keep compression value when switching formats
})

async function onCreateStream() {
  const name = streamName.value.trim()
  const result = await createStreamFromView({
    connectionId: props.connectionId,
    database: props.database,
    schema: props.schema || undefined,
    table: props.objectName,
    allColumns: props.allColumns,
    format: format.value,
    objectKey: props.objectKey,
    dialect: props.dialect,
    streamName: name.length > 0 ? name : undefined,
    runImmediately: runImmediately.value,
    compression: compression.value === 'none' ? undefined : compression.value,
    targetBasePath: targetBasePath.value.trim() || undefined
  })

  if (result.success) {
    if (runImmediately.value) {
      toast.success('Stream started')
    } else {
      toast.success('Stream created')
    }
    emit('close')
  } else if (result.error) {
    toast.error(result.error)
  } else {
    toast.error('Failed to create stream')
  }
}
</script>

<template>
  <SlideOverPanel
    :open="open"
    title="Create stream from this view"
    subtitle="Quick stream setup using current filters and columns"
    @close="emit('close')"
  >
    <div class="space-y-5">
      <div
        class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 p-3 border-l-2 border-l-teal-500/70"
      >
        <div class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
          Source (read-only)
        </div>
        <div class="mt-1 text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
          {{ sourceLabel }}
        </div>
        <div class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          {{ isView ? 'View' : 'Table' }} · {{ selectedColumnsLabel }}
        </div>
      </div>

      <div class="space-y-2">
        <div class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
          Selected columns
        </div>
        <div
          class="flex flex-wrap gap-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-2 py-2 max-h-24 overflow-auto"
        >
          <span
            v-for="col in selectedColumns"
            :key="col"
            class="px-2 py-0.5 text-[11px] rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            {{ col }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3">
        <div
          class="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3"
        >
          <div class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Filters
          </div>
          <div v-if="filters.length === 0" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            None
          </div>
          <ul v-else class="mt-1 space-y-1 text-xs text-gray-700 dark:text-gray-300">
            <li v-for="filter in filters" :key="filter.id">
              <span class="font-semibold text-gray-800 dark:text-gray-200">
                {{ filter.column }}
              </span>
              <span class="mx-1 text-gray-500 dark:text-gray-400">{{ filter.operator }}</span>
              <span class="text-gray-700 dark:text-gray-300">{{ filter.value }}</span>
            </li>
          </ul>
        </div>

        <div
          class="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3"
        >
          <div class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Sort
          </div>
          <div v-if="sorts.length === 0" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            None
          </div>
          <ul v-else class="mt-1 space-y-1 text-xs text-gray-700 dark:text-gray-300">
            <li v-for="sort in sorts" :key="`${sort.column}-${sort.direction}`">
              <span class="font-semibold text-gray-800 dark:text-gray-200">
                {{ sort.column }}
              </span>
              <span class="mx-1 text-gray-500 dark:text-gray-400">{{ sort.direction }}</span>
            </li>
          </ul>
        </div>

        <div
          class="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3"
        >
          <div class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Limit
          </div>
          <div class="mt-1">
            <span
              class="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300"
            >
              {{ limit ?? 'None' }}
            </span>
          </div>
        </div>
      </div>

      <div
        class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-3"
      >
        <div class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
          Target
        </div>
        <label class="block">
          <span class="text-xs text-gray-700 dark:text-gray-300">Format</span>
          <select
            v-model="format"
            class="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 px-2.5 py-2 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="csv">CSV</option>
            <option value="parquet">Parquet</option>
            <option value="jsonl">JSONL</option>
          </select>
        </label>
      </div>

      <div
        class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-3"
      >
        <div class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
          Stream
        </div>
        <label class="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
          <input v-model="runImmediately" type="checkbox" class="rounded border-gray-300" />
          Run immediately
        </label>

        <label class="block">
          <span class="text-xs text-gray-700 dark:text-gray-300">Stream name</span>
          <input
            v-model="streamName"
            type="text"
            class="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 px-2.5 py-2 text-sm text-gray-900 dark:text-gray-100"
            @input="streamNameTouched = true"
          />
        </label>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1 text-xs text-teal-700 dark:text-teal-300 hover:text-teal-600"
        @click="showOptions = !showOptions"
      >
        {{ showOptions ? 'Hide stream settings' : 'Stream settings' }}
      </button>

      <div
        v-if="showOptions"
        class="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"
      >
        <div class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
          Stream-level settings
        </div>

        <label class="block">
          <span class="text-xs text-gray-700 dark:text-gray-300">Compression</span>
          <select
            v-model="compression"
            class="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 px-2.5 py-2 text-sm text-gray-900 dark:text-gray-100"
          >
            <option v-for="option in compressionOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="block">
          <span class="text-xs text-gray-700 dark:text-gray-300">Target path</span>
          <input
            v-model="targetBasePath"
            type="text"
            class="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 px-2.5 py-2 text-sm text-gray-900 dark:text-gray-100"
            placeholder="Leave blank to use default export folder"
          />
          <p v-if="currentExportBasePath" class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            Current export folder: {{ currentExportBasePath }}
          </p>
        </label>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="text-xs rounded-md px-2.5 py-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        @click="emit('close')"
      >
        Cancel
      </button>
      <button
        type="button"
        class="text-xs rounded-md px-2.5 py-1 border border-teal-600 bg-teal-600 text-white hover:bg-teal-700 hover:border-teal-700 disabled:opacity-50 disabled:cursor-not-allowed dark:border-teal-500 dark:bg-teal-600 dark:hover:bg-teal-700"
        :disabled="isExporting"
        @click="onCreateStream"
      >
        {{ isExporting ? 'Creating...' : 'Create stream' }}
      </button>
    </template>
  </SlideOverPanel>
</template>
