<script setup lang="ts">
import { computed } from 'vue'
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
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="text-xs font-medium text-gray-600 dark:text-gray-300">Sample:</span>
    <select
      v-model="selectedPreset"
      class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="loading"
    >
      <option v-for="pct in presets" :key="pct" :value="pct">{{ pct }}%</option>
      <option value="custom">Custom…</option>
    </select>

    <input
      v-if="selectedPreset === 'custom'"
      v-model.number="customPercent"
      type="number"
      min="1"
      max="100"
      step="1"
      class="w-20 inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="loading"
      aria-label="Custom sample percent"
    />
  </div>
</template>
