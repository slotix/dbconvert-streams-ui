<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { ArrowPathIcon, KeyIcon, LinkIcon } from '@heroicons/vue/24/outline'
import { type SQLTableMeta, type SQLColumnMeta, type SQLIndexMeta } from '@/types/metadata'
import SqlCodeBlock from './SqlCodeBlock.vue'
import DdlView from './DdlView.vue'

const props = defineProps<{
  tableMeta: SQLTableMeta
  connectionId: string
  connectionType: string
}>()

const emit = defineEmits<{
  (e: 'refresh-metadata'): void
}>()

const isLoading = ref(false)

function handleRefresh() {
  isLoading.value = true;
  emit('refresh-metadata');
  // Keep spinner for a short duration to provide visual feedback
  nextTick(() => {
    const timer = globalThis.setTimeout(() => {
      isLoading.value = false;
    }, 1000);
    return () => globalThis.clearTimeout(timer);
  });
}

const columns = computed(() => {
  const primaryKeys = new Set(props.tableMeta?.primaryKeys || [])

  const foreignKeyColumns = new Set(
    (props.tableMeta?.foreignKeys || []).map((fk: any) => {
      return fk.sourceColumn
    })
  )

  return (props.tableMeta?.columns || []).map(column => {
    const isPrimaryKey = primaryKeys.has(column.name)
    const isForeignKey = foreignKeyColumns.has(column.name)

    return {
      ...column,
      isPrimaryKey: isPrimaryKey,
      isForeignKey: isForeignKey
    }
  })
})

const foreignKeys = computed(() => {
  return (props.tableMeta?.foreignKeys || []).map((fk: any) => ({
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

// Add active tab tracking
const activeTabIndex = ref(0)

function getColumnType(column: SQLColumnMeta) {
  let type = column.dataType

  const length = column.length
  const precision = column.precision
  const scale = column.scale

  if (length?.Valid && length.Int64 !== null) {
    type += `(${length.Int64})`
  }
  else if (precision?.Valid && precision.Int64 !== null) {
    const precisionValue = precision.Int64
    const scaleStr = scale?.Valid && scale.Int64 !== null ? `,${scale.Int64}` : ''
    type += `(${precisionValue}${scaleStr})`
  }
  return type
}

function getColumnDefault(column: SQLColumnMeta) {
  const defaultValue = column.defaultValue
  if (!defaultValue) return '-'

  return defaultValue.Valid && defaultValue.String !== null
    ? defaultValue.String
    : '-'
}

function getColumnExtra(column: typeof columns.value[0]) {
  const extras = []
  if (column.autoIncrement) {
    extras.push('AUTO_INCREMENT')
  }
  if (column.isUnique) {
    extras.push('UNIQUE')
  }
  return extras.length > 0 ? extras.join(', ') : '-'
}
</script>

<template>
  <div :class="[
    'bg-white',
    $attrs.class ? $attrs.class : 'shadow-sm ring-1 ring-gray-900/5 rounded-lg'
  ]">
    <div class="px-4 py-3 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium leading-6 text-gray-900">
          {{ tableMeta?.name || '' }}
          <span v-if="tableMeta?.schema" class="text-sm text-gray-500">
            ({{ tableMeta.schema }})
          </span>
        </h3>
        <button type="button"
          class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          :disabled="isLoading" @click="handleRefresh">
          <ArrowPathIcon :class="['h-5 w-5 text-gray-400 mr-2', { 'animate-spin': isLoading }]" />
          Refresh Metadata
        </button>
      </div>
    </div>

    <div>
      <TabGroup v-model="activeTabIndex" as="div">
        <TabList class="flex space-x-1 border-b border-gray-200 px-4">
          <Tab v-for="tab in tabs" :key="tab.name" v-slot="{ selected }" as="template">
            <button :class="[
              'px-3 py-2 text-sm font-medium leading-5 text-gray-700 whitespace-nowrap',
              'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60',
              selected
                ? 'border-blue-500 text-blue-600 border-b-2 -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]">
              {{ tab.name }}
              <span :class="[
                'ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium',
                selected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-900'
              ]">
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
                        <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Column
                        </th>
                        <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Type</th>
                        <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Null</th>
                        <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Default
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 bg-white">
                      <tr v-for="column in columns" :key="column.name" class="hover:bg-gray-50">
                        <td class="whitespace-nowrap px-3 py-2 text-sm">
                          <div class="flex items-center">
                            <span class="font-medium text-gray-900">{{ column.name }}</span>
                            <div class="ml-2 flex items-center space-x-1">
                              <KeyIcon v-if="column.isPrimaryKey" class="h-4 w-4 text-amber-400" title="Primary Key" />
                              <LinkIcon v-if="column.isForeignKey" class="h-4 w-4 text-blue-400" title="Foreign Key" />
                            </div>
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
                  <li v-for="key in primaryKeys" :key="key" class="flex items-center justify-between gap-x-6 py-3">
                    <div class="flex min-w-0 gap-x-4">
                      <KeyIcon class="h-5 w-5 text-amber-400" />
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
                  <li v-for="key in foreignKeys" :key="key.name" class="flex items-center justify-between gap-x-6 py-3">
                    <div class="flex min-w-0 gap-x-4">
                      <LinkIcon class="h-5 w-5 text-blue-400" />
                      <div class="min-w-0 flex-auto">
                        <p class="text-sm font-semibold leading-6 text-gray-900">{{ key.name }}</p>
                        <p class="mt-1 truncate text-xs leading-5 text-gray-500">
                          {{ key.sourceColumn }} → {{ key.referencedTable }}.{{ key.referencedColumn }}
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
                        <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900">Columns</th>
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
            <DdlView :ddl="ddl" :connection-type="connectionType" @refresh-metadata="emit('refresh-metadata')" />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  </div>
</template>

<style>
/* Remove all the hljs styles since they're now in SqlCodeBlock.vue */
</style>