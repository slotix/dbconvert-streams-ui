<template>
  <header>
    <div class="bg-white flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8">
      <h1 class="flex-auto text-3xl font-bold text-gray-900 dark:text-white;">
        <span v-if="isBackendConnected">
          <span v-if="streamsCount() > 0"> {{ streamsCount() }} Stream configurations. </span>
          <span v-else>No Stream configurations.</span>
        </span>
        <span v-else>Stream Configurations Unavailable</span>
      </h1>
    </div>
  </header>
  <main>
    <div class="antialiased bg-gray-50">
      <Streams />
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Streams from '@/components/stream/Streams.vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useCommonStore } from '@/stores/common'

const streamsStore = useStreamsStore()
const commonStore = useCommonStore()

function streamsCount() {
  return streamsStore.countStreams
}

const isBackendConnected = computed(() => commonStore.isBackendConnected)
</script>
