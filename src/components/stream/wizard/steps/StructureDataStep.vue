<template>
  <div class="space-y-6">
    <!-- Data Transfer Mode Section -->
    <div
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
      <FilePreviewList v-if="isFileSourceConnection" :connection-id="sourceConnectionId" />
      <template v-else>
        <!-- Data Source Mode Selector - Only show for Convert mode (not CDC) -->
        <DataSourceModeSelector
          v-if="currentMode === 'convert'"
          v-model="dataSourceMode"
          :show-query-mode="currentMode === 'convert'"
          class="mb-4"
        />

        <!-- Table Selection Mode -->
        <TableList v-if="dataSourceMode === 'tables'" />

        <!-- Custom Query Mode - Only in Convert mode -->
        <div
          v-else-if="dataSourceMode === 'queries' && currentMode === 'convert'"
          class="h-[600px] min-h-[400px]"
        >
          <CustomQueryEditor />
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
              :disabled="isFileSourceConnection"
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
import DataSourceModeSelector from '@/components/stream/wizard/DataSourceModeSelector.vue'
import CustomQueryEditor from '@/components/stream/wizard/CustomQueryEditor.vue'
import type { DataSourceMode } from '@/components/stream/wizard/DataSourceModeSelector.vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'

interface Props {
  targetConnectionId?: string | null
  createTables?: boolean
  createIndexes?: boolean
  createForeignKeys?: boolean
  copyData?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  targetConnectionId: null,
  createTables: true,
  createIndexes: true,
  createForeignKeys: true,
  copyData: true
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

// Data source mode: 'tables' for table selection, 'queries' for custom SQL
const dataSourceMode = ref<DataSourceMode>('tables')

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()

// Current mode from stream config
const currentMode = computed(() => streamsStore.currentStreamConfig?.mode || 'convert')

// Reset dataSourceMode to 'tables' when switching to CDC mode
watch(currentMode, (newMode) => {
  if (newMode === 'cdc') {
    dataSourceMode.value = 'tables'
  }
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
  return source?.id || null
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
      createTables.value = false
      createIndexes.value = false
      createForeignKeys.value = false
      showAdvanced.value = false
      if (streamsStore.currentStreamConfig) {
        streamsStore.currentStreamConfig.files = streamsStore.currentStreamConfig.files || []
      }
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

  // Can proceed as long as at least one option is selected (for database targets)
  // For file targets, structure options are not applicable, so always allow proceeding
  const canProceed = !isTargetDatabase.value || anyStructureEnabled.value || copyData.value
  emit('update:can-proceed', canProceed)
}

// Initialize can-proceed state
emit('update:can-proceed', true)
</script>
