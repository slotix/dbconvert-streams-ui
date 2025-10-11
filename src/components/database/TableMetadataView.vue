<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { KeyIcon, LinkIcon } from '@heroicons/vue/24/outline'
import { type SQLTableMeta, type SQLColumnMeta } from '@/types/metadata'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import DdlView from './DdlView.vue'

// Define brand colors as constants for consistency (matching DatabaseDiagramD3.vue)
const BRAND_COLORS = {
  primary: '#00B2D6', // Teal/Cyan blue (from logo)
  secondary: '#F26627', // Orange (from logo)
  highlight: {
    blue: '#DBEAFE', // Light blue highlight
    orange: '#FFEDD5' // Light orange highlight
  }
}

// Define gray colors for tabs
// (header colors were managed by the container)

const props = defineProps<{
  tableMeta: SQLTableMeta
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

// Expose optional refresh method for parent container
defineExpose({ refresh: handleRefresh })

// Determine the SQL dialect based on connection type
const sqlDialect = computed(() => {
  return props.connectionType.toLowerCase()
})

const columns = computed(() => {
  const primaryKeys = new Set(props.tableMeta?.primaryKeys || [])

  const foreignKeyColumns = new Set(
    (props.tableMeta?.foreignKeys || []).map((fk: { sourceColumn: string }) => {
      return fk.sourceColumn
    })
  )

  return (props.tableMeta?.columns || []).map((column) => {
    const isPrimaryKey = primaryKeys.has(column.name)
    const isForeignKey = foreignKeyColumns.has(column.name)

    return {
      ...column,
      isPrimaryKey: isPrimaryKey,
      isForeignKey: isForeignKey
    }
  })
})

type FK = {
  name: string
  sourceColumn: string
  referencedTable: string
  referencedColumn: string
  onUpdate?: string
  onDelete?: string
}
const foreignKeys = computed(() => {
  return (props.tableMeta?.foreignKeys || []).map((fk: FK) => ({
    name: fk.name,
    sourceColumn: fk.sourceColumn,
    referencedTable: fk.referencedTable,
    referencedColumn: fk.referencedColumn,
    onUpdate: fk.onUpdate,
    onDelete: fk.onDelete
  }))
})

const indexes = computed(() => props.tableMeta?.indexes || [])
const primaryKeys = computed(() => props.tableMeta?.primaryKeys || [])
const ddl = computed(() => props.tableMeta?.ddl)

const tabs = computed(() => {
  const baseTabs = [
    { name: 'Columns', count: columns.value.length },
    { name: 'Keys', count: primaryKeys.value.length + foreignKeys.value.length },
    { name: 'Indexes', count: indexes.value.length }
  ]

  if (ddl.value) {
    baseTabs.push({
      name: 'DDL',
      count: (ddl.value.createIndexes?.length || 0) + 1
    })
  }

  return baseTabs
})

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

function getColumnType(column: SQLColumnMeta) {
  let type = column.dataType

  const length = column.length
  const precision = column.precision
  const scale = column.scale

  if (length?.Valid && length.Int64 !== null) {
    type += `(${length.Int64})`
  } else if (precision?.Valid && precision.Int64 !== null) {
    const precisionValue = precision.Int64
    const scaleStr = scale?.Valid && scale.Int64 !== null ? `,${scale.Int64}` : ''
    type += `(${precisionValue}${scaleStr})`
  }
  return type
}

function getColumnDefault(column: SQLColumnMeta) {
  const defaultValue = column.defaultValue
  if (!defaultValue) return '-'

  return defaultValue.Valid && defaultValue.String !== null ? defaultValue.String : '-'
}

function getColumnCheckConstraints(column: SQLColumnMeta): string {
  const constraints = column.checkConstraints
  if (!constraints || constraints.length === 0) return '-'

  // Format multiple constraints nicely
  return constraints
    .map((c) => {
      // Show constraint name if available, otherwise just the clause
      if (c.name) {
        return `${c.name}: ${c.clause}`
      }
      return c.clause
    })
    .join(' AND ')
}

// extra display removed for compactness
</script>

<template>
  <div
    :class="[
      'bg-white',
      $attrs.class ? $attrs.class : 'shadow-sm ring-1 ring-gray-900/5 rounded-lg'
    ]"
  >
    <!-- Header removed; DatabaseObjectContainer renders tabs, title, and actions -->

    <!-- HeadlessUI Tab Implementation with Store Integration -->
    <TabGroup :selectedIndex="activeTabIndex" as="div" @change="onSubTabChange">
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
                        class="px-3 py-2 text-left text-sm font-semibold text-gray-900 whitespace-nowrap"
                      >
                        Column
                      </th>
                      <th
                        class="px-3 py-2 text-left text-sm font-semibold text-gray-900 whitespace-nowrap"
                      >
                        Type
                      </th>
                      <th
                        class="px-3 py-2 text-left text-sm font-semibold text-gray-900 whitespace-nowrap"
                      >
                        Null
                      </th>
                      <th
                        class="px-3 py-2 text-left text-sm font-semibold text-gray-900 whitespace-nowrap"
                      >
                        Default
                      </th>
                      <th
                        class="px-3 py-2 text-left text-sm font-semibold text-gray-900 whitespace-nowrap"
                      >
                        Check constraints
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 bg-white">
                    <tr v-for="column in columns" :key="column.name" class="hover:bg-gray-50">
                      <td class="whitespace-nowrap px-3 py-2 text-sm">
                        <div class="flex items-center">
                          <div class="mr-2 flex items-center space-x-1">
                            <KeyIcon
                              v-if="column.isPrimaryKey"
                              :style="`color: ${BRAND_COLORS.primary}`"
                              class="h-4 w-4"
                              title="Primary Key"
                            />
                            <LinkIcon
                              v-if="column.isForeignKey"
                              :style="`color: ${BRAND_COLORS.secondary}`"
                              class="h-4 w-4"
                              title="Foreign Key"
                            />
                          </div>
                          <span class="font-medium text-gray-900">{{ column.name }}</span>
                        </div>
                      </td>
                      <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                        {{ getColumnType(column) }}
                      </td>
                      <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                        {{ column.isNullable ? 'Yes' : 'No' }}
                      </td>
                      <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                        {{ getColumnDefault(column) }}
                      </td>
                      <td
                        class="px-3 py-2 text-sm text-gray-500 max-w-xs truncate"
                        :title="getColumnCheckConstraints(column)"
                      >
                        {{ getColumnCheckConstraints(column) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabPanel>

        <!-- Keys Panel -->
        <TabPanel>
          <div class="space-y-8">
            <!-- Primary Keys -->
            <div v-if="primaryKeys.length > 0">
              <h4 class="text-sm font-medium text-gray-900 mb-4">Primary Keys</h4>
              <ul role="list" class="divide-y divide-gray-100">
                <li
                  v-for="key in primaryKeys"
                  :key="key"
                  class="flex items-center justify-between gap-x-6 py-3"
                >
                  <div class="flex min-w-0 gap-x-4">
                    <KeyIcon :style="`color: ${BRAND_COLORS.primary}`" class="h-5 w-5" />
                    <div class="min-w-0 flex-auto">
                      <p class="text-sm font-semibold leading-6 text-gray-900">{{ key }}</p>
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            <!-- Foreign Keys -->
            <div v-if="foreignKeys.length > 0">
              <h4 class="text-sm font-medium text-gray-900 mb-4">Foreign Keys</h4>
              <ul role="list" class="divide-y divide-gray-100">
                <li
                  v-for="key in foreignKeys"
                  :key="key.name"
                  class="flex items-center justify-between gap-x-6 py-3"
                >
                  <div class="flex min-w-0 gap-x-4">
                    <LinkIcon :style="`color: ${BRAND_COLORS.secondary}`" class="h-5 w-5" />
                    <div class="min-w-0 flex-auto">
                      <p class="text-sm font-semibold leading-6 text-gray-900">{{ key.name }}</p>
                      <p class="mt-1 truncate text-xs leading-5 text-gray-500">
                        {{ key.sourceColumn }} → {{ key.referencedTable }}.{{
                          key.referencedColumn
                        }}
                      </p>
                      <p class="mt-1 truncate text-xs leading-5 text-gray-500">
                        ON UPDATE {{ key.onUpdate }}, ON DELETE {{ key.onDelete }}
                      </p>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </TabPanel>

        <!-- Indexes Panel -->
        <TabPanel>
          <div class="overflow-x-auto">
            <div class="inline-block min-w-full align-middle">
              <div class="overflow-hidden ring-1 ring-gray-200 rounded-lg">
                <table class="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr class="bg-gray-50">
                      <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900">
                        Columns
                      </th>
                      <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900">Type</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 bg-white">
                    <tr v-for="index in indexes" :key="index.name" class="hover:bg-gray-50">
                      <td class="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900">
                        {{ index.name }}
                      </td>
                      <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                        {{ index.columns.join(', ') }}
                      </td>
                      <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                        {{ index.type }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabPanel>

        <!-- DDL Panel -->
        <TabPanel v-if="ddl">
          <DdlView
            :ddl="ddl"
            :connection-type="connectionType"
            :dialect="sqlDialect"
            @refresh-metadata="emit('refresh-metadata')"
          />
        </TabPanel>
      </TabPanels>
    </TabGroup>
  </div>
</template>

<style>
/* Remove all the hljs styles since they're now in SqlCodeBlock.vue */
</style>
