<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div class="flex-1 min-w-0">
            <h1 class="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
              {{ mode === 'edit' ? 'Edit Stream Config' : 'Add Stream Config' }}
              <span v-if="currentStreamConfig"
                class="ml-2 text-lg font-medium text-gray-500 underline underline-offset-4 decoration-dashed decoration-gray-400">
                {{ currentStreamConfig.id }}
              </span>
            </h1>
          </div>
          <Steps class="mt-4 sm:mt-0" />
        </div>
      </div>
    </div>

    <!-- Main content -->
    <main class="py-8">
      <div v-if="currentStep !== null">
        <div v-show="currentStep.name === 'source'">
          <Connections />
        </div>
        <div v-show="currentStep.name === 'target'">
          <Connections />
        </div>
        <Add v-if="dlgTp === DIALOG_TYPES.SAVE" />
        <Edit v-if="dlgTp === DIALOG_TYPES.UPDATE" />
        <div v-show="currentStep.name === 'streamSettings'">
          <Settings />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Connections from '@/components/connection/Connections.vue'
import Add from '@/components/connection/Add.vue'
import Edit from '@/components/connection/Edit.vue'
import { useCommonStore } from '@/stores/common'
import Steps from '@/components/stream/Steps.vue'
import Settings from '@/components/settings/Settings.vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { DIALOG_TYPES } from '@/stores/common'

const store = useStreamsStore()
const commonStore = useCommonStore()

const currentStep = computed(() => store.currentStep)
const currentStreamConfig = computed(() => store.currentStreamConfig)

interface Props {
  mode: string
}

const props = defineProps<Props>()

const dlgTp = computed(() => commonStore.dlgType)
</script>
