<template>
  <div class="px-4 md:px-6">
    <!-- Connection ID (for existing connections) -->
    <div
      v-if="connection?.id"
      class="bg-white dark:bg-gray-850 rounded-xl border border-gray-100 dark:border-gray-700 p-6 mb-6 shadow-sm dark:shadow-gray-900/30"
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Connection ID</label>
        <div class="md:col-span-2">
          <div
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 px-4 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-sm text-sm"
          >
            {{ connection?.id }}
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state for edit mode -->
    <div v-else class="text-center" :class="isEdit ? '' : 'hidden'">
      <Spinner text="Loading connection..." size="sm" />
    </div>

    <!-- Connection Name -->
    <div
      v-if="connection"
      class="bg-white dark:bg-gray-850 rounded-xl border border-gray-100 dark:border-gray-700 p-6 mb-6 shadow-sm dark:shadow-gray-900/30"
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
        <div class="md:col-span-2">
          <input
            v-model="connection.name"
            type="text"
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 transition-colors"
            placeholder="Connection Name"
          />
        </div>
      </div>
    </div>

    <!-- Local Files Parameters -->
    <div v-if="connection && ((isEdit && connection.id) || !isEdit)">
      <!-- Local Files Configuration Group -->
      <div
        class="bg-white dark:bg-gray-850 rounded-xl border border-gray-100 dark:border-gray-700 p-6 mb-6 shadow-sm dark:shadow-gray-900/30"
      >
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          <img
            v-if="logo"
            :src="logo"
            alt="Connection type logo"
            class="h-6 w-6 mr-2.5 object-contain dark:brightness-0 dark:invert dark:opacity-70"
          />
          <FolderOpen v-else class="h-6 w-6 mr-2.5 text-teal-600 dark:text-teal-400" />
          {{ connectionType }} Connection Details
        </h3>

        <div class="space-y-4">
          <!-- Folder Path -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Folder Path</label>
            <div class="md:col-span-2">
              <FolderSelector
                v-model="folderPath"
                :placeholder="folderPathPlaceholder"
                help-text="Select the folder containing your data files"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- File Formats Info -->
      <div
        class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 shadow-sm dark:shadow-gray-900/20"
      >
        <div class="flex items-start">
          <FileText class="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 shrink-0" />
          <div>
            <h4 class="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Supported File Formats
            </h4>
            <p class="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              CSV, JSON, JSONL, Parquet files (.zst, .gz compressed versions also supported). Mixed
              formats in the same folder are allowed.
            </p>
            <p class="text-xs text-blue-600 dark:text-blue-400 mt-3 italic">
              Note: Local files connection will scan the specified folder for supported data files.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { FileText, FolderOpen } from 'lucide-vue-next'
import Spinner from '@/components/common/Spinner.vue'
import FolderSelector from '@/components/common/FolderSelector.vue'
import { useConnectionsStore } from '@/stores/connections'

interface Props {
  connectionType: string
  logo?: string
}

const props = defineProps<Props>()

const connectionsStore = useConnectionsStore()

// Direct store access - single source of truth
const connection = computed(() => connectionsStore.currentConnection)

const folderPathPlaceholder = computed(() => {
  if (typeof navigator === 'undefined') {
    return '/home/user/Documents/my-data-folder'
  }

  const userAgent = navigator.userAgent || ''
  if (/windows/i.test(userAgent)) {
    return 'C:\\Users\\user\\Documents\\my-data-folder'
  }
  if (/macintosh|mac os x/i.test(userAgent)) {
    return '/Users/user/Documents/my-data-folder'
  }
  return '/home/user/Documents/my-data-folder'
})

// Computed property for folder path that uses spec.files.basePath
const folderPath = computed({
  get: () => connection.value?.spec?.files?.basePath || '',
  set: (value: string) => {
    if (connection.value) {
      if (!connection.value.spec) {
        connection.value.spec = { files: { basePath: value } }
      } else if (!connection.value.spec.files) {
        connection.value.spec.files = { basePath: value }
      } else {
        connection.value.spec.files.basePath = value
      }
    }
  }
})

// Helper function to apply connection defaults for local files
const applyConnectionDefaults = (connectionType: string) => {
  if (connection.value) {
    connection.value.type = connectionType.toLowerCase()
    connection.value.port = 0 // Not used for local files
    connection.value.username = 'local' // Default username for local files
    connection.value.password = '' // Not needed for local files

    // Initialize spec.files for new connections
    if (!connection.value.spec && !isEdit.value) {
      connection.value.spec = { files: { basePath: '' } }
    } else if (!connection.value.spec?.files && !isEdit.value) {
      if (!connection.value.spec) {
        connection.value.spec = {}
      }
      connection.value.spec.files = { basePath: '' }
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
  if (!connection.value?.type || !folderPath.value) {
    return ''
  }
  // Support both Unix and Windows paths
  if (/^[A-Za-z]:\\?$/.test(folderPath.value)) {
    const drive = folderPath.value.substring(0, 1)
    return `Files-${drive}`
  }

  const folderName = folderPath.value.split(/[\\/]/).filter(Boolean).pop() || 'files'
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
  () => folderPath.value,
  () => {
    if (!isEdit.value) {
      updateConnectionName()
    }
  }
)
</script>
