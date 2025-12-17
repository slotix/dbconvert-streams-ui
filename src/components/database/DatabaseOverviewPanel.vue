<script setup lang="ts">
import { onMounted, watch, computed, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { format as formatSql } from 'sql-formatter'
import { useDatabaseOverviewStore } from '@/stores/databaseOverview'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useDatabaseCapabilities } from '@/composables/useDatabaseCapabilities'
import { formatDataSize } from '@/utils/formats'
import type { ShowDiagramPayload } from '@/types/diagram'
import type { DatabaseMetadata, SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import BaseButton from '@/components/base/BaseButton.vue'
import FormInput from '@/components/base/FormInput.vue'
import {
  CircleStackIcon,
  SignalIcon,
  ChartBarIcon,
  TableCellsIcon,
  InformationCircleIcon,
  CommandLineIcon,
  PlusIcon,
  ServerIcon,
  ShareIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  connectionId: string
  database: string
}>()

const emit = defineEmits<{
  (e: 'show-diagram', payload: ShowDiagramPayload): void
  (e: 'open-table', payload: { name: string }): void
  (e: 'open-sql-console', payload: { connectionId: string; database: string }): void
  (e: 'create-schema', schemaName: string): void
}>()

const overviewStore = useDatabaseOverviewStore()
const connectionsStore = useConnectionsStore()
const navigationStore = useExplorerNavigationStore()
const toast = useToast()

// Schema creation state
const newSchemaName = ref('')
const isCreatingSchema = ref(false)

// Get connection type for capabilities
const connectionType = computed(() => {
  const conn = connectionsStore.connectionByID(props.connectionId)
  return conn?.type || ''
})

// Database capabilities
const { canCreateSchema } = useDatabaseCapabilities(connectionType)

// Get overview and loading state for this specific connection + database
const overview = computed(() => overviewStore.getOverview(props.connectionId, props.database))
const isLoading = computed(() =>
  overviewStore.isLoadingOverview(props.connectionId, props.database)
)
const error = computed(() => overviewStore.getError(props.connectionId, props.database))

async function load() {
  // Guard: Don't load if either connectionId or database is missing
  if (!props.connectionId || !props.database) {
    return
  }

  try {
    await overviewStore.fetchOverview(props.connectionId, props.database)
  } catch (e) {
    // Silently ignore "not found" errors which can occur during connection switching
    // when props are temporarily mismatched (e.g., new connectionId with old database name)
    if (e instanceof Error && e.message.includes('not found')) {
      console.warn(
        `Skipping overview load for ${props.database} on connection ${props.connectionId}: database not found (likely during connection switch)`
      )
      // Clear the error from store since this is an expected transient error
      overviewStore.clearOverview(props.connectionId, props.database)
      return
    }
    // Re-throw other errors
    console.error('Failed to load overview:', e)
    throw e
  }
}

async function refresh() {
  // Refresh both overview and database list from sidebar
  // This ensures dropped databases are removed from the sidebar
  navigationStore.invalidateDatabases(props.connectionId)
  await navigationStore.ensureDatabases(props.connectionId, true)
  await load()
}

onMounted(load)

watch(
  () => [props.connectionId, props.database],
  () => {
    // Only load if both props are present
    // This prevents attempting to load during prop transition when switching connections
    if (props.connectionId && props.database) {
      load()
    }
  },
  { deep: true }
)

const showSystemObjects = computed(() => {
  return navigationStore.showSystemObjectsFor(props.connectionId, props.database)
})

const isExportingSchemaSql = ref(false)
const lastGeneratedSchemaSql = ref<string>('')

function formatSqlForExport(rawSql: string): string {
  const raw = (rawSql || '').trim()
  if (!raw) return ''

  // Avoid re-formatting already multi-line SQL.
  if (raw.includes('\n')) return raw

  const normalized = connectionType.value.toLowerCase()
  const dialect = normalized.includes('mysql')
    ? 'mysql'
    : normalized.includes('postgre')
      ? 'postgresql'
      : normalized.includes('snowflake')
        ? 'snowflake'
        : 'sql'

  try {
    return formatSql(raw, {
      language: dialect as never,
      keywordCase: 'upper'
    })
  } catch {
    return raw
  }
}

function tableSortKey(t: SQLTableMeta) {
  // Stable, deterministic ordering for export
  return `${(t.schema || '').toLowerCase()}\u0000${t.name.toLowerCase()}`
}

function viewSortKey(v: SQLViewMeta) {
  return `${(v.schema || '').toLowerCase()}\u0000${v.name.toLowerCase()}`
}

function quotePgIdent(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

function quoteMyIdent(value: string) {
  return `\`${value.replaceAll('`', '``')}\``
}

function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function buildSchemaSql(meta: DatabaseMetadata) {
  const lines: string[] = []
  lines.push('-- Generated by DBConvert Streams UI')
  lines.push(`-- Database: ${props.database}`)
  lines.push(`-- Generated at: ${new Date().toISOString()}`)
  lines.push('')

  const isPostgres = connectionType.value.toLowerCase() === 'postgres'
  const isMySQL = connectionType.value.toLowerCase() === 'mysql'
  const includeSystem = showSystemObjects.value

  // Optional: database creation header
  if (isPostgres) {
    lines.push('-- Database')
    lines.push(
      `-- Run this on an admin connection, then connect to ${props.database} and run the rest.`
    )
    lines.push(`CREATE DATABASE ${quotePgIdent(props.database)};`)
    lines.push('')
  } else if (isMySQL) {
    lines.push('-- Database')
    lines.push(`CREATE DATABASE IF NOT EXISTS ${quoteMyIdent(props.database)};`)
    lines.push(`USE ${quoteMyIdent(props.database)};`)
    lines.push('')
  }

  const isSystemSchema = (schemaName: string | undefined) => {
    if (!schemaName) return false
    return schemaSystemInfo.value.get(schemaName.toLowerCase()) === true
  }

  const tablesAll = Object.values(meta.tables || {})
  const viewsAll = Object.values(meta.views || {})

  const tables = (includeSystem ? tablesAll : tablesAll.filter((t) => !isSystemSchema(t.schema)))
    .slice()
    .sort((a, b) => tableSortKey(a).localeCompare(tableSortKey(b)))

  const views = (includeSystem ? viewsAll : viewsAll.filter((v) => !isSystemSchema(v.schema)))
    .slice()
    .sort((a, b) => viewSortKey(a).localeCompare(viewSortKey(b)))

  if (isPostgres) {
    const usedSchemas = new Set<string>()
    for (const t of tables) usedSchemas.add(t.schema)
    for (const v of views) usedSchemas.add(v.schema)

    const schemas = Array.from(usedSchemas)
      .filter((s) => (includeSystem ? true : !isSystemSchema(s)))
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))

    if (schemas.length) {
      lines.push('-- Schemas')
      for (const s of schemas) {
        lines.push(`CREATE SCHEMA IF NOT EXISTS ${quotePgIdent(s)};`)
      }
      lines.push('')
    }
  }

  if (tables.length) {
    lines.push('-- Tables')
    lines.push('')
  }

  for (const table of tables) {
    const qualified = table.schema ? `${table.schema}.${table.name}` : table.name
    lines.push(`-- ${qualified}`)

    const createTable = table.ddl?.createTable?.trim() || ''
    if (!createTable) {
      lines.push('-- DDL not available')
      lines.push('')
      continue
    }

    lines.push(createTable)

    const indexes = (table.ddl?.createIndexes || []).map((s) => s.trim()).filter(Boolean)
    if (indexes.length) {
      lines.push('')
      for (const idx of indexes) {
        lines.push(idx)
      }
    }

    lines.push('')
  }

  if (views.length) {
    lines.push('-- Views')
    lines.push('')
  }

  for (const view of views) {
    const qualified = view.schema ? `${view.schema}.${view.name}` : view.name
    lines.push(`-- ${qualified}`)

    const ddl = (view.definition || '').trim()
    if (!ddl) {
      lines.push('-- DDL not available')
      lines.push('')
      continue
    }

    // Many backends already include a trailing semicolon; don’t force one.
    lines.push(formatSqlForExport(ddl))
    lines.push('')
  }

  return lines.join('\n').trim() + '\n'
}

