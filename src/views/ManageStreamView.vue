<template>
  <header>
    <div class="bg-white flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8">
      <h1 class="flex-auto text-3xl font-bold text-gray-900 dark:text-white;">
        {{ mode === 'edit' ? 'Edit Stream' : 'Add Stream' }}:
        <span v-if="currentStream"
          class="text-gray-500 text-lg underline underline-offset-4 decoration-dashed decoration-gray-400">
          {{ currentStream.id }}
        </span>
      </h1>
      <Steps />
    </div>
  </header>
  <main>
    <div class="antialiased bg-gray-200">
      <div class="mb-20" v-if="currentStep !== null">
        <div v-show="currentStep.name === 'source'">
          <Connections />
        </div>
        <div v-show="currentStep.name === 'target'">
          <Connections />
        </div>
        <!-- Add/ Edit connection  -->

        <Add v-if="dlgTp === DIALOG_TYPES.SAVE" />
        <Edit v-if="dlgTp === DIALOG_TYPES.UPDATE" />
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
import { useCommonStore } from '@/stores/common'
import Steps from '@/components/stream/Steps.vue'
import Settings from '@/components/settings/Settings.vue'
import { useStreamsStore } from '@/stores/streams'
import { DIALOG_TYPES } from '@/stores/common';

const store = useStreamsStore()
const commonStore = useCommonStore()

const currentStep = computed(() => store.currentStep)
const currentStream = computed(() => store.currentStream)

const props = defineProps({
  mode: String,
})

const dlgTp = computed(() => commonStore.dlgType)
</script>
 