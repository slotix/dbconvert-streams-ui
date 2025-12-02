<template>
  <div class="flex items-center gap-4">
    <!-- Label with Icon -->
    <div class="flex items-center gap-2 shrink-0">
      <svg
        class="h-5 w-5 text-teal-600 dark:text-teal-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
      <label class="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Data Transfer Mode
      </label>
    </div>

    <!-- Mode Buttons -->
    <RadioGroup v-model="mode" class="flex-1">
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
              checked
                ? 'bg-teal-600 dark:bg-teal-900 text-white border border-transparent dark:border-teal-600 hover:bg-teal-700 dark:hover:bg-teal-800 focus:ring-teal-500 dark:focus:ring-teal-400'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:ring-gray-500',
              'flex items-center justify-center rounded-md py-3 px-3 text-sm font-medium transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2'
            ]"
          >
            <RadioGroupLabel as="span" class="cursor-pointer">{{ option.title }}</RadioGroupLabel>
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
