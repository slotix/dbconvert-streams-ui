<script setup lang="ts">
import { type SQLViewMeta } from '@/types/metadata'
import ViewDefinitionView from './ViewDefinitionView.vue'
import { ref, nextTick, computed, watch } from 'vue'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { useObjectTabStateStore } from '@/stores/objectTabState'

// Define brand colors as constants for consistency (matching DatabaseDiagramD3.vue)
// (colors handled elsewhere)

const props = defineProps<{
  viewMeta: SQLViewMeta
  connectionId: string
  connectionType: string
  objectKey: string
}>()

const emit = defineEmits<{
  (e: 'refresh-metadata'): void
}>()

// Use the Pinia store for sub-tab state management
const tabStateStore = useObjectTabStateStore()

const isLoading = ref(false)

// Replace local activeTabIndex with store-based state management
const activeTabIndex = ref(0)

// Watch for objectKey changes and update sub-tab state accordingly
watch(
  () => props.objectKey,
  (newKey) => {
    const savedState = tabStateStore.getSubTabState(newKey)
    activeTabIndex.value = savedState ?? 0
  },
  { immediate: true }
)

// Handle sub-tab changes and save to store
function onSubTabChange(index: number) {
  activeTabIndex.value = index
  tabStateStore.setSubTabState(props.objectKey, index)
}

function handleRefresh() {
  isLoading.value = true
  emit('refresh-metadata')
  // Keep spinner for a short duration to provide visual feedback
  nextTick(() => {
    const timer = globalThis.setTimeout(() => {
      isLoading.value = false
    }, 1000)
    return () => globalThis.clearTimeout(timer)
  })
}

// Expose for parent container
defineExpose({ refresh: handleRefresh })

const tabs = computed(() => [
  { name: 'Columns', count: props.viewMeta?.columns?.length || 0 },
  { name: 'DDL', count: 1 }
])

import type { SQLColumnMeta } from '@/types/metadata'

// Type guards to gracefully handle legacy shapes if present
function hasValueNumber(obj: unknown): obj is { value: number | null; Valid: boolean } {
  if (!obj || typeof obj !== 'object') return false
  return 'value' in obj
}
function hasInt64Number(obj: unknown): obj is { Int64: number | null; Valid: boolean } {
  if (!obj || typeof obj !== 'object') return false
  return 'Int64' in obj
}

function getColumnDefault(column: SQLColumnMeta) {
  return column.defaultValue?.Valid && column.defaultValue.String !== null
    ? column.defaultValue.String
    : '-'
}

function getColumnType(column: SQLColumnMeta) {
  let type = column.dataType

  // Prefer current shape { Int64, Valid }, but tolerate legacy { value, Valid }
  if (column.length && typeof column.length === 'object') {
    if (hasInt64Number(column.length) && column.length.Valid && column.length.Int64 !== null) {
      type += `(${column.length.Int64})`
      return type
    }
    if (hasValueNumber(column.length) && column.length.Valid && column.length.value !== null) {
      type += `(${column.length.value})`
      return type
    }
  }

  if (column.precision?.Valid && column.precision.Int64 !== null) {
    const precisionStr = `${column.precision.Int64}`
    const scaleStr =
      column.scale?.Valid && column.scale.Int64 !== null ? `,${column.scale.Int64}` : ''
    type += `(${precisionStr}${scaleStr})`
  }
  return type
}
</script>

<template>
  <div
    v-if="viewMeta"
    :class="[
      'bg-white dark:bg-gray-850',
      $attrs.class ? $attrs.class : 'shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 rounded-lg'
    ]"
  >
    <!-- Header removed; DatabaseObjectContainer renders tabs, title, and actions -->

    <!-- HeadlessUI Tab Implementation with Store Integration - Underline Style -->
    <TabGroup :selectedIndex="activeTabIndex" as="div" @change="onSubTabChange">
      <TabList class="flex space-x-1 border-b border-gray-200 dark:border-gray-700 px-4">
        <Tab v-for="tab in tabs" :key="tab.name" v-slot="{ selected }" as="template">
          <button
            :class="[
              'px-3 py-2.5 text-sm font-medium leading-5 whitespace-nowrap transition-colors duration-150',
              'focus:outline-none focus:ring-1 ring-offset-1 ring-gray-300 dark:ring-gray-600',
              selected
                ? 'border-b-2 border-gray-400 dark:border-gray-500 text-gray-900 dark:text-gray-100 -mb-px'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            ]"
          >
            {{ tab.name }}
            <span
              :class="[
                'ml-2 rounded-full px-2 py-0.5 text-xs font-medium transition-colors duration-150',
                selected
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              ]"
            >
              {{ tab.count }}
            </span>
          </button>
        </Tab>
      </TabList>

      <TabPanels class="p-4">
        <!-- Columns Panel -->
        <TabPanel>
          <div class="overflow-x-auto">
            <div class="min-w-[640px]">
              <div class="ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg">
                <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                  <thead>
                    <tr class="bg-gray-50 dark:bg-gray-900">
                      <th
                        scope="col"
                        class="py-2 pl-6 pr-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400 sm:pl-6"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        class="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400"
                      >
                        Type
                      </th>
                      <th
                        scope="col"
                        class="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400"
                      >
                        Nullable
                      </th>
                      <th
                        scope="col"
                        class="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400"
                      >
                        Default
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-850"
                  >
                    <tr
                      v-for="column in viewMeta.columns"
                      :key="column.name"
                      class="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td
                        class="whitespace-nowrap py-2 pl-6 pr-4 text-sm text-gray-900 dark:text-gray-100 sm:pl-6"
                      >
                        {{ column.name }}
                      </td>
                      <td
                        class="whitespace-nowrap px-4 py-2 text-sm text-gray-500 dark:text-gray-400"
                      >
                        {{ getColumnType(column) }}
                      </td>
                      <td
                        class="whitespace-nowrap px-4 py-2 text-sm text-gray-500 dark:text-gray-400"
                      >
                        {{ column.isNullable ? 'Yes' : 'No' }}
                      </td>
                      <td
                        class="whitespace-nowrap px-4 py-2 text-sm text-gray-500 dark:text-gray-400"
                      >
                        {{ getColumnDefault(column) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabPanel>

        <!-- DDL Panel -->
        <TabPanel>
          <ViewDefinitionView :definition="viewMeta.definition" :connection-type="connectionType" />
        </TabPanel>
      </TabPanels>
    </TabGroup>

    <!-- Dependencies -->
    <div v-if="viewMeta.dependsOn?.length" class="mt-4 px-4">
      <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Dependencies</h4>
      <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
        <li v-for="dep in viewMeta.dependsOn" :key="dep">{{ dep }}</li>
      </ul>
    </div>
  </div>
</template>

<style>
@reference '../../assets/style.css';

/* Component-specific styles only - code highlighting styles are centralized in src/styles/codeHighlighting.css */

/* Scrollbar styling */
.overflow-x-auto {
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}

.overflow-x-auto::-webkit-scrollbar {
  @apply h-2 w-2;
}

.overflow-x-auto::-webkit-scrollbar-track {
  @apply bg-gray-50;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full hover:bg-gray-400 transition-colors;
}

/* Override tab-size for SQL code blocks (different from default tab-size: 2) */
pre {
  tab-size: 4;
}
</style>
