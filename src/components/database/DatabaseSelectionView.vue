<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Select Database</h2>
        <p class="text-sm text-gray-500">Choose a database to explore its structure</p>
      </div>
      <button
        @click="refreshDatabases"
        :disabled="isLoading"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
      >
        <ArrowPathIcon :class="['h-4 w-4', isLoading ? 'animate-spin' : '']" />
        Refresh
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-8">
      <ArrowPathIcon class="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
      <p class="text-gray-500">Loading databases...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-600 mb-4">{{ error }}</p>
      <button
        @click="loadDatabases"
        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
      >
        <ArrowPathIcon class="h-4 w-4" />
        Retry
      </button>
    </div>

    <!-- Database List -->
    <div v-else-if="databases.length > 0" class="space-y-4">
      <!-- Database Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="database in databases"
          :key="database.name"
          @click="selectDatabase(database.name)"
          class="p-4 border border-gray-200 rounded-lg cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-200 group"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <CubeIcon class="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 class="font-medium text-gray-900">{{ database.name }}</h3>
                <p v-if="database.schemas && database.schemas.length > 0" class="text-sm text-gray-500">
                  {{ database.schemas.length }} schema{{ database.schemas.length !== 1 ? 's' : '' }}
                </p>
              </div>
            </div>
            <ChevronRightIcon class="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
          </div>
        </div>
      </div>

      <!-- Create Database Section -->
      <div class="border-t border-gray-200 pt-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-medium text-gray-900">Create New Database</h3>
            <p class="text-sm text-gray-500">Add a new database to this connection</p>
          </div>
          <button
            @click="showCreateDatabase = true"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            <PlusIcon class="h-4 w-4" />
            Create Database
          </button>
        </div>

        <!-- Create Database Form -->
        <div v-if="showCreateDatabase" class="mt-4 p-4 bg-gray-50 rounded-lg">
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700">Database Name</label>
              <input
                v-model="newDatabaseName"
                type="text"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter database name"
                @keyup.enter="createDatabase"
              />
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="createDatabase"
                :disabled="!newDatabaseName.trim() || isCreating"
                class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <span v-if="isCreating">Creating...</span>
                <span v-else>Create</span>
              </button>
              <button
                @click="cancelCreateDatabase"
                class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <CubeIcon class="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <p class="text-gray-500 mb-4">No databases found</p>
      <button
        @click="showCreateDatabase = true"
        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
      >
        <PlusIcon class="h-4 w-4" />
        Create Your First Database
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ArrowPathIcon, CubeIcon, ChevronRightIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import connections from '@/api/connections'
import type { DatabaseInfo } from '@/types/connections'

interface Props {
  connectionId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'database-selected': [databaseName: string]
}>()

const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

// State
const databases = ref<DatabaseInfo[]>([])
const isLoading = ref(false)
const error = ref<string>()
const showCreateDatabase = ref(false)
const newDatabaseName = ref('')
const isCreating = ref(false)

// Get current connection
const connection = computed(() => {
  return connectionsStore.connections.find((conn) => conn.id === props.connectionId)
})

// Load databases from API
async function loadDatabases() {
  isLoading.value = true
  error.value = undefined
  
  try {
    databases.value = await connections.getDatabases(props.connectionId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load databases'
  } finally {
    isLoading.value = false
  }
}

// Refresh databases
async function refreshDatabases() {
  await loadDatabases()
}

// Select a database
function selectDatabase(databaseName: string) {
  emit('database-selected', databaseName)
}

// Create new database
async function createDatabase() {
  if (!newDatabaseName.value.trim()) return
  
  isCreating.value = true
  try {
    await connections.createDatabase(newDatabaseName.value.trim(), props.connectionId)
    commonStore.showNotification(`Database "${newDatabaseName.value}" created successfully`, 'success')
    
    // Refresh the list and reset form
    await loadDatabases()
    cancelCreateDatabase()
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create database'
    commonStore.showNotification(errorMessage, 'error')
  } finally {
    isCreating.value = false
  }
}

// Cancel create database
function cancelCreateDatabase() {
  showCreateDatabase.value = false
  newDatabaseName.value = ''
}

onMounted(async () => {
  await loadDatabases()
})
</script>