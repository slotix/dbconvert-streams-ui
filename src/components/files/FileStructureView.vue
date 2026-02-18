<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import filesApi from '@/api/files'
import { type FileSystemEntry } from '@/api/fileSystem'
import { type CSVSniffResult, type FileMetadata } from '@/types/files'
import { getFileFormat } from '@/utils/fileFormat'
import { useSqlConsoleActions } from '@/composables/useSqlConsoleActions'
import { isWailsContext } from '@/composables/useWailsEvents'
import { useCopyToClipboard } from '@/composables/useCopyToClipboard'
import UnsupportedFileMessage from './UnsupportedFileMessage.vue'
import { useToast } from 'vue-toastification'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CircleHelp,
  Clipboard,
  Clock3,
  FolderOpen,
  Hash,
  RefreshCw,
  Search,
  Terminal,
  Type
} from 'lucide-vue-next'

type CSVSettingRow = {
  key: string
  label: string
  value: string
  mono?: boolean
}

type ColumnSortKey = 'name' | 'type' | 'nullable'
type MetadataColumn = NonNullable<FileMetadata['columns']>[number]

const props = defineProps<{
  entry: FileSystemEntry
  metadata: FileMetadata | null
  connectionId: string
}>()

const emit = defineEmits<{
  (e: 'refresh-metadata'): void
}>()

const { openFileInDuckDbConsole } = useSqlConsoleActions()
const toast = useToast()

const fileFormat = computed(() => props.entry.format || getFileFormat(props.entry.name))
const isUnsupportedFile = computed(() => fileFormat.value === null)
const isDesktop = computed(() => isWailsContext())
const isLocalPath = computed(() => !props.entry.path.startsWith('s3://'))
const isCSVFile = computed(() => {
  const knownFormats = [props.metadata?.format, props.entry.format, fileFormat.value]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.toLowerCase())
  return knownFormats.includes('csv')
})

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

const formatNumber = (num: number): string => num.toLocaleString()

const formatControlChars = (value?: string): string => {
  if (!value) return '(none)'
  if (value === '\n') return '\\n'
  if (value === '\r\n') return '\\r\\n'
  if (value === '\r') return '\\r'
  if (value === '\t') return '\\t'
  return value
}

const normalizePromptForConsole = (prompt: string): string => {
  const trimmed = prompt.trim().replace(/;\s*$/, '')
  if (!trimmed) return ''
  if (/^from\s+/i.test(trimmed)) {
    return `SELECT * ${trimmed} LIMIT 100;`
  }
  return `${trimmed};`
}

const toDisplayPath = (path: string): string => {
  const normalized = path.replace(/\\/g, '/')
  if (normalized.startsWith('s3://')) {
    return normalized
  }
  return normalized.replace(/^\/(home|Users)\/[^/]+(?=\/|$)/, '~')
}

const collapsePathMiddle = (path: string): string => {
  if (!path) return path

  if (path.startsWith('s3://')) {
    const parts = path.slice(5).split('/').filter(Boolean)
    if (parts.length <= 3) return path
    return `s3://${parts[0]}/${parts[1]}/.../${parts[parts.length - 1]}`
  }

  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 4) {
    return path
  }

  if (path.startsWith('~/')) {
    const kept = parts.slice(0, 3).join('/')
    return `${kept}/.../${parts[parts.length - 1]}`
  }

  if (path.startsWith('/')) {
    const kept = parts.slice(0, 2).join('/')
    return `/${kept}/.../${parts[parts.length - 1]}`
  }

  return `${parts[0]}/${parts[1]}/.../${parts[parts.length - 1]}`
}

const { isCopied: isPathCopied, copy: copyPathToClipboard } = useCopyToClipboard(2000)
const { isCopied: isSQLCopied, copy: copySQLToClipboard } = useCopyToClipboard(2000)

const isPathExpanded = ref(false)
const displayPathFull = computed(() => toDisplayPath(props.entry.path))
const displayPathCollapsed = computed(() => collapsePathMiddle(displayPathFull.value))
const isPathCollapsible = computed(() => displayPathCollapsed.value !== displayPathFull.value)
const displayPath = computed(() => {
  if (!isPathCollapsible.value || isPathExpanded.value) {
    return displayPathFull.value
  }
  return displayPathCollapsed.value
})
const canRevealInFolder = computed(() => isDesktop.value && isLocalPath.value)

