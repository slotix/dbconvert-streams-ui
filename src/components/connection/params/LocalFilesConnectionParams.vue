<template>
  <div :class="containerClass">
    <div v-if="!connection && isEdit" class="text-center">
      <Spinner text="Loading connection..." size="sm" />
    </div>

    <div
      v-if="connection"
      class="ui-surface-raised ui-border-default mb-6 rounded-xl border p-6 shadow-sm dark:shadow-gray-900/30"
    >
      <div class="space-y-4">
        <div v-if="connection.id" class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Connection ID</label>
          <div class="md:col-span-2">
            <div
              class="ui-surface-muted ui-border-default w-full rounded-lg border px-4 py-2.5 text-sm text-gray-700 shadow-sm dark:text-gray-300"
            >
              {{ connection.id }}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
          <div class="md:col-span-2">
            <input
              v-model="connection.name"
              type="text"
              class="ui-surface-raised ui-border-default ui-accent-focus w-full rounded-lg border px-4 py-2.5 text-sm text-gray-700 shadow-sm transition-colors dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Connection Name"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-if="connection && ((isEdit && connection.id) || !isEdit)">
      <div
        class="ui-surface-raised ui-border-default mb-6 rounded-xl border p-6 shadow-sm dark:shadow-gray-900/30"
      >
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          <img
            v-if="resolvedLogo"
            :src="resolvedLogo"
            alt="Connection type logo"
            class="h-6 w-6 mr-2.5 object-contain dark:brightness-0 dark:invert dark:opacity-70"
          />
          <FolderOpen v-else class="ui-accent-icon h-6 w-6 mr-2.5" />
          {{ displayConnectionType }} Connection Details
        </h3>

        <div class="space-y-4">
          <!-- Folder Path -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Folder Path</label>
            <div class="md:col-span-2">
              <FolderSelector
                v-model="folderPath"
                :placeholder="folderPathPlaceholder"
                :help-text="folderPathHelpText"
                :initial-path="defaultBasePath"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="ui-border-default rounded-xl border bg-transparent p-5">
        <div class="flex items-start">
          <FileText class="mr-3 mt-0.5 h-5 w-5 shrink-0 ui-accent-icon" />
          <div>
            <h4 class="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Supported File Formats
            </h4>
            <p class="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              CSV, JSON, JSONL, Parquet files (.zst, .gz compressed versions also supported). Mixed
              formats in the same folder are allowed.
            </p>
            <p class="mt-3 text-xs italic text-gray-500 dark:text-gray-400">
              Note: Local files connection will scan the specified folder for supported data files.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { FileText, FolderOpen } from 'lucide-vue-next'
import Spinner from '@/components/common/Spinner.vue'
import FolderSelector from '@/components/common/FolderSelector.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useSystemDefaults } from '@/composables/useSystemDefaults'

interface Props {
  connectionType: string
  logo?: string
  layout?: 'default' | 'workspace'
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'default'
})

const connectionsStore = useConnectionsStore()
const { systemDefaults, loadSystemDefaults } = useSystemDefaults()
const matchedDbType = computed(() =>
  connectionsStore.dbTypes.find(
    (dbType) => dbType.type.toLowerCase() === props.connectionType.toLowerCase()
  )
)
const displayConnectionType = computed(() => matchedDbType.value?.type || props.connectionType)
const resolvedLogo = computed(() => matchedDbType.value?.logo || props.logo)
const containerClass = computed(() => (props.layout === 'workspace' ? '' : 'px-4 md:px-6'))

// Direct store access - single source of truth
const connection = computed(() => connectionsStore.currentConnection)
const defaultBasePath = computed(() => systemDefaults.value?.defaultExportPath ?? '')

const folderPathPlaceholder = computed(() => {
  if (defaultBasePath.value) {
    return defaultBasePath.value
  }
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

const folderPathHelpText = computed(() => {
  if (defaultBasePath.value) {
    return `Default folder (server): ${defaultBasePath.value}`
  }
  return 'Select the folder containing your data files'
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

onMounted(async () => {
  try {
    await loadSystemDefaults()
  } catch {
    // Defaults are optional; fall back to placeholders when unavailable.
  }
})
</script>
