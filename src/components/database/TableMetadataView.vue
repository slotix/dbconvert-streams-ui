<script setup lang="ts">
import { computed, ref } from 'vue'
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

// Add active tab tracking
const activeTabIndex = ref(0)

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
                          <div class="flex items-center">
                            <span class="font-medium text-gray-900">{{ column.Name }}</span>
                            <div class="ml-2 flex items-center space-x-1">
                              <KeyIcon v-if="column.IsPrimaryKey" class="h-4 w-4 text-amber-400" title="Primary Key" />
                              <LinkIcon v-if="column.IsForeignKey" class="h-4 w-4 text-blue-400" title="Foreign Key" />
                            </div>
                          </div>
                        </td>
                        <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                          {{ getColumnType(column) }}
                        </td>
                        <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                          {{ column.IsNullable ? 'Yes' : 'No' }}
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
                      <tr v-for="index in indexes" :key="index.Name" class="hover:bg-gray-50">
                        <td class="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900">
                          {{ index.Name }}
                        </td>
                        <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                          {{ index.Columns.join(', ') }}
                        </td>
                        <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                          {{ index.Type }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- DDL Panel -->
          <TabPanel v-if="showDdl && ddl">
            <div class="space-y-8">
              <!-- Create Table -->
              <div>
                <h4 class="text-sm font-medium text-gray-900 mb-4">Create Table</h4>
                <div class="overflow-x-auto">
                  <pre v-highlightjs
                    class="hljs rounded-md p-4"><code class="language-sql">{{ ddl.createTable }}</code></pre>
                </div>
              </div>

              <!-- Create Indexes -->
              <div v-if="ddl.createIndexes?.length">
                <h4 class="text-sm font-medium text-gray-900 mb-4">Create Indexes</h4>
                <div v-for="(indexDdl, i) in ddl.createIndexes" :key="i" class="overflow-x-auto mt-4">
                  <pre v-highlightjs class="hljs rounded-md p-4"><code class="language-sql">{{ indexDdl }}</code></pre>
                </div>
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  </div>
</template>

<style>
.hljs {
  @apply bg-gray-800;
  color: #abb2bf;
}

/* Add styles to ensure proper background colors */
.hljs-keyword {
  @apply text-purple-400;
}

.hljs-string {
  @apply text-green-400;
}

.hljs-number {
  @apply text-orange-400;
}

.hljs-operator {
  @apply text-sky-400;
}

.hljs-punctuation {
  @apply text-gray-400;
}

.hljs-comment {
  @apply text-gray-500;
}
</style>