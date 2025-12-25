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

    <!-- Connection Parameters -->
    <div v-if="connection && ((isEdit && connection.id) || !isEdit)" class="mt-6">
      <!-- Connection Authentication Group -->
      <div
        class="bg-white dark:bg-gray-850 rounded-xl border border-gray-100 dark:border-gray-700 p-6 mb-6 shadow-sm dark:shadow-gray-900/30"
      >
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          <img
            v-if="logo"
            :src="logo"
            alt="Connection type logo"
            class="h-6 w-6 mr-2.5 object-contain dark:brightness-0 dark:invert dark:opacity-70"
          />
          <svg
            v-else
            class="h-6 w-6 mr-2.5 text-teal-600 dark:text-teal-400"
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
          {{ connectionType }} Connection Details
        </h3>

        <div class="space-y-4">
          <!-- Server -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Server</label>
            <div class="md:col-span-2">
              <input
                v-model="connection.spec.database!.host"
                type="text"
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 dark:focus:ring-teal-400 focus:border-transparent"
                placeholder="localhost"
              />
            </div>
          </div>

          <!-- Port -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Port</label>
            <div class="md:col-span-2">
              <input
                v-model.number.lazy="connection.spec.database!.port"
                type="number"
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 dark:focus:ring-teal-400 focus:border-transparent"
                :placeholder="defaultPort.toString()"
              />
            </div>
          </div>

          <!-- Username -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
            <div class="md:col-span-2">
              <input
                v-model="connection.spec.database!.username"
                type="text"
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 dark:focus:ring-teal-400 focus:border-transparent"
                :placeholder="getConnectionDefaults().username"
              />
            </div>
          </div>

          <!-- Password -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <div class="md:col-span-2">
              <div class="relative">
                <input
                  v-model="connection.spec.database!.password"
                  :type="passwordFieldType"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 dark:focus:ring-teal-400 focus:border-transparent pr-10"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  class="absolute right-0 top-0 h-full px-3 flex items-center"
                  @click="togglePasswordVisibility"
                >
                  <Eye
                    v-if="passwordFieldType === 'password'"
                    class="h-5 w-5 text-gray-400 dark:text-gray-500"
                    aria-hidden="true"
                  />
                  <EyeOff
                    v-else
                    class="h-5 w-5 text-gray-400 dark:text-gray-500"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </div>
          <!-- Database Field (Optional) -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >Default Database (Optional)</label
            >
            <div class="md:col-span-2">
              <input
                v-model="connection.spec.database!.database"
                type="text"
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 dark:focus:ring-teal-400 focus:border-transparent"
                :placeholder="getDatabasePlaceholder()"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                💡 Used for connection testing and UI defaults. Streams specify database in their
                config.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDatabaseCapabilities } from '@/composables/useDatabaseCapabilities'
import { normalizeConnectionType } from '@/utils/connectionUtils'
import Spinner from '@/components/common/Spinner.vue'
import { useConnectionsStore } from '@/stores/connections'
import { Eye, EyeOff } from 'lucide-vue-next'

interface Props {
  connectionType: string
  logo?: string
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
  if (connection.value && connection.value.spec?.database) {
    const defaults = getConnectionDefaults()
    connection.value.type = connectionType.toLowerCase()

    // Only set port to default if it's not already set (preserve parsed values from connection string)
    if (!connection.value.spec.database.port) {
      connection.value.spec.database.port = defaultPort.value
    }

    // Only set username to default if it's not already set (preserve parsed values from connection string)
    if (!connection.value.spec.database.username) {
      connection.value.spec.database.username = defaults.username
    }

    // Only clear database if it's not already set (preserve parsed values from connection string)
    if (!connection.value.spec.database.database) {
      connection.value.spec.database.database = '' // Empty for new wizard flow
    }

    // Only set host to localhost if it's empty (don't override existing values)
    if (!connection.value.spec.database.host) {
      connection.value.spec.database.host = 'localhost'
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
  const spec = connection.value?.spec?.database
  if (!connection.value?.type || !spec?.host || !spec?.username) {
    return ''
  }
  const normalizedType = normalizeConnectionType(connection.value.type)
  return `${normalizedType}-${spec.host}-${spec.username}`
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
  () => connection.value?.spec?.database?.host,
  () => {
    if (!isEdit.value) {
      updateConnectionName()
    }
  }
)

// Watch for username changes to update connection name
watch(
  () => connection.value?.spec?.database?.username,
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
