<template>
  <header>
    <div
      class="bg-white flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8"
    >
      <h1 class="flex-auto text-3xl font-bold text-gray-900 dark:text-white;">Add Stream.</h1>
      <Steps />
    </div>
  </header>
  <main>
    <div class="antialiased bg-gray-200">
      <div class="mb-20" v-if="currentStep !== null">
        <div v-show="currentStep.name === 'source'">
          <Connections :isStreamsTab="true" />
        </div>
        <div v-show="currentStep.name === 'target'">
          <Connections :isStreamsTab="true" />
        </div>
        <Add v-if="dlgTp === 'Save'" />
        <Edit v-if="dlgTp === 'Update'" />
        <div v-show="currentStep.name === 'streamSettings'">
          <Settings />
        </div>
      </div>
    </div>
  </main>
</template>
<script setup>
import { computed } from 'vue'
import Connections from '@/components/connection/Connections.vue'
import Add from '@/components/connection/Add.vue'
import Edit from '@/components/connection/Edit.vue'
import { useSettingsStore } from '@/stores/settingsStore.js'
import Steps from '@/components/stream/Steps.vue'
import Settings from '@/components/settings/Settings.vue'
import { useStreamsStore } from '@/stores/streams.js'
const store = useStreamsStore()
const currentStep = computed(() => {
  return store.currentStep
})
const dlgTp = computed(() => {
  return useSettingsStore().dlgType
})
</script>
