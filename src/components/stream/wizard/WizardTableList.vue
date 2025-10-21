<template>
  <div>
    <!--Show error if no source selected -->
    <div
      v-if="!sourceConnectionId || !sourceDatabase"
      class="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
    >
      <div class="flex items-center">
        <svg class="w-5 h-5 text-yellow-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        <div>
          <h4 class="text-sm font-medium text-yellow-800">Source Database Required</h4>
          <p class="text-sm text-yellow-700 mt-1">
            Please go back to Step 1 and select a source connection with a database.
          </p>
        </div>
      </div>
    </div>

    <!-- TableList when source is selected -->
    <TableList v-else />
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import TableList from '@/components/settings/TableList.vue'

interface Props {
  sourceConnectionId?: string | null
  sourceDatabase?: string | null
}

const props = defineProps<Props>()

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()

// Ensure the source is set in the stream config when component mounts
watch(
  [() => props.sourceConnectionId, () => props.sourceDatabase],
  ([connId, database]) => {
    if (connId && streamsStore.currentStreamConfig) {
      streamsStore.updateSource(connId)

      // Also update the connection's selected database if needed
      // This is a workaround for TableList expecting database info
      const connection = connectionsStore.connectionByID(connId)
      if (connection && database) {
        // Store the database in a way TableList can access it
        // Note: This might require updating the connection or stream config
      }
    }
  },
  { immediate: true }
)
</script>
