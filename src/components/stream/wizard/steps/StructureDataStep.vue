<template>
  <div class="space-y-6">
    <!-- Multi-Source Query Mode Banner - only shown on Queries tab -->
    <div
      v-if="isMultiSource && activeDataTab === 'queries'"
      class="bg-linear-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700/50 rounded-xl p-4 shadow-sm"
    >
      <div class="flex items-center gap-3">
        <div
          class="shrink-0 h-10 w-10 rounded-lg bg-linear-to-br from-purple-500 to-indigo-500 flex items-center justify-center"
        >
          <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-purple-900 dark:text-purple-100">
            Multi-Source Query Mode
          </h3>
          <p class="text-sm text-purple-700 dark:text-purple-300">
            Write a SQL query that can join data across {{ sourceConnections.length }} connected
            sources. Database tables are prefixed with connection aliases (e.g., db1.tablename).
            File sources can be read directly using DuckDB functions.
          </p>
        </div>
      </div>
    </div>

    <!-- Data Transfer Mode Section - Hidden for multi-source -->
    <div
      v-if="!isMultiSource"
      class="bg-linear-to-br from-slate-50 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-850 border border-gray-100 dark:border-gray-700 rounded-xl p-6 shadow-sm dark:shadow-gray-900/30"
    >
      <ModeButtons />

      <!-- CDC Operations - Only show when CDC mode is selected -->
      <div v-if="currentMode === 'cdc'" class="mt-6">
        <Operations v-model="cdcOperations" prefix="wizard-cdc" />
      </div>
    </div>

    <!-- Dataset Section -->
    <div
      class="bg-linear-to-br from-slate-50 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-850 border border-gray-100 dark:border-gray-700 rounded-xl p-6 shadow-sm dark:shadow-gray-900/30"
    >
      <!-- File Source: Show file preview list -->
      <FilePreviewList v-if="isFileSourceConnection" :connection-id="sourceConnectionId" />
      <template v-else>
        <!-- Tab-based Data Source Selector -->
        <div class="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
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
              <TableCellsIcon class="w-4 h-4" />
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
              <CodeBracketIcon class="w-4 h-4" />
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
        <div class="mt-4">
          <!-- Tables Tab Content -->
          <div v-if="activeDataTab === 'tables'">
            <TableList />
          </div>

          <!-- Queries Tab Content - Only in Convert mode -->
          <div
            v-else-if="activeDataTab === 'queries' && currentMode === 'convert'"
            class="h-[600px] min-h-[400px]"
          >
            <CustomQueryEditor :source-connections="sourceConnections" />
          </div>
        </div>
      </template>
    </div>

    <!-- Structure Options Section - Only show for database targets -->
    <div
      v-if="isTargetDatabase"
      class="bg-linear-to-br from-slate-50 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-850 border border-gray-100 dark:border-gray-700 rounded-xl p-6 shadow-sm dark:shadow-gray-900/30"
    >
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
import { TableCellsIcon, CodeBracketIcon } from '@heroicons/vue/24/outline'
import type { ConnectionMapping } from '@/api/federated'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'

interface Props {
  targetConnectionId?: string | null
  createTables?: boolean
  createIndexes?: boolean
  createForeignKeys?: boolean
  copyData?: boolean
  sourceConnections?: ConnectionMapping[]
}

const props = withDefaults(defineProps<Props>(), {
  targetConnectionId: null,
  createTables: true,
  createIndexes: true,
  createForeignKeys: true,
  copyData: true,
  sourceConnections: () => []
})

const emit = defineEmits<{
  'update:create-tables': [value: boolean]
  'update:create-indexes': [value: boolean]
  'update:create-foreign-keys': [value: boolean]
  'update:copy-data': [value: boolean]
  'update:can-proceed': [value: boolean]
}>()

const createTables = ref(props.createTables)
const createIndexes = ref(props.createIndexes)
const createForeignKeys = ref(props.createForeignKeys)
const copyData = ref(props.copyData)
const showAdvanced = ref(false)

// Active tab: 'tables' or 'queries'
const activeDataTab = ref<'tables' | 'queries'>('tables')

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()

// Current mode from stream config
const currentMode = computed(() => streamsStore.currentStreamConfig?.mode || 'convert')
const isMultiSource = computed(() => props.sourceConnections.length > 1)

// Reset activeDataTab to 'tables' when switching to CDC mode
watch(currentMode, (newMode) => {
  if (newMode === 'cdc') {
    activeDataTab.value = 'tables'
  }
})

// Count selected tables
const selectedTablesCount = computed(() => {
  const tables = streamsStore.currentStreamConfig?.source?.tables || []
  return tables.filter((t) => t.selected).length
})

// Count custom queries
const customQueriesCount = computed(() => {
  const queries = streamsStore.currentStreamConfig?.source?.queries || []
  return queries.length
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

const sourceConnectionId = computed(() => {
  const source = streamsStore.currentStreamConfig?.source
  // Use id first, fallback to first connection's connectionId
  return source?.id || source?.connections?.[0]?.connectionId || null
})

const sourceConnection = computed(() => {
  if (!sourceConnectionId.value) {
    return null
  }
  return connectionsStore.connectionByID(sourceConnectionId.value)
})

const isFileSourceConnection = computed(() => {
  const type = sourceConnection.value?.type?.toLowerCase() || ''
  return type.includes('file')
})

// Check if target is a database type that supports structure options
const targetConnection = computed(() => {
  // Use prop first (for wizard), fallback to stream config (for edit mode)
  const targetId = props.targetConnectionId || streamsStore.currentStreamConfig?.target?.id
  if (!targetId) return null
  return connectionsStore.connectionByID(targetId)
})

const isTargetDatabase = computed(() => {
  const type = targetConnection.value?.type?.toLowerCase() || ''
  // Structure options only apply to database targets (not S3, GCS, Azure, or local files)
  // Snowflake is a database type that also supports structure options
  return (
    type === 'mysql' ||
    type === 'postgresql' ||
    type === 'clickhouse' ||
    type === 'duckdb' ||
    type === 'snowflake'
  )
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
    } else if (streamsStore.currentStreamConfig) {
      streamsStore.currentStreamConfig.files = []
    }
  },
  { immediate: true }
)

// Master "Create structure" checkbox - checked if any structure option is enabled
const createStructure = computed({
  get: () => createTables.value || createIndexes.value || createForeignKeys.value,
  set: (value: boolean) => {
    // When toggled, enable/disable all structure options
    createTables.value = value
    createIndexes.value = value
    createForeignKeys.value = value
    handleOptionsChange()
  }
})

// Helper to check if any structure option is enabled
const anyStructureEnabled = computed(
  () => createTables.value || createIndexes.value || createForeignKeys.value
)

function handleStructureToggle() {
  // Already handled by computed setter
  // This just ensures the change event is properly emitted
}

function handleOptionsChange() {
  emit('update:create-tables', createTables.value)
  emit('update:create-indexes', createIndexes.value)
  emit('update:create-foreign-keys', createForeignKeys.value)
  emit('update:copy-data', copyData.value)

  // For database targets, require at least one option (structure or data)
  // For file targets, always allow proceeding (no structure options needed)
  const canProceed = !isTargetDatabase.value || anyStructureEnabled.value || copyData.value
  emit('update:can-proceed', canProceed)
}

// Initialize can-proceed state
emit('update:can-proceed', true)
</script>
