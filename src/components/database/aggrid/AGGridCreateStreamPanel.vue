<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SlideOverPanel from '@/components/common/SlideOverPanel.vue'
import FolderSelectionModal from '@/components/common/FolderSelectionModal.vue'
import FormSelect from '@/components/base/FormSelect.vue'
import FormCheckbox from '@/components/base/FormCheckbox.vue'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import { useToast } from 'vue-toastification'
import { isWailsContext } from '@/composables/useWailsEvents'
import {
  buildExportStreamName,
  useStreamExport,
  type StreamExportFormat
} from '@/composables/useStreamExport'
import type { FilterConfig, SortConfig } from '@/stores/objectTabState'
import { useSystemDefaults } from '@/composables/useSystemDefaults'

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
const toast = useToast()

const format = ref<StreamExportFormat>('csv')
const runImmediately = ref(true)
const streamName = ref('')
const streamNameTouched = ref(false)
const compression = ref<'none' | 'gzip' | 'zstd' | 'snappy'>('none')
const targetBasePath = ref('')
const showFolderPicker = ref(false)
const { systemDefaults, loadSystemDefaults } = useSystemDefaults()
const defaultExportPath = computed(() => systemDefaults.value?.defaultExportPath ?? '')

const { createStreamFromView, isExporting } = useStreamExport()
const isDesktop = isWailsContext()

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

const formatOptions = [
  { value: 'csv', label: 'CSV' },
  { value: 'parquet', label: 'Parquet' },
  { value: 'jsonl', label: 'JSONL' }
]

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

const targetPickerPath = computed(() => targetBasePath.value || defaultExportPath.value || '')

function handleFolderSelect(path: string) {
  targetBasePath.value = path
  showFolderPicker.value = false
}

async function openTargetPathPicker() {
  if (isDesktop) {
    const wailsGo = (
      window as unknown as {
        go?: { main?: { App?: { PickDirectory?: (path: string) => Promise<string> } } }
      }
    ).go
    if (!wailsGo?.main?.App?.PickDirectory) {
      toast.error('Folder picker is not available in this build')
      return
    }

    try {
      const selectedPath = await wailsGo.main.App.PickDirectory(targetPickerPath.value)
      if (selectedPath) {
        targetBasePath.value = selectedPath
      }
    } catch (err: unknown) {
      toast.error(`Failed to open folder picker: ${String(err)}`)
    }
    return
  }

  showFolderPicker.value = true
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    format.value = 'csv'
    runImmediately.value = true
    compression.value = 'none'
    targetBasePath.value = ''
    streamNameTouched.value = false
    streamName.value = generateStreamName()

    // Fetch system defaults for export path
    try {
      await loadSystemDefaults()
    } catch {
      // Leave defaultExportPath empty if defaults cannot be loaded.
    }
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
          v-if="filters.length > 0"
          class="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3"
        >
          <div class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Filters
          </div>
          <ul class="mt-1 space-y-1 text-xs text-gray-700 dark:text-gray-300">
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
          v-if="sorts.length > 0"
          class="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3"
        >
          <div class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Sort
          </div>
          <ul class="mt-1 space-y-1 text-xs text-gray-700 dark:text-gray-300">
            <li v-for="sort in sorts" :key="`${sort.column}-${sort.direction}`">
              <span class="font-semibold text-gray-800 dark:text-gray-200">
                {{ sort.column }}
              </span>
              <span class="mx-1 text-gray-500 dark:text-gray-400">{{ sort.direction }}</span>
            </li>
          </ul>
        </div>

        <div
          v-if="limit !== null && limit > 0"
          class="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3"
        >
          <div class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Limit
          </div>
          <div class="mt-1">
            <span
              class="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300"
            >
              {{ limit }}
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
          <FormSelect
            class="mt-1"
            :model-value="format"
            :options="formatOptions"
            @update:model-value="format = String($event ?? 'csv') as StreamExportFormat"
          />
        </label>

        <label class="block">
          <span class="text-xs text-gray-700 dark:text-gray-300">Compression</span>
          <FormSelect
            class="mt-1"
            :model-value="compression"
            :options="compressionOptions"
            @update:model-value="
              compression = String($event ?? 'none') as 'none' | 'gzip' | 'zstd' | 'snappy'
            "
          />
        </label>

        <label class="block">
          <span class="text-xs text-gray-700 dark:text-gray-300">Target path</span>
          <div class="mt-1 flex items-stretch gap-2">
            <input
              v-model="targetBasePath"
              type="text"
              class="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 px-2.5 py-2 text-sm text-gray-900 dark:text-gray-100"
              placeholder="Leave blank to use default export folder"
            />
            <button
              type="button"
              class="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              @click="openTargetPathPicker"
            >
              Browse
            </button>
          </div>
          <p v-if="defaultExportPath" class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            Export folder (server default): {{ defaultExportPath }}
          </p>
          <FolderSelectionModal
            v-model:is-open="showFolderPicker"
            :initial-path="targetPickerPath"
            @select="handleFolderSelect"
          />
        </label>
      </div>

      <div
        class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-3"
      >
        <div class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
          Stream
        </div>
        <FormCheckbox v-model="runImmediately" label="Run immediately" />

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
