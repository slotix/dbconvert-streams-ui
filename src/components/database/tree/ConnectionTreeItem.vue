<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import DatabaseTreeItem from './DatabaseTreeItem.vue'
import FileEntry from '../FileEntry.vue'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import DatabaseIcon from '@/components/base/DatabaseIcon.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'
import ConnectionErrorState from '@/components/common/ConnectionErrorState.vue'
import { getConnectionTooltip } from '@/utils/connectionUtils'
import { getConnectionHost, getConnectionPort } from '@/utils/specBuilder'
import { useConnectionTreeLogic } from '@/composables/useConnectionTreeLogic'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useExplorerNavigationStore, type ObjectType } from '@/stores/explorerNavigation'
import type { Connection } from '@/types/connections'
import type { FileSystemEntry } from '@/api/fileSystem'
import {
  type ConnectionDatabaseSearchMatches,
  type ConnectionSearchPathMatches
} from '@/api/connections'

interface DatabaseInfo {
  name: string
}

const props = defineProps<{
  connection: Connection
  isExpanded: boolean
  isFileConnection: boolean
  databases: DatabaseInfo[]
  searchMatches?: ConnectionSearchPathMatches | null
}>()

// Inject search query, caret class, and selection from parent
const searchQuery = inject<ComputedRef<string>>('treeSearchQuery')!
const caretClass = inject<string>('treeCaretClass')!
const treeSelection = inject<
  ComputedRef<{
    connectionId?: string
    database?: string
    schema?: string
    type?: ObjectType | null
    name?: string | null
    filePath?: string
  }>
>('treeSelection')!

// Check if this connection is selected (connection selected but no database/table/file)
const isSelected = computed(() => {
  const sel = treeSelection.value
  return sel.connectionId === props.connection.id && !sel.database && !sel.name && !sel.filePath
})

// Use composable and stores directly
const treeLogic = useConnectionTreeLogic()
const fileExplorerStore = useFileExplorerStore()
const navigationStore = useExplorerNavigationStore()

// Get file entries and selected path from store
const fileEntries = computed(() => fileExplorerStore.getEntries(props.connection.id))
const selectedFilePath = computed(() => fileExplorerStore.getSelectedPath(props.connection.id))
const hasActiveSearch = computed(() => (searchQuery.value || '').trim().length > 0)

// Get database error state
const databaseError = computed(() => navigationStore.getDatabasesError(props.connection.id))

// Get file connection error state
const fileConnectionError = computed(() => fileExplorerStore.getError(props.connection.id))

const emit = defineEmits<{
  (e: 'toggle-connection'): void
  (e: 'select-connection', payload: { connectionId: string; mode?: 'preview' | 'pinned' }): void
  (e: 'toggle-database', dbName: string): void
  (e: 'toggle-schema', payload: { dbName: string; schemaName: string }): void
  (e: 'select-database', payload: { connectionId: string; database: string }): void
  (e: 'select-file', payload: { connectionId: string; path: string; entry?: FileSystemEntry }): void
  (
    e: 'open-object',
    payload: {
      connectionId: string
      database: string
      type: ObjectType
      name: string
      schema?: string
      mode: 'preview' | 'pinned'
    }
  ): void
  (
    e: 'open-file',
    payload: {
      connectionId: string
      path: string
      entry: FileSystemEntry
      mode: 'preview' | 'pinned'
      defaultTab?: 'structure' | 'data'
      openInRightSplit?: boolean
    }
  ): void
  (e: 'contextmenu-connection', payload: { event: MouseEvent; connectionId: string }): void
  (
    e: 'contextmenu-database',
    payload: { event: MouseEvent; connectionId: string; database: string }
  ): void
  (
    e: 'contextmenu-schema',
    payload: { event: MouseEvent; connectionId: string; database: string; schema: string }
  ): void
  (
    e: 'contextmenu-object',
    payload: {
      event: MouseEvent
      kind: ObjectType
      connectionId: string
      database: string
      schema?: string
      name: string
    }
  ): void
  (
    e: 'contextmenu-file',
    payload: {
      event: MouseEvent
      connectionId: string
      path: string
      name: string
      isDir?: boolean
      isTable?: boolean
      format?: string
    }
  ): void
  (e: 'request-file-entries', payload: { connectionId: string }): void
}>()

