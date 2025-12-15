<script setup lang="ts">
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import {
  ChevronRightIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/vue/24/outline'
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
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { useTreeSearch } from '@/composables/useTreeSearch'
import type { Connection } from '@/types/connections'
import type { FileSystemEntry } from '@/api/fileSystem'

type ObjectType = 'table' | 'view'

interface DatabaseInfo {
  name: string
}

const props = defineProps<{
  connection: Connection
  isExpanded: boolean
  isFileConnection: boolean
  databases: DatabaseInfo[]
}>()

// Inject search query, caret class, and selection from parent
const searchQuery = inject<ComputedRef<string>>('treeSearchQuery')!
const caretClass = inject<string>('treeCaretClass')!
const treeSelection = inject<
  ComputedRef<{
    connectionId?: string
    database?: string
    schema?: string
    type?: 'table' | 'view' | null
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
const treeSearch = computed(() => useTreeSearch(searchQuery.value))

// Get file entries and selected path from store
const fileEntries = computed(() => fileExplorerStore.getEntries(props.connection.id))
const selectedFilePath = computed(() => fileExplorerStore.getSelectedPath(props.connection.id))

// Get database error state
const databaseError = computed(() => navigationStore.getDatabasesError(props.connection.id))

// Get file connection error state
const fileConnectionError = computed(() => fileExplorerStore.getError(props.connection.id))

const showSystemDatabases = computed(() => {
  return navigationStore.showSystemDatabasesFor(props.connection.id)
})

const emit = defineEmits<{
  (e: 'toggle-connection'): void
  (e: 'select-connection', payload: { connectionId: string }): void
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

function handleConnectionContextMenu(event: MouseEvent) {
  emit('contextmenu-connection', {
    event,
    connectionId: props.connection.id
  })
}

function toggleSystemDatabases() {
  navigationStore.toggleShowSystemDatabasesFor(props.connection.id)
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

const visibleFileEntries = computed(() => {
  return treeSearch.value.filterFileEntries(fileEntries.value)
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
      :class="[
        'group flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-lg cursor-pointer select-none',
        'transition-all duration-200 ease-out',
        'hover:bg-linear-to-r hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-850 dark:hover:to-gray-800',
        'hover:shadow-sm hover:scale-[1.02] hover:-translate-y-0.5',
        'active:scale-[0.98]',
        // Highlight when connection is selected (but no database/table selected)
        isSelected
          ? 'bg-linear-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 shadow-md ring-2 ring-gray-300/50 dark:ring-gray-700/50'
          : ''
      ]"
      :title="connectionTooltip"
      @click="handleConnectionClick"
      @contextmenu.stop.prevent="handleConnectionContextMenu"
    >
      <component
        :is="isExpanded ? ChevronDownIcon : ChevronRightIcon"
        :class="[
          caretClass,
          'transition-transform duration-200 group-hover:text-teal-600 dark:group-hover:text-teal-400'
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
            class="font-semibold truncate text-slate-800 dark:text-gray-100 group-hover:text-teal-900 dark:group-hover:text-teal-300"
            :text="connection.name || connectionHost || 'Connection'"
            :query="searchQuery"
          />
          <CloudProviderBadge
            v-if="connection.cloud_provider"
            :cloud-provider="connection.cloud_provider"
            :db-type="connection.type"
            size="sm"
            class="shrink-0"
          />
        </div>
        <div
          v-if="connectionHost && connectionPort"
          class="text-xs text-slate-500 dark:text-gray-400 truncate leading-tight group-hover:text-slate-600 dark:group-hover:text-gray-300"
        >
          {{ connectionHost }}:{{ connectionPort }}
        </div>
      </div>
      <button
        v-if="!isFileConnection"
        type="button"
        class="shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-70 hover:opacity-100 group-hover:opacity-100"
        :title="showSystemDatabases ? 'Hide system databases' : 'Show system databases'"
        @click.stop.prevent="toggleSystemDatabases"
      >
        <EyeIcon v-if="showSystemDatabases" class="h-4 w-4" />
        <EyeSlashIcon v-else class="h-4 w-4" />
      </button>
    </div>

    <!-- Databases or Files under connection -->
    <div
      v-if="isExpanded"
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
          v-else-if="!databases.length"
          class="text-xs text-slate-500 dark:text-gray-400 px-3 py-1.5"
        >
          No databases
        </div>
        <!-- Database list -->
        <DatabaseTreeItem
          v-for="db in databases"
          :key="db.name"
          :database="db"
          :connection-id="connection.id"
          :is-expanded="isDatabaseExpanded(db.name)"
          :has-schemas="treeLogic.hasSchemas(connection.id)"
          :schemas="treeLogic.getSchemas(connection.id, db.name)"
          :flat-tables="treeLogic.getFlatTables(connection.id, db.name)"
          :flat-views="treeLogic.getFlatViews(connection.id, db.name)"
          :search-query="searchQuery"
          :caret-class="caretClass"
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
