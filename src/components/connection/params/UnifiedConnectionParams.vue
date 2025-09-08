<template>
  <div class="px-4 md:px-6">
    <!-- Connection ID (for existing connections) -->
    <div v-if="connection.id" class="bg-white bg-opacity-5 text-center md:text-left">
      <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
        <label class="max-w-sm mx-auto md:w-1/3">Connection ID</label>
        <div class="max-w-sm mx-auto md:w-2/3">
          <div class="relative">
            <span
              class="block rounded-lg bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base py-2 px-4"
            >
              {{ connection.id }}
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
    <ConnectionName v-model:name="connection.name" />

    <!-- Connection Parameters -->
    <div v-if="(isEdit && connection.id) || !isEdit">
      <hr />

      <!-- Connection Authentication Group -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
        <h3 class="text-sm font-medium text-gray-900 mb-6 flex items-center">
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
                  :type="passwordFieldType"
                  v-model="connection.password"
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
        </div>
      </div>


      <!-- 
        Simplified Workflow: 
        1. Users connect to the DATABASE SERVER (not specific databases)
        2. Database selection happens in the Database Explorer
        3. Stream creation allows selecting specific databases/schemas/tables
        
        This matches industry standards (DBeaver, Adminer) and simplifies onboarding.
        Backend uses default maintenance databases (postgres, mysql) for initial connection.
      -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCommon } from './common'
import { type Connection } from '@/types/connections'
import { useDatabaseCapabilities } from '@/composables/useDatabaseCapabilities'
import ConnectionName from './ConnectionName.vue'
import Spinner from '@/components/common/Spinner.vue'
import { useConnectionsStore } from '@/stores/connections'
import {
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/vue/24/outline'

interface Props {
  connectionType: string
}

const props = defineProps<Props>()

// Get database capabilities
const dbCapabilities = useDatabaseCapabilities(computed(() => props.connectionType))
const { defaultPort, getConnectionDefaults } = dbCapabilities

// Create default connection based on database type
const createDefaultConnection = (): Connection => ({
  id: '',
  name: '',
  type: props.connectionType.toLowerCase(),
  host: 'localhost',
  port: defaultPort.value,
  username: getConnectionDefaults().username,
  password: '',
  databasesInfo: [],
  // Set default database for backend compatibility
  database: getDefaultDatabase()
})

// Helper function to get default database based on connection type
const getDefaultDatabase = (): string => {
  // For the new wizard flow, database selection happens in step 3
  // Step 2 (connection details) creates bootstrap connections without database names
  return ''
}

const connectionsStore = useConnectionsStore()
const { connection, isEdit } = useCommon<Connection>(createDefaultConnection())

// Watch for connection type changes and update defaults
watch(
  () => props.connectionType,
  () => {
    if (!isEdit.value) {
      // Only update defaults for new connections, not when editing existing ones
      const defaults = getConnectionDefaults()
      connection.type = props.connectionType.toLowerCase()
      connection.port = defaultPort.value
      connection.username = defaults.username
      connection.database = getDefaultDatabase()
    }
  },
  { immediate: true }
)

// Local state
const passwordFieldType = ref('password')

// Event handlers
const togglePasswordVisibility = () => {
  passwordFieldType.value = passwordFieldType.value === 'password' ? 'text' : 'password'
}
</script>
