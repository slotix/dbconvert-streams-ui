<template>
  <header>
    <div
      class="bg-white flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8"
    >
      <h1 class="flex-auto text-3xl font-bold text-gray-900 dark:text-white;">
        {{ connectionsCount }} Database Connections.
      </h1>
    </div>
  </header>
  <main>
    <!-- Main area -->
    <Connections />
    <Add v-if="dlgTp === 'Save'" />
    <Edit v-if="dlgTp === 'Update'" />
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import Connections from '@/components/connection/Connections.vue'
import Add from '@/components/connection/Add.vue'
import Edit from '@/components/connection/Edit.vue'
import { useSettingsStore } from '@/stores/settings.js'
import { useConnectionsStore } from '@/stores/connections.js'

const connectionsCount = computed(() => {
  return useConnectionsStore().countConnections;
})
const dlgTp = computed(() => {
  return useSettingsStore().dlgType
})
</script>