async function handleExportSchemaSql() {
  if (!props.connectionId || !props.database || isExportingSchemaSql.value) return

  isExportingSchemaSql.value = true
  try {
    // Use the navigation store so this respects show/hide system objects
    const meta = await navigationStore.ensureMetadata(props.connectionId, props.database)
    if (!meta) {
      toast.error('Failed to load database metadata')
      return
    }

    const sql = buildSchemaSql(meta)
    lastGeneratedSchemaSql.value = sql

    if (!sql.trim()) {
      toast.info('No DDL available to export')
      return
    }

    try {
      await navigator.clipboard.writeText(sql)
      toast.success('Schema SQL copied')
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to export schema SQL'
    toast.error(msg)
  } finally {
    isExportingSchemaSql.value = false
  }
}

async function handleDownloadSchemaSql() {
  if (!props.connectionId || !props.database || isExportingSchemaSql.value) return

  isExportingSchemaSql.value = true
  try {
    // If we already generated recently in this session, reuse it.
    let sql = lastGeneratedSchemaSql.value
    if (!sql.trim()) {
      const meta = await navigationStore.ensureMetadata(props.connectionId, props.database)
      if (!meta) {
        toast.error('Failed to load database metadata')
        return
      }
      sql = buildSchemaSql(meta)
      lastGeneratedSchemaSql.value = sql
    }

    if (!sql.trim()) {
      toast.info('No DDL available to export')
      return
    }

    const safeName = props.database.replaceAll(/[^a-zA-Z0-9._-]+/g, '_')
    downloadTextFile(sql, `${safeName || 'schema'}.sql`, 'application/sql')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to download schema SQL'
    toast.error(msg)
  } finally {
    isExportingSchemaSql.value = false
  }
}

// Map schema name -> isSystem (from backend)
const schemaSystemInfo = computed(() => {
  const dbInfo = navigationStore
    .getDatabasesRaw(props.connectionId)
    ?.find((d) => d.name === props.database)
  const info = new Map<string, boolean>()
  if (dbInfo?.schemas) {
    dbInfo.schemas.forEach((s) => {
      info.set(s.name.toLowerCase(), s.isSystem || false)
    })
  }
  return info
})

function isSystemTableName(tableName: string): boolean {
  // Table names can be "schema.table" or just "table"
  const dotIndex = tableName.indexOf('.')
  if (dotIndex > 0) {
    const schemaName = tableName.substring(0, dotIndex).toLowerCase()
    return schemaSystemInfo.value.get(schemaName) === true
  }
  return false
}

// Filter tables based on showSystemObjects setting
const topSize = computed(() => {
  const allTables = overview.value?.allTablesBySize || []
  const filtered = showSystemObjects.value
    ? allTables
    : allTables.filter((t) => !isSystemTableName(t.name))
  return filtered.slice(0, 10)
})

const topRows = computed(() => {
  const allTables = overview.value?.allTablesByRows || []
  const filtered = showSystemObjects.value
    ? allTables
    : allTables.filter((t) => !isSystemTableName(t.name))
  return filtered.slice(0, 10)
})

const filteredSchemaCount = computed(() => {
  const meta = navigationStore.getMetadata(props.connectionId, props.database)
  if (!meta?.schemas) return overview.value?.counts?.schemas

  // Count schemas, filtering out system ones if needed
  if (showSystemObjects.value) {
    return meta.schemas.length
  }
  return meta.schemas.filter((schemaName) => !schemaSystemInfo.value.get(schemaName.toLowerCase()))
    .length
})

// Get filtered table count based on showSystemObjects setting
const filteredTableCount = computed(() => {
  const meta = navigationStore.getMetadata(props.connectionId, props.database)
  if (!meta?.tables) return overview.value?.counts?.tables

  const tables = Object.values(meta.tables)
  if (showSystemObjects.value) {
    return tables.length
  }
  // Filter out tables in system schemas
  return tables.filter((t) => !schemaSystemInfo.value.get(t.schema.toLowerCase())).length
})

// Get filtered view count based on showSystemObjects setting
const filteredViewCount = computed(() => {
  const meta = navigationStore.getMetadata(props.connectionId, props.database)
  if (!meta?.views) return overview.value?.counts?.views

  const views = Object.values(meta.views)
  if (showSystemObjects.value) {
    return views.length
  }
  // Filter out views in system schemas
  return views.filter((v) => !schemaSystemInfo.value.get(v.schema.toLowerCase())).length
})

// Counts with filtered schema, table, and view counts
const counts = computed(() => {
  const rawCounts = overview.value?.counts
  if (!rawCounts) return undefined
  return {
    ...rawCounts,
    schemas: filteredSchemaCount.value,
    tables: filteredTableCount.value,
    views: filteredViewCount.value
  }
})
const activity = computed(() => overview.value?.activity)

// Calculate filtered database size based on showSystemObjects setting
const filteredSizeBytes = computed(() => {
  const allTables = overview.value?.allTablesBySize || []
  if (showSystemObjects.value) {
    return overview.value?.sizeBytes
  }
  // Sum sizes of non-system tables only
  const filtered = allTables.filter((t) => !isSystemTableName(t.name))
  return filtered.reduce((sum, t) => sum + (t.sizeBytes || 0), 0)
})

// Safe display for total database size
const sizeBytes = computed(() => filteredSizeBytes.value)
const sizeDisplay = computed(() => {
  const b = sizeBytes.value
  return typeof b === 'number' && Number.isFinite(b) ? formatDataSize(b) : '—'
})

const showCreateSchemaCard = computed(() => {
  return Boolean(canCreateSchema.value && overview.value?.engine === 'postgres')
})

// Schema creation handler
async function handleCreateSchema() {
  const schemaName = newSchemaName.value.trim()
  if (!schemaName) return

  isCreatingSchema.value = true
  try {
    emit('create-schema', schemaName)
    newSchemaName.value = '' // Clear input on success
  } finally {
    isCreatingSchema.value = false
  }
}
</script>

<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Database Overview</h3>
      <div class="flex items-center gap-2">
        <BaseButton variant="secondary" size="sm" @click="refresh()"> Refresh </BaseButton>
      </div>
    </div>

    <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
      Loading overview…
    </div>
    <div v-else-if="error" class="text-sm text-red-600 dark:text-red-400 py-8 text-center">
      {{ error }}
    </div>
    <div v-else-if="overview" class="grid grid-cols-1 md:grid-cols-6 gap-4">
      <!-- Essentials -->
      <div
        class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700 md:col-span-2"
      >
        <div class="flex items-center gap-2 mb-3">
          <div class="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <CircleStackIcon class="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Essentials</span>
        </div>

        <div class="space-y-3">
          <!-- Stats Grid -->
          <div class="grid grid-cols-2 gap-2">
            <div v-if="overview.encoding">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Encoding</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.encoding }}
              </p>
            </div>
            <div v-if="overview.collation">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Collation</label
              >
              <p
                class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm truncate"
                :title="overview.collation"
              >
                {{ overview.collation }}
              </p>
            </div>
            <div>
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Size</label
              >
              <p
                class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-base"
                :title="
                  typeof sizeBytes === 'number'
                    ? Intl.NumberFormat().format(sizeBytes || 0) + ' bytes'
                    : ''
                "
              >
                {{ sizeDisplay }}
              </p>
            </div>
            <div>
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Tables</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-base">
                {{ counts?.tables ?? '—' }}
              </p>
            </div>
            <div>
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Views</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-base">
                {{ counts?.views ?? '—' }}
              </p>
            </div>
            <div v-if="typeof counts?.schemas === 'number'">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Schemas</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-base">
                {{ counts.schemas }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- CDC readiness -->
      <div
        class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700 md:col-span-2"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <SignalIcon class="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
              >CDC readiness</span
            >
          </div>
          <!-- Status Badge -->
          <span
            v-if="overview.engine === 'mysql'"
            class="inline-flex items-center text-xs px-2 py-0.5 rounded font-medium"
            :class="{
              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300':
                overview.health?.binlog?.enabled &&
                overview.health?.binlog?.format === 'ROW' &&
                overview.health?.binlog?.rowImage === 'FULL',
              'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300':
                overview.health?.binlog?.enabled &&
                (overview.health?.binlog?.format !== 'ROW' ||
                  overview.health?.binlog?.rowImage !== 'FULL'),
              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300':
                !overview.health?.binlog?.enabled
            }"
          >
            {{ overview.health?.binlog?.enabled ? 'enabled' : 'disabled' }}
          </span>
          <span
            v-else-if="overview.engine === 'postgres'"
            class="inline-flex items-center text-xs px-2 py-0.5 rounded font-medium"
            :class="{
              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300':
                overview.health?.wal?.level === 'logical',
              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300':
                overview.health?.wal?.level !== 'logical'
            }"
          >
            {{ overview.health?.wal?.level || 'unknown' }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <template v-if="overview.engine === 'mysql'">
            <div>
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Binary log</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.binlog?.enabled ? 'ON' : 'OFF' }}
              </p>
            </div>
            <div v-if="overview.health?.binlog?.format">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Format</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.binlog?.format }}
              </p>
            </div>
            <div v-if="overview.health?.binlog?.rowImage">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Row image</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.binlog?.rowImage }}
              </p>
            </div>
            <div v-if="typeof overview.health?.binlog?.serverId === 'number'">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Server ID</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.binlog?.serverId }}
              </p>
            </div>
          </template>
          <template v-else>
            <div>
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >wal_level</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.wal?.level || 'unknown' }}
              </p>
            </div>
            <div v-if="typeof overview.health?.wal?.maxReplicationSlots === 'number'">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Slots (max)</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.wal?.maxReplicationSlots }}
              </p>
            </div>
            <div v-if="typeof overview.health?.wal?.freeReplicationSlots === 'number'">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Slots (free)</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.wal?.freeReplicationSlots }}
              </p>
            </div>
            <div v-if="typeof overview.health?.wal?.maxWalSenders === 'number'">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >WAL senders</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.wal?.maxWalSenders }}
              </p>
            </div>
          </template>
        </div>
      </div>

      <!-- Activity -->
      <div
        class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700 md:col-span-2"
      >
        <div class="flex items-center gap-2 mb-3">
          <div class="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <ChartBarIcon class="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Activity</span>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
              >Connections</label
            >
            <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-base">
              {{ activity?.connections?.used ?? '—' }}
              <span
                v-if="activity?.connections?.max"
                class="text-xs font-normal text-gray-500 dark:text-gray-400"
              >
                / {{ activity.connections.max }}
              </span>
            </p>
          </div>
          <div>
            <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
              >Active sessions</label
            >
            <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-base">
              {{ activity?.activeSessions ?? '—' }}
            </p>
          </div>
        </div>

        <!-- Long-running queries -->
        <div
          v-if="activity?.longRunning?.length"
          class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
        >
          <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2 block"
            >Long-running queries</label
          >
          <ul class="space-y-1.5">
            <li
              v-for="(q, idx) in activity.longRunning.slice(0, 3)"
              :key="q.pid || q.threadId || idx"
              class="flex items-center justify-between gap-2 text-xs"
            >
              <div class="truncate min-w-0 flex-1">
                <span class="text-gray-500 dark:text-gray-400">{{ q.user }}:</span>
                <span class="ml-1 text-gray-700 dark:text-gray-300 truncate" :title="q.query">
                  {{ q.query.slice(0, 40) }}{{ q.query.length > 40 ? '...' : '' }}
                </span>
              </div>
              <span class="shrink-0 font-medium text-gray-500 dark:text-gray-400">{{
                q.duration
              }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Top by size -->
      <div
        class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700 md:col-span-3"
      >
        <div class="flex items-center gap-2 mb-3">
          <div class="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <ServerIcon class="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
            >Top tables by size</span
          >
        </div>
        <ul class="space-y-1">
          <li
            v-for="t in topSize"
            :key="t.name"
            class="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <button
              type="button"
              class="truncate text-left text-sm hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors min-w-0 flex-1"
              :title="t.name"
              @click="$emit('open-table', { name: t.name })"
            >
              {{ t.name }}
            </button>
            <span
              class="ml-2 shrink-0 text-gray-500 dark:text-gray-400 text-xs font-medium"
              :title="
                t.sizeBytes > 0
                  ? Intl.NumberFormat().format(t.sizeBytes) + ' bytes'
                  : 'Size not available'
              "
              >{{ formatDataSize(t.sizeBytes, true) }}</span
            >
          </li>
          <li
            v-if="!topSize.length"
            class="text-xs text-gray-500 dark:text-gray-400 py-2 text-center"
          >
            No tables
          </li>
        </ul>
      </div>

      <!-- Top by rows -->
      <div
        class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700 md:col-span-3"
      >
        <div class="flex items-center gap-2 mb-3">
          <div class="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <TableCellsIcon class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Top tables by rows
            <span
              v-if="overview.engine === 'mysql'"
              class="ml-1 text-xs text-amber-600 dark:text-amber-400 font-normal"
              >(approx)</span
            >
          </span>
        </div>
        <ul class="space-y-1">
          <li
            v-for="t in topRows"
            :key="t.name"
            class="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <button
              type="button"
              class="truncate text-left text-sm hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors min-w-0 flex-1"
              :title="t.name"
              @click="$emit('open-table', { name: t.name })"
            >
              {{ t.name }}
            </button>
            <span class="ml-2 shrink-0 text-gray-500 dark:text-gray-400 text-xs font-medium">
              {{ Intl.NumberFormat().format(t.approxRows) }}
            </span>
          </li>
          <li
            v-if="!topRows.length"
            class="text-xs text-gray-500 dark:text-gray-400 py-2 text-center"
          >
            No tables
          </li>
        </ul>
      </div>

      <!-- Notes -->
      <div
        v-if="overview.notes?.length"
        class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700 md:col-span-6"
      >
        <div class="flex items-center gap-2 mb-3">
          <div class="p-1.5 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
            <InformationCircleIcon class="h-4 w-4 text-sky-600 dark:text-sky-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Notes</span>
        </div>
        <ul class="space-y-2">
          <li
            v-for="(n, i) in overview.notes"
            :key="i"
            class="flex items-start gap-2 p-2 rounded-lg text-sm"
            :class="{
              'bg-sky-100/50 dark:bg-sky-900/20': n.severity === 'info',
              'bg-amber-100/50 dark:bg-amber-900/20': n.severity === 'warn',
              'bg-red-100/50 dark:bg-red-900/20': n.severity === 'error'
            }"
          >
            <span
              class="mt-1.5 inline-block w-1.5 h-1.5 rounded-full shrink-0"
              :class="{
                'bg-sky-500': n.severity === 'info',
                'bg-amber-500': n.severity === 'warn',
                'bg-red-500': n.severity === 'error'
              }"
            />
            <div class="flex-1 min-w-0">
              <span
                :class="{
                  'text-sky-800 dark:text-sky-300': n.severity === 'info',
                  'text-amber-800 dark:text-amber-300': n.severity === 'warn',
                  'text-red-800 dark:text-red-300': n.severity === 'error'
                }"
                >{{ n.message }}</span
              >
              <a
                v-if="n.doc"
                :href="n.doc"
                class="ml-2 text-xs font-medium hover:underline"
                :class="{
                  'text-sky-600 dark:text-sky-400': n.severity === 'info',
                  'text-amber-600 dark:text-amber-400': n.severity === 'warn',
                  'text-red-600 dark:text-red-400': n.severity === 'error'
                }"
                target="_blank"
                rel="noopener noreferrer"
                >docs</a
              >
            </div>
          </li>
        </ul>
      </div>

      <!-- Utility Blocks Row -->
      <div class="md:col-span-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- SQL Console - Utility Block -->
        <div
          class="bg-linear-to-br from-indigo-50 to-slate-50 dark:from-indigo-950/30 dark:to-gray-800/50 rounded-xl p-4 ring-1 ring-indigo-200/70 dark:ring-indigo-800/50"
        >
          <div class="flex items-start gap-4 mb-4">
            <div
              class="shrink-0 p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl ring-1 ring-indigo-200 dark:ring-indigo-700/50"
            >
              <CommandLineIcon class="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div class="flex-1 min-w-0 pt-1">
              <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200">SQL Console</h4>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Execute SQL queries on this database
              </p>
            </div>
          </div>

          <BaseButton
            variant="secondary"
            size="sm"
            class="w-full justify-center"
            @click="
              emit('open-sql-console', {
                connectionId: props.connectionId,
                database: props.database
              })
            "
          >
            <CommandLineIcon class="w-4 h-4 mr-1.5" />
            Open SQL Console
          </BaseButton>
        </div>

        <!-- Show Diagram - Utility Block -->
        <div
          class="bg-linear-to-br from-purple-50 to-slate-50 dark:from-purple-950/30 dark:to-gray-800/50 rounded-xl p-4 ring-1 ring-purple-200/70 dark:ring-purple-800/50"
        >
          <div class="flex items-start gap-4 mb-4">
            <div
              class="shrink-0 p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl ring-1 ring-purple-200 dark:ring-purple-700/50"
            >
              <ShareIcon class="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div class="flex-1 min-w-0 pt-1">
              <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Schema Diagram</h4>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Visualize table relationships and structure
              </p>
            </div>
          </div>

          <BaseButton
            variant="secondary"
            size="sm"
            class="w-full justify-center"
            @click="
              emit('show-diagram', { connectionId: props.connectionId, database: props.database })
            "
          >
            <ShareIcon class="w-4 h-4 mr-1.5" />
            Show Diagram
          </BaseButton>
        </div>

        <!-- Export Schema SQL - Utility Block -->
        <div
          class="bg-linear-to-br from-teal-50 to-slate-50 dark:from-teal-950/30 dark:to-gray-800/50 rounded-xl p-4 ring-1 ring-teal-200/70 dark:ring-teal-800/50"
        >
          <div class="flex items-start gap-4 mb-4">
            <div
              class="shrink-0 p-3 bg-teal-100 dark:bg-teal-900/50 rounded-xl ring-1 ring-teal-200 dark:ring-teal-700/50"
            >
              <ClipboardDocumentIcon class="h-7 w-7 text-teal-600 dark:text-teal-400" />
            </div>
            <div class="flex-1 min-w-0 pt-1">
              <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Export Schema SQL
              </h4>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Combine all table DDLs into one script for sharing
              </p>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-2">
            <BaseButton
              variant="secondary"
              size="sm"
              class="w-full justify-center"
              :loading="isExportingSchemaSql"
              @click="handleExportSchemaSql"
            >
              <ClipboardDocumentIcon class="w-4 h-4 mr-1.5" />
              Copy SQL
            </BaseButton>

            <BaseButton
              variant="secondary"
              size="sm"
              class="w-full justify-center"
              :loading="isExportingSchemaSql"
              @click="handleDownloadSchemaSql"
            >
              <ArrowDownTrayIcon class="w-4 h-4 mr-1.5" />
              Download .sql
            </BaseButton>
          </div>
        </div>

        <!-- Create Schema (PostgreSQL) - Utility Block -->
        <div
          v-if="showCreateSchemaCard"
          class="bg-linear-to-br from-emerald-50 to-slate-50 dark:from-emerald-950/30 dark:to-gray-800/50 rounded-xl p-4 ring-1 ring-emerald-200/70 dark:ring-emerald-800/50"
        >
          <div class="flex items-start gap-4 mb-4">
            <div
              class="shrink-0 p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl ring-1 ring-emerald-200 dark:ring-emerald-700/50"
            >
              <PlusIcon class="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div class="flex-1 min-w-0 pt-1">
              <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Create Schema</h4>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Create a new schema in this database
              </p>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-2">
            <FormInput
              v-model="newSchemaName"
              placeholder="schema_name"
              class="flex-1"
              :disabled="isCreatingSchema"
              @keyup.enter="handleCreateSchema"
            />
            <BaseButton
              variant="primary"
              size="sm"
              class="shrink-0 w-full sm:w-auto"
              :disabled="!newSchemaName.trim() || isCreatingSchema"
              @click="handleCreateSchema"
            >
              <PlusIcon class="w-4 h-4 mr-1.5" />
              Create Schema
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
