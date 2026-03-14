<script setup lang="ts">
import { computed } from 'vue'
import FormSelect from '@/components/base/FormSelect.vue'
import type { SamplePreset } from '@/composables/useSummarySampling'

const props = defineProps<{
  presets: readonly number[]
  selectedPreset: SamplePreset
  customPercent: number
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:selectedPreset': [value: SamplePreset]
  'update:customPercent': [value: number]
}>()

const selectedPreset = computed({
  get: () => props.selectedPreset,
  set: (value: SamplePreset) => emit('update:selectedPreset', value)
})

const customPercent = computed({
  get: () => props.customPercent,
  set: (value: number) => emit('update:customPercent', value)
})

const presetOptions = computed(() => [
  ...props.presets.map((pct) => ({ value: pct, label: `${pct}%` })),
  { value: 'custom', label: 'Custom…' }
])
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="text-xs font-medium text-gray-600 dark:text-gray-300">Sample:</span>
    <FormSelect
      :model-value="selectedPreset"
      :options="presetOptions"
      :disabled="loading"
      compact
      button-class="h-7"
      class="w-[9rem]"
      @update:model-value="selectedPreset = ($event ?? 'custom') as SamplePreset"
    />

    <input
      v-if="selectedPreset === 'custom'"
      v-model.number="customPercent"
      type="number"
      min="1"
      max="100"
      step="1"
      class="ui-accent-focus ui-surface-raised ui-border-default inline-flex w-20 items-center rounded border px-2 py-1 text-xs text-gray-600 hover:[background-color:var(--ui-surface-muted)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400"
      :disabled="loading"
      aria-label="Custom sample percent"
    />
  </div>
</template>
