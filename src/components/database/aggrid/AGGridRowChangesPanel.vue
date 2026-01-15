<script setup lang="ts">
import { computed } from 'vue'
import SlideOverPanel from '@/components/common/SlideOverPanel.vue'

const props = defineProps<{
  open: boolean
  items: Array<{ field: string; oldValue: string; newValue: string }>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'revert', field: string): void
}>()

const countLabel = computed(() => {
  const n = props.items.length
  return `${n} field${n === 1 ? '' : 's'} changed`
})
</script>

<template>
  <SlideOverPanel
    :open="open"
    title="Changes in this row"
    :subtitle="countLabel"
    @close="emit('close')"
  >
    <div v-if="items.length === 0" class="text-sm text-gray-600 dark:text-gray-400">
      No pending edits for this row.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="item in items"
        :key="item.field"
        class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 p-3"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
            {{ item.field }}
          </div>
          <button
            type="button"
            class="text-xs text-teal-700 dark:text-teal-300 hover:underline"
            @click="emit('revert', item.field)"
          >
            Revert
          </button>
        </div>
        <div class="mt-2 text-xs text-gray-700 dark:text-gray-300">
          <span class="line-through opacity-70">{{ item.oldValue }}</span>
          <span class="mx-2 opacity-70">→</span>
          <span class="font-semibold">{{ item.newValue }}</span>
        </div>
      </div>
    </div>
  </SlideOverPanel>
</template>
