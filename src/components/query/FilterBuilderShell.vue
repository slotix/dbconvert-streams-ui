<template>
  <div
    class="bg-linear-to-br from-gray-50 to-gray-100/50 dark:from-gray-900/60 dark:to-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible"
  >
    <div
      v-if="$slots.header"
      class="flex items-center justify-between px-3 py-2 bg-white/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"
    >
      <slot name="header" />
    </div>

    <div :class="bodyClass">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  bodyClass?: string
}

withDefaults(defineProps<Props>(), {
  bodyClass: 'p-3'
})
</script>
