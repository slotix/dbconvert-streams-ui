<template>
  <div class="px-4 md:px-6">
    <!-- Connection ID (for existing connections) -->
    <div v-if="connection.id" class="bg-white bg-opacity-5 text-center md:text-left">
      <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
        <label class="max-w-sm mx-auto md:w-1/3">Connection ID</label>
        <div class="max-w-sm mx-auto md:w-2/3">
          <div class="relative">
            <span class="block rounded-lg bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base py-2 px-4">
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
          <svg class="h-4 w-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
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

      <!-- Database Selection Group -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <h3 class="text-sm font-medium text-gray-900 mb-6 flex items-center">
          <svg class="h-4 w-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
          </svg>
          Database Selection
        </h3>

        <div class="space-y-4">
          <!-- Database Field -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <label class="text-sm font-medium text-gray-700 pt-2">
              {{ isNoSQL ? 'Database' : 'Database' }}
            </label>
            <div class="md:col-span-2 flex items-start space-x-2">
              <div class="flex-1 min-w-0">
                <Combobox v-model="connection.database" @update:modelValue="updateDatabase">
                  <div class="relative">
                    <ComboboxInput
                      class="w-full rounded-lg border border-gray-300 py-2 px-3 pr-10 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      :class="{ 'border-red-300': databaseValidationError }"
                      :placeholder="getDatabasePlaceholder()"
                      @change="handleDatabaseChange"
                    />
                    <ComboboxButton class="absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </ComboboxButton>
                  </div>

                  <ComboboxOptions class="absolute z-10 mt-1 max-h-48 max-w-xs overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <ComboboxOption
                      v-for="database in availableDatabases"
                      :key="database"
                      :value="database"
                      as="template"
                      v-slot="{ active, selected }"
                    >
                      <li
                        :class="[
                          'relative cursor-default select-none py-2 pl-3 pr-9',
                          active ? 'bg-gray-100 text-gray-900' : 'text-gray-900'
                        ]"
                      >
                        <div class="flex items-center">
                          <span :class="['block truncate', selected ? 'font-medium' : 'font-normal']">
                            {{ database }}
                          </span>
                        </div>
                        <span
                          v-if="selected"
                          :class="[
                            'absolute inset-y-0 right-0 flex items-center pr-4',
                            'text-gray-600'
                          ]"
                        >
                          <CheckIcon class="h-5 w-5" aria-hidden="true" />
                        </span>
                      </li>
                    </ComboboxOption>
                  </ComboboxOptions>
                </Combobox>
                
                <!-- Validation Error -->
                <p v-if="databaseValidationError" class="text-red-500 text-xs mt-1">
                  {{ databaseValidationError }}
                </p>
                
                <!-- Help Text -->
                <p class="text-xs text-gray-500 mt-1">
                  💡 {{ getDatabaseHelpText() }}
                </p>
              </div>

              <!-- Refresh Button -->
              <button
                v-if="connection.id"
                @click="refreshDatabases"
                :disabled="isLoadingDatabases"
                class="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded-md"
                title="Refresh database list"
              >
                <ArrowPathIcon 
                  class="h-5 w-5" 
                  :class="{ 'animate-spin': isLoadingDatabases }"
                  aria-hidden="true" 
                />
              </button>
            </div>
          </div>

          <!-- Create Database Section -->
          <div v-if="connection.id && canCreateDatabase" class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <label class="text-sm font-medium text-gray-700 pt-2">Create New</label>
            <div class="md:col-span-2 space-y-2">
              <div class="flex items-center space-x-2">
                <input
                  v-model="newDatabase"
                  type="text"
                  class="flex-1 rounded-lg border border-gray-300 py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                  :class="{ 'border-red-300': newDatabaseValidationError }"
                  :placeholder="getNewDatabasePlaceholder()"
                  @input="validateNewDatabase"
                />
                <button
                  @click="createDatabase"
                  :disabled="!newDatabase || !!newDatabaseValidationError || isCreatingDatabase"
                  class="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="isCreatingDatabase">Creating...</span>
                  <span v-else>Create</span>
                </button>
                <button
                  v-if="newDatabase"
                  @click="clearNewDatabase"
                  class="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded-md"
                  title="Clear input"
                >
                  <XMarkIcon class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              
              <!-- New Database Validation Error -->
              <p v-if="newDatabaseValidationError" class="text-red-500 text-xs">
                {{ newDatabaseValidationError }}
              </p>
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
import connectionsApi from '@/api/connections'
import {
  EyeIcon,
  EyeSlashIcon,
  ChevronUpDownIcon,
  CheckIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'
import { 
  Combobox, 
  ComboboxInput, 
  ComboboxButton, 
  ComboboxOptions, 
  ComboboxOption 
} from '@headlessui/vue'

interface Props {
  connectionType: string
}

const props = defineProps<Props>()

// Get database capabilities
const dbCapabilities = useDatabaseCapabilities(computed(() => props.connectionType))
const {
  defaultPort,
  getConnectionDefaults
} = dbCapabilities

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
  const type = props.connectionType.toLowerCase()
  switch (type) {
    case 'postgresql':
      return 'postgres' // Required: PostgreSQL always needs a database name
    case 'mysql':
      return '' // Optional: MySQL can connect without a database specified
    case 'oracle':
      return 'XE' // Required: Oracle needs a service name (XE is common default)
    case 'sqlserver':
      return 'master' // Required: SQL Server needs a database (master is system default)
    case 'mongodb':
      return '' // Optional: MongoDB can connect without a database specified
    default:
      return ''
  }
}

