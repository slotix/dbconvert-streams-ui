<script setup lang="ts">
import { computed } from 'vue'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { type SQLTableMeta } from '@/types/metadata'

const props = defineProps<{
  tableMeta: SQLTableMeta
  showDdl?: boolean
  connectionId: string
}>()

const emit = defineEmits<{
  (e: 'refresh-metadata'): void
}>()

const columns = computed(() => props.tableMeta?.Columns || [])
const indexes = computed(() => props.tableMeta?.Indexes || [])
const primaryKeys = computed(() => props.tableMeta?.PrimaryKeys || [])
const ddl = computed(() => props.tableMeta?.DDL)

const tabs = computed(() => {
  const baseTabs = [
    { name: 'Columns', count: columns.value.length },
    { name: 'Indexes', count: indexes.value.length },
    { name: 'Primary Keys', count: primaryKeys.value.length }
  ]

  if (props.showDdl && ddl.value) {
    baseTabs.push({
      name: 'DDL',
      count: (ddl.value.createIndexes?.length || 0) + 1
    })
  }

  return baseTabs
})

function getColumnType(column: typeof columns.value[0]) {
  let type = column.DataType
  if (column.Length.Valid) {
    type += `(${column.Length.Int64})`
  } else if (column.Precision.Valid) {
    type += `(${column.Precision.Int64}${column.Scale.Valid ? `,${column.Scale.Int64}` : ''})`
  }
  return type
}

function getColumnDefault(column: typeof columns.value[0]) {
  return column.DefaultValue.Valid ? column.DefaultValue.String : '-'
}

function getColumnExtra(column: typeof columns.value[0]) {
  const extras = []
  if (column.AutoIncrement) {
    extras.push('AUTO_INCREMENT')
  }
  if (column.IsUnique) {
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
          Table Structure: {{ tableMeta?.Name || '' }}
          <span v-if="tableMeta?.Schema" class="text-sm text-gray-500">
            ({{ tableMeta.Schema }})
          </span>
        </h3>
        <button type="button"
          class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          @click="emit('refresh-metadata')">
          <ArrowPathIcon class="h-5 w-5 text-gray-400 mr-2" />
          Refresh Metadata
        </button>
      </div>
    </div>

    <TabGroup>
      <TabList class="flex space-x-1 border-b border-gray-200 px-4">
        <Tab v-for="tab in tabs" :key="tab.name" v-slot="{ selected }" as="template">
          <button :class="[
            'px-3 py-2 text-sm font-medium leading-5 text-gray-700',
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
            <table class="min-w-full divide-y divide-gray-300">
              <thead>
                <tr class="bg-gray-50">
                  <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900">Nullable</th>
                  <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900">Default</th>
                  <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900">Extra</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="column in columns" :key="column.Name">
                  <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-900">
                    <div class="flex items-center">
                      <span :class="{ 'font-semibold': column.IsPrimaryKey }">{{ column.Name }}</span>
                      <span v-if="column.IsPrimaryKey" class="ml-2 text-xs text-blue-600">(PK)</span>
                    </div>
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                    {{ getColumnType(column) }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-sm">
                    <span :class="[
                      'inline-flex rounded-full px-2 text-xs font-medium leading-5',
                      column.IsNullable ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-800'
                    ]">
                      {{ column.IsNullable ? 'NULL' : 'NOT NULL' }}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                    {{ getColumnDefault(column) }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                    {{ getColumnExtra(column) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabPanel>

        <!-- Indexes Panel -->
        <TabPanel>
          <div class="space-y-4">
            <div v-for="index in indexes" :key="index.Name" class="bg-gray-50 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium text-gray-900">
                  {{ index.Name }}
                  <span v-if="index.IsPrimary"
                    class="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    Primary
                  </span>
                  <span v-if="index.IsUnique"
                    class="ml-2 inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                    Unique
                  </span>
                </h4>
                <span
                  class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                  {{ index.Type }}
                </span>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <span v-for="column in index.Columns" :key="column"
                  class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                  {{ column }}
                </span>
              </div>
            </div>
          </div>
        </TabPanel>

        <!-- Primary Keys Panel -->
        <TabPanel>
          <div class="space-y-2">
            <div v-for="pk in primaryKeys" :key="pk" class="flex items-center space-x-2 bg-gray-50 rounded-lg p-3">
              <span class="text-sm text-gray-900">{{ pk }}</span>
            </div>
          </div>
        </TabPanel>

        <!-- DDL Panel -->
        <TabPanel v-if="showDdl && ddl">
          <div class="space-y-4">
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-900 mb-2">Create Table</h4>
              <pre class="text-sm text-gray-600 overflow-x-auto whitespace-pre-wrap">{{ ddl.createTable }}</pre>
            </div>
            <div v-if="ddl.createIndexes?.length" class="bg-gray-50 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-900 mb-2">Create Indexes</h4>
              <pre v-for="(indexDdl, index) in ddl.createIndexes" :key="index"
                class="text-sm text-gray-600 overflow-x-auto whitespace-pre-wrap mt-2">{{ indexDdl }}</pre>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </TabGroup>
  </div>
</template>