<script setup lang="ts">
import { computed, ref, watch, defineAsyncComponent, type Component } from 'vue'
import { Filter, RefreshCw, Share2, Terminal } from 'lucide-vue-next'
import type { SQLRoutineMeta, SQLSequenceMeta, SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata } from '@/types/files'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import { getFileFormat } from '@/utils/fileFormat'

// Lazy load database components that use ag-grid
const TableMetadataView = defineAsyncComponent(
  () => import('@/components/database/TableMetadataView.vue')
)
const ViewStructureView = defineAsyncComponent(
  () => import('@/components/database/ViewStructureView.vue')
)
const DatabaseObjectDataView = defineAsyncComponent(
  () => import('@/components/database/DatabaseObjectDataView.vue')
)
const RoutineDefinitionView = defineAsyncComponent(
  () => import('@/components/database/RoutineDefinitionView.vue')
)
const SequenceDefinitionView = defineAsyncComponent(
  () => import('@/components/database/SequenceDefinitionView.vue')
)
const TableSummaryTab = defineAsyncComponent(
  () => import('@/components/database/TableSummaryTab.vue')
)
const FileSummaryTab = defineAsyncComponent(() => import('@/components/files/FileSummaryTab.vue'))

// Lazy load file components that use ag-grid
const FileDataView = defineAsyncComponent(() => import('@/components/files/FileDataView.vue'))
const FileStructureView = defineAsyncComponent(
  () => import('@/components/files/FileStructureView.vue')
)

defineOptions({
  name: 'ObjectContainer'
})

// Use the Pinia store for tab state management
const tabStateStore = useObjectTabStateStore()

// Simplified props approach - use discriminated union with all props optional except the discriminator
const props = defineProps<{
  objectType: 'database' | 'file'
  connectionId: string
  closable?: boolean
  paneId?: string // Optional pane identifier (e.g., 'left', 'right') for independent state per pane
  // Database-specific props
  objectKind?: 'table' | 'view' | 'function' | 'procedure' | 'sequence'
  objectMeta?: SQLTableMeta | SQLViewMeta | SQLRoutineMeta | SQLSequenceMeta
  connectionType?: string
  database?: string
  // File-specific props
  fileEntry?: FileSystemEntry
  fileMetadata?: FileMetadata | null
}>()

const emit = defineEmits<{
  (e: 'refresh-metadata'): void
  (e: 'close'): void
  (e: 'tab-change', tab: 'data' | 'structure'): void
  (
    e: 'open-sql-console',
    payload: { connectionId: string; database: string; tableName: string; schema?: string }
  ): void
  (
    e: 'open-file-console',
    payload: {
      connectionId: string
      filePath: string
      fileName: string
      isDir?: boolean
      format?: string
    }
  ): void
  (
    e: 'open-diagram',
    payload: {
      connectionId: string
      database: string
      focus?: { type: 'table' | 'view'; name: string; schema?: string }
    }
  ): void
}>()

type TabItem = {
  name: string
  component: Component
  props: Record<string, unknown>
}

const isDataObject = computed(
  () =>
    props.objectType === 'database' && (props.objectKind === 'table' || props.objectKind === 'view')
)

// Check if connection type supports table summary (DuckDB SUMMARIZE)
const supportsSummary = computed(() => {
  const type = props.connectionType?.toLowerCase() || ''
  return type === 'mysql' || type === 'mariadb' || type === 'postgresql' || type === 'postgres'
})

const supportsFileSummary = computed(() => {
  if (props.objectType !== 'file' || !props.fileEntry) return false
  if (props.fileEntry.type === 'dir' && !props.fileEntry.isTable) return false
  const format = props.fileEntry.format || getFileFormat(props.fileEntry.name)
  return Boolean(format)
})

