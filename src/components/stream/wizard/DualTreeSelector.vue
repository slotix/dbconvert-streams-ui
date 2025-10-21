<template>
  <div class="space-y-4">
    <!-- Split Pane Container -->
    <div class="grid grid-cols-2 gap-4 h-[600px]">
      <!-- Source Tree (Left) -->
      <div
        class="relative border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden flex flex-col"
        :class="{ 'ring-2 ring-blue-500': activePane === 'source' }"
      >
        <div class="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-4 py-3">
          <h3 class="text-sm font-semibold text-gray-900 flex items-center">
            <svg
              class="w-4 h-4 mr-2 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7l2-2h12l2 2M4 7h16"
              />
            </svg>
            Source Connection
          </h3>
          <p class="text-xs text-gray-500 mt-1">Select where to read data from</p>
        </div>

        <div class="flex-1 overflow-y-auto p-4">
          <ConnectionTreeSelector
            :connections="connections"
            :selected-connection-id="sourceConnectionId"
            :selected-database="sourceDatabase"
            :selected-schema="sourceSchema"
            mode="source"
            @select-connection="handleSourceConnectionSelect"
            @select-database="handleSourceDatabaseSelect"
          />
        </div>
      </div>

      <!-- Target Tree (Right) -->
      <div
        class="relative border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden flex flex-col"
        :class="{ 'ring-2 ring-green-500': activePane === 'target' }"
      >
        <div class="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-4 py-3">
          <h3 class="text-sm font-semibold text-gray-900 flex items-center">
            <svg
              class="w-4 h-4 mr-2 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Target Connection
          </h3>
          <p class="text-xs text-gray-500 mt-1">Select where to write data to</p>
        </div>

        <div class="flex-1 overflow-y-auto p-4">
          <ConnectionTreeSelector
            :connections="connections"
            :selected-connection-id="targetConnectionId"
            :selected-database="targetDatabase"
            :selected-schema="targetSchema"
            :selected-path="targetPath"
            mode="target"
            @select-connection="handleTargetConnectionSelect"
            @select-database="handleTargetDatabaseSelect"
            @select-file="handleTargetFileSelect"
          />
        </div>
      </div>
    </div>

    <!-- Selection Summary -->
    <div
      v-if="sourceConnectionId || targetConnectionId"
      class="bg-blue-50 border border-blue-200 rounded-lg p-4"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4 flex-1">
          <!-- Source -->
          <div class="flex-1">
            <p class="text-xs font-medium text-blue-900 mb-1">Source</p>
            <p v-if="sourceConnectionId" class="text-sm text-blue-700 font-medium">
              {{ getConnectionName(sourceConnectionId) }}
              <span v-if="sourceDatabase" class="text-blue-600">
                / {{ sourceDatabase }}
                <span v-if="sourceSchema"> / {{ sourceSchema }}</span>
              </span>
            </p>
            <p v-else class="text-sm text-gray-500 italic">Not selected</p>
          </div>

          <!-- Arrow -->
          <div class="flex-shrink-0">
            <svg
              class="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </div>

          <!-- Target -->
          <div class="flex-1">
            <p class="text-xs font-medium text-green-900 mb-1">Target</p>
            <p v-if="targetConnectionId" class="text-sm text-green-700 font-medium">
              {{ getConnectionName(targetConnectionId) }}
              <span v-if="targetDatabase" class="text-green-600">
                / {{ targetDatabase }}
                <span v-if="targetSchema"> / {{ targetSchema }}</span>
              </span>
              <span v-if="targetPath" class="text-green-600"> / {{ targetPath }}</span>
            </p>
            <p v-else class="text-sm text-gray-500 italic">Not selected</p>
          </div>
        </div>

        <!-- Clear All Button -->
        <button
          v-if="sourceConnectionId || targetConnectionId"
          type="button"
          class="ml-4 text-xs text-blue-600 hover:text-blue-800 font-medium"
          @click="clearAll"
        >
          Clear All
        </button>
      </div>
    </div>

    <!-- Validation Error -->
    <div
      v-if="sourceConnectionId && targetConnectionId && sourceConnectionId === targetConnectionId"
      class="bg-red-50 border border-red-200 rounded-lg p-3"
    >
      <div class="flex items-center">
        <svg class="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
        <p class="text-sm text-red-700 font-medium">
          Source and target cannot be the same connection
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import ConnectionTreeSelector from './ConnectionTreeSelector.vue'
import type { Connection } from '@/types/connections'

interface Props {
  sourceConnectionId?: string | null
  targetConnectionId?: string | null
  sourceDatabase?: string | null
  targetDatabase?: string | null
  sourceSchema?: string | null
  targetSchema?: string | null
  targetPath?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  sourceConnectionId: null,
  targetConnectionId: null,
  sourceDatabase: null,
  targetDatabase: null,
  sourceSchema: null,
  targetSchema: null,
  targetPath: null
})

const emit = defineEmits<{
  'update:source-connection': [connectionId: string, database?: string, schema?: string]
  'update:target-connection': [
    connectionId: string,
    database?: string,
    schema?: string,
    path?: string
  ]
  'clear-all': []
}>()

const connectionsStore = useConnectionsStore()
const activePane = ref<'source' | 'target' | null>(null)

const connections = computed(() => connectionsStore.connections)

function getConnectionName(connectionId: string): string {
  const conn = connections.value.find((c) => c.id === connectionId)
  return conn?.name || connectionId
}

function handleSourceConnectionSelect(payload: {
  connectionId: string
  database?: string
  schema?: string
}) {
  activePane.value = 'source'
  emit('update:source-connection', payload.connectionId, payload.database, payload.schema)
}

function handleSourceDatabaseSelect(payload: {
  connectionId: string
  database: string
  schema?: string
}) {
  activePane.value = 'source'
  emit('update:source-connection', payload.connectionId, payload.database, payload.schema)
}

function handleTargetConnectionSelect(payload: {
  connectionId: string
  database?: string
  schema?: string
}) {
  activePane.value = 'target'
  emit('update:target-connection', payload.connectionId, payload.database, payload.schema)
}

function handleTargetDatabaseSelect(payload: {
  connectionId: string
  database: string
  schema?: string
}) {
  activePane.value = 'target'
  emit('update:target-connection', payload.connectionId, payload.database, payload.schema)
}

function handleTargetFileSelect(payload: { connectionId: string; path: string }) {
  activePane.value = 'target'
  emit('update:target-connection', payload.connectionId, undefined, undefined, payload.path)
}

function clearAll() {
  emit('clear-all')
}
</script>
