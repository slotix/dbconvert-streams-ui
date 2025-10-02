<template>
  <div class="mb-2">
    <div class="flex items-center gap-1">
      <button
        v-if="currentPreview"
        class="px-2 py-1 text-xs rounded border border-dashed border-gray-300 bg-white text-gray-600 italic"
        @click="$emit('activate-preview')"
      >
        {{ currentPreview.label }}
      </button>
      <template v-for="(tab, i) in pinnedTabs" :key="generateTabKey(tab)">
        <button
          class="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-1"
          :class="{ 'ring-1 ring-slate-400': activePinnedIndex === i }"
          @click="$emit('activate-pinned', i)"
        >
          <span class="font-medium">{{ tab.name }}</span>
          <span v-if="tab.tabType === 'database'" class="text-gray-400">{{
            tab.type === 'table' ? 'T' : 'V'
          }}</span>
          <span v-else class="text-gray-400">F</span>
          <button
            class="ml-1 text-gray-400 hover:text-gray-600"
            @click.stop="$emit('close-pinned', i)"
          >
            ×
          </button>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTabsStore } from '@/stores/tabs'

const tabsStore = useTabsStore()

// Define emits
defineEmits<{
  'activate-preview': []
  'activate-pinned': [index: number]
  'close-pinned': [index: number]
}>()

// Computed properties from store
const pinnedTabs = computed(() => tabsStore.pinnedTabs)
const activePinnedIndex = computed(() => tabsStore.activePinnedIndex)

// Preview chip reflects the real current view
const currentPreview = computed<
  { kind: 'panel'; label: string } | { kind: 'object'; label: string } | null
>(() => {
  if (tabsStore.previewTab) {
    return { kind: 'object', label: `${tabsStore.previewTab.name} (Preview)` }
  }
  return null
})

// Generate tab key for v-for
function generateTabKey(tab: (typeof tabsStore.pinnedTabs)[0]) {
  return tabsStore.generateTabKey(tab)
}
</script>