const csvSniffResult = ref<CSVSniffResult | null>(null)
const csvSniffLoading = ref(false)
const csvSniffError = ref('')
let csvSniffRequestSeq = 0
const columnFilterQuery = ref('')
const columnSortBy = ref<ColumnSortKey>('name')
const columnSortDirection = ref<'asc' | 'desc'>('asc')

const summaryLine = computed(() => {
  const parts: string[] = []

  if (fileFormat.value) {
    parts.push(`${fileFormat.value.toUpperCase()} file`)
  }

  if (props.metadata) {
    parts.push(`${formatNumber(props.metadata.rowCount)} rows`)
    parts.push(`${props.metadata.columnCount} columns`)
  }

  if (props.entry.size) {
    parts.push(formatFileSize(props.entry.size))
  }

  return parts.join(' • ')
})

const csvSettingsRows = computed<CSVSettingRow[]>(() => {
  if (csvSniffResult.value) {
    return [
      {
        key: 'delimiter',
        label: 'Delimiter',
        value: formatControlChars(csvSniffResult.value.delimiter),
        mono: true
      },
      {
        key: 'quote',
        label: 'Quote',
        value: formatControlChars(csvSniffResult.value.quote),
        mono: true
      },
      {
        key: 'header',
        label: 'Header',
        value: csvSniffResult.value.hasHeader ? 'Yes' : 'No'
      },
      {
        key: 'skip',
        label: 'Skip',
        value: String(csvSniffResult.value.skipRows)
      },
      {
        key: 'terminator',
        label: 'Terminator',
        value: formatControlChars(csvSniffResult.value.newLineDelimiter),
        mono: true
      }
    ]
  }

  const dialect = props.metadata?.csvDialect
  if (!dialect) return []

  return [
    {
      key: 'delimiter',
      label: 'Delimiter',
      value: formatControlChars(dialect.delimiter),
      mono: true
    },
    {
      key: 'quote',
      label: 'Quote',
      value: formatControlChars(dialect.quote),
      mono: true
    },
    {
      key: 'header',
      label: 'Header',
      value: dialect.hasHeader ? 'Yes' : 'No'
    },
    {
      key: 'skip',
      label: 'Skip',
      value: '0'
    },
    {
      key: 'terminator',
      label: 'Terminator',
      value: formatControlChars(dialect.lineTerminator),
      mono: true
    }
  ]
})

const csvSamplePath = computed(() => {
  const samplePath = csvSniffResult.value?.samplePath
  if (!samplePath || samplePath === props.entry.path) return ''
  return samplePath
})

