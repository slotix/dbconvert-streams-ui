<script setup lang="ts">
import { type SQLViewMeta } from '@/types/metadata'
import ViewDefinitionView from './ViewDefinitionView.vue'
import { ref, nextTick, computed } from 'vue'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'

// Define brand colors as constants for consistency (matching DatabaseDiagramD3.vue)
// (colors handled elsewhere)

const props = defineProps<{
  viewMeta: SQLViewMeta
  connectionId: string
  connectionType: string
}>()

const emit = defineEmits<{
  (e: 'refresh-metadata'): void
}>()

const isLoading = ref(false)
const activeTabIndex = ref(0)

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
      'bg-white',
      $attrs.class ? $attrs.class : 'shadow-sm ring-1 ring-gray-900/5 rounded-lg'
    ]"
  >
    <!-- Header removed; DatabaseObjectContainer renders tabs, title, and actions -->

    <TabGroup v-model="activeTabIndex" as="div">
      <TabList class="flex space-x-1 border-b border-gray-200 px-4">
        <Tab v-for="tab in tabs" :key="tab.name" v-slot="{ selected }" as="template">
          <button
            :class="[
              'px-3 py-2 text-sm font-medium leading-5 whitespace-nowrap transition-colors duration-150',
              'focus:outline-none focus:ring-1 ring-offset-1 ring-gray-300',
              selected
                ? 'border-b-2 border-slate-500 text-slate-900 -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            {{ tab.name }}
            <span
              :class="[
                'ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-150',
                selected ? 'bg-slate-100 text-slate-600' : 'bg-gray-100 text-gray-600'
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
              <div class="ring-1 ring-gray-200 rounded-lg">
                <table class="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr class="bg-gray-50">
                      <th
                        scope="col"
                        class="py-2 pl-6 pr-4 text-left text-sm font-medium text-gray-500 sm:pl-6"
                      >
                        Name
                      </th>
                      <th scope="col" class="px-4 py-2 text-left text-sm font-medium text-gray-500">
                        Type
                      </th>
                      <th scope="col" class="px-4 py-2 text-left text-sm font-medium text-gray-500">
                        Nullable
                      </th>
                      <th scope="col" class="px-4 py-2 text-left text-sm font-medium text-gray-500">
                        Default
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 bg-white">
                    <tr
                      v-for="column in viewMeta.columns"
                      :key="column.name"
                      class="hover:bg-gray-50"
                    >
                      <td class="whitespace-nowrap py-2 pl-6 pr-4 text-sm text-gray-900 sm:pl-6">
                        {{ column.name }}
                      </td>
                      <td class="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        {{ getColumnType(column) }}
                      </td>
                      <td class="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        {{ column.isNullable ? 'Yes' : 'No' }}
                      </td>
                      <td class="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
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
    <div v-if="viewMeta.dependsOn?.length" class="mt-4">
      <h4 class="text-sm font-medium text-gray-900 mb-2">Dependencies</h4>
      <ul class="list-disc list-inside text-sm text-gray-600">
        <li v-for="dep in viewMeta.dependsOn" :key="dep">{{ dep }}</li>
      </ul>
    </div>
  </div>
</template>

<style>
.hljs {
  @apply bg-white;
  color: #24292e;
  font-family:
    'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
}

/* SQL specific syntax highlighting */
.hljs-keyword {
  @apply text-[#d73a49] font-semibold;
  /* red */
}

.hljs-string {
  @apply text-[#032f62];
  /* blue */
}

.hljs-number {
  @apply text-[#005cc5];
  /* blue */
}

.hljs-operator {
  @apply text-[#d73a49];
  /* red */
}

.hljs-punctuation {
  @apply text-[#24292e];
  /* black */
}

.hljs-comment {
  @apply text-[#6a737d] italic;
  /* gray */
}

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

/* Selection styling */
::selection {
  @apply bg-blue-100;
}

pre {
  tab-size: 4;
}
</style>
