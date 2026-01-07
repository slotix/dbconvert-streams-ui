<script setup lang="ts">
import { computed } from 'vue'
import type { SQLTriggerMeta } from '@/types/metadata'
import ViewDefinitionView from './ViewDefinitionView.vue'

const props = withDefaults(
  defineProps<{
    triggerMeta: SQLTriggerMeta
    connectionType: string
    objectKey?: string
    showContext?: boolean
  }>(),
  {
    showContext: true
  }
)

const timingValue = computed(() => props.triggerMeta.timing?.trim())
const eventValue = computed(() => props.triggerMeta.event?.trim())
const hasTiming = computed(() => Boolean(timingValue.value))
const hasEvent = computed(() => Boolean(eventValue.value))
const timingDisplay = computed(() => (timingValue.value ? timingValue.value.toUpperCase() : '—'))
const eventDisplay = computed(() => (eventValue.value ? eventValue.value.toUpperCase() : '—'))
</script>

<template>
  <div class="p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <div
          class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
        >
          Trigger
        </div>
        <div
          class="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 break-all font-mono"
        >
          {{ triggerMeta.name }}
        </div>
        <div
          v-if="showContext"
          class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
        >
          <span class="inline-flex items-center gap-1">
            <span class="font-medium text-gray-600 dark:text-gray-300">Schema</span>
            <span class="font-mono">{{ triggerMeta.schema || 'default' }}</span>
          </span>
          <span class="text-gray-300 dark:text-gray-600">•</span>
          <span class="inline-flex items-center gap-1">
            <span class="font-medium text-gray-600 dark:text-gray-300">Table</span>
            <span class="font-mono">{{ triggerMeta.tableName || '—' }}</span>
          </span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div
          :class="[
            'inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-medium',
            hasTiming
              ? 'border-teal-200 dark:border-teal-500/40 bg-teal-50/60 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400'
          ]"
        >
          <span class="text-[10px] uppercase tracking-wide">Timing</span>
          <span :class="[hasTiming ? 'font-mono' : 'italic']">{{ timingDisplay }}</span>
        </div>
        <div
          :class="[
            'inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-medium',
            hasEvent
              ? 'border-blue-200 dark:border-blue-500/40 bg-blue-50/60 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400'
          ]"
        >
          <span class="text-[10px] uppercase tracking-wide">Event</span>
          <span :class="[hasEvent ? 'font-mono' : 'italic']">{{ eventDisplay }}</span>
        </div>
      </div>
    </div>
    <ViewDefinitionView
      :definition="triggerMeta.definition || ''"
      :connection-type="connectionType"
    />
  </div>
</template>