function isDatabaseExpanded(dbName: string): boolean {
  const key = `${props.connection.id}:${dbName}`
  return navigationStore.isDatabaseExpanded(key)
}

function handleConnectionClick() {
  // Emit both toggle (expand/collapse) and select (show details) events
  emit('toggle-connection')
  emit('select-connection', {
    connectionId: props.connection.id
  })
}

function handleConnectionDoubleClick() {
  emit('select-connection', {
    connectionId: props.connection.id,
    mode: 'pinned'
  })
}

function handleConnectionContextMenu(event: MouseEvent) {
  emit('contextmenu-connection', {
    event,
    connectionId: props.connection.id
  })
}

function handleDatabaseToggle(dbName: string) {
  emit('toggle-database', dbName)
}

function handleSchemaToggle(dbName: string, schemaName: string) {
  emit('toggle-schema', { dbName, schemaName })
}

function handleObjectOpen(
  payload: {
    type: ObjectType
    name: string
    schema?: string
    mode: 'preview' | 'pinned'
  },
  dbName: string
) {
  emit('open-object', {
    connectionId: props.connection.id,
    database: dbName,
    ...payload
  })
}

function handleFileOpen(payload: {
  entry: FileSystemEntry
  mode: 'preview' | 'pinned'
  openInRightSplit?: boolean
}) {
  emit('open-file', {
    connectionId: props.connection.id,
    path: payload.entry.path,
    entry: payload.entry,
    mode: payload.mode,
    defaultTab: 'data',
    openInRightSplit: payload.openInRightSplit
  })
}

function handleFileContextMenu(payload: { event: MouseEvent; entry: FileSystemEntry }) {
  emit('contextmenu-file', {
    event: payload.event,
    connectionId: props.connection.id,
    path: payload.entry.path,
    name: payload.entry.name,
    isDir: payload.entry.type === 'dir',
    isTable: payload.entry.isTable,
    format: payload.entry.format
  })
}

function handleSelectFile(payload: { path: string; entry: FileSystemEntry }) {
  emit('select-file', {
    connectionId: props.connection.id,
    path: payload.path,
    entry: payload.entry
  })
}

async function handleExpandFolder(payload: { entry: FileSystemEntry }) {
  const folder = payload.entry
  const isExpanded = fileExplorerStore.isFolderExpanded(props.connection.id, folder.path)

  if (isExpanded) {
    // Collapse the folder
    fileExplorerStore.collapseFolder(props.connection.id, folder.path)
  } else {
    // Expand and load folder contents if not already loaded
    if (!folder.isLoaded) {
      await fileExplorerStore.loadFolderContents(props.connection.id, folder.path)
    } else {
      fileExplorerStore.expandFolder(props.connection.id, folder.path)
    }
  }
}

function normalized(value: string | undefined | null): string {
  return (value || '').trim().toLowerCase()
}

function getMatchedDatabaseNames(
  matches: ConnectionSearchPathMatches | null | undefined
): Set<string> {
  const result = new Set<string>()
  if (!matches) return result
  ;(matches.databases || []).forEach((dbName) => result.add(normalized(dbName)))
  Object.keys(matches.schemas || {}).forEach((dbName) => result.add(normalized(dbName)))
  Object.keys(matches.tables || {}).forEach((dbName) => result.add(normalized(dbName)))
  Object.keys(matches.views || {}).forEach((dbName) => result.add(normalized(dbName)))
  Object.keys(matches.functions || {}).forEach((dbName) => result.add(normalized(dbName)))
  Object.keys(matches.procedures || {}).forEach((dbName) => result.add(normalized(dbName)))
  Object.keys(matches.sequences || {}).forEach((dbName) => result.add(normalized(dbName)))
  return result
}

