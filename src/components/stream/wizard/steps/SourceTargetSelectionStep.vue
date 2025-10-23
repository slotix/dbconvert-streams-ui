<template>
  <div class="space-y-6">
    <!-- Stream Name Field -->
    <StreamNameField
      :source-connection-id="sourceConnectionId"
      :target-connection-id="targetConnectionId"
      :source-database="sourceDatabase"
      :target-database="targetDatabase"
    />

    <!-- Dual Tree Selector -->
    <DualTreeSelector
      :source-connection-id="sourceConnectionId"
      :target-connection-id="targetConnectionId"
      :source-database="sourceDatabase"
      :target-database="targetDatabase"
      :source-schema="sourceSchema"
      :target-schema="targetSchema"
      :target-path="targetPath"
      @update:source-connection="handleSourceUpdate"
      @update:target-connection="handleTargetUpdate"
      @clear-all="handleClearAll"
    />

    <!-- Help Text -->
    <div class="bg-gray-50 rounded-lg p-4">
      <div class="flex items-start">
        <svg
          class="w-5 h-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
        <div class="flex-1">
          <h4 class="text-sm font-medium text-gray-900 mb-1">Tips</h4>
          <ul class="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Source and target cannot be the same connection and database</li>
            <li>You can use the same connection if selecting different databases</li>
            <li>File connections use the folder path defined in their connection settings</li>
            <li>Make sure both connections are accessible and tested before creating a stream</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import DualTreeSelector from '../DualTreeSelector.vue'
import StreamNameField from '../StreamNameField.vue'

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

// Watch for prop changes to update can-proceed state
watch(
  [
    () => props.sourceConnectionId,
    () => props.targetConnectionId,
    () => props.sourceDatabase,
    () => props.targetDatabase
  ],
  () => {
    updateCanProceed()
  }
)

const emit = defineEmits<{
  'update:source-connection': [connectionId: string, database?: string, schema?: string]
  'update:target-connection': [
    connectionId: string,
    database?: string,
    schema?: string,
    path?: string
  ]
  'clear-all': []
  'update:can-proceed': [value: boolean]
}>()

function handleSourceUpdate(connectionId: string, database?: string, schema?: string) {
  emit('update:source-connection', connectionId, database, schema)
  updateCanProceed()
}

function handleTargetUpdate(
  connectionId: string,
  database?: string,
  schema?: string,
  path?: string
) {
  emit('update:target-connection', connectionId, database, schema, path)
  updateCanProceed()
}

function handleClearAll() {
  emit('clear-all')
  updateCanProceed()
}

function updateCanProceed() {
  // Emit can-proceed status based on validation
  // Source and target cannot be the same connection AND database combination
  const isSameConnectionAndDatabase =
    props.sourceConnectionId &&
    props.targetConnectionId &&
    props.sourceConnectionId === props.targetConnectionId &&
    props.sourceDatabase === props.targetDatabase &&
    props.sourceDatabase

  const canProceed = Boolean(
    props.sourceConnectionId && props.targetConnectionId && !isSameConnectionAndDatabase
  )
  emit('update:can-proceed', canProceed)
}
</script>
