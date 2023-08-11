
<template>
  <header>
    <div
      class="bg-white flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8"
    >
      <h1 class="flex-auto text-3xl font-bold text-gray-900 dark:text-white;">
        {{ streamsCount }} Database Streams.
      </h1>
    </div>
  </header>
  <main>
    <!-- Main area -->
    <!-- <Streams @count-streams="onStreamCountChanged" /> -->
    <Streams />
    <Add v-if="dlgTp === 'Save'" />
    <Edit v-if="dlgTp === 'Update'" />
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import Streams from '@/components/stream/Streams.vue'
import Add from '@/components/connection/Add.vue'
import Edit from '@/components/connection/Edit.vue'
import { useModalStore } from '@/stores/modalStore.js'
import { useStreamsStore } from '@/stores/streams.js'
const streamsCount = computed(() => {
  return useStreamsStore().countStreams;
})
// const streamsCount = ref(null)
// const onStreamCountChanged = (value) => {
//   streamsCount.value = value
// }

const dlgTp = computed(() => {
  return useModalStore().dlgType
})
</script>