const tabs = computed<TabItem[]>(() => {
  if (props.objectType === 'file') {
    if (!props.fileEntry) {
      console.error('fileEntry is required when objectType is file')
      return []
    }
    const baseTabs: TabItem[] = [
      {
        name: 'Data',
        component: FileDataView,
        props: {
          entry: props.fileEntry,
          metadata: props.fileMetadata,
          connectionId: props.connectionId,
          objectKey: objectKey.value
        }
      },
      {
        name: 'Structure',
        component: FileStructureView,
        props: {
          entry: props.fileEntry,
          metadata: props.fileMetadata,
          connectionId: props.connectionId
        }
      }
    ]

    if (supportsFileSummary.value) {
      const summaryTabIndex = baseTabs.length
      baseTabs.push({
        name: 'Summary',
        component: FileSummaryTab,
        props: {
          fileEntry: props.fileEntry,
          connectionId: props.connectionId,
          isActive: selectedIndex.value === summaryTabIndex
        }
      })
    }

    return baseTabs
  } else {
    if (!props.objectMeta || !props.objectKind || !props.database || !props.connectionType) {
      console.error(
        'objectMeta, objectKind, database, and connectionType are required when objectType is database'
      )
      return []
    }

    if (props.objectKind === 'table' || props.objectKind === 'view') {
      const baseTabs: TabItem[] = [
        {
          name: 'Data',
          component: DatabaseObjectDataView,
          props: {
            tableMeta: props.objectMeta as SQLTableMeta | SQLViewMeta,
            isView: props.objectKind === 'view',
            database: props.database,
            connectionId: props.connectionId,
            objectKey: objectKey.value
          }
        },
        {
          name: 'Structure',
          component: props.objectKind === 'view' ? ViewStructureView : TableMetadataView,
          props:
            props.objectKind === 'view'
              ? {
                  viewMeta: props.objectMeta as SQLViewMeta,
                  connectionId: props.connectionId,
                  connectionType: props.connectionType,
                  objectKey: objectKey.value
                }
              : {
                  tableMeta: props.objectMeta as SQLTableMeta,
                  connectionId: props.connectionId,
                  connectionType: props.connectionType,
                  objectKey: objectKey.value
                }
        }
      ]

      // Add Summary tab for MySQL and PostgreSQL connections
      if (supportsSummary.value) {
        const summaryTabIndex = baseTabs.length
        baseTabs.push({
          name: 'Summary',
          component: TableSummaryTab,
          props: {
            tableMeta: props.objectMeta as SQLTableMeta | SQLViewMeta,
            connectionId: props.connectionId,
            database: props.database,
            isView: props.objectKind === 'view',
            isActive: selectedIndex.value === summaryTabIndex
          }
        })
      }

      return baseTabs
    }

    if (props.objectKind === 'sequence') {
      return [
        {
          name: 'Definition',
          component: SequenceDefinitionView,
          props: {
            sequenceMeta: props.objectMeta as SQLSequenceMeta,
            connectionType: props.connectionType,
            objectKey: objectKey.value
          }
        }
      ]
    }

    // function or procedure
    return [
      {
        name: 'Definition',
        component: RoutineDefinitionView,
        props: {
          routineMeta: props.objectMeta as SQLRoutineMeta,
          connectionType: props.connectionType,
          objectKey: objectKey.value
        }
      }
    ]
  }
})

// Simple local state - each ObjectContainer manages its own Data/Structure state
// Global Map is defined in the script block above

function getObjectKey(): string {
  const panePrefix = props.paneId ? `${props.paneId}:` : ''

  if (props.objectType === 'database' && props.objectMeta) {
    const schema = props.objectMeta.schema || 'default'
    const kind = props.objectKind || 'table'
    return `${panePrefix}db-${props.objectMeta.database}-${schema}-${kind}-${props.objectMeta.name}`
  } else if (props.objectType === 'file' && props.fileEntry) {
    return `${panePrefix}file-${props.fileEntry.path}`
  }
  return 'unknown'
}

const objectKey = computed(() => getObjectKey())

// Start with default state (always Data tab - index 0)
const selectedIndex = ref(0)

// Load saved state when objectKey is available
const savedState = tabStateStore.getTabState(objectKey.value)
if (savedState !== undefined) {
  selectedIndex.value = savedState
}

