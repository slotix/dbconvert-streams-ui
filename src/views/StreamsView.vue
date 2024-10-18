<template>
  <header>
    <div
      class="bg-white flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8"
    >
      <h1 class="flex-auto text-3xl font-bold text-gray-900 dark:text-white;">
        <span v-if="streamsCount() > 0"> {{ streamsCount() }} Stream configurations. </span>
        <span v-else>No Stream configurations.</span>
      </h1>
    </div>
  </header>
  <main>
    <Streams />
  </main>
</template>

<script setup>
import Streams from '@/components/stream/Streams.vue'
import { useStreamsStore } from '@/stores/streamConfig'

function streamsCount() {
  return useStreamsStore().countStreams
}
</script>
