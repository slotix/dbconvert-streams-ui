<template>
  <div class="space-y-6">
    <!-- Split Pane Container -->
    <div class="grid grid-cols-2 gap-4 h-[600px]">
      <!-- Source Tree (Left) -->
      <div class="relative rounded-lg bg-gray-50 overflow-hidden flex flex-col">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="text-sm font-semibold text-gray-900 flex items-center">
            <img src="/images/steps/source-step.svg" alt="Source" class="w-8 h-8 mr-2" />
            Source Connection
          </h3>
          <p class="text-xs text-gray-500 mt-1">Select where to read data from</p>
        </div>

        <div class="flex-1 overflow-y-auto p-4 bg-white">
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
      <div class="relative rounded-lg bg-gray-50 overflow-hidden flex flex-col">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="text-sm font-semibold text-gray-900 flex items-center">
            <img src="/images/steps/target-step.svg" alt="Target" class="w-8 h-8 mr-2" />
            Target Connection
          </h3>
          <p class="text-xs text-gray-500 mt-1">Select where to write data to</p>
        </div>

        <div class="flex-1 overflow-y-auto p-4 bg-white">
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

    <!-- Selection Summary - Neutral Chips -->
    <div v-if="sourceConnectionId || targetConnectionId" class="space-y-3">
      <!-- Source and Target Chips -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 flex-1">
          <!-- Source Chip -->
          <div class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <span class="font-medium text-gray-900">Source:</span>
            <span v-if="sourceConnectionId" class="text-slate-600 ml-1">
              {{ getConnectionName(sourceConnectionId) }}
              <span v-if="sourceDatabase"> / {{ sourceDatabase }}</span>
            </span>
            <span v-else class="text-gray-500 ml-1 italic">Not selected</span>
          </div>

          <!-- Arrow -->
          <svg
            class="w-4 h-4 text-gray-400 shrink-0"
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

          <!-- Target Chip -->
          <div class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <span class="font-medium text-gray-900">Target:</span>
            <span v-if="targetConnectionId" class="text-slate-600 ml-1">
              {{ getConnectionName(targetConnectionId) }}
              <span v-if="targetDatabase"> / {{ targetDatabase }}</span>
            </span>
            <span v-else class="text-gray-500 ml-1 italic">Not selected</span>
          </div>
        </div>

        <!-- Clear All Button -->
        <button
          type="button"
          class="text-xs text-gray-600 hover:text-gray-800 font-medium whitespace-nowrap"
          @click="clearAll"
        >
          Clear All
        </button>
      </div>
    </div>

    <!-- Validation Error -->
    <div v-if="isSameConnectionAndDatabase" class="bg-red-50 border border-red-200 rounded-lg p-3">
      <div class="flex items-center">
        <svg class="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
        <p class="text-sm text-red-700 font-medium">
          Source and target cannot be the same connection and database
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import ConnectionTreeSelector from './ConnectionTreeSelector.vue'

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

const isSameConnectionAndDatabase = computed(() => {
  return (
    props.sourceConnectionId &&
    props.targetConnectionId &&
    props.sourceConnectionId === props.targetConnectionId &&
    props.sourceDatabase === props.targetDatabase &&
    props.sourceDatabase
  )
})

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