const visibleDatabases = computed(() => {
  if (!hasActiveSearch.value) {
    return props.databases
  }

  if (!props.searchMatches) {
    // Connection-level match (e.g., connection name/host) without db-level paths.
    return props.databases
  }

  const matchedDbNames = getMatchedDatabaseNames(props.searchMatches)
  if (matchedDbNames.size === 0) {
    // Keep children visible until backend provides narrowed matched paths.
    return props.databases
  }
  return props.databases.filter((db) => matchedDbNames.has(normalized(db.name)))
})

function getMatchesForDatabase<T>(
  values: Record<string, T> | undefined,
  dbName: string,
  fallback: T
): T {
  if (!values) return fallback
  if (dbName in values) return values[dbName]
  const target = normalized(dbName)
  for (const [key, value] of Object.entries(values)) {
    if (normalized(key) === target) {
      return value
    }
  }
  return fallback
}

function hasSearchMatches(matches: ConnectionSearchPathMatches | null | undefined): boolean {
  if (!matches) return false
  return (
    (matches.databases?.length || 0) > 0 ||
    Object.keys(matches.schemas || {}).length > 0 ||
    Object.keys(matches.tables || {}).length > 0 ||
    Object.keys(matches.views || {}).length > 0 ||
    Object.keys(matches.functions || {}).length > 0 ||
    Object.keys(matches.procedures || {}).length > 0 ||
    Object.keys(matches.sequences || {}).length > 0 ||
    (matches.files?.length || 0) > 0
  )
}

function getDatabaseSearchMatches(dbName: string): ConnectionDatabaseSearchMatches | null {
  const matches = props.searchMatches
  if (!matches) return null

  return {
    schemas: getMatchesForDatabase(matches.schemas, dbName, []),
    tables: getMatchesForDatabase(matches.tables, dbName, []),
    views: getMatchesForDatabase(matches.views, dbName, []),
    functions: getMatchesForDatabase(matches.functions, dbName, []),
    procedures: getMatchesForDatabase(matches.procedures, dbName, []),
    sequences: getMatchesForDatabase(matches.sequences, dbName, [])
  }
}

type FileMatchIndex = {
  values: Set<string>
  pathValues: string[]
}

function normalizePath(value: string | undefined | null): string {
  const replaced = normalized(value).replace(/\\/g, '/')
  if (!replaced) return ''

  const schemeSeparator = '://'
  const schemeIndex = replaced.indexOf(schemeSeparator)
  if (schemeIndex >= 0) {
    const scheme = replaced.slice(0, schemeIndex)
    const rest = replaced.slice(schemeIndex + schemeSeparator.length).replace(/\/+/g, '/')
    return `${scheme}${schemeSeparator}${rest}`
  }

  return replaced.replace(/\/+/g, '/')
}

function trimPathTrailingSlash(value: string): string {
  if (!value) return ''
  if (value === '/' || /^[a-z]:\/$/i.test(value) || value.endsWith('://')) {
    return value
  }
  return value.endsWith('/') ? value.replace(/\/+$/, '') : value
}

function canonicalPathVariants(rawValue: string | undefined | null): string[] {
  const normalizedPath = trimPathTrailingSlash(normalizePath(rawValue))
  if (!normalizedPath) return []

  const variants = new Set<string>([normalizedPath])
  if (normalizedPath.startsWith('s3://')) {
    variants.add(trimPathTrailingSlash(normalizedPath.slice('s3://'.length)))
  }
  if (normalizedPath.startsWith('/')) {
    variants.add(trimPathTrailingSlash(normalizedPath.slice(1)))
  }
  return Array.from(variants).filter(Boolean)
}

function isPathPrefix(prefix: string, value: string): boolean {
  if (!prefix || !value) return false
  if (prefix === value) return true
  return value.startsWith(`${prefix}/`)
}

function buildFileMatchIndex(matchedPaths: string[]): FileMatchIndex {
  const values = new Set<string>()
  const pathValuesSet = new Set<string>()

  for (const rawPath of matchedPaths) {
    const normalizedValue = normalized(rawPath)
    if (normalizedValue) {
      values.add(normalizedValue)
    }

    for (const variant of canonicalPathVariants(rawPath)) {
      values.add(variant)
      if (variant.includes('/')) {
        pathValuesSet.add(variant)
      }
    }
  }

  return {
    values,
    pathValues: Array.from(pathValuesSet)
  }
}

