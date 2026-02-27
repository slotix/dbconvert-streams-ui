<template>
  <div class="flex h-full min-h-0 flex-col gap-6">
    <!-- Data Transfer Mode Section -->
    <div class="shrink-0">
      <ModeButtons :disabled-mode-ids="disabledModeIds" :disabled-reasons="modeDisabledReasons" />

      <!-- CDC Operations - Only show when CDC mode is selected -->
      <div v-if="currentMode === 'cdc'" class="mt-6">
        <Operations v-model="cdcOperations" prefix="wizard-cdc" />
      </div>
    </div>

    <!-- Dataset Section -->
    <div class="flex-1 min-h-0 flex flex-col">
      <!-- Tab-based Data Source Selector -->
      <div
        v-if="!isFileSourceConnection"
        class="shrink-0 flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-700"
      >
        <!-- Tables Tab -->
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium transition-colors relative"
          :class="[
            activeDataTab === 'tables'
              ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          ]"
          @click="activeDataTab = 'tables'"
        >
          <span class="flex items-center gap-2">
            <Sheet class="w-4 h-4" />
            Tables
            <span
              v-if="selectedTablesCount > 0"
              class="px-1.5 py-0.5 text-xs rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300"
            >
              {{ selectedTablesCount }}
            </span>
          </span>
        </button>

        <!-- Queries Tab - Hidden in CDC mode -->
        <button
          v-if="currentMode !== 'cdc'"
          type="button"
          class="px-4 py-2 text-sm font-medium transition-colors relative"
          :class="[
            activeDataTab === 'queries'
              ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          ]"
          @click="activeDataTab = 'queries'"
        >
          <span class="flex items-center gap-2">
            <Code class="w-4 h-4" />
            Queries
            <span
              v-if="customQueriesCount > 0"
              class="px-1.5 py-0.5 text-xs rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300"
            >
              {{ customQueriesCount }}
            </span>
          </span>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="flex-1 min-h-0 flex flex-col">
        <!-- Tables / Source Objects Tab Content -->
        <div
          v-if="isFileSourceConnection || activeDataTab === 'tables'"
          class="h-full min-h-0 flex flex-col"
          :class="showCombinedObjectsToolbar ? 'overflow-y-auto pr-1 gap-6' : ''"
        >
          <DataSelectionToolbar
            v-if="showCombinedObjectsToolbar"
            :selected-count="combinedObjectSelectedCount"
            :total-count="combinedObjectTotalCount"
            :search-value="combinedObjectSearchQuery"
            search-placeholder="Filter source objects..."
            :select-all-checked="combinedSelectAllChecked"
            :select-all-indeterminate="combinedSelectAllIndeterminate"
            select-all-label="All"
            refresh-label="Refresh"
            refresh-title="Refresh source objects"
            sticky
            @update:search-value="combinedObjectSearchQuery = $event"
            @update:select-all="setCombinedSelectAll"
            @refresh="refreshCombinedObjects"
          />
          <div :class="sourceObjectsContainerClass">
            <TableList
              v-if="!isFileSourceConnection"
              ref="tableListRef"
              :list-height="showCombinedObjectsToolbar ? undefined : '100%'"
              :list-max-height="showCombinedObjectsToolbar ? 'none' : undefined"
              :sticky-header="!showCombinedObjectsToolbar"
              :show-toolbar="!showCombinedObjectsToolbar"
              :external-search-query="showCombinedObjectsToolbar ? combinedObjectSearchQuery : ''"
              :embedded="showCombinedObjectsToolbar"
              @stats-change="tableObjectStats = $event"
            />

            <div v-if="hasFileSourceGroups">
              <div
                v-for="fileConn in fileSourceConnections"
                :key="fileConn.connectionId"
                class="border-t first:border-t-0 border-gray-200 dark:border-gray-700"
              >
                <SourceSectionHeader
                  :alias="fileConn.alias"
                  :connection-name="getConnectionName(fileConn.connectionId)"
                  :selection-label="getSourceSelectionLabel(fileConn)"
                  :icon="isS3Type(fileConn.connectionId) ? Cloud : FolderOpen"
                  icon-class="text-sky-500/80 dark:text-sky-400/80"
                  collapsible
                  :expanded="isFileGroupExpanded(fileConn.connectionId)"
                  sticky
                  class="rounded-none border-x-0 border-t-0 border-b border-b-gray-200/70 dark:border-b-gray-700/70"
                  @toggle="toggleFileGroup(fileConn.connectionId)"
                >
                  <template #actions>
                    <SourceHeaderActions
                      @select-all="selectAllInFileGroup(fileConn.connectionId)"
                      @clear="clearAllInFileGroup(fileConn.connectionId)"
                    />
                  </template>
                </SourceSectionHeader>
                <div v-show="isFileGroupExpanded(fileConn.connectionId)">
                  <FilePreviewList
                    :ref="(instance) => setFilePreviewRef(fileConn.connectionId, instance)"
                    :connection-id="fileConn.connectionId"
                    :show-toolbar="false"
                    :external-search-query="combinedObjectSearchQuery"
                    :embedded="showCombinedObjectsToolbar"
                    @stats-change="(stats) => setFileObjectStats(fileConn.connectionId, stats)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Queries Tab Content - Only in Convert mode -->
        <div
          v-else-if="activeDataTab === 'queries' && currentMode === 'convert'"
          class="flex-1 min-h-0 flex flex-col"
        >
          <CustomQueryEditor
            :source-connections="sourceConnections"
            @update:source-connections="handleSourceConnectionsUpdate"
          />
        </div>
      </div>
    </div>

    <!-- Structure Options Section - Only show for database targets -->
    <div v-if="isTargetDatabase" class="shrink-0">
      <!-- Warning when nothing is selected -->
      <div
        v-if="!anyStructureEnabled && !copyData"
        class="mb-4 rounded-md bg-yellow-50 dark:bg-amber-900/30 border border-yellow-200 dark:border-amber-500/50 p-4"
      >
        <div class="flex">
          <div class="shrink-0">
            <svg
              class="h-5 w-5 text-yellow-400 dark:text-amber-300"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-yellow-800 dark:text-amber-200">Select at least one option</p>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <!-- Create Structure Checkbox (Master) -->
        <div class="relative flex items-start">
          <div class="flex items-center h-5">
            <input
              id="create-structure"
              v-model="createStructure"
              type="checkbox"
              class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              @change="handleStructureToggle"
            />
          </div>
          <div class="ml-3 text-sm">
            <label
              for="create-structure"
              class="font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
            >
              Create structure
            </label>
            <!-- Helper text for file sources -->
            <p
              v-if="isFileSourceConnection"
              class="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
            >
              Table structure will be inferred from file schema
            </p>
          </div>
        </div>

        <!-- Advanced Structure Options (Expandable) -->
        <div v-if="createStructure && !isFileSourceConnection" class="ml-7 mt-3">
          <button
            type="button"
            class="flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none"
            @click="showAdvanced = !showAdvanced"
          >
            <svg
              class="h-4 w-4 mr-1 transition-transform"
              :class="{ 'rotate-90': showAdvanced }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span class="font-medium">Advanced structure options</span>
          </button>

          <!-- Granular Structure Options -->
          <div
            v-if="showAdvanced"
            class="mt-3 pl-5 space-y-3 border-l-2 border-gray-200 dark:border-gray-700"
          >
            <!-- Create Tables -->
            <div class="relative flex items-start">
              <div class="flex items-center h-5">
                <input
                  id="create-tables"
                  v-model="createTables"
                  type="checkbox"
                  class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  :disabled="isFileSourceConnection"
                  @change="handleOptionsChange"
                />
              </div>
              <div class="ml-3 text-sm">
                <label
                  for="create-tables"
                  class="font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Tables
                </label>
              </div>
            </div>

            <!-- Create Indexes -->
            <div class="relative flex items-start">
              <div class="flex items-center h-5">
                <input
                  id="create-indexes"
                  v-model="createIndexes"
                  type="checkbox"
                  class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  :disabled="isFileSourceConnection"
                  @change="handleOptionsChange"
                />
              </div>
              <div class="ml-3 text-sm">
                <label
                  for="create-indexes"
                  class="font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Indexes
                </label>
              </div>
            </div>

            <!-- Create Foreign Keys -->
            <div class="relative flex items-start">
              <div class="flex items-center h-5">
                <input
                  id="create-foreign-keys"
                  v-model="createForeignKeys"
                  type="checkbox"
                  class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  :disabled="isFileSourceConnection"
                  @change="handleOptionsChange"
                />
              </div>
              <div class="ml-3 text-sm">
                <label
                  for="create-foreign-keys"
                  class="font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Foreign keys
                </label>
              </div>
            </div>

            <!-- Create Check Constraints -->
            <div class="relative flex items-start">
              <div class="flex items-center h-5">
                <input
                  id="create-check-constraints"
                  v-model="createCheckConstraints"
                  type="checkbox"
                  class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  :disabled="isFileSourceConnection"
                  @change="handleOptionsChange"
                />
              </div>
              <div class="ml-3 text-sm">
                <label
                  for="create-check-constraints"
                  class="font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Check constraints
                </label>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="isPolicySupportedTarget"
          class="ml-7 mt-3 space-y-4 rounded-md border border-gray-200 dark:border-gray-700 p-4"
        >
          <div>
            <label
              for="schema-policy"
              class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
            >
              Schema policy
            </label>
            <select
              id="schema-policy"
              v-model="schemaPolicy"
              class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="!createStructure"
              @change="handleOptionsChange"
            >
              <option
                v-for="option in schemaPolicyOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ schemaPolicyHelpText }}
            </p>
          </div>

          <div>
            <label
              for="write-mode"
              class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
            >
              Write mode
            </label>
            <select
              id="write-mode"
              v-model="writeMode"
              class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="isWriteModeLocked || !copyData"
              @change="handleOptionsChange"
            >
              <option v-for="option in writeModeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ writeModeHelpText }}
            </p>
          </div>
        </div>

        <!-- Copy Data Checkbox -->
        <div class="relative flex items-start">
          <div class="flex items-center h-5">
            <input
              id="copy-data"
              v-model="copyData"
              type="checkbox"
              class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              @change="handleOptionsChange"
            />
          </div>
          <div class="ml-3 text-sm">
            <label
              for="copy-data"
              class="font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
            >
              Copy data
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import TableList from '@/components/settings/TableList.vue'
import FilePreviewList from '@/components/stream/wizard/FilePreviewList.vue'
import DataSelectionToolbar from '@/components/stream/wizard/DataSelectionToolbar.vue'
import SourceSectionHeader from '@/components/stream/wizard/SourceSectionHeader.vue'
import SourceHeaderActions from '@/components/stream/wizard/SourceHeaderActions.vue'
import ModeButtons from '@/components/settings/ModeButtons.vue'
import Operations from '@/components/settings/Operations.vue'
import CustomQueryEditor from '@/components/stream/wizard/CustomQueryEditor.vue'
import { Code, Sheet, Cloud, FolderOpen } from 'lucide-vue-next'
import type { StreamConnectionMapping } from '@/types/streamConfig'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import type { ModeOption } from '@/stores/common'
import {
  getConnectionKindFromSpec,
  isDatabaseKind,
  isFileBasedKind,
  type SchemaPolicy,
  type WriteMode
} from '@/types/specs'

