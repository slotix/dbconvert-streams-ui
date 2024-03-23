<template>
  <header>
    <div class="bg-white flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8">
      <h1 class="flex-auto text-3xl font-bold text-gray-900 dark:text-white;">
        Monitor stream.
      </h1>
    </div>
  </header>
  <main>
      <LogContainer />
  </main>
</template>

<script setup>
import LogContainer from '@/components/common/LogContainer.vue';

const source = "source"
const target = "target"
// const streamsCount = computed(() => useStreamsStore().countStreams )

// const streamsCount = ref(useStreamsStore().countStreams)
// const streamsCount = ref(null)
// const onStreamCountChanged = (value) => {
//   streamsCount.value = value
// }
</script>