// Watch for objectKey changes and update state accordingly
watch(objectKey, (newKey) => {
  const savedState = tabStateStore.getTabState(newKey)
  selectedIndex.value = savedState ?? 0
})

function onTabChange(i: number) {
  selectedIndex.value = i
  // Save state to Pinia store
  tabStateStore.setTabState(objectKey.value, i)
  const activeTab = isDataObject.value && i === 0 ? 'data' : 'structure'
  emit('tab-change', activeTab)
}

// Keep refs to the rendered child components so parent can trigger refresh
type Refreshable = { refresh?: () => Promise<void> | void }
type FilterPanelMethods = {
  openPanel?: () => void
  addFilter?: () => void
  addSort?: () => void
  toggleColumnSelector?: () => void
  canAddSort?: { value: boolean }
  showColumnSelector?: { value: boolean }
  hasActiveFilters?: { value: boolean }
  hasActiveSorts?: { value: boolean }
  selectedColumns?: { value: string[] }
  columns?: () => { field?: string }[]
}
type DataViewComponent = Refreshable & {
  filterPanelRef?: FilterPanelMethods | { value: FilterPanelMethods | null }
}
const panelRefs = ref<DataViewComponent[]>([])
const isRefreshing = ref(false)

const activeTabName = computed(() => tabs.value[selectedIndex.value]?.name || '')
const isSummaryTab = computed(() => activeTabName.value === 'Summary')

const isFileObject = computed(() => props.objectType === 'file' && Boolean(props.fileEntry))

const supportsFileFilters = computed(() => {
  if (!isFileObject.value || !props.fileEntry) return false
  if (props.fileEntry.type === 'dir' && !props.fileEntry.isTable) return false
  const format = props.fileEntry.format || getFileFormat(props.fileEntry.name)
  return Boolean(format)
})

const showFilterControls = computed(
  () => selectedIndex.value === 0 && (isDataObject.value || supportsFileFilters.value)
)

// Get the current data view's filter panel ref (handles both ref and direct value)
function getFilterPanel(): FilterPanelMethods | null {
  const dataView = panelRefs.value[0] as DataViewComponent | undefined
  if (!dataView?.filterPanelRef) return null
  // Handle case where filterPanelRef is a ref (computed) or direct value
  const panel = dataView.filterPanelRef
  if ('value' in panel && panel.value !== undefined) {
    return panel.value as FilterPanelMethods
  }
  return panel as FilterPanelMethods
}

const hasActiveFilters = computed(() => {
  const panel = getFilterPanel()
  return panel?.hasActiveFilters?.value ?? false
})

const hasActiveSorts = computed(() => {
  const panel = getFilterPanel()
  return panel?.hasActiveSorts?.value ?? false
})

const hasAnyFilterActivity = computed(() => hasActiveFilters.value || hasActiveSorts.value)

function openFilterPanel() {
  const panel = getFilterPanel()
  if (panel?.openPanel) {
    panel.openPanel()
  }
}

async function onRefreshClick() {
  try {
    isRefreshing.value = true
    const comp = panelRefs.value[selectedIndex.value]
    if (comp && typeof comp.refresh === 'function') {
      await comp.refresh()
    } else {
      emit('refresh-metadata')
    }
  } finally {
    // small delay to show spinner feels responsive even if instant
    setTimeout(
      () => {
        isRefreshing.value = false
      },
      props.objectType === 'database' ? 300 : 0
    )
  }
}

function onOpenSqlConsole() {
  if (isDataObject.value && props.objectMeta && props.database) {
    const meta = props.objectMeta as SQLTableMeta | SQLViewMeta
    emit('open-sql-console', {
      connectionId: props.connectionId,
      database: props.database,
      tableName: meta.name,
      schema: meta.schema
    })
  }
}

function onOpenFileConsole() {
  if (props.objectType === 'file' && props.fileEntry) {
    emit('open-file-console', {
      connectionId: props.connectionId,
      filePath: props.fileEntry.path,
      fileName: props.fileEntry.name,
      isDir: props.fileEntry.type === 'dir',
      format: props.fileEntry.format
    })
  }
}