interface Props {
  targetConnectionId?: string | null
  createTables?: boolean
  createIndexes?: boolean
  createForeignKeys?: boolean
  createCheckConstraints?: boolean
  schemaPolicy?: SchemaPolicy
  writeMode?: WriteMode
  copyData?: boolean
  sourceConnections?: StreamConnectionMapping[]
}

const props = withDefaults(defineProps<Props>(), {
  targetConnectionId: null,
  createTables: true,
  createIndexes: true,
  createForeignKeys: true,
  createCheckConstraints: true,
  schemaPolicy: 'fail_if_exists',
  writeMode: 'fail_if_not_empty',
  copyData: true,
  sourceConnections: () => []
})

const emit = defineEmits<{
  'update:create-tables': [value: boolean]
  'update:create-indexes': [value: boolean]
  'update:create-foreign-keys': [value: boolean]
  'update:create-check-constraints': [value: boolean]
  'update:schema-policy': [value: SchemaPolicy]
  'update:write-mode': [value: WriteMode]
  'update:copy-data': [value: boolean]
  'update:can-proceed': [value: boolean]
  'update:source-connections': [connections: StreamConnectionMapping[]]
}>()

const createTables = ref(props.createTables)
const createIndexes = ref(props.createIndexes)
const createForeignKeys = ref(props.createForeignKeys)
const createCheckConstraints = ref(props.createCheckConstraints)
const schemaPolicy = ref<SchemaPolicy>(props.schemaPolicy)
const writeMode = ref<WriteMode>(props.writeMode)
const copyData = ref(props.copyData)
const showAdvanced = ref(false)

