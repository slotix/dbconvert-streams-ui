<template>
  <div class="flex items-center gap-3">
    <button type="button" :class="selectClass" @click.stop="$emit('select-all')">
      {{ selectLabel }}
    </button>
    <button type="button" :class="clearClass" @click.stop="$emit('clear')">
      {{ clearLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  selectLabel?: string
  clearLabel?: string
  selectClass?: string
  clearClass?: string
}

withDefaults(defineProps<Props>(), {
  selectLabel: 'Select All',
  clearLabel: 'Clear',
  selectClass:
    'text-xs text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-300 font-medium',
  clearClass: 'text-xs text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-300'
})

defineEmits<{
  'select-all': []
  clear: []
}>()
</script>
