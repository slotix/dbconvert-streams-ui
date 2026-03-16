<template>
  <div
    class="ui-surface-toolbar ui-border-default flex items-center justify-between px-4 py-3 border rounded-lg backdrop-blur-sm"
    :class="[sticky ? 'sticky top-0 z-20' : '', collapsible ? 'cursor-pointer' : '']"
    @click="handleToggle"
  >
    <div class="flex items-center gap-3 min-w-0">
      <component
        :is="expanded ? ChevronDown : ChevronRight"
        v-if="collapsible"
        class="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0"
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
          class="ui-chip-muted text-xs rounded px-2 py-0.5 font-medium shrink-0"
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
  alias?: string
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
  alias: '',
  selectionLabel: '',
  countLabel: '',
  iconClass: 'ui-accent-icon',
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