const sqlPreview = computed(() => {
  if (csvSniffResult.value?.prompt) {
    return normalizePromptForConsole(csvSniffResult.value.prompt)
  }

  if (isCSVFile.value) {
    const escaped = props.entry.path.replace(/'/g, "''")
    return `SELECT * FROM read_csv_auto('${escaped}') LIMIT 100;`
  }

  return ''
})

function getColumnTypeCategory(type: string): 'number' | 'text' | 'datetime' | 'other' {
  const normalized = type.toUpperCase()
  if (
    normalized.includes('INT') ||
    normalized.includes('DECIMAL') ||
    normalized.includes('NUMERIC') ||
    normalized.includes('FLOAT') ||
    normalized.includes('DOUBLE') ||
    normalized.includes('REAL')
  ) {
    return 'number'
  }
  if (
    normalized.includes('DATE') ||
    normalized.includes('TIME') ||
    normalized.includes('TIMESTAMP')
  ) {
    return 'datetime'
  }
  if (
    normalized.includes('CHAR') ||
    normalized.includes('TEXT') ||
    normalized.includes('STRING') ||
    normalized.includes('VARCHAR')
  ) {
    return 'text'
  }
  return 'other'
}

function getColumnTypeIcon(type: string) {
  const category = getColumnTypeCategory(type)
  if (category === 'number') return Hash
  if (category === 'datetime') return Clock3
  if (category === 'text') return Type
  return CircleHelp
}

function getColumnTypeIconClass(type: string): string {
  const category = getColumnTypeCategory(type)
  if (category === 'number') return 'text-blue-500 dark:text-blue-400'
  if (category === 'datetime') return 'text-amber-500 dark:text-amber-400'
  if (category === 'text') return 'text-emerald-500 dark:text-emerald-400'
  return 'text-gray-400 dark:text-gray-500'
}

function toggleColumnSort(key: ColumnSortKey) {
  if (columnSortBy.value === key) {
    columnSortDirection.value = columnSortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }

  columnSortBy.value = key
  columnSortDirection.value = 'asc'
}

function getSortIcon(key: ColumnSortKey) {
  if (columnSortBy.value !== key) return ArrowUpDown
  return columnSortDirection.value === 'asc' ? ArrowUp : ArrowDown
}

const filteredSortedColumns = computed<MetadataColumn[]>(() => {
  const columns = props.metadata?.columns ?? []
  const query = columnFilterQuery.value.trim().toLowerCase()

  const filtered = query
    ? columns.filter((column) => {
        const nullableText = column.nullable ? 'nullable yes true' : 'nullable no false'
        return (
          column.name.toLowerCase().includes(query) ||
          column.type.toLowerCase().includes(query) ||
          nullableText.includes(query)
        )
      })
    : columns

  const sorted = [...filtered].sort((a, b) => {
    const direction = columnSortDirection.value === 'asc' ? 1 : -1

    if (columnSortBy.value === 'name') {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * direction
    }

    if (columnSortBy.value === 'type') {
      return a.type.localeCompare(b.type, undefined, { sensitivity: 'base' }) * direction
    }

    if (a.nullable === b.nullable) return 0
    return (a.nullable ? 1 : -1) * direction
  })

  return sorted
})

async function loadCSVSniff() {
  if (!isCSVFile.value) {
    csvSniffResult.value = null
    csvSniffError.value = ''
    csvSniffLoading.value = false
    return
  }

  const requestSeq = ++csvSniffRequestSeq
  csvSniffLoading.value = true
  csvSniffError.value = ''

  try {
    const result = await filesApi.sniffCSV(props.entry.path, props.connectionId)
    if (requestSeq !== csvSniffRequestSeq) return
    csvSniffResult.value = result
  } catch (error) {
    if (requestSeq !== csvSniffRequestSeq) return
    csvSniffResult.value = null
    csvSniffError.value = error instanceof Error ? error.message : 'Failed to inspect CSV settings'
  } finally {
    if (requestSeq === csvSniffRequestSeq) {
      csvSniffLoading.value = false
    }
  }
}

function openSQLInConsole(query: string) {
  if (!query.trim()) return

  openFileInDuckDbConsole({
    connectionId: props.connectionId,
    filePath: props.entry.path,
    fileName: props.entry.name,
    isDir: props.entry.type === 'dir',
    format: props.entry.format,
    query
  })
}

async function copyPreviewSQL() {
  if (!sqlPreview.value) return
  await copySQLToClipboard(sqlPreview.value)
}

function openPreviewSQLInConsole() {
  if (!sqlPreview.value) return
  openSQLInConsole(sqlPreview.value)
}

async function revealInFolder() {
  if (!isLocalPath.value) {
    return
  }

  const app = (
    window as typeof window & {
      go?: { main?: { App?: { OpenContainingFolder?: (path: string) => Promise<void> } } }
    }
  ).go?.main?.App

  if (!app?.OpenContainingFolder) {
    toast.info('Reveal in folder is available in desktop mode')
    return
  }

  try {
    await app.OpenContainingFolder(props.entry.path)
  } catch (err) {
    toast.error(`Failed to open folder: ${err instanceof Error ? err.message : String(err)}`)
  }
}

watch(
  () => [
    props.entry.path,
    props.connectionId,
    props.metadata?.format,
    props.entry.format,
    fileFormat.value
  ],
  () => {
    void loadCSVSniff()
  },
  { immediate: true }
)

watch(
  () => props.entry.path,
  () => {
    isPathExpanded.value = false
    columnFilterQuery.value = ''
    columnSortBy.value = 'name'
    columnSortDirection.value = 'asc'
  }
)

defineExpose({
  refresh: async () => {
    emit('refresh-metadata')
    await loadCSVSniff()
  }
})
</script>

<template>
  <div class="p-4">
    <UnsupportedFileMessage v-if="isUnsupportedFile" :file-name="entry.name" variant="structure" />

    <div v-if="!isUnsupportedFile" class="space-y-3">
      <section
        class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 px-3 py-2.5"
      >
        <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {{ entry.name }}
          <span v-if="fileFormat" class="text-teal-600 dark:text-teal-400"
            >[{{ fileFormat.toUpperCase() }}]</span
          >
        </div>
        <div v-if="summaryLine" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {{ summaryLine }}
        </div>
      </section>

      <section
        class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 px-3 py-2.5"
      >
        <div
          class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
        >
          File
        </div>
        <div class="mt-2 flex items-start justify-between gap-2">
          <button
            type="button"
            class="min-w-0 text-left text-sm font-mono text-gray-900 dark:text-gray-100 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            :title="
              isPathCollapsible
                ? isPathExpanded
                  ? 'Click to collapse path'
                  : 'Click to expand full path'
                : displayPathFull
            "
            @click="isPathExpanded = !isPathExpanded"
          >
            {{ displayPath }}
            <span
              v-if="isPathCollapsible"
              class="ml-2 text-[10px] font-medium text-teal-600 dark:text-teal-400"
            >
              {{ isPathExpanded ? 'Collapse' : 'Expand' }}
            </span>
          </button>

          <div class="shrink-0 flex items-center gap-1">
            <button
              type="button"
              class="inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-2 py-1 text-xs font-medium shadow-sm dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              :class="
                isPathCopied
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300'
              "
              :title="isPathCopied ? 'Copied!' : 'Copy path'"
              @click="copyPathToClipboard(entry.path)"
            >
              <Check v-if="isPathCopied" class="h-3.5 w-3.5 mr-1" />
              <Clipboard v-else class="h-3.5 w-3.5 mr-1" />
              {{ isPathCopied ? 'Copied' : 'Copy' }}
            </button>
            <button
              v-if="isLocalPath"
              type="button"
              class="inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 shadow-sm dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!canRevealInFolder"
              :title="
                canRevealInFolder
                  ? 'Reveal in folder'
                  : 'Reveal in folder is available in desktop mode'
              "
              @click="revealInFolder"
            >
              <FolderOpen class="h-3.5 w-3.5 mr-1" />
              Reveal
            </button>
          </div>
        </div>
      </section>

      <section
        v-if="metadata?.columns?.length"
        class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 px-3 py-2.5"
      >
        <div class="flex items-center justify-between gap-3">
          <div
            class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
          >
            Columns ({{ metadata.columns.length }})
          </div>
          <div class="relative w-full max-w-xs">
            <Search
              class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            />
            <input
              v-model="columnFilterQuery"
              type="text"
              placeholder="Filter columns..."
              class="h-7 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-8 pr-2 text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 dark:focus:ring-teal-500/30"
            />
          </div>
        </div>
        <div class="mt-2 overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th class="text-left py-1.5 pr-4 font-medium">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    @click="toggleColumnSort('name')"
                  >
                    Column
                    <component :is="getSortIcon('name')" class="h-3 w-3" />
                  </button>
                </th>
                <th class="text-left py-1.5 pr-4 font-medium">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    @click="toggleColumnSort('type')"
                  >
                    Type
                    <component :is="getSortIcon('type')" class="h-3 w-3" />
                  </button>
                </th>
                <th class="text-left py-1.5 font-medium">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    @click="toggleColumnSort('nullable')"
                  >
                    Nullable
                    <component :is="getSortIcon('nullable')" class="h-3 w-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              <tr v-for="col in filteredSortedColumns" :key="col.name">
                <td class="py-1.5 pr-4 font-medium text-gray-900 dark:text-gray-100">
                  {{ col.name }}
                </td>
                <td class="py-1.5 pr-4 text-gray-700 dark:text-gray-300 uppercase">
                  <span class="inline-flex items-center gap-1.5">
                    <component
                      :is="getColumnTypeIcon(col.type)"
                      :class="['h-3.5 w-3.5', getColumnTypeIconClass(col.type)]"
                    />
                    <span>{{ col.type }}</span>
                  </span>
                </td>
                <td class="py-1.5 text-gray-700 dark:text-gray-300">
                  {{ col.nullable ? 'Nullable' : 'Required' }}
                </td>
              </tr>
            </tbody>
          </table>
          <div
            v-if="!filteredSortedColumns.length"
            class="py-4 text-center text-xs text-gray-500 dark:text-gray-400"
          >
            No columns match "{{ columnFilterQuery }}".
          </div>
        </div>
      </section>

      <section
        v-if="isCSVFile || metadata?.csvDialect"
        class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 px-3 py-2.5"
      >
        <div class="flex items-center justify-between gap-2">
          <div
            class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
          >
            CSV Settings
          </div>
          <button
            v-if="isCSVFile"
            type="button"
            class="inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 shadow-sm dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="csvSniffLoading"
            title="Re-run DuckDB sniff_csv"
            @click="loadCSVSniff"
          >
            <RefreshCw :class="['h-3.5 w-3.5 mr-1', csvSniffLoading ? 'animate-spin' : '']" />
            Refresh
          </button>
        </div>

        <div v-if="csvSniffLoading" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Detecting CSV dialect...
        </div>
        <div v-if="csvSniffError" class="mt-2 text-xs text-amber-600 dark:text-amber-400">
          {{ csvSniffError }}
        </div>
        <div v-if="csvSamplePath" class="mt-2 text-xs text-gray-500 dark:text-gray-400 break-all">
          Sample: {{ csvSamplePath }}
        </div>

        <div
          v-if="csvSettingsRows.length"
          class="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-sm"
        >
          <div v-for="row in csvSettingsRows" :key="row.key" class="flex items-center gap-1.5">
            <span class="text-gray-500 dark:text-gray-400">{{ row.label }}:</span>
            <code v-if="row.mono" class="font-mono text-gray-900 dark:text-gray-100">{{
              row.value
            }}</code>
            <span v-else class="font-medium text-gray-900 dark:text-gray-100">{{ row.value }}</span>
          </div>
        </div>
      </section>

      <section
        v-if="sqlPreview"
        class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 px-3 py-2.5"
      >
        <div class="flex items-center justify-between gap-2">
          <div
            class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
          >
            SQL
          </div>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-2 py-1 text-xs font-medium shadow-sm dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              :class="
                isSQLCopied
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300'
              "
              :title="isSQLCopied ? 'Copied!' : 'Copy SQL'"
              @click="copyPreviewSQL"
            >
              <Check v-if="isSQLCopied" class="h-3.5 w-3.5 mr-1" />
              <Clipboard v-else class="h-3.5 w-3.5 mr-1" />
              {{ isSQLCopied ? 'Copied' : 'Copy' }}
            </button>
            <button
              type="button"
              class="inline-flex items-center rounded-md bg-teal-50 dark:bg-teal-900/20 px-2 py-1 text-xs font-medium text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700/60 hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors"
              title="Open SQL in DuckDB Console"
              @click="openPreviewSQLInConsole"
            >
              <Terminal class="h-3.5 w-3.5 mr-1" />
              Open in Console
            </button>
          </div>
        </div>
        <pre
          class="mt-2 p-2 rounded-md bg-slate-50 dark:bg-gray-950/70 ring-1 ring-slate-200 dark:ring-gray-700 text-xs font-mono text-gray-900 dark:text-gray-100 overflow-x-auto"
        ><code>{{ sqlPreview }}</code></pre>
      </section>
    </div>

    <div v-if="!isUnsupportedFile && !metadata" class="text-center py-8">
      <p class="text-sm text-gray-500 dark:text-gray-400">No metadata available</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">File metadata could not be loaded</p>
    </div>
  </div>
</template>
