<template>
  <div class="space-y-3">
    <!-- Label with Icon -->
    <div class="flex items-center gap-2">
      <ArrowLeftRight class="h-5 w-5 text-teal-600 dark:text-teal-400" />
      <label class="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Data Transfer Mode
      </label>
    </div>

    <!-- Mode Radio Buttons -->
    <RadioGroup v-model="mode">
      <RadioGroupLabel class="sr-only">Choose a data transfer mode</RadioGroupLabel>
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <RadioGroupOption
          v-for="option in modes"
          :key="option.id"
          v-slot="{ active, checked, disabled }"
          :value="option"
          :disabled="isModeDisabled(option.id)"
        >
          <div
            :class="[
              disabled
                ? 'bg-gray-100 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                : checked
                  ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer',
              active && !disabled ? 'ring-2 ring-teal-500 ring-offset-2' : '',
              'relative h-full min-h-[76px] flex items-start rounded-lg border p-3 transition-all duration-150 focus:outline-none'
            ]"
          >
            <div class="mt-0.5 flex items-center h-5">
              <input
                :checked="checked"
                type="radio"
                class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700"
                :disabled="disabled"
                readonly
              />
            </div>
            <div class="ml-3 flex-1">
              <RadioGroupLabel
                as="div"
                :class="[
                  disabled
                    ? 'text-gray-500 dark:text-gray-400'
                    : checked
                      ? 'text-teal-900 dark:text-teal-100'
                      : 'text-gray-900 dark:text-gray-100',
                  'text-sm font-medium'
                ]"
              >
                {{ option.title }}
              </RadioGroupLabel>
              <p
                class="mt-0.5 text-xs"
                :class="
                  disabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-300'
                "
              >
                {{ getModeDescription(option.id) }}
              </p>
              <p
                v-if="disabled && disabledReasons[option.id]"
                class="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
              >
                {{ disabledReasons[option.id] }}
              </p>
            </div>
          </div>
        </RadioGroupOption>
      </div>
    </RadioGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useCommonStore } from '@/stores/common'
import { type ModeOption } from '@/stores/common'
import { RadioGroup, RadioGroupLabel, RadioGroupOption } from '@headlessui/vue'
import { ArrowLeftRight } from 'lucide-vue-next'

type ModeId = ModeOption['id']

interface Props {
  disabledModeIds?: ModeId[]
  disabledReasons?: Partial<Record<ModeId, string>>
}

const props = withDefaults(defineProps<Props>(), {
  disabledModeIds: () => [],
  disabledReasons: () => ({})
})

const commonStore = useCommonStore()
const modes = commonStore.modes as ModeOption[]
const streamsStore = useStreamsStore()

const mode = computed<ModeOption>({
  get: () =>
    modes.find((option) => option.id === streamsStore.currentStreamConfig?.mode) || modes[0],
  set: (newVal) => {
    if (streamsStore.currentStreamConfig) {
      streamsStore.currentStreamConfig.mode = newVal.id
    }
  }
})

const disabledReasons = computed(() => props.disabledReasons)

function isModeDisabled(modeId: ModeId): boolean {
  return props.disabledModeIds.includes(modeId)
}

function getModeDescription(modeId: ModeId): string {
  if (modeId === 'convert') {
    return 'One-time migration. Supports tables and custom queries.'
  }
  return 'Continuous replication of changes from a single database source.'
}
</script>
