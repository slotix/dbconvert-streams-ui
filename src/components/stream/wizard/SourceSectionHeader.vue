<template>
  <div
    class="flex items-center justify-between px-4 py-3 bg-linear-to-r from-gray-50/80 to-gray-100/40 dark:from-gray-850 dark:to-gray-800/70 border border-gray-200/80 dark:border-gray-700/80 rounded-lg backdrop-blur-sm"
    :class="[sticky ? 'sticky top-0 z-20' : '', collapsible ? 'cursor-pointer' : '']"
    @click="handleToggle"
  >
    <div class="flex items-center gap-3 min-w-0">
      <component
        :is="expanded ? ChevronDown : ChevronRight"
        class="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0"
        :class="collapsible ? '' : 'invisible'"
      />
      <component :is="icon" class="w-5 h-5 shrink-0" :class="iconClass" />

      <div class="flex items-center gap-2 min-w-0">
        <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ alias }}</span>
        <span class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ connectionName }}</span>
        <span v-if="selectionLabel" class="text-sm text-gray-500 dark:text-gray-400 truncate">
          / {{ selectionLabel }}
        </span>
        <span
          v-if="countLabel"
          class="text-xs text-gray-600 dark:text-gray-300 bg-gray-200/70 dark:bg-gray-700/70 rounded px-2 py-0.5 font-medium shrink-0"
        >
          {{ countLabel }}
        </span>
      </div>
    </div>

    <div class="flex items-center gap-3 shrink-0" @click.stop>
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import type { Component } from 'vue'

interface Props {
  alias: string
  connectionName: string
  selectionLabel?: string
  countLabel?: string
  icon: Component
  iconClass?: string
  collapsible?: boolean
  expanded?: boolean
  sticky?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectionLabel: '',
  countLabel: '',
  iconClass: 'text-sky-600 dark:text-sky-400',
  collapsible: false,
  expanded: true,
  sticky: false
})

const emit = defineEmits<{
  toggle: []
}>()

function handleToggle() {
  if (!props.collapsible) return
  emit('toggle')
}
</script>
