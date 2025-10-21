<template>
  <div class="space-y-6">
    <!-- Dataset Section -->
    <div class="bg-white border border-gray-200 rounded-lg p-6">
      <FilePreviewList v-if="isFileSourceConnection" :connection-id="sourceConnectionId" />
      <TableList v-else />
    </div>

    <!-- Structure Options Section -->
    <div class="bg-white border border-gray-200 rounded-lg p-6">
      <!-- Warning when nothing is selected -->
      <div
        v-if="!anyStructureEnabled && !copyData"
        class="mb-4 rounded-md bg-yellow-50 border border-yellow-200 p-4"
      >
        <div class="flex">
          <div class="flex-shrink-0">
            <svg
              class="h-5 w-5 text-yellow-400"
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
            <p class="text-sm text-yellow-800">Select at least one option</p>
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
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              :disabled="isFileSourceConnection"
              @change="handleStructureToggle"
            />
          </div>
          <div class="ml-3 text-sm">
            <label for="create-structure" class="font-medium text-gray-900 cursor-pointer">
              Create structure
            </label>
          </div>
        </div>

        <!-- Advanced Structure Options (Expandable) -->
        <div v-if="createStructure && !isFileSourceConnection" class="ml-7 mt-3">
          <button
            type="button"
            class="flex items-center text-sm text-gray-700 hover:text-gray-900 focus:outline-none"
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
          <div v-if="showAdvanced" class="mt-3 pl-5 space-y-3 border-l-2 border-gray-200">
            <!-- Create Tables -->
            <div class="relative flex items-start">
              <div class="flex items-center h-5">
                <input
                  id="create-tables"
                  v-model="createTables"
                  type="checkbox"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  :disabled="isFileSourceConnection"
                  @change="handleOptionsChange"
                />
              </div>
              <div class="ml-3 text-sm">
                <label for="create-tables" class="font-medium text-gray-700 cursor-pointer">
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
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  :disabled="isFileSourceConnection"
                  @change="handleOptionsChange"
                />
              </div>
              <div class="ml-3 text-sm">
                <label for="create-indexes" class="font-medium text-gray-700 cursor-pointer">
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
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  :disabled="isFileSourceConnection"
                  @change="handleOptionsChange"
                />
              </div>
              <div class="ml-3 text-sm">
                <label for="create-foreign-keys" class="font-medium text-gray-700 cursor-pointer">
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
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              @change="handleOptionsChange"
            />
          </div>
          <div class="ml-3 text-sm">
            <label for="copy-data" class="font-medium text-gray-900 cursor-pointer">
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
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'

interface Props {
  createTables?: boolean
  createIndexes?: boolean
  createForeignKeys?: boolean
  copyData?: boolean
}

const props = withDefaults(defineProps<Props>(), {
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

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()

const sourceConnectionId = computed(() => {
  const source = streamsStore.currentStreamConfig?.source
  return source || null
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

watch(
  isFileSourceConnection,
  (isFile) => {
    if (isFile) {
      createTables.value = false
      createIndexes.value = false
      createForeignKeys.value = false
      showAdvanced.value = false
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

  // Can proceed as long as at least one option is selected
  const canProceed = anyStructureEnabled.value || copyData.value
  emit('update:can-proceed', canProceed)
}

// Initialize can-proceed state
emit('update:can-proceed', true)
</script>