// Active tab: 'tables' or 'queries'
const activeDataTab = ref<'tables' | 'queries'>('tables')

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()

interface ObjectListStats {
  selected: number
  total: number
}

interface UnifiedObjectPanelHandle {
  refresh?: () => void | Promise<void>
  setSelectAll?: (value: boolean) => void
}

const tableListRef = ref<UnifiedObjectPanelHandle | null>(null)
const filePreviewRefs = ref<Record<string, UnifiedObjectPanelHandle | null>>({})
const tableObjectStats = ref<ObjectListStats>({ selected: 0, total: 0 })
const fileObjectStats = ref<Record<string, ObjectListStats>>({})
const combinedObjectSearchQuery = ref('')
const expandedFileGroups = ref<Set<string>>(new Set())

// Current mode from stream config
const currentMode = computed(() => streamsStore.currentStreamConfig?.mode || 'convert')

const streamSourceConnections = computed(
  () => streamsStore.currentStreamConfig?.source?.connections || []
)
const databaseSourceCount = computed(
  () => streamSourceConnections.value.filter((conn) => isDatabaseType(conn.connectionId)).length
)
const fileSourceCount = computed(
  () => streamSourceConnections.value.filter((conn) => isFileType(conn.connectionId)).length
)

// CDC only allowed with exactly 1 database source and no file/S3 sources
const canUseCDCMode = computed(() => databaseSourceCount.value === 1 && fileSourceCount.value === 0)

