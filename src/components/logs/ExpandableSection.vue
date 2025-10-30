<script setup lang="ts">
/**
 * ExpandableSection - Reusable expandable content container
 *
 * Provides smooth expand/collapse animations with consistent styling.
 * Used for SQL syntax highlighting and detailed error information.
 *
 * Features:
 * - Smooth collapse/expand animation
 * - Optional title header
 * - Flexible content slots
 * - Customizable styling
 */

import { ref } from 'vue'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

interface Props {
  title?: string
  isOpen?: boolean
  hasError?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  hasError: false
})

const isExpanded = ref(props.isOpen)

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div
    :class="['border rounded', hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white']"
  >
    <!-- Header (if title provided) -->
    <button
      v-if="title"
      class="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-100 transition-colors text-left"
      @click="toggleExpand"
    >
      <component
        :is="isExpanded ? ChevronDownIcon : ChevronRightIcon"
        class="w-4 h-4 text-gray-500 flex-shrink-0"
      />
      <span :class="['text-sm font-semibold', hasError ? 'text-red-700' : 'text-gray-700']">
        {{ title }}
      </span>
    </button>

    <!-- Content (with smooth animation) -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="overflow-hidden max-h-0"
      enter-to-class="overflow-hidden max-h-96"
      leave-active-class="transition-all duration-200"
      leave-from-class="overflow-hidden max-h-96"
      leave-to-class="overflow-hidden max-h-0"
    >
      <div
        v-if="isExpanded"
        :class="[
          'overflow-hidden',
          title ? 'border-t' : '',
          hasError ? 'border-red-300' : 'border-gray-200'
        ]"
      >
        <div class="px-4 py-3">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Smooth transitions for expandable content */
.transition-all {
  transition: all 0.2s ease;
}
</style>
