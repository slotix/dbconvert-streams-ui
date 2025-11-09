<template>
  <div>
    <label for="dataBundleSize" class="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >Data Transfer Mode:</label
    >
    <RadioGroup v-model="mode" class="mt-2">
      <RadioGroupLabel class="sr-only">Choose a data transfer mode</RadioGroupLabel>
      <div class="grid grid-cols-2 gap-2">
        <RadioGroupOption
          v-for="option in modes"
          :key="option.id"
          v-slot="{ active, checked }"
          :value="option"
        >
          <div
            :class="[
              active
                ? 'ring-2 ring-gray-600 dark:ring-gray-400 ring-offset-2 dark:ring-offset-gray-900'
                : '',
              checked
                ? 'bg-gray-600 dark:bg-gray-500 text-white hover:bg-gray-500 dark:hover:bg-gray-400'
                : 'ring-1 ring-inset ring-gray-300 dark:ring-gray-600 bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800',
              'flex items-center justify-center rounded-md py-3 px-3 text-xs transition-colors duration-150'
            ]"
          >
            <RadioGroupLabel>{{ option.title }}</RadioGroupLabel>
            <CheckCircleIcon v-if="checked" class="ml-2 h-4 w-4" aria-hidden="true" />
          </div>
        </RadioGroupOption>
      </div>
    </RadioGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useCommonStore } from '@/stores/common'
import { type ModeOption } from '@/stores/common'
import { RadioGroup, RadioGroupLabel, RadioGroupOption } from '@headlessui/vue'
import { CheckCircleIcon } from '@heroicons/vue/20/solid'

const commonStore = useCommonStore()
const modes = commonStore.modes as ModeOption[]
const streamsStore = useStreamsStore()
const currentStreamConfig = streamsStore.currentStreamConfig

const mode = ref<ModeOption>(
  modes.find((option) => option.id === currentStreamConfig?.mode) || modes[0]
)

watch(mode, (newVal) => {
  if (currentStreamConfig) {
    currentStreamConfig.mode = newVal.id
  }
})
</script>
