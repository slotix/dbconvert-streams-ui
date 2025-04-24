<script setup lang="ts">
import { computed } from 'vue'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { ArrowPathIcon, KeyIcon, LinkIcon } from '@heroicons/vue/24/outline'
import { type SQLTableMeta } from '@/types/metadata'

const props = defineProps<{
  tableMeta: SQLTableMeta
  showDdl?: boolean
  connectionId: string
}>()

const emit = defineEmits<{
  (e: 'refresh-metadata'): void
}>()

const columns = computed(() => {
  const primaryKeys = new Set(props.tableMeta?.PrimaryKeys || [])

  const foreignKeyColumns = new Set(
    ((props.tableMeta as any)?.foreignKeys || []).map((fk: any) => {
      return fk.sourceColumn
    })
  )

  return (props.tableMeta?.Columns || []).map(column => {
    const isPrimaryKey = primaryKeys.has(column.Name)
    const isForeignKey = foreignKeyColumns.has(column.Name)

    return {
      ...column,
      IsPrimaryKey: isPrimaryKey,
      IsForeignKey: isForeignKey
    }
  })
})

const foreignKeys = computed(() => {
  return ((props.tableMeta as any)?.foreignKeys || []).map((fk: any) => ({
    name: fk.name,
    sourceColumn: fk.sourceColumn,
    referencedTable: fk.referencedTable,
    referencedColumn: fk.referencedColumn,
    onUpdate: fk.onUpdate,
    onDelete: fk.onDelete
  }))
})

const indexes = computed(() => props.tableMeta?.Indexes || [])
const primaryKeys = computed(() => props.tableMeta?.PrimaryKeys || [])
const ddl = computed(() => props.tableMeta?.DDL)

const tabs = computed(() => {
  const baseTabs = [
    { name: 'Columns', count: columns.value.length },
    { name: 'Keys', count: primaryKeys.value.length + foreignKeys.value.length },
    { name: 'Indexes', count: indexes.value.length }
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
          {{ tableMeta?.Name || '' }}
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
            <div class="inline-block min-w-full align-middle">
              <div class="overflow-hidden ring-1 ring-gray-200 rounded-lg">
                <table class="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr class="bg-gray-50">
                      <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900">Column</th>
                      <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900">Type</th>
                      <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900">Null</th>
                      <th class="px-3 py-2 text-left text-sm font-semibold text-gray-900">Default</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 bg-white">
                    <tr v-for="column in columns" :key="column.Name" class="hover:bg-gray-50">
                      <td class="whitespace-nowrap px-3 py-2 text-sm">
                        <div class="flex items-center space-x-1.5">
                          <KeyIcon v-if="column.IsPrimaryKey" class="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <LinkIcon v-else-if="column.IsForeignKey" class="h-4 w-4 text-purple-600 flex-shrink-0" />
                          <span :class="{
                            'font-semibold text-blue-700': column.IsPrimaryKey,
                            'font-medium text-purple-700': !column.IsPrimaryKey && column.IsForeignKey,
                            'text-gray-900': !column.IsPrimaryKey && !column.IsForeignKey
                          }">{{ column.Name }}</span>
                        </div>
                      </td>
                      <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                        {{ getColumnType(column) }}
                      </td>
                      <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                        <input type="checkbox" :checked="column.IsNullable" disabled
                          class="h-4 w-4 rounded border-gray-300 text-gray-400 cursor-not-allowed" />
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
          <div class="space-y-6">
            <!-- Primary Keys Section -->
            <div>
              <h4 class="text-sm font-medium text-gray-900 mb-3">Primary Keys</h4>
              <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <div v-for="pk in primaryKeys" :key="pk" class="flex items-center space-x-2 bg-blue-50 rounded-lg p-3">
                  <KeyIcon class="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span class="text-sm font-medium text-blue-900">{{ pk }}</span>
                </div>
              </div>
            </div>

            <!-- Foreign Keys Section -->
            <div>
              <h4 class="text-sm font-medium text-gray-900 mb-3">Foreign Keys</h4>
              <div class="space-y-3">
                <div v-for="fk in foreignKeys" :key="fk.name" class="bg-purple-50 rounded-lg p-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <LinkIcon class="h-4 w-4 text-purple-600 flex-shrink-0" />
                      <span class="text-sm font-medium text-purple-900">{{ fk.name }}</span>
                    </div>
                  </div>
                  <div class="mt-2 text-sm text-purple-800">
                    <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>Source Column:</div>
                      <div class="font-medium">{{ fk.sourceColumn }}</div>
                      <div>References:</div>
                      <div class="font-medium">{{ fk.referencedTable }}.{{ fk.referencedColumn }}</div>
                      <div>On Update:</div>
                      <div class="font-medium">{{ fk.onUpdate || 'NO ACTION' }}</div>
                      <div>On Delete:</div>
                      <div class="font-medium">{{ fk.onDelete || 'NO ACTION' }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>

        <!-- Indexes Panel -->
        <TabPanel>
          <div class="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            <div v-for="index in indexes" :key="index.Name"
              class="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
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

        <!-- DDL Panel -->
        <TabPanel v-if="showDdl && ddl">
          <div class="space-y-4">
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-900 mb-2">Create Table</h4>
              <div class="overflow-x-auto">
                <pre class="text-sm text-gray-600 whitespace-pre-wrap">{{ ddl.createTable }}</pre>
              </div>
            </div>
            <div v-if="ddl.createIndexes?.length" class="bg-gray-50 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-900 mb-2">Create Indexes</h4>
              <div class="overflow-x-auto">
                <pre v-for="(indexDdl, index) in ddl.createIndexes" :key="index"
                  class="text-sm text-gray-600 whitespace-pre-wrap mt-2">{{ indexDdl }}</pre>
              </div>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </TabGroup>
  </div>
</template>