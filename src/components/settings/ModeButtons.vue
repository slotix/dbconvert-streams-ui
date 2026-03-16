<template>
  <div class="space-y-3">
    <!-- Label with Icon -->
    <div class="flex items-center gap-2">
      <ArrowLeftRight class="ui-accent-icon h-5 w-5" />
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
                ? 'ui-surface-muted ui-border-default opacity-60 cursor-not-allowed'
                : checked
                  ? 'ui-accent-selection-checked'
                  : 'ui-surface-raised ui-border-default hover:[background-color:var(--ui-surface-muted)] cursor-pointer',
              active && !disabled && !checked ? 'ui-accent-selection-active' : '',
              'relative h-full min-h-[76px] flex items-start rounded-lg border p-3 transition-all duration-150 focus:outline-none'
            ]"
          >
            <div class="mt-0.5 flex items-center h-5">
              <span
                :class="[
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  checked
                    ? 'border-sky-600 dark:border-sky-400'
                    : 'border-gray-400 dark:border-gray-500'
                ]"
              >
                <span v-if="checked" class="h-2 w-2 rounded-full bg-sky-600 dark:bg-sky-400" />
              </span>
            </div>
            <div class="ml-3 flex-1">
              <RadioGroupLabel
                as="div"
                :class="[
                  disabled
                    ? 'text-gray-500 dark:text-gray-400'
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
