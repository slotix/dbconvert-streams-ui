<template>
  <div class="px-4 md:px-6">
    <!-- Connection ID (for existing connections) -->
    <div
      v-if="connection?.id"
      class="bg-white dark:bg-gray-800 bg-opacity-5 dark:bg-opacity-10 text-center md:text-left"
    >
      <div
        class="items-center w-full p-4 space-y-4 text-gray-500 dark:text-gray-400 md:inline-flex md:space-y-0"
      >
        <label class="max-w-sm mx-auto md:w-1/3">Connection ID</label>
        <div class="max-w-sm mx-auto md:w-2/3">
          <div class="relative">
            <span
              class="block rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-base py-2 px-4"
            >
              {{ connection?.id }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state for edit mode -->
    <div v-else class="text-center" :class="isEdit ? '' : 'hidden'">
      <Spinner text="Loading connection..." size="sm" />
    </div>

    <!-- Connection Name -->
    <ConnectionName v-if="connection" v-model:name="connection.name" />

    <!-- Local Files Parameters -->
    <div v-if="connection && ((isEdit && connection.id) || !isEdit)" class="mt-6">
      <!-- Local Files Configuration Group -->
      <div
        class="bg-white dark:bg-gray-900/40 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-sm dark:shadow-gray-900/30"
      >
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          <FolderOpenIcon class="h-5 w-5 mr-2 text-teal-600 dark:text-teal-400" />
          Files Configuration
        </h3>

        <div class="space-y-4">
          <!-- Folder Path -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Folder Path</label>
            <div class="md:col-span-2">
              <FolderSelector
                v-model="connection.path"
                placeholder="/home/user/Documents/my-data-folder"
                help-text="Select the folder containing your data files"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- File Formats Info -->
      <div
        class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4"
      >
        <div class="flex items-start">
          <DocumentTextIcon class="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 shrink-0" />
          <div>
            <h4 class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Supported File Formats
            </h4>
            <p class="text-xs text-blue-700 dark:text-blue-300">
              CSV, JSON, JSONL, Parquet files (.gz compressed versions also supported). Mixed
              formats in the same folder are allowed.
            </p>
          </div>
        </div>
      </div>

      <!-- Note about local files -->
      <div class="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
        Note: Local files connection will scan the specified folder for supported data files.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { FolderOpenIcon, DocumentTextIcon } from '@heroicons/vue/24/outline'
import ConnectionName from './ConnectionName.vue'
import Spinner from '@/components/common/Spinner.vue'
import FolderSelector from '@/components/common/FolderSelector.vue'
import { useConnectionsStore } from '@/stores/connections'

interface Props {
  connectionType: string
}

const props = defineProps<Props>()

const connectionsStore = useConnectionsStore()

// Direct store access - single source of truth
const connection = computed(() => connectionsStore.currentConnection)

// Helper function to apply connection defaults for local files
const applyConnectionDefaults = (connectionType: string) => {
  if (connection.value) {
    connection.value.type = connectionType.toLowerCase()
    connection.value.port = 0 // Not used for local files
    connection.value.username = 'local' // Default username for local files
    connection.value.password = '' // Not needed for local files
    connection.value.database = '' // Not used for local files

    // Set path to empty if it's a new connection
    if (!connection.value.path && !isEdit.value) {
      connection.value.path = ''
    }

    // Update name after applying defaults (for new connections only)
    if (!isEdit.value) {
      updateConnectionName()
    }
  }
}

// Check if we're in edit mode (connection has an ID)
const isEdit = computed(() => !!connection.value?.id)

// Auto-generate connection name based on connection details
const buildConnectionName = computed(() => {
  if (!connection.value?.type || !connection.value?.path) {
    return ''
  }
  const folderName = connection.value.path.split('/').pop() || 'files'
  return `Files-${folderName}`
})

// Update connection name based on mode
const updateConnectionName = () => {
  if (!connection.value) return

  if (!isEdit.value) {
    // New connections: Auto-generate name from connection details
    if (buildConnectionName.value) {
      connection.value.name = buildConnectionName.value
    } else if (connection.value.type) {
      connection.value.name = 'Files-Connection'
    }
  } else {
    // Edit mode: Keep existing name unless it's empty
    if (!connection.value.name && buildConnectionName.value) {
      connection.value.name = buildConnectionName.value
    }
  }
}

// Watch for connection type changes and update defaults
watch(
  () => props.connectionType,
  (newConnectionType) => {
    if (!isEdit.value && newConnectionType) {
      // Only update defaults for new connections, not when editing existing ones
      applyConnectionDefaults(newConnectionType)
    }
  },
  { immediate: true }
)

// Watch for path changes to update connection name
watch(
  () => connection.value?.path,
  () => {
    if (!isEdit.value) {
      updateConnectionName()
    }
  }
)
</script>