function onOpenDiagram() {
  if (isDataObject.value && props.objectMeta && props.database) {
    const meta = props.objectMeta as SQLTableMeta | SQLViewMeta
    emit('open-diagram', {
      connectionId: props.connectionId,
      database: props.database,
      focus: {
        type: props.objectKind === 'view' ? 'view' : 'table',
        name: meta.name,
        schema: meta.schema
      }
    })
  }
}
</script>

<template>
  <div
    :class="[
      'bg-white dark:bg-gray-850 h-full flex flex-col min-h-0',
      $attrs.class ? $attrs.class : 'shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 rounded-lg'
    ]"
  >
    <!-- Header with segmented control tabs, filter controls, and refresh button -->
    <div class="border-b border-gray-200 dark:border-gray-700 px-4 py-2.5">
      <div class="flex items-center justify-between">
        <!-- Left: Tabs + Filter Controls -->
        <div class="flex items-center gap-4">
          <!-- Data/Structure tabs -->
          <div v-if="tabs.length > 1" class="inline-flex rounded-md shadow-sm" role="group">
            <button
              v-for="(tab, i) in tabs"
              :key="tab.name"
              :class="[
                'px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:z-10',
                'border',
                // Rounded corners only on first and last
                i === 0 ? 'rounded-l-md' : '',
                i === tabs.length - 1 ? 'rounded-r-md' : '',
                // Remove left border from middle buttons to avoid double borders
                i !== 0 ? '-ml-px' : '',
                selectedIndex === i
                  ? 'bg-teal-600 dark:bg-teal-900 text-white border-teal-600 dark:border-teal-600 hover:bg-teal-700 dark:hover:bg-teal-800 z-10'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
              ]"
              @click="onTabChange(i)"
            >
              {{ tab.name }}
            </button>
          </div>

          <!-- Filter Action Buttons (only shown on Data tab) -->
          <div v-if="showFilterControls" class="flex items-center gap-1">
            <button
              type="button"
              class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded transition-colors"
              :class="
                hasAnyFilterActivity
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
              "
              title="Open data filter"
              @click="openFilterPanel"
            >
              <Filter class="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        <!-- Right: SQL/DuckDB Console + Refresh buttons -->
        <div class="flex items-center gap-2">
          <!-- SQL Console button (for database tables/views) -->
          <button
            v-if="isDataObject"
            type="button"
            class="inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 shadow-sm dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            title="Open in SQL Console"
            @click="onOpenSqlConsole"
          >
            <Terminal class="h-4 w-4" />
          </button>
          <!-- Diagram button (for database tables/views) -->
          <button
            v-if="isDataObject"
            type="button"
            class="inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 shadow-sm dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            title="Show in Diagram"
            @click="onOpenDiagram"
          >
            <Share2 class="h-4 w-4" />
          </button>
          <!-- DuckDB Console button (for file objects) -->
          <button
            v-if="objectType === 'file'"
            type="button"
            class="inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 shadow-sm dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            title="Open in DuckDB Console"
            @click="onOpenFileConsole"
          >
            <Terminal class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 shadow-sm dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isRefreshing"
            @click="onRefreshClick"
          >
            <RefreshCw
              :class="[
                'h-4 w-4 mr-1.5',
                isRefreshing ? 'animate-spin' : 'text-gray-400 dark:text-gray-500'
              ]"
            />
            {{
              showFilterControls
                ? 'Refresh Data'
                : isSummaryTab
                  ? 'Refresh Summary'
                  : 'Refresh Metadata'
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Tab Content -->
    <div :class="['flex-1 min-h-0', isSummaryTab ? 'overflow-y-auto' : 'overflow-hidden']">
      <div
        v-for="(tab, i) in tabs"
        v-show="selectedIndex === i"
        :key="tab.name"
        class="h-full min-h-0"
      >
        <component
          :is="tab.component"
          v-bind="tab.props"
          :ref="(el: any) => (panelRefs[i] = el)"
          @refresh-metadata="emit('refresh-metadata')"
        />
      </div>
    </div>
  </div>
</template>
