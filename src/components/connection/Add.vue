<template>
  <Modal @ok="ok">
    <template #dbtypes-combo>
      <ConnectionStringInput @update:connection-params="updateConnectionParams" />
      <DBTypesListBox
        :model-value="connectionDBType"
        @update:model-value="selectDBType"
        @update:selected-db-type="selectDBType"
      />
    </template>
    <template #connection-params>
      <ConnectionParams v-if="connectionDBType?.type" :connectionType="connectionDBType.type" />
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Modal from './Modal.vue'
import ConnectionParams from './params/ConnectionParams.vue'
import DBTypesListBox from './DBTypesListBox.vue'
import ConnectionStringInput from './ConnectionStringInput.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import type { DbType, Connection } from '@/types/connections'

const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

const connectionDBType = ref<DbType | null>(null)
const showDBCombo = ref(false)
const currentConnection = computed(() => connectionsStore.currentConnection)

function selectDBType(dbType: DbType): void {
  connectionDBType.value = dbType
}

function updateConnectionParams(params: Connection): void {
  const dbType = connectionsStore.dbTypes.find((dbType) => dbType.type === params.type)
  if (dbType) {
    selectDBType(dbType)
    connectionsStore.updateConnectionParams(params)
  }
}

async function ok(): Promise<void> {
  try {
    // if currentConnection has no id, it's a new connection
    if (!currentConnection.value?.id) {
      if (!connectionDBType.value) {
        throw new Error('Database type not selected')
      }
      if (currentConnection.value) {
        currentConnection.value.type = connectionDBType.value.type
        await connectionsStore.createConnection()
        commonStore.showNotification('Connection added', 'success')
      }
    } else {
      await connectionsStore.updateConnection()
      commonStore.showNotification('Connection updated', 'success')
      commonStore.closeModal()
    }
    await connectionsStore.refreshConnections()
  } catch (err: Error | unknown) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
    commonStore.showNotification(errorMessage, 'error')
  }
}

// Define what's exposed to the template and parent components
defineExpose({
  connectionDBType,
  showDBCombo,
  currentConnection,
  selectDBType,
  updateConnectionParams,
  ok
})
</script>