function entryMatchesBackendPath(entry: FileSystemEntry, matchIndex: FileMatchIndex): boolean {
  const entryName = normalized(entry.name)
  if (entryName && matchIndex.values.has(entryName)) {
    return true
  }

  const entryPathVariants = canonicalPathVariants(entry.path)
  for (const entryPath of entryPathVariants) {
    if (matchIndex.values.has(entryPath)) {
      return true
    }
  }

  for (const candidatePath of matchIndex.pathValues) {
    if (entryName && candidatePath.endsWith(`/${entryName}`)) {
      return true
    }
    for (const entryPath of entryPathVariants) {
      if (isPathPrefix(entryPath, candidatePath) || isPathPrefix(candidatePath, entryPath)) {
        return true
      }
    }
  }

  return false
}

function filterFileTreeEntriesByBackendMatches(
  entries: FileSystemEntry[],
  matchIndex: FileMatchIndex
): FileSystemEntry[] {
  const filtered: FileSystemEntry[] = []

  for (const entry of entries) {
    const ownMatch = entryMatchesBackendPath(entry, matchIndex)
    const filteredChildren = entry.children
      ? filterFileTreeEntriesByBackendMatches(entry.children, matchIndex)
      : []
    const hasMatchingChildren = filteredChildren.length > 0

    if (!ownMatch && !hasMatchingChildren) {
      continue
    }

    filtered.push(
      hasMatchingChildren
        ? {
            ...entry,
            children: filteredChildren
          }
        : entry
    )
  }

  return filtered
}

const visibleFileEntries = computed(() => {
  if (!hasActiveSearch.value) {
    return fileEntries.value
  }

  const fileMatches = props.searchMatches?.files || []
  if (!props.searchMatches || !hasSearchMatches(props.searchMatches) || fileMatches.length === 0) {
    // Connection-level match or warmup not ready: keep full tree visible.
    return fileEntries.value
  }

  const matchIndex = buildFileMatchIndex(fileMatches)
  return filterFileTreeEntriesByBackendMatches(fileEntries.value, matchIndex)
})

// Generate tooltip with full connection details
const connectionTooltip = computed(() => {
  return getConnectionTooltip(props.connection)
})

// Derived host and port from spec
const connectionHost = computed(() => getConnectionHost(props.connection))
const connectionPort = computed(() => getConnectionPort(props.connection))
</script>