const cdcModeDisabledReason = computed(() => {
  if (canUseCDCMode.value) return ''
  if (databaseSourceCount.value > 1 && fileSourceCount.value === 0) {
    return 'Requires exactly one database source.'
  }
  if (databaseSourceCount.value > 0 && fileSourceCount.value > 0) {
    return 'Not available with mixed database and file/S3 sources.'
  }
  if (databaseSourceCount.value === 0 && fileSourceCount.value > 0) {
    return 'File/S3 sources support Convert mode only.'
  }
  return 'Select one database source to enable CDC.'
})

type ModeId = ModeOption['id']

const disabledModeIds = computed<ModeId[]>(() => (canUseCDCMode.value ? [] : ['cdc']))
const modeDisabledReasons = computed<Partial<Record<ModeId, string>>>(() => ({
  cdc: cdcModeDisabledReason.value
}))

// Reset activeDataTab to 'tables' when switching to CDC mode
watch(currentMode, (newMode) => {
  if (newMode === 'cdc') {
    activeDataTab.value = 'tables'
  }
})

watch(
  canUseCDCMode,
  (canUseCDC) => {
    if (!canUseCDC && streamsStore.currentStreamConfig?.mode === 'cdc') {
      streamsStore.currentStreamConfig.mode = 'convert'
    }
  },
  { immediate: true }
)

