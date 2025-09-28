<template>
  <div class="space-y-6">
    <!-- Connection Info Display -->
    <div
      v-if="connection"
      class="flex items-center p-3 bg-green-50 rounded-lg border border-green-200"
    >
      <svg
        class="h-5 w-5 text-green-600 mr-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <div>
        <span class="text-sm font-medium text-green-900">Connection Created Successfully!</span>
        <p class="text-xs text-green-700">{{ connection.name }} ({{ connection.type }})</p>
      </div>
    </div>

    <!-- Database Selection -->
    <div v-if="connectionType" class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
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
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
          />
        </svg>
        Database Selection (Optional)
      </h3>

      <div class="space-y-4">
        <!-- Database Field -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <label class="text-sm font-medium text-gray-700 pt-2">Database</label>
          <div class="md:col-span-2 flex items-start space-x-2">
            <div class="flex-1 min-w-0">
              <Combobox v-model="selectedDatabase" @update:modelValue="updateDatabase">
                <div class="relative">
                  <ComboboxInput
                    class="w-full rounded-lg border border-gray-300 py-2 px-3 pr-10 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    :placeholder="getDatabasePlaceholder()"
                    @change="handleDatabaseChange"
                  />
                  <ComboboxButton class="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </ComboboxButton>
                </div>

                <ComboboxOptions
                  v-if="availableDatabases.length > 0"
                  class="absolute z-10 mt-1 max-h-48 max-w-xs overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                >
                  <ComboboxOption
                    v-for="database in availableDatabases"
                    :key="database"
                    v-slot="{ active, selected }"
                    :value="database"
                    as="template"
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

              <!-- Help Text -->
              <p v-if="!databaseLoadError" class="text-xs text-gray-500 mt-1">
                💡 {{ getDatabaseHelpText() }}
              </p>

              <!-- Error message when database loading fails -->
              <p v-if="databaseLoadError" class="text-xs text-red-600 mt-1">
                ⚠️ Couldn't load databases automatically. You can manually type a database name or
                fix the connection and try refreshing.
              </p>
            </div>

            <!-- Refresh Button -->
            <button
              :disabled="isLoadingDatabases"
              class="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded-md"
              title="Refresh database list"
              @click="refreshDatabases"
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
        <div v-if="canCreateDatabase" class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <label class="text-sm font-medium text-gray-700 pt-2">Create New</label>
          <div class="md:col-span-2 space-y-2">
            <div class="flex items-center space-x-2">
              <input
                v-model="newDatabase"
                type="text"
                class="flex-1 rounded-lg border border-gray-300 py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                :placeholder="getNewDatabasePlaceholder()"
                @input="validateNewDatabase"
              />
              <button
                :disabled="!newDatabase || isCreatingDatabase"
                class="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="createDatabase"
              >
                <span v-if="isCreatingDatabase">Creating...</span>
                <span v-else>Create</span>
              </button>
              <button
                v-if="newDatabase"
                class="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded-md"
                title="Clear input"
                @click="clearNewDatabase"
              >
                <XMarkIcon class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <!-- Skip Option -->
        <div class="border-t pt-4">
          <p class="text-sm text-gray-600">
            ℹ️ You can skip database selection and configure it later in the Database Explorer.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import { ChevronUpDownIcon, CheckIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/vue/24/outline'
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
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

const emit = defineEmits<{
  'update:can-proceed': [canProceed: boolean]
}>()

// Local state
const selectedDatabase = ref('')
const isLoadingDatabases = ref(false)
const isCreatingDatabase = ref(false)
const newDatabase = ref('')
const databaseLoadError = ref(false)

// Computed properties
const connection = computed(() => connectionsStore.currentConnection)
const availableDatabases = computed(
  () => connection.value?.databasesInfo?.map((db) => db.name) || []
)
const isNoSQL = computed(() => ['mongodb'].includes(props.connectionType.toLowerCase()))
const canCreateDatabase = computed(() => !isNoSQL.value && connection.value?.id)

// Initialize selected database from current connection
watch(
  () => connection.value?.database,
  (dbName) => {
    if (dbName) {
      selectedDatabase.value = dbName
    }
  },
  { immediate: true }
)

// Auto-select first database when databases are loaded
watch(
  () => availableDatabases.value,
  (databases) => {
    // Only auto-select if no database is currently selected and databases are available
    if (databases && databases.length > 0 && !selectedDatabase.value) {
      const firstDatabase = databases[0]
      selectedDatabase.value = firstDatabase
      updateDatabase(firstDatabase)
    }
  },
  { immediate: true }
)

// Always allow proceeding (database selection is optional)
emit('update:can-proceed', true)

// Auto-load databases when component mounts
onMounted(() => {
  if (
    connection.value?.id &&
    (!connection.value.databasesInfo || connection.value.databasesInfo.length === 0)
  ) {
    refreshDatabases()
  }
})

// Event handlers
const updateDatabase = (value: string) => {
  selectedDatabase.value = value
  if (connection.value) {
    connection.value.database = value
  }
}

const handleDatabaseChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  updateDatabase(target.value)
}

const refreshDatabases = async () => {
  if (!connection.value?.id) return

  isLoadingDatabases.value = true
  databaseLoadError.value = false

  try {
    await connectionsStore.getDatabases(connection.value.id)
    databaseLoadError.value = false
  } catch (error) {
    databaseLoadError.value = true
    let errorMessage = 'Failed to load databases'

    if (error instanceof Error) {
      if (
        error.message.includes('timeout') ||
        error.message.includes('connect: connection timed out')
      ) {
        errorMessage =
          'Connection timeout: Unable to reach the database server. Please check your connection details and network connectivity.'
      } else if (error.message.includes('connect')) {
        errorMessage =
          'Connection failed: Please verify your connection details and ensure the database server is accessible.'
      } else {
        errorMessage = error.message
      }
    }

    commonStore.showNotification(errorMessage, 'error')
    console.warn('Database loading failed, but you can still proceed with the wizard:', error)
  } finally {
    isLoadingDatabases.value = false
  }
}

const validateNewDatabase = () => {
  // Basic validation
}

const createDatabase = async () => {
  if (!newDatabase.value || !connection.value?.id) return

  const databaseName = newDatabase.value
  isCreatingDatabase.value = true

  try {
    const response = await connectionsStore.createDatabase(databaseName, connection.value.id)
    if (response.status === 'success') {
      // Clear the input field
      clearNewDatabase()

      // Refresh the database list to include the newly created database
      await refreshDatabases()

      // Auto-select the newly created database
      selectedDatabase.value = databaseName
      updateDatabase(databaseName)

      commonStore.showNotification(
        `Database "${databaseName}" created and selected successfully`,
        'success'
      )
    }
  } catch (error) {
    commonStore.showNotification(
      error instanceof Error ? error.message : 'Failed to create database',
      'error'
    )
  } finally {
    isCreatingDatabase.value = false
  }
}

const clearNewDatabase = () => {
  newDatabase.value = ''
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
      return 'Enter the database name you want to connect to. You can also leave this empty and configure it later.'
    case 'mysql':
      return 'Enter your database name or leave empty to configure later.'
    case 'oracle':
      return 'Enter your service name or leave empty to configure later.'
    case 'sqlserver':
      return 'Enter your database name or leave empty to configure later.'
    case 'mongodb':
      return 'Enter your database name or leave empty to configure later.'
    default:
      return 'Enter the database name or leave empty to configure later.'
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
