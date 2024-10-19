<template>
  <header>
    <div
      class="bg-white flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8"
    >
      <h1 class="flex-auto text-3xl font-bold text-gray-900 dark:text-white;">
        <span v-if="isBackendConnected">{{ connectionsCount }} Connections.</span>
        <span v-else>Database Connections Unavailable</span>
      </h1>
    </div>
  </header>
  <main>
    <!-- Main area -->
    <Connections />
    <Add v-if="dlgTp === DIALOG_TYPES.SAVE" />
    <Edit v-if="dlgTp === DIALOG_TYPES.UPDATE" />
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Connections from '@/components/connection/Connections.vue'
import Add from '@/components/connection/Add.vue'
import Edit from '@/components/connection/Edit.vue'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { DIALOG_TYPES } from '@/stores/common'

// Access the connections store
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

// Define the function to count connections
const connectionsCount = computed(() => connectionsStore.countConnections)

// Get the dialog type from the common store
const dlgTp = computed(() => commonStore.dlgType)

// Check if the backend is connected
const isBackendConnected = computed(() => commonStore.isBackendConnected)
</script>