// Count selected tables (now per-connection)
// Note: connection.tables only contains selected tables (filtered in TableList.vue)
const selectedTablesCount = computed(() => {
  const connections = streamsStore.currentStreamConfig?.source?.connections || []
  let count = 0
  for (const conn of connections) {
    if (conn.tables) {
      count += conn.tables.length
    }
  }
  return count
})

// Count custom queries (now per-connection)
const customQueriesCount = computed(() => {
  const connections = streamsStore.currentStreamConfig?.source?.connections || []
  let count = 0
  for (const conn of connections) {
    if (conn.queries) {
      count += conn.queries.filter((query) => query.query?.trim()).length
    }
  }
  return count
})

// CDC Operations
const cdcOperations = computed({
  get: () => streamsStore.currentStreamConfig?.source?.options?.operations || [],
  set: (value: string[]) => {
    if (streamsStore.currentStreamConfig?.source?.options) {
      streamsStore.currentStreamConfig.source.options.operations = value
    }
  }
})

// Helper to check if a connection is a file/S3 type - spec is the ONLY source of truth
function isFileType(connectionId: string): boolean {
  const conn = connectionsStore.connectionByID(connectionId)
  const kind = getConnectionKindFromSpec(conn?.spec)
  return isFileBasedKind(kind)
}

function isDatabaseType(connectionId: string): boolean {
  const conn = connectionsStore.connectionByID(connectionId)
  const kind = getConnectionKindFromSpec(conn?.spec)
  return isDatabaseKind(kind)
}

// Helper to check if a connection is S3 (spec.s3)
function isS3Type(connectionId: string): boolean {
  const conn = connectionsStore.connectionByID(connectionId)
  return getConnectionKindFromSpec(conn?.spec) === 's3'
}

// Get all file/S3 source connections
const fileSourceConnections = computed(() => {
  const connections = streamsStore.currentStreamConfig?.source?.connections || []
  return connections.filter((conn) => isFileType(conn.connectionId))
})

// Get all database source connections
const databaseSourceConnections = computed(() => {
  const connections = streamsStore.currentStreamConfig?.source?.connections || []
  return connections.filter((conn) => !isFileType(conn.connectionId))
})

// Check if ALL sources are file connections (pure file mode)
const isFileSourceConnection = computed(() => {
  const connections = streamsStore.currentStreamConfig?.source?.connections || []
  if (connections.length === 0) return false
  return connections.every((conn) => isFileType(conn.connectionId))
})

const hasFileSourceGroups = computed(() => fileSourceConnections.value.length > 0)
const showCombinedObjectsToolbar = computed(() => hasFileSourceGroups.value)
const sourceObjectsContainerClass = computed(() =>
  showCombinedObjectsToolbar.value
    ? 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 overflow-hidden'
    : ''
)

const combinedObjectSelectedCount = computed(() => {
  const fileSelected = Object.values(fileObjectStats.value).reduce(
    (sum, stats) => sum + (stats?.selected || 0),
    0
  )
  return tableObjectStats.value.selected + fileSelected
})

const combinedObjectTotalCount = computed(() => {
  const fileTotal = Object.values(fileObjectStats.value).reduce(
    (sum, stats) => sum + (stats?.total || 0),
    0
  )
  return tableObjectStats.value.total + fileTotal
})

const combinedSelectAllChecked = computed(() => {
  const total = combinedObjectTotalCount.value
  if (total === 0) return false
  return combinedObjectSelectedCount.value === total
})

const combinedSelectAllIndeterminate = computed(() => {
  const selected = combinedObjectSelectedCount.value
  const total = combinedObjectTotalCount.value
  return selected > 0 && selected < total
})

