<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { Key, Link } from 'lucide-vue-next'
import { type SQLTableMeta, type SQLColumnMeta, type SQLTriggerMeta } from '@/types/metadata'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
import { formatDataSize } from '@/utils/formats'
import { getSqlDialectFromType } from '@/types/specs'
import DdlView from './DdlView.vue'
import TriggerDefinitionView from './TriggerDefinitionView.vue'

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
const navigationStore = useExplorerNavigationStore()

const isLoading = ref(false)
const showAdvancedColumns = ref(false)

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
const sqlDialect = computed(() => getSqlDialectFromType(props.connectionType))

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
  referencedSchema?: string
  referencedTable: string
  referencedColumn: string
  onUpdate?: string
  onDelete?: string
}
const foreignKeys = computed(() => {
  return (props.tableMeta?.foreignKeys || []).map((fk: FK) => ({
    name: fk.name,
    sourceColumn: fk.sourceColumn,
    referencedSchema: fk.referencedSchema,
    referencedTable: fk.referencedTable,
    referencedColumn: fk.referencedColumn,
    onUpdate: fk.onUpdate,
    onDelete: fk.onDelete
  }))
})

const indexes = computed(() => props.tableMeta?.indexes || [])
const primaryKeys = computed(() => props.tableMeta?.primaryKeys || [])
const ddl = computed(() => props.tableMeta?.ddl)
const partitions = computed(() => props.tableMeta?.partitions || [])
const isPartitioned = computed(() => props.tableMeta?.isPartitioned || false)
const partitionStrategy = computed(() => props.tableMeta?.partitionStrategy || '')
const tableTriggers = computed<SQLTriggerMeta[]>(() => {
  const metadata = navigationStore.getMetadata(props.connectionId, props.tableMeta.database)
  if (!metadata?.triggers) return []
  const tableName = props.tableMeta.name
  const schemaName = props.tableMeta.schema || ''

  return Object.values(metadata.triggers)
    .filter((trigger) => {
      if ((trigger.schema || '') !== schemaName) return false
      return trigger.tableName === tableName
    })
    .sort((a, b) => a.name.localeCompare(b.name))
})

