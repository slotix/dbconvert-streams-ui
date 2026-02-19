<script setup lang="ts">
/**
 * LogRow - Generic, reusable log entry component
 *
 * Provides a unified row layout for both System and SQL logs.
 * Uses slots for customization while maintaining consistent styling.
 *
 * Features:
 * - Flexible grid layout with consistent spacing
 * - Badge support for categorization
 * - Expandable/collapsible content
 * - Copy button support
 * - Error state styling
 * - Hover effects and transitions
 */

import { ref, computed, type Component } from 'vue'
import { Check, ChevronDown, ChevronRight, Clipboard } from 'lucide-vue-next'

interface Props {
  timestamp: string
  badge?: {
    icon: Component
    colorClass: string
  }
  message: string
  isError?: boolean
  expandable?: boolean
  copyText?: string
}

const props = withDefaults(defineProps<Props>(), {
  isError: false,
  expandable: false
})

const isExpanded = ref(false)
const copied = ref(false)

const rowBackgroundClass = computed(() => {
  if (props.isError) {
    return 'bg-red-50 dark:bg-red-900/30'
  }
  return 'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
})

async function copyToClipboard() {
  if (!props.copyText) return

  try {
    await navigator.clipboard.writeText(props.copyText)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}

function toggleExpand() {
  if (props.expandable) {
    isExpanded.value = !isExpanded.value
  }
}
</script>

<template>
  <div class="border-b border-gray-200 dark:border-gray-700">
    <!-- Main Row -->
    <div
      :class="[rowBackgroundClass, 'flex items-center gap-2 px-4 py-2 cursor-pointer']"
      @click="toggleExpand"
    >
      <!-- Expand/Collapse Icon (if expandable) -->
      <button
        v-if="expandable"
        class="flex-shrink-0 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        @click.stop="toggleExpand"
      >
        <component
          :is="isExpanded ? ChevronDown : ChevronRight"
          class="w-4 h-4 text-gray-500 dark:text-gray-400"
        />
      </button>

      <!-- Timestamp -->
      <span
        class="w-28 text-xs text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap flex-shrink-0"
      >
        {{ timestamp }}
      </span>

      <!-- Badge Icon -->
      <component
        :is="badge.icon"
        v-if="badge"
        class="w-4 h-4 flex-shrink-0 transition-colors"
        :class="[badge.colorClass]"
      />

      <!-- Message / Content -->
      <span class="flex-1 text-sm text-gray-800 dark:text-gray-200 overflow-hidden text-ellipsis">
        <slot>{{ message }}</slot>
      </span>

      <!-- Copy Button (if copyable) -->
      <button
        v-if="copyText"
        class="flex-shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded"
        title="Copy"
        @click.stop="copyToClipboard"
      >
        <Check v-if="copied" class="w-4 h-4 text-green-600 dark:text-green-400" />
        <Clipboard v-else class="w-4 h-4" />
      </button>
    </div>

    <!-- Expanded Content -->
    <div
      v-if="expandable && isExpanded"
      class="px-12 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
    >
      <slot name="expanded-content" />
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions */
.transition-colors {
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}
</style>
