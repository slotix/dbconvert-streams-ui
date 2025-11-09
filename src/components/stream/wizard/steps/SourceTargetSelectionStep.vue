<template>
  <div class="flex flex-col h-full gap-6">
    <!-- Stream Name Field -->
    <div class="shrink-0">
      <StreamNameField
        :source-connection-id="sourceConnectionId"
        :target-connection-id="targetConnectionId"
        :source-database="sourceDatabase"
        :target-database="targetDatabase"
      />
    </div>

    <!-- Dual Tree Selector -->
    <div class="flex-1 min-h-0">
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
        @add-connection="(paneType) => $emit('add-connection', paneType)"
      />
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
  'add-connection': [paneType: 'source' | 'target']
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
