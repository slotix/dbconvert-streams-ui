<template>
  <div class="flex flex-col gap-6">
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
    <div class="shrink-0">
      <DualTreeSelector
        :source-connection-id="sourceConnectionId"
        :target-connection-id="targetConnectionId"
        :source-database="sourceDatabase"
        :target-database="targetDatabase"
        :source-schema="sourceSchema"
        :target-schema="targetSchema"
        :target-path="targetPath"
        :federated-mode="federatedMode"
        :federated-connections="federatedConnections"
        @update:source-connection="handleSourceUpdate"
        @update:target-connection="handleTargetUpdate"
        @update:federated-mode="handleFederatedModeUpdate"
        @update:federated-connections="handleFederatedConnectionsUpdate"
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
import type { ConnectionMapping } from '@/api/federated'

interface Props {
  sourceConnectionId?: string | null
  targetConnectionId?: string | null
  sourceDatabase?: string | null
  targetDatabase?: string | null
  sourceSchema?: string | null
  targetSchema?: string | null
  targetPath?: string | null
  federatedMode?: boolean
  federatedConnections?: ConnectionMapping[]
}

const props = withDefaults(defineProps<Props>(), {
  sourceConnectionId: null,
  targetConnectionId: null,
  sourceDatabase: null,
  targetDatabase: null,
  sourceSchema: null,
  targetSchema: null,
  targetPath: null,
  federatedMode: false,
  federatedConnections: () => []
})

// Watch for prop changes to update can-proceed state
watch(
  [
    () => props.sourceConnectionId,
    () => props.targetConnectionId,
    () => props.sourceDatabase,
    () => props.targetDatabase,
    () => props.federatedMode,
    () => props.federatedConnections
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
  'update:federated-mode': [enabled: boolean]
  'update:federated-connections': [connections: ConnectionMapping[]]
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

function handleFederatedModeUpdate(enabled: boolean) {
  emit('update:federated-mode', enabled)
  updateCanProceed()
}

function handleFederatedConnectionsUpdate(connections: ConnectionMapping[]) {
  emit('update:federated-connections', connections)
  updateCanProceed()
}

function handleClearAll() {
  emit('clear-all')
  updateCanProceed()
}

function updateCanProceed() {
  // For federated mode, check that we have at least one connection selected
  if (props.federatedMode) {
    const canProceed = Boolean(
      props.federatedConnections &&
        props.federatedConnections.length > 0 &&
        props.targetConnectionId
    )
    emit('update:can-proceed', canProceed)
    return
  }

  // For single-source mode, same logic as before
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