const { connection, refreshDatabases, isEdit } = 
  useCommon<Connection>(createDefaultConnection())

// Watch for connection type changes and update defaults
watch(() => props.connectionType, () => {
  if (!isEdit.value) {
    // Only update defaults for new connections, not when editing existing ones
    const defaults = getConnectionDefaults()
    connection.type = props.connectionType.toLowerCase()
    connection.port = defaultPort.value
    connection.username = defaults.username
    connection.database = getDefaultDatabase()
  }
}, { immediate: false })

// Local state
const passwordFieldType = ref('password')
const isLoadingDatabases = ref(false)
const isCreatingDatabase = ref(false)
const databaseValidationError = ref<string | null>(null)
const newDatabaseValidationError = ref<string | null>(null)
const newDatabase = ref('')

// Computed properties for available options
const availableDatabases = computed(() => 
  connection.databasesInfo.map((db) => db.name)
)

const isNoSQL = computed(() => ['mongodb'].includes(props.connectionType.toLowerCase()))
const canCreateDatabase = computed(() => !isNoSQL.value && connection.id)

// Event handlers
const togglePasswordVisibility = () => {
  passwordFieldType.value = passwordFieldType.value === 'password' ? 'text' : 'password'
}

const updateDatabase = (value: string) => {
  connection.database = value
}

const handleDatabaseChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  connection.database = target.value
}

const validateNewDatabase = () => {
  // Implement validation logic for new database
  // This will be enhanced with actual validation rules
}

const createDatabase = async () => {
  if (!newDatabase.value || !connection.id) return
  
  isCreatingDatabase.value = true
  try {
    await connectionsApi.createDatabase(newDatabase.value, connection.id)
    // Refresh the database list after creation
    await refreshDatabases()
    // Clear the input
    clearNewDatabase()
  } catch (error) {
    databaseValidationError.value = error instanceof Error ? error.message : 'Failed to create database'
  } finally {
    isCreatingDatabase.value = false
  }
}

const clearNewDatabase = () => {
  newDatabase.value = ''
  newDatabaseValidationError.value = null
}

// Helper functions
const getDatabasePlaceholder = () => {
  const type = props.connectionType.toLowerCase()
  switch (type) {
    case 'postgresql':
      return 'postgres, your_database_name'
    case 'mysql':
      return 'your_database_name'
    case 'oracle':
      return 'XE, ORCL, or your service name'
    case 'sqlserver':
      return 'master or your database name'
    case 'mongodb':
      return 'your_database_name'
    default:
      return 'database name'
  }
}

const getDatabaseHelpText = () => {
  const type = props.connectionType.toLowerCase()
  switch (type) {
    case 'postgresql':
      return 'PostgreSQL requires a database name. Most providers use "postgres" as the default database name. Compatible with AWS RDS, Azure Database, Google Cloud SQL, Neon, Supabase, and on-premises servers.'
    case 'mysql':
      return 'Enter your database name. Avoid system databases like "mysql", "information_schema", "performance_schema". Compatible with all major cloud providers and on-premises installations.'
    case 'oracle':
      return 'Oracle requires a service name. Use "XE" for Express Edition, "ORCL" for standard installations, or your custom service name.'
    case 'sqlserver':
      return 'SQL Server requires a database name. Use "master" for system access or specify your database name.'
    case 'mongodb':
      return 'Enter your database name for MongoDB connection.'
    default:
      return 'Enter the database name for connection.'
  }
}

const getNewDatabasePlaceholder = () => {
  const type = props.connectionType.toLowerCase()
  switch (type) {
    case 'postgresql':
      return 'new_database_name'
    case 'mysql':
      return 'new_database_name'
    case 'oracle':
      return 'new_service_name'
    case 'sqlserver':
      return 'new_database_name'
    case 'mongodb':
      return 'new_database_name'
    default:
      return 'new database name'
  }
}
</script> 