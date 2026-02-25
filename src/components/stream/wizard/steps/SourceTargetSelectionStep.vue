<template>
  <div class="flex h-full min-h-0 flex-col gap-6">
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
        :source-connections="sourceConnections"
        @update:source-connection="handleSourceUpdate"
        @update:target-connection="handleTargetUpdate"
        @update:source-connections="handleSourceConnectionsUpdate"
        @clear-all="handleClearAll"
        @add-connection="(paneType) => $emit('add-connection', paneType)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import DualTreeSelector from '../DualTreeSelector.vue'
import StreamNameField from '../StreamNameField.vue'
import type { StreamConnectionMapping } from '@/types/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { getConnectionKindFromSpec } from '@/types/specs'
import { getSourceSelectionValue } from '@/components/stream/wizard/sourceMappings'

interface Props {
  sourceConnectionId?: string | null
  targetConnectionId?: string | null
  sourceDatabase?: string | null
  targetDatabase?: string | null
  sourceSchema?: string | null
  targetSchema?: string | null
  targetPath?: string | null
  sourceConnections?: StreamConnectionMapping[]
}

const props = withDefaults(defineProps<Props>(), {
  sourceConnectionId: null,
  targetConnectionId: null,
  sourceDatabase: null,
  targetDatabase: null,
  sourceSchema: null,
  targetSchema: null,
  targetPath: null,
  sourceConnections: () => []
})

// Watch for prop changes to update can-proceed state
watch(
  [
    () => props.sourceConnectionId,
    () => props.targetConnectionId,
    () => props.sourceDatabase,
    () => props.targetDatabase,
    () => props.sourceConnections
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
  'update:source-connections': [connections: StreamConnectionMapping[]]
}>()

const primarySourceId = computed(
  () => props.sourceConnections[0]?.connectionId || props.sourceConnectionId
)
const connectionsStore = useConnectionsStore()

const primarySourceDatabase = computed(() => {
  const primary = props.sourceConnections[0]
  if (primary) {
    const conn = connectionsStore.connectionByID(primary.connectionId)
    const kind = getConnectionKindFromSpec(conn?.spec)
    return getSourceSelectionValue(primary, kind)
  }
  return props.sourceDatabase
})
// Multiple sources = 2+ connections selected
const hasMultipleSources = computed(() => props.sourceConnections.length > 1)

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

function handleSourceConnectionsUpdate(connections: StreamConnectionMapping[]) {
  emit('update:source-connections', connections)
  updateCanProceed()
}

function handleClearAll() {
  emit('clear-all')
  updateCanProceed()
}

function updateCanProceed() {
  // Source and target cannot be same connection+database (only checked for single source)
  // With multiple sources, at least one differs from target
  const isSameConnectionAndDatabase =
    !hasMultipleSources.value &&
    primarySourceId.value &&
    props.targetConnectionId &&
    primarySourceId.value === props.targetConnectionId &&
    (primarySourceDatabase.value || props.sourceDatabase) === props.targetDatabase &&
    (primarySourceDatabase.value || props.sourceDatabase)

  const canProceed = Boolean(
    (props.sourceConnections.length > 0 || primarySourceId.value) &&
      props.targetConnectionId &&
      !isSameConnectionAndDatabase
  )
  emit('update:can-proceed', canProceed)
}
</script>
