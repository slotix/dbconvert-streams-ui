<template>
  <div class="px-4 md:px-6">
    <!-- Connection ID (for existing connections) -->
    <div v-if="connection?.id" class="bg-white bg-opacity-5 text-center md:text-left">
      <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
        <label class="max-w-sm mx-auto md:w-1/3">Connection ID</label>
        <div class="max-w-sm mx-auto md:w-2/3">
          <div class="relative">
            <span
              class="block rounded-lg bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base py-2 px-4"
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

    <!-- Connection Parameters -->
    <div v-if="connection && ((isEdit && connection.id) || !isEdit)" class="mt-6">
      <!-- Connection Authentication Group -->
      <div class="bg-white rounded-xl border border-gray-100 p-6 mb-6 shadow-sm">
        <h3 class="text-sm font-semibold text-gray-900 mb-6 flex items-center">
          <svg
            class="h-4 w-4 mr-2 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Connection Details
        </h3>

        <div class="space-y-4">
          <!-- Server -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700">Server</label>
            <div class="md:col-span-2">
              <input
                v-model="connection.host"
                type="text"
                class="w-full rounded-lg border border-gray-300 py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                placeholder="localhost"
              />
            </div>
          </div>

          <!-- Port -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700">Port</label>
            <div class="md:col-span-2">
              <input
                v-model.number.lazy="connection.port"
                type="number"
                class="w-full rounded-lg border border-gray-300 py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                :placeholder="defaultPort.toString()"
              />
            </div>
          </div>

          <!-- Username -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700">User ID</label>
            <div class="md:col-span-2">
              <input
                v-model="connection.username"
                type="text"
                class="w-full rounded-lg border border-gray-300 py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                :placeholder="getConnectionDefaults().username"
              />
            </div>
          </div>

          <!-- Password -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700">Password</label>
            <div class="md:col-span-2">
              <div class="relative">
                <input
                  v-model="connection.password"
                  :type="passwordFieldType"
                  class="w-full rounded-lg border border-gray-300 py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent pr-10"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  class="absolute right-0 top-0 h-full px-3 flex items-center"
                  @click="togglePasswordVisibility"
                >
                  <EyeIcon
                    v-if="passwordFieldType === 'password'"
                    class="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <EyeSlashIcon v-else class="h-5 w-5 text-gray-400" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
          <!-- Database Field (Optional) -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700">Database (Optional)</label>
            <div class="md:col-span-2">
              <input
                v-model="connection.database"
                type="text"
                class="w-full rounded-lg border border-gray-300 py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                :placeholder="getDatabasePlaceholder()"
              />
              <p class="text-xs text-gray-500 mt-1">
                💡 Leave blank to browse all databases, or specify one for direct access
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Note about simplified workflow -->
      <div class="text-xs text-gray-500 italic mt-2">
        Note: Database selection is now optional. You can connect to the server and explore
        databases in the Data Explorer.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { type Connection } from '@/types/connections'
import { useDatabaseCapabilities } from '@/composables/useDatabaseCapabilities'
import { normalizeConnectionType } from '@/utils/connectionUtils'
import ConnectionName from './ConnectionName.vue'
import Spinner from '@/components/common/Spinner.vue'
import { useConnectionsStore } from '@/stores/connections'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'

interface Props {
  connectionType: string
}

const props = defineProps<Props>()

// Get database capabilities
const dbCapabilities = useDatabaseCapabilities(computed(() => props.connectionType))
const { defaultPort, getConnectionDefaults } = dbCapabilities

const connectionsStore = useConnectionsStore()

// Direct store access - single source of truth
const connection = computed(() => connectionsStore.currentConnection)

// Helper function to apply connection defaults for a specific database type
const applyConnectionDefaults = (connectionType: string) => {
  if (connection.value) {
    const defaults = getConnectionDefaults()
    connection.value.type = connectionType.toLowerCase()

    // Only set port to default if it's not already set (preserve parsed values from connection string)
    if (!connection.value.port) {
      connection.value.port = defaultPort.value
    }

    // Only set username to default if it's not already set (preserve parsed values from connection string)
    if (!connection.value.username) {
      connection.value.username = defaults.username
    }

    // Only clear database if it's not already set (preserve parsed values from connection string)
    if (!connection.value.database) {
      connection.value.database = '' // Empty for new wizard flow
    }

    // Only set host to localhost if it's empty (don't override existing values)
    if (!connection.value.host) {
      connection.value.host = 'localhost'
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
  if (!connection.value?.type || !connection.value?.host || !connection.value?.username) {
    return ''
  }
  const normalizedType = normalizeConnectionType(connection.value.type)
  return `${normalizedType}-${connection.value.host}-${connection.value.username}`
})

// Update connection name based on mode
const updateConnectionName = () => {
  if (!connection.value) return

  if (!isEdit.value) {
    // New connections: Auto-generate name from connection details
    if (buildConnectionName.value) {
      connection.value.name = buildConnectionName.value
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

// Watch for host changes to update connection name
watch(
  () => connection.value?.host,
  () => {
    if (!isEdit.value) {
      updateConnectionName()
    }
  }
)

// Watch for username changes to update connection name
watch(
  () => connection.value?.username,
  () => {
    if (!isEdit.value) {
      updateConnectionName()
    }
  }
)

// Local state
const passwordFieldType = ref('password')

// Event handlers
const togglePasswordVisibility = () => {
  passwordFieldType.value = passwordFieldType.value === 'password' ? 'text' : 'password'
}

// Get database placeholder based on connection type
const getDatabasePlaceholder = () => {
  if (!connection.value?.type) return 'database_name'

  const connectionType = connection.value.type.toLowerCase()
  switch (connectionType) {
    case 'postgresql':
    case 'postgres':
      return 'postgres'
    case 'mysql':
      return 'mysql'
    case 'snowflake':
      return 'MYDB'
    case 'files':
      return 'subfolder'
    default:
      return 'database_name'
  }
}
</script>
