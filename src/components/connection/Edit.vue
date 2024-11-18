<template>
  <Modal @ok="ok">
    <template #connection-params>
      <ConnectionParams v-if="currentConnection" :connectionType="currentConnection.type" />
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Modal from './Modal.vue'
import ConnectionParams from './params/ConnectionParams.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import type { Connection } from '@/types/connections'

const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

const currentConnection = computed<Connection | null>(() => connectionsStore.currentConnection)

async function ok(): Promise<void> {
  try {
    await connectionsStore.updateConnection()
    commonStore.showNotification('Connection updated', 'success')
    commonStore.closeModal()
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
    commonStore.showNotification(errorMessage, 'error')
  }
}
</script>
