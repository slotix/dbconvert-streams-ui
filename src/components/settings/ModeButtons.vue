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

    <!-- Mode Radio Buttons -->
    <RadioGroup v-model="mode" class="flex-1">
      <RadioGroupLabel class="sr-only">Choose a data transfer mode</RadioGroupLabel>
      <div class="flex gap-4">
        <RadioGroupOption
          v-for="option in modes"
          :key="option.id"
          v-slot="{ active, checked }"
          :value="option"
        >
          <div
            :class="[
              checked
                ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
              active ? 'ring-2 ring-teal-500 ring-offset-2' : '',
              'relative flex items-center cursor-pointer rounded-lg border p-3 transition-all duration-150 focus:outline-none'
            ]"
          >
            <div class="flex items-center h-5">
              <input
                :checked="checked"
                type="radio"
                class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700"
                readonly
              />
            </div>
            <div class="ml-3 flex-1">
              <RadioGroupLabel
                as="div"
                :class="[
                  checked ? 'text-teal-900 dark:text-teal-100' : 'text-gray-900 dark:text-gray-100',
                  'text-sm font-medium cursor-pointer'
                ]"
              >
                {{ option.title }}
              </RadioGroupLabel>
            </div>
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
