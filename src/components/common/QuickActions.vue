<script lang="ts">
import { vTooltip } from '@/directives/tooltip'

export default {
  directives: {
    tooltip: vTooltip
  }
}
</script>

<script setup lang="ts">
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export interface QuickAction {
  key: string
  icon: Component
  tooltip: string
  variant?: 'default' | 'primary' | 'danger'
  to?: RouteLocationRaw
}

defineProps<{
  actions: QuickAction[]
}>()

const emit = defineEmits<{
  (e: 'action', key: string): void
}>()

const variantClasses: Record<string, string> = {
  default:
    'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
  primary:
    'hover:bg-teal-100 dark:hover:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300',
  danger:
    'hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
}
</script>

<template>
  <div
    class="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-gray-850/95 backdrop-blur-sm rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-0.5"
    @click.stop
  >
    <!-- Slot for custom leading buttons (e.g. play/pause) -->
    <slot name="prepend" />

    <template v-for="action in actions" :key="action.key">
      <router-link v-if="action.to" :to="action.to">
        <button
          v-tooltip="action.tooltip"
          type="button"
          :class="[
            'p-1.5 rounded-md transition-colors',
            variantClasses[action.variant || 'default']
          ]"
        >
          <component :is="action.icon" class="h-4 w-4" />
        </button>
      </router-link>
      <button
        v-else
        v-tooltip="action.tooltip"
        type="button"
        :class="['p-1.5 rounded-md transition-colors', variantClasses[action.variant || 'default']]"
        @click.stop="emit('action', action.key)"
      >
        <component :is="action.icon" class="h-4 w-4" />
      </button>
    </template>
  </div>
</template>
