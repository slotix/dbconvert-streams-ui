<template>
  <div
    class="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center text-gray-500 dark:text-gray-400"
  >
    <div
      class="inline-flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-teal-500 text-white shadow-xl"
    >
      <component :is="icon" class="h-10 w-10" />
    </div>
    <div class="max-w-md mx-auto space-y-1">
      <p class="text-xl font-semibold text-gray-900 dark:text-gray-100">{{ title }}</p>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ message }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DocumentTextIcon, CursorArrowRaysIcon } from '@heroicons/vue/24/outline'

interface Props {
  variant?: 'no-object' | 'no-connection'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'no-object'
})

const icon = computed(() => {
  return props.variant === 'no-connection' ? CursorArrowRaysIcon : DocumentTextIcon
})

const title = computed(() => {
  return props.variant === 'no-connection' ? 'Select a connection' : 'No object selected'
})

const message = computed(() => {
  return props.variant === 'no-connection'
    ? 'Choose a connection from the sidebar to start exploring data'
    : 'Select an object from the sidebar to view its details. You can preview tables, views, or files.'
})
</script>
