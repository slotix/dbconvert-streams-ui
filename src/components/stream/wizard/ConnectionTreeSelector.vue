<template>
  <div class="space-y-2">
    <div v-if="!connections.length" class="text-center py-8 text-gray-500 text-sm">
      No connections available
    </div>

    <div v-for="connection in connections" :key="connection.id" class="space-y-1">
      <!-- Connection Item -->
      <div
        class="flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors"
        :class="[
          selectedConnectionId === connection.id
            ? 'bg-blue-100 text-blue-900 font-medium'
            : 'hover:bg-gray-100 text-gray-700'
        ]"
        @click="selectConnection(connection)"
      >
        <svg
          v-if="isFileConnection(connection)"
          class="w-4 h-4 mr-2 flex-shrink-0"
          :class="selectedConnectionId === connection.id ? 'text-blue-600' : 'text-gray-400'"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <svg
          v-else
          class="w-4 h-4 mr-2 flex-shrink-0"
          :class="selectedConnectionId === connection.id ? 'text-blue-600' : 'text-gray-400'"
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
        <span class="text-sm flex-1">{{ connection.name }}</span>
        <span class="text-xs text-gray-500 ml-2">{{ connection.type }}</span>
      </div>

      <!-- Loading databases indicator -->
      <div
        v-if="
          selectedConnectionId === connection.id &&
          !isFileConnection(connection) &&
          isLoadingDatabases
        "
        class="ml-6 mt-2 flex items-center px-3 py-2 text-sm text-gray-600"
      >
        <svg
          class="animate-spin h-4 w-4 mr-2 text-blue-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Loading databases...
      </div>

      <!-- Database List (if connection is expanded and selected) -->
      <div
        v-if="
          selectedConnectionId === connection.id &&
          !isFileConnection(connection) &&
          !isLoadingDatabases &&
          databases.length > 0
        "
        class="ml-6 space-y-1 mt-2"
      >
        <div
          v-for="db in databases"
          :key="db.name"
          class="flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer transition-colors text-sm group"
          :class="[
            selectedDatabase === db.name
              ? 'bg-blue-100 text-blue-900 font-medium ring-1 ring-blue-300'
              : 'hover:bg-gray-50 text-gray-600'
          ]"
          @click.stop="selectDatabase(connection.id, db.name)"
        >
          <div class="flex items-center">
            <svg
              class="w-3.5 h-3.5 mr-2 transition-colors"
              :class="selectedDatabase === db.name ? 'text-blue-600' : 'text-gray-400'"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"
              />
              <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
              <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
            </svg>
            {{ db.name }}
          </div>
          <!-- Checkmark for selected database -->
          <svg
            v-if="selectedDatabase === db.name"
            class="w-4 h-4 text-blue-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
      </div>

      <!-- File Path (if connection is file-based) -->
      <div
        v-if="
          selectedConnectionId === connection.id &&
          isFileConnection(connection) &&
          mode === 'target'
        "
        class="ml-6 mt-2"
      >
        <div class="text-xs text-gray-600 mb-1 font-medium">Target Path:</div>
        <input
          v-model="filePathInput"
          type="text"
          placeholder="Enter file path or pattern (e.g., /output/data.parquet)"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          @input="handleFilePathChange"
        />
        <p class="text-xs text-gray-500 mt-1">
          Specify the target file path or use patterns like /output/*.parquet
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import type { Connection } from '@/types/connections'

interface DatabaseInfo {
  name: string
}

interface Props {
  connections: Connection[]
  selectedConnectionId?: string | null
  selectedDatabase?: string | null
  selectedSchema?: string | null
  selectedPath?: string | null
  mode: 'source' | 'target'
}

const props = withDefaults(defineProps<Props>(), {
  selectedConnectionId: null,
  selectedDatabase: null,
  selectedSchema: null,
  selectedPath: null
})

const emit = defineEmits<{
  'select-connection': [payload: { connectionId: string; database?: string; schema?: string }]
  'select-database': [payload: { connectionId: string; database: string; schema?: string }]
  'select-file': [payload: { connectionId: string; path: string }]
}>()

const navigationStore = useExplorerNavigationStore()
const databases = ref<DatabaseInfo[]>([])
const filePathInput = ref('')
const isLoadingDatabases = ref(false)

function isFileConnection(connection: Connection): boolean {
  return ['files', 'csv', 'parquet', 'jsonl'].includes(connection.type.toLowerCase())
}

async function selectConnection(connection: Connection) {
  // Load databases if it's a database connection
  if (!isFileConnection(connection)) {
    isLoadingDatabases.value = true
    try {
      await navigationStore.ensureDatabases(connection.id)
      databases.value = navigationStore.databasesState[connection.id] || []

      // Auto-select the first database or the connection's default database
      let defaultDb =
        connection.database || (databases.value.length > 0 ? databases.value[0].name : undefined)

      emit('select-connection', { connectionId: connection.id, database: defaultDb })

      // Also emit select-database to ensure it's properly set
      if (defaultDb) {
        emit('select-database', { connectionId: connection.id, database: defaultDb })
      }
    } catch (error) {
      console.error('Failed to load databases:', error)
      databases.value = []
      emit('select-connection', { connectionId: connection.id })
    } finally {
      isLoadingDatabases.value = false
    }
  } else {
    databases.value = []
    emit('select-connection', { connectionId: connection.id })
  }
}

function selectDatabase(connectionId: string, database: string) {
  emit('select-database', { connectionId, database })
}

function handleFilePathChange() {
  if (props.selectedConnectionId && filePathInput.value) {
    emit('select-file', { connectionId: props.selectedConnectionId, path: filePathInput.value })
  }
}

// Watch for changes to selected connection to load databases
watch(
  () => props.selectedConnectionId,
  async (newConnectionId) => {
    if (newConnectionId) {
      const connection = props.connections.find((c) => c.id === newConnectionId)
      if (connection && !isFileConnection(connection)) {
        try {
          await navigationStore.ensureDatabases(newConnectionId)
          databases.value = navigationStore.databasesState[newConnectionId] || []
        } catch (error) {
          console.error('Failed to load databases:', error)
          databases.value = []
        }
      }
    } else {
      databases.value = []
    }
  }
)

// Initialize file path from props
watch(
  () => props.selectedPath,
  (newPath) => {
    if (newPath) {
      filePathInput.value = newPath
    }
  },
  { immediate: true }
)
</script>