<template>
  <div class="transition-all duration-200">
    <div
      :data-explorer-connection="connection.id"
      data-tree-node="true"
      data-node-kind="connection"
      data-tree-depth="0"
      :data-connection-id="connection.id"
      role="treeitem"
      aria-level="1"
      :aria-expanded="isExpanded ? 'true' : 'false'"
      :aria-selected="isSelected ? 'true' : 'false'"
      tabindex="-1"
      :class="[
        'group flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-lg cursor-pointer select-none',
        'transition-all duration-200 ease-out',
        'hover:bg-linear-to-r hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-850 dark:hover:to-gray-800',
        'hover:shadow-sm hover:scale-[1.02] hover:-translate-y-0.5',
        'active:scale-[0.98]',
        // Highlight when connection is selected (but no database/table selected)
        isSelected ? 'bg-slate-100/90 dark:bg-slate-800/85 shadow-sm' : ''
      ]"
      :title="connectionTooltip"
      @click="handleConnectionClick"
      @dblclick.stop="handleConnectionDoubleClick"
      @contextmenu.stop.prevent="handleConnectionContextMenu"
    >
      <component
        :is="isExpanded ? ChevronDown : ChevronRight"
        :class="[
          caretClass,
          'transition-transform duration-200 group-hover:text-slate-600 dark:group-hover:text-slate-300'
        ]"
      />
      <DatabaseIcon
        :db-type="treeLogic.getEffectiveType(connection)"
        :logo-src="treeLogic.getDbLogoForConnection(connection)"
        size="MD"
        container-class="group-hover:shadow-sm"
      />
      <div class="flex-1 min-w-0 flex flex-col gap-0.5">
        <div class="flex items-center gap-1.5">
          <HighlightedText
            class="font-semibold truncate text-slate-800 dark:text-gray-100 group-hover:text-slate-900 dark:group-hover:text-white"
            :text="connection.name || connectionHost || 'Connection'"
            :query="searchQuery"
          />
          <CloudProviderBadge
            v-if="connection.cloud_provider"
            :cloud-provider="connection.cloud_provider"
            :db-type="treeLogic.getEffectiveType(connection)"
            size="sm"
            class="shrink-0"
          />
        </div>
        <div
          v-if="connectionHost && connectionPort"
          class="text-xs text-slate-500 dark:text-gray-400 truncate leading-tight group-hover:text-slate-700 dark:group-hover:text-gray-300"
        >
          {{ connectionHost }}:{{ connectionPort }}
        </div>
      </div>
    </div>

    <!-- Databases or Files under connection -->
    <div
      v-if="isExpanded"
      role="group"
      class="ml-5 border-l-2 border-slate-200 dark:border-gray-800 pl-3 space-y-1 mt-1"
    >
      <div v-if="isFileConnection">
        <!-- Loading state for files -->
        <div
          v-if="fileExplorerStore.isLoading(connection.id)"
          class="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 dark:text-gray-400"
        >
          <svg
            class="animate-spin h-4 w-4 text-teal-600 dark:text-teal-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Loading files…</span>
        </div>
        <!-- Error state for file connections -->
        <ConnectionErrorState v-if="fileConnectionError" :error="fileConnectionError" />
        <!-- Empty state -->
        <div
          v-else-if="!visibleFileEntries.length"
          class="text-xs text-slate-500 dark:text-gray-400 px-3 py-1.5"
        >
          No files
        </div>
        <!-- File list -->
        <FileEntry
          v-for="entry in visibleFileEntries"
          :key="entry.path"
          :entry="entry"
          :connection-id="connection.id"
          :selected-path="selectedFilePath"
          @select="handleSelectFile"
          @open="handleFileOpen"
          @context-menu="handleFileContextMenu"
          @expand-folder="handleExpandFolder"
        />
      </div>
      <div v-else>
        <!-- Loading state for databases -->
        <div
          v-if="navigationStore.isDatabasesLoading(connection.id)"
          class="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 dark:text-gray-400"
        >
          <svg
            class="animate-spin h-3.5 w-3.5 text-teal-600 dark:text-teal-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Loading databases…</span>
        </div>
        <!-- Error state when connection failed -->
        <ConnectionErrorState v-if="databaseError" :error="databaseError" />
        <!-- Empty state when loaded but no databases -->
        <div
          v-else-if="!visibleDatabases.length"
          class="text-xs text-slate-500 dark:text-gray-400 px-3 py-1.5"
        >
          No databases
        </div>
        <!-- Database list -->
        <DatabaseTreeItem
          v-for="db in visibleDatabases"
          :key="db.name"
          :database="db"
          :connection-id="connection.id"
          :is-expanded="isDatabaseExpanded(db.name)"
          :has-schemas="treeLogic.hasSchemas(connection.id)"
          :schemas="treeLogic.getSchemas(connection.id, db.name)"
          :flat-tables="treeLogic.getFlatTables(connection.id, db.name)"
          :flat-views="treeLogic.getFlatViews(connection.id, db.name)"
          :flat-functions="treeLogic.getFlatFunctions(connection.id, db.name)"
          :flat-procedures="treeLogic.getFlatProcedures(connection.id, db.name)"
          :search-matches="getDatabaseSearchMatches(db.name)"
          :metadata-loaded="treeLogic.isMetadataLoaded(connection.id, db.name)"
          @toggle-database="handleDatabaseToggle(db.name)"
          @toggle-schema="(schemaName) => handleSchemaToggle(db.name, schemaName)"
          @select-database="$emit('select-database', $event)"
          @open-object="(p) => handleObjectOpen(p, db.name)"
          @contextmenu-database="$emit('contextmenu-database', $event)"
          @contextmenu-schema="$emit('contextmenu-schema', $event)"
          @contextmenu-object="$emit('contextmenu-object', $event)"
        />
      </div>
    </div>
  </div>
</template>
