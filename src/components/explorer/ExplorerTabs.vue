<template>
  <div class="mb-2">
    <div class="flex items-center gap-1">
      <button
        v-if="currentPreview"
        class="px-2 py-1 text-xs rounded border border-dashed border-gray-300 bg-white text-gray-600 italic transition hover:border-gray-400 hover:text-gray-700"
        @click="$emit('activate-preview')"
      >
        {{ currentPreview.label }}
      </button>

      <TabGroup
        v-if="pinnedTabs.length"
        :selected-index="headlessSelectedIndex"
        manual
        @change="$emit('activate-pinned', $event)"
      >
        <TabList class="flex items-center gap-1">
          <Tab v-for="(tab, i) in pinnedTabs" :key="generateTabKey(tab)" v-slot as="template">
            <button
              type="button"
              class="group flex items-center gap-2 rounded border border-gray-300 bg-white px-2 py-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400"
              :class="[
                isTabActive(i) ? 'ring-1 ring-slate-400 bg-gray-50' : 'hover:bg-gray-50',
                'cursor-pointer'
              ]"
            >
              <span class="truncate font-medium text-gray-900" :title="tab.name || ''">{{
                tab.name || 'Unnamed'
              }}</span>
              <span class="flex items-center gap-1 text-gray-400">
                <component
                  :is="getPrimaryIcon(tab)"
                  class="h-4 w-4 text-slate-500"
                  aria-hidden="true"
                />
                <span v-if="primaryIconLabel(tab)" class="sr-only">{{
                  primaryIconLabel(tab)
                }}</span>
                <component
                  v-if="tab.tabType === 'database'"
                  :is="getViewIcon(tab)"
                  class="h-3.5 w-3.5 text-slate-400"
                  aria-hidden="true"
                />
                <span v-if="tab.tabType === 'database'" class="sr-only">{{
                  viewIconLabel(tab)
                }}</span>
              </span>
              <span
                role="button"
                tabindex="0"
                class="ml-1 flex h-6 w-6 items-center justify-center rounded transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400"
                :aria-label="`Close tab ${tab.name ?? ''}`"
                @click.stop="$emit('close-pinned', i)"
                @keydown.enter.stop.prevent="$emit('close-pinned', i)"
                @keydown.space.stop.prevent="$emit('close-pinned', i)"
              >
                <XMarkIcon
                  class="h-4 w-4 text-gray-500 group-hover:text-gray-700"
                  aria-hidden="true"
                />
              </span>
            </button>
          </Tab>
        </TabList>
      </TabGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TabGroup, TabList, Tab } from '@headlessui/vue'
import {
  DocumentIcon,
  DocumentTextIcon,
  EyeIcon,
  Squares2X2Icon,
  TableCellsIcon,
  XMarkIcon
} from '@heroicons/vue/20/solid'
import type { ExplorerTab } from '@/stores/tabs'
import { useTabsStore } from '@/stores/tabs'

defineEmits<{
  'activate-preview': []
  'activate-pinned': [index: number]
  'close-pinned': [index: number]
}>()

const tabsStore = useTabsStore()

const pinnedTabs = computed(() => tabsStore.pinnedTabs)
const activePinnedIndex = computed(() => tabsStore.activePinnedIndex)

const currentPreview = computed<
  { kind: 'panel'; label: string } | { kind: 'object'; label: string } | null
>(() => {
  if (tabsStore.previewTab) {
    const name = tabsStore.previewTab.name ?? ''
    return { kind: 'object', label: `${name} (Preview)` }
  }
  return null
})

const headlessSelectedIndex = computed(() => {
  if (!pinnedTabs.value.length) return 0
  return activePinnedIndex.value ?? 0
})

function isTabActive(index: number) {
  return activePinnedIndex.value === index
}

function getPrimaryIcon(tab: ExplorerTab) {
  if (tab.tabType === 'file') return DocumentIcon
  return tab.type === 'view' ? EyeIcon : TableCellsIcon
}

function primaryIconLabel(tab: ExplorerTab) {
  if (tab.tabType === 'file') return 'File'
  return tab.type === 'view' ? 'View' : 'Table'
}

function getViewIcon(tab: ExplorerTab) {
  const mode = tab.viewTab || tab.defaultTab || 'data'
  return mode === 'structure' ? DocumentTextIcon : Squares2X2Icon
}

function viewIconLabel(tab: ExplorerTab) {
  const mode = tab.viewTab || tab.defaultTab || 'data'
  return mode === 'structure' ? 'Structure view' : 'Data view'
}

function generateTabKey(tab: ExplorerTab) {
  return tabsStore.generateTabKey(tab)
}
</script>