function setFilePreviewRef(connectionId: string, instance: unknown) {
  filePreviewRefs.value[connectionId] = instance as UnifiedObjectPanelHandle | null
}

function setFileObjectStats(connectionId: string, stats: ObjectListStats) {
  fileObjectStats.value = {
    ...fileObjectStats.value,
    [connectionId]: stats
  }
}

function isFileGroupExpanded(connectionId: string): boolean {
  return expandedFileGroups.value.has(connectionId)
}

function toggleFileGroup(connectionId: string) {
  const next = new Set(expandedFileGroups.value)
  if (next.has(connectionId)) {
    next.delete(connectionId)
  } else {
    next.add(connectionId)
  }
  expandedFileGroups.value = next
}

function selectAllInFileGroup(connectionId: string) {
  filePreviewRefs.value[connectionId]?.setSelectAll?.(true)
}

function clearAllInFileGroup(connectionId: string) {
  filePreviewRefs.value[connectionId]?.setSelectAll?.(false)
}

function setCombinedSelectAll(selectAll: boolean) {
  tableListRef.value?.setSelectAll?.(selectAll)
  for (const refInstance of Object.values(filePreviewRefs.value)) {
    refInstance?.setSelectAll?.(selectAll)
  }
}

function refreshCombinedObjects() {
  void tableListRef.value?.refresh?.()
  for (const refInstance of Object.values(filePreviewRefs.value)) {
    void refInstance?.refresh?.()
  }
}

// Get connection name by ID
function getConnectionName(connectionId: string): string {
  const conn = connectionsStore.connectionByID(connectionId)
  return conn?.name || connectionId
}

function getSourceSelectionLabel(source: StreamConnectionMapping): string {
  return source.s3?.bucket || source.files?.basePath || source.database || ''
}

// Check if target is a database type that supports structure options
const targetConnection = computed(() => {
  // Use prop first (for wizard), fallback to stream config (for edit mode)
  const targetId = props.targetConnectionId || streamsStore.currentStreamConfig?.target?.id
  if (!targetId) return null
  return connectionsStore.connectionByID(targetId)
})

const isTargetDatabase = computed(() => {
  const kind = getConnectionKindFromSpec(targetConnection.value?.spec)
  // Structure options only apply to database targets (not file-based)
  return isDatabaseKind(kind)
})

const isPolicySupportedTarget = computed(() => {
  if (!isTargetDatabase.value || !targetConnection.value?.type) return false
  const targetType = targetConnection.value.type.toLowerCase()
  return targetType === 'mysql' || targetType === 'postgresql' || targetType === 'postgres'
})

const schemaPolicyOptions: Array<{ value: SchemaPolicy; label: string }> = [
  { value: 'fail_if_exists', label: 'Fail if exists (safe default)' },
  { value: 'validate_existing', label: 'Validate existing' },
  { value: 'create_missing_only', label: 'Create missing only' },
  { value: 'drop_and_recreate', label: 'Drop and recreate' }
]

const writeModeOptions = computed<Array<{ value: WriteMode; label: string }>>(() => {
  if (currentMode.value === 'cdc') {
    return [{ value: 'upsert', label: 'Upsert (required for CDC)' }]
  }
  return [
    { value: 'fail_if_not_empty', label: 'Fail if not empty (safe default)' },
    { value: 'append', label: 'Append' },
    { value: 'truncate_and_load', label: 'Truncate and load' },
    { value: 'upsert', label: 'Upsert' }
  ]
})

const isWriteModeLocked = computed(() => currentMode.value === 'cdc')

const schemaPolicyHelpText = computed(() => {
  if (!createStructure.value) {
    return 'Ignored when structure creation is disabled.'
  }
  return 'Controls how existing target tables are handled before structure creation.'
})

const writeModeHelpText = computed(() => {
  if (!copyData.value) {
    return 'Ignored when data copy is disabled.'
  }
  if (isWriteModeLocked.value) {
    return 'CDC requires upsert to keep target rows synchronized.'
  }
  return 'Controls how rows are written when target tables already contain data.'
})