const tabs = computed(() => {
  const baseTabs = [
    { name: 'Columns', count: columns.value.length },
    { name: 'Keys', count: primaryKeys.value.length + foreignKeys.value.length },
    { name: 'Indexes', count: indexes.value.length }
  ]

  if (tableTriggers.value.length > 0) {
    baseTabs.push({ name: 'Triggers', count: tableTriggers.value.length })
  }

  // Add Partitions tab only if table is partitioned
  if (isPartitioned.value && partitions.value.length > 0) {
    baseTabs.push({ name: 'Partitions', count: partitions.value.length })
  }

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

function parseSqlStringLiteralList(input: string): string[] | null {
  // Parses a comma-separated list of single-quoted SQL string literals.
  // Example: `'a','b','c'` -> ["a","b","c"]. Handles doubled quotes: `''`.
  const s = input.trim()
  const out: string[] = []
  let i = 0

  const skipSpaces = () => {
    while (i < s.length && /\s/.test(s[i])) i++
  }

  while (i < s.length) {
    skipSpaces()
    if (i >= s.length) break
    if (s[i] !== "'") return null
    i++

    let buf = ''
    while (i < s.length) {
      const ch = s[i]
      if (ch === "'") {
        // doubled single-quote escape
        if (i + 1 < s.length && s[i + 1] === "'") {
          buf += "'"
          i += 2
          continue
        }
        i++
        break
      }
      buf += ch
      i++
    }

    out.push(buf)
    skipSpaces()
    if (i >= s.length) break
    if (s[i] === ',') {
      i++
      continue
    }
    return null
  }

  return out
}

function getEnumSetInfo(column: SQLColumnMeta): { kind: 'enum' | 'set'; values: string[] } | null {
  // Postgres: enumValues are already decoded.
  if (column.enumValues && column.enumValues.length > 0) {
    return { kind: 'enum', values: column.enumValues }
  }

  // MySQL: infer from columnType (raw) but do not display it.
  const ct = (column.columnType || '').trim()
  if (!ct) return null
  const lower = ct.toLowerCase()

  const isEnum = lower.startsWith('enum(')
  const isSet = lower.startsWith('set(')
  if (!isEnum && !isSet) return null

  const open = ct.indexOf('(')
  const close = ct.lastIndexOf(')')
  if (open < 0 || close <= open) return null

  const inside = ct.slice(open + 1, close)
  const values = parseSqlStringLiteralList(inside)
  if (!values || values.length === 0) return null
  return { kind: isSet ? 'set' : 'enum', values }
}

function formatEnumSetSummary(values: string[], maxShown = 4): string {
  if (!values.length) return ''
  if (values.length <= maxShown) return values.join(', ')
  const shown = values.slice(0, maxShown).join(', ')
  return `${shown} +${values.length - maxShown} more`
}

function getEnumSetLabel(column: SQLColumnMeta): string {
  const info = getEnumSetInfo(column)
  if (!info) return ''
  return info.kind.toUpperCase()
}

function getEnumSetSummary(column: SQLColumnMeta): string {
  const info = getEnumSetInfo(column)
  if (!info) return ''
  return formatEnumSetSummary(info.values)
}

function getEnumSetTitle(column: SQLColumnMeta): string {
  const info = getEnumSetInfo(column)
  if (!info) return ''
  return info.values.join(', ')
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

function getAdvancedColumnMetaSummary(column: SQLColumnMeta): string {
  const parts: string[] = []

  const characterSet = (column.characterSet || '').trim()
  if (characterSet) parts.push(`Charset: ${characterSet}`)

  const collation = (column.collation || '').trim()
  if (collation) parts.push(`Collation: ${collation}`)

  const dataType = (column.dataType || '').trim().toLowerCase()
  const udtName = (column.udtName || '').trim()
  if (udtName && udtName.toLowerCase() !== dataType) {
    parts.push(`UDT: ${udtName}`)
  }

  const domainBaseType = (column.domainBaseType || '').trim()
  if (domainBaseType && domainBaseType.toLowerCase() !== dataType) {
    parts.push(`Domain base: ${domainBaseType}`)
  }

  return parts.join(' · ')
}

// extra display removed for compactness
</script>

<template>
  <div
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
          <div class="mb-3 flex items-center justify-end">
            <button
              type="button"
              class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset transition-colors"
              :class="
                showAdvancedColumns
                  ? 'bg-gray-100 text-gray-900 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700'
                  : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50 dark:bg-gray-850 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800'
              "
              :aria-pressed="showAdvancedColumns"
              @click="showAdvancedColumns = !showAdvancedColumns"
            >
              Advanced
            </button>
          </div>

          <div class="overflow-x-auto">
            <div class="min-w-[640px]">
              <div class="ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg">
                <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                  <thead>
                    <tr class="bg-gray-50 dark:bg-gray-900">
                      <th
                        class="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap"
                      >
                        Column
                      </th>
                      <th
                        class="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap"
                      >
                        Type
                      </th>
                      <th
                        class="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap"
                      >
                        Null
                      </th>
                      <th
                        class="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap"
                      >
                        Default
                      </th>
                      <th
                        class="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap"
                      >
                        Check constraints
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-850"
                  >
                    <tr
                      v-for="column in columns"
                      :key="column.name"
                      class="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td class="whitespace-nowrap px-3 py-2 text-sm">
                        <div class="flex items-center">
                          <div class="mr-2 flex items-center space-x-1">
                            <Key
                              v-if="column.isPrimaryKey"
                              :style="`color: ${BRAND_COLORS.primary}`"
                              class="h-4 w-4"
                              title="Primary Key"
                            />
                            <Link
                              v-if="column.isForeignKey"
                              :style="`color: ${BRAND_COLORS.secondary}`"
                              class="h-4 w-4"
                              title="Foreign Key"
                            />
                          </div>
                          <span class="font-medium text-gray-900 dark:text-gray-100">{{
                            column.name
                          }}</span>
                        </div>
                      </td>

                      <td class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        <div class="leading-5">
                          <div class="flex items-center gap-2">
                            <span class="whitespace-nowrap">{{ getColumnType(column) }}</span>
                            <span
                              v-if="column.isUnsigned"
                              class="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700/50"
                            >
                              UNSIGNED
                            </span>
                          </div>
                          <div
                            v-if="getEnumSetSummary(column)"
                            class="mt-0.5 text-xs text-gray-400 dark:text-gray-500 max-w-[420px] truncate"
                            :title="getEnumSetTitle(column)"
                          >
                            <span
                              class="mr-1 inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 ring-1 ring-inset ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700"
                            >
                              {{ getEnumSetLabel(column) }}
                            </span>
                            {{ getEnumSetSummary(column) }}
                          </div>

                          <div
                            v-if="showAdvancedColumns && getAdvancedColumnMetaSummary(column)"
                            class="mt-0.5 text-xs text-gray-400 dark:text-gray-500 max-w-[420px] truncate"
                            :title="getAdvancedColumnMetaSummary(column)"
                          >
                            {{ getAdvancedColumnMetaSummary(column) }}
                          </div>
                        </div>
                      </td>

                      <td
                        class="whitespace-nowrap px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
                      >
                        {{ column.isNullable ? 'Yes' : 'No' }}
                      </td>
                      <td
                        class="whitespace-nowrap px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
                      >
                        {{ getColumnDefault(column) }}
                      </td>
                      <td
                        class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate"
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
              <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
                Primary Keys
              </h4>
              <ul role="list" class="divide-y divide-gray-100 dark:divide-gray-700">
                <li
                  v-for="key in primaryKeys"
                  :key="key"
                  class="flex items-center justify-between gap-x-6 py-3"
                >
                  <div class="flex min-w-0 gap-x-4">
                    <Key :style="`color: ${BRAND_COLORS.primary}`" class="h-5 w-5" />
                    <div class="min-w-0 flex-auto">
                      <p class="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                        {{ key }}
                      </p>
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            <!-- Foreign Keys -->
            <div v-if="foreignKeys.length > 0">
              <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
                Foreign Keys
              </h4>
              <ul role="list" class="divide-y divide-gray-100 dark:divide-gray-700">
                <li
                  v-for="key in foreignKeys"
                  :key="key.name"
                  class="flex items-center justify-between gap-x-6 py-3"
                >
                  <div class="flex min-w-0 gap-x-4">
                    <Link :style="`color: ${BRAND_COLORS.secondary}`" class="h-5 w-5" />
                    <div class="min-w-0 flex-auto">
                      <p class="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                        {{ key.name }}
                      </p>
                      <p class="mt-1 truncate text-xs leading-5 text-gray-500 dark:text-gray-400">
                        <span>{{ key.sourceColumn }} → </span>
                        <span v-if="key.referencedSchema">{{ key.referencedSchema }}.</span>
                        <span>{{ key.referencedTable }}.{{ key.referencedColumn }}</span>
                      </p>
                      <p class="mt-1 truncate text-xs leading-5 text-gray-500 dark:text-gray-400">
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
              <div class="overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg">
                <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                  <thead>
                    <tr class="bg-gray-50 dark:bg-gray-900">
                      <th
                        class="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
                      >
                        Name
                      </th>
                      <th
                        class="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
                      >
                        Columns
                      </th>
                      <th
                        class="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
                      >
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-850"
                  >
                    <tr
                      v-for="index in indexes"
                      :key="index.name"
                      class="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td
                        class="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100"
                      >
                        {{ index.name }}
                      </td>
                      <td
                        class="whitespace-nowrap px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
                      >
                        {{ index.columns.join(', ') }}
                      </td>
                      <td
                        class="whitespace-nowrap px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
                      >
                        {{ index.type }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabPanel>

        <!-- Triggers Panel -->
        <TabPanel v-if="tableTriggers.length">
          <div class="space-y-4">
            <div
              v-for="trigger in tableTriggers"
              :key="`${trigger.schema || 'default'}:${trigger.name}`"
              class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 overflow-hidden shadow-sm"
            >
              <TriggerDefinitionView
                :trigger-meta="trigger"
                :connection-type="connectionType"
                :show-context="false"
              />
            </div>
          </div>
        </TabPanel>

        <!-- Partitions Panel -->
        <TabPanel v-if="isPartitioned && partitions.length > 0">
          <div class="mb-4">
            <div
              class="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800"
            >
              <div class="flex">
                <div class="shrink-0">
                  <svg
                    class="h-5 w-5 text-blue-400 dark:text-blue-300"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Partitioned Table
                  </h3>
                  <div class="mt-2 text-sm text-blue-700 dark:text-blue-300">
                    <p>
                      This table uses <strong>{{ partitionStrategy }}</strong> partitioning strategy
                      with {{ partitions.length }}
                      {{ partitions.length === 1 ? 'partition' : 'partitions' }}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto">
            <div class="inline-block min-w-full align-middle">
              <div class="overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg">
                <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                  <thead>
                    <tr class="bg-gray-50 dark:bg-gray-900">
                      <th
                        class="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
                      >
                        Partition Name
                      </th>
                      <th
                        class="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
                      >
                        Bounds/Values
                      </th>
                      <th
                        class="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-gray-100"
                      >
                        Rows
                      </th>
                      <th
                        class="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-gray-100"
                      >
                        Size
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-850"
                  >
                    <tr
                      v-for="partition in partitions"
                      :key="partition.name"
                      class="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td
                        class="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100"
                      >
                        {{ partition.name }}
                        <span
                          v-if="partition.isDefault"
                          class="ml-2 inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300"
                        >
                          DEFAULT
                        </span>
                      </td>
                      <td class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        <code
                          class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono"
                        >
                          {{ partition.values || 'N/A' }}
                        </code>
                      </td>
                      <td
                        class="whitespace-nowrap px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-right"
                      >
                        {{ partition.approxRows.toLocaleString() }}
                      </td>
                      <td
                        class="whitespace-nowrap px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-right"
                      >
                        {{ formatDataSize(partition.sizeBytes) }}
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
