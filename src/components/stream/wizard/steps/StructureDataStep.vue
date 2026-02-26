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
      <!-- Pure File Source: Show file preview list for ALL file connections -->
      <template v-if="isFileSourceConnection">
        <div
          v-for="fileConn in fileSourceConnections"
          :key="fileConn.connectionId"
          class="mb-6 last:mb-0"
        >
          <!-- File source header (when multiple sources) -->
          <div
            v-if="fileSourceConnections.length > 1"
            class="flex items-center gap-3 mb-3 px-4 py-2 bg-linear-to-r from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 rounded-lg border border-teal-200 dark:border-teal-700"
          >
            <component
              :is="isS3Type(fileConn.connectionId) ? Cloud : FolderOpen"
              class="w-5 h-5 text-teal-600 dark:text-teal-400"
            />
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-teal-900 dark:text-teal-100">
                {{ fileConn.alias }}
              </span>
              <span class="text-xs text-teal-600 dark:text-teal-400">
                {{ getConnectionName(fileConn.connectionId) }}
              </span>
              <span v-if="fileConn.s3?.bucket" class="text-xs text-teal-500 dark:text-teal-400">
                / {{ fileConn.s3.bucket }}
              </span>
            </div>
          </div>
          <FilePreviewList :connection-id="fileConn.connectionId" />
        </div>
      </template>

      <!-- Mixed or Pure Database Sources -->
      <template v-else>
        <!-- Tab-based Data Source Selector -->
        <div
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
          <!-- Tables Tab Content -->
          <div v-if="activeDataTab === 'tables'" class="h-full min-h-0 flex flex-col">
            <TableList list-height="100%" />

            <!-- File/S3 Sources Section (in mixed mode) -->
            <div v-if="hasMixedSourceTypes" class="mt-6 space-y-4">
              <div
                v-for="fileConn in fileSourceConnections"
                :key="fileConn.connectionId"
                class="border-t border-gray-200 dark:border-gray-700 pt-4"
              >
                <!-- File source header -->
                <div
                  class="flex items-center gap-3 mb-3 px-4 py-2 bg-linear-to-r from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 rounded-lg border border-teal-200 dark:border-teal-700"
                >
                  <component
                    :is="isS3Type(fileConn.connectionId) ? Cloud : FolderOpen"
                    class="w-5 h-5 text-teal-600 dark:text-teal-400"
                  />
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-teal-900 dark:text-teal-100">
                      {{ fileConn.alias }}
                    </span>
                    <span class="text-xs text-teal-600 dark:text-teal-400">
                      {{ getConnectionName(fileConn.connectionId) }}
                    </span>
                    <span
                      v-if="fileConn.s3?.bucket"
                      class="text-xs text-teal-500 dark:text-teal-400"
                    >
                      / {{ fileConn.s3.bucket }}
                    </span>
                  </div>
                </div>
                <!-- File preview for this connection - bucket looked up from stream config -->
                <FilePreviewList :connection-id="fileConn.connectionId" />
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
      </template>
    </div>

    <!-- Structure Options Section - Only show for database targets -->
    <div v-if="isTargetDatabase" class="">
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
import ModeButtons from '@/components/settings/ModeButtons.vue'
import Operations from '@/components/settings/Operations.vue'
import CustomQueryEditor from '@/components/stream/wizard/CustomQueryEditor.vue'
import { Code, Sheet, Cloud, FolderOpen } from 'lucide-vue-next'
import type { StreamConnectionMapping } from '@/types/streamConfig'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import type { ModeOption } from '@/stores/common'
import { getConnectionKindFromSpec, isDatabaseKind, isFileBasedKind } from '@/types/specs'

interface Props {
  targetConnectionId?: string | null
  createTables?: boolean
  createIndexes?: boolean
  createForeignKeys?: boolean
  createCheckConstraints?: boolean
  copyData?: boolean
  sourceConnections?: StreamConnectionMapping[]
}

const props = withDefaults(defineProps<Props>(), {
  targetConnectionId: null,
  createTables: true,
  createIndexes: true,
  createForeignKeys: true,
  createCheckConstraints: true,
  copyData: true,
  sourceConnections: () => []
})

const emit = defineEmits<{
  'update:create-tables': [value: boolean]
  'update:create-indexes': [value: boolean]
  'update:create-foreign-keys': [value: boolean]
  'update:create-check-constraints': [value: boolean]
  'update:copy-data': [value: boolean]
  'update:can-proceed': [value: boolean]
  'update:source-connections': [connections: StreamConnectionMapping[]]
}>()

const createTables = ref(props.createTables)
const createIndexes = ref(props.createIndexes)
const createForeignKeys = ref(props.createForeignKeys)
const createCheckConstraints = ref(props.createCheckConstraints)
const copyData = ref(props.copyData)
const showAdvanced = ref(false)

// Active tab: 'tables' or 'queries'
const activeDataTab = ref<'tables' | 'queries'>('tables')

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()

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

// Check if we have a mix of database and file sources
const hasMixedSourceTypes = computed(() => {
  return fileSourceConnections.value.length > 0 && databaseSourceConnections.value.length > 0
})

// Get connection name by ID
function getConnectionName(connectionId: string): string {
  const conn = connectionsStore.connectionByID(connectionId)
  return conn?.name || connectionId
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