watch(
  currentMode,
  (mode) => {
    if (mode === 'cdc') {
      writeMode.value = 'upsert'
      if (schemaPolicy.value === 'fail_if_exists') {
        schemaPolicy.value = 'validate_existing'
      }
      handleOptionsChange()
    }
  },
  { immediate: true }
)

watch(
  isFileSourceConnection,
  (isFile) => {
    if (isFile) {
      // For file sources, initialize the files array and emit can-proceed
      if (streamsStore.currentStreamConfig) {
        streamsStore.currentStreamConfig.files = streamsStore.currentStreamConfig.files || []
      }
      // File sources can proceed - structure will be inferred from file schema
      emit('update:can-proceed', true)
    }
    // Note: Don't clear files when isFileSourceConnection is false - multi-source streams
    // can have both database AND file sources, and we need to preserve the file selections
  },
  { immediate: true }
)

watch(
  fileSourceConnections,
  (connections) => {
    const validIds = new Set(connections.map((c) => c.connectionId))
    const nextRefs: Record<string, UnifiedObjectPanelHandle | null> = {}
    const nextStats: Record<string, ObjectListStats> = {}
    const nextExpanded = new Set<string>()

    for (const [connectionId, instance] of Object.entries(filePreviewRefs.value)) {
      if (validIds.has(connectionId)) {
        nextRefs[connectionId] = instance
      }
    }
    for (const [connectionId, stats] of Object.entries(fileObjectStats.value)) {
      if (validIds.has(connectionId)) {
        nextStats[connectionId] = stats
      }
    }
    for (const connectionId of connections.map((c) => c.connectionId)) {
      if (expandedFileGroups.value.has(connectionId)) {
        nextExpanded.add(connectionId)
      }
    }
    filePreviewRefs.value = nextRefs
    fileObjectStats.value = nextStats
    expandedFileGroups.value = nextExpanded
  },
  { deep: true, immediate: true }
)

watch(
  databaseSourceConnections,
  (connections) => {
    if (connections.length === 0) {
      tableObjectStats.value = { selected: 0, total: 0 }
    }
  },
  { deep: true, immediate: true }
)

// Master "Create structure" checkbox - checked if any structure option is enabled
const createStructure = computed({
  get: () =>
    createTables.value ||
    createIndexes.value ||
    createForeignKeys.value ||
    createCheckConstraints.value,
  set: (value: boolean) => {
    // When toggled, enable/disable all structure options
    createTables.value = value
    createIndexes.value = value
    createForeignKeys.value = value
    createCheckConstraints.value = value
    handleOptionsChange()
  }
})

// Helper to check if any structure option is enabled
const anyStructureEnabled = computed(
  () =>
    createTables.value ||
    createIndexes.value ||
    createForeignKeys.value ||
    createCheckConstraints.value
)

function handleStructureToggle() {
  // Already handled by computed setter
  // This just ensures the change event is properly emitted
}

function handleOptionsChange() {
  emit('update:create-tables', createTables.value)
  emit('update:create-indexes', createIndexes.value)
  emit('update:create-foreign-keys', createForeignKeys.value)
  emit('update:create-check-constraints', createCheckConstraints.value)
  emit('update:schema-policy', schemaPolicy.value)
  emit('update:write-mode', writeMode.value)
  emit('update:copy-data', copyData.value)

  // For database targets, require at least one option (structure or data)
  // For file targets, always allow proceeding (no structure options needed)
  const canProceed = !isTargetDatabase.value || anyStructureEnabled.value || copyData.value
  emit('update:can-proceed', canProceed)
}

function handleSourceConnectionsUpdate(connections: StreamConnectionMapping[]) {
  emit('update:source-connections', connections)
}

// Initialize can-proceed state
emit('update:can-proceed', true)
</script>
