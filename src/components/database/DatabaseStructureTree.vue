<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRightIcon, ChevronDownIcon, TableCellsIcon, KeyIcon } from '@heroicons/vue/24/outline'
import { type DatabaseMetadata, type SQLTableMeta } from '@/types/metadata'

const props = defineProps<{
  metadata: DatabaseMetadata
}>()

const expandedSchemas = ref(new Set<string>())
const selectedTableName = ref<string>()

interface TreeNode {
  name: string
  type: 'schema' | 'table'
  children: TreeNode[]
  meta?: SQLTableMeta
}

const treeData = computed<TreeNode[]>(() => {
  if (!props.metadata || typeof props.metadata !== 'object') {
    return []
  }

  const schemaMap = new Map<string, TreeNode>()

  // Convert metadata to plain object to avoid proxy issues
  const metadataEntries = Object.entries(props.metadata).filter(([key, value]) =>
    typeof value === 'object' && value !== null && !Object.getOwnPropertySymbols(value).length
  )

  // Process each table
  metadataEntries.forEach(([tableName, tableMeta]) => {
    const schemaName = (tableMeta?.Type?.toLowerCase?.() === 'mysql') ? '' : (tableMeta?.Schema || 'public')

    if (!schemaMap.has(schemaName)) {
      schemaMap.set(schemaName, {
        name: schemaName,
        type: 'schema',
        children: [],
      })
      // Auto-expand MySQL (empty schema) and public schema
      if (!schemaName || schemaName === 'public') {
        expandedSchemas.value.add(schemaName)
      }
    }

    const schema = schemaMap.get(schemaName)!
    if (!schema.children) {
      schema.children = []
    }

    if (tableMeta && typeof tableMeta === 'object') {
      schema.children.push({
        name: tableMeta.Name || tableName,
        type: 'table',
        children: [],
        meta: tableMeta,
      })
    }
  })

  // Sort schemas and tables
  const sortedData = Array.from(schemaMap.values())
    .sort((a, b) => {
      const nameA = String(a.name || '')
      const nameB = String(b.name || '')
      if (!nameA) return -1 // Empty schema (MySQL) comes first
      if (!nameB) return 1
      if (nameA === 'public') return -1
      if (nameB === 'public') return 1
      return nameA.localeCompare(nameB)
    })
    .map(schema => ({
      ...schema,
      children: schema.children?.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))) || []
    }))

  return sortedData
})

const emit = defineEmits<{
  (e: 'select', table: SQLTableMeta): void
}>()

function toggleSchema(schema: TreeNode) {
  const schemaName = schema.name
  if (expandedSchemas.value.has(schemaName)) {
    expandedSchemas.value.delete(schemaName)
  } else {
    expandedSchemas.value.add(schemaName)
  }
}

function isSchemaExpanded(schemaName: string): boolean {
  return expandedSchemas.value.has(schemaName)
}

function handleTableSelect(table: TreeNode) {
  if (table.meta) {
    selectedTableName.value = table.name
    emit('select', table.meta)
  }
}
</script>

<template>
  <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg divide-y divide-gray-200">
    <div class="px-4 py-3">
      <h3 class="text-base font-semibold leading-6 text-gray-900">Database Structure</h3>
    </div>

    <div class="p-4">
      <div v-if="treeData.length === 0" class="text-center text-gray-500 py-4">
        No tables found
      </div>
      <div v-else class="space-y-1">
        <template v-for="schema in treeData" :key="schema.name">
          <!-- Schema (only show if has name - i.e. not MySQL) -->
          <div v-if="schema.name"
            class="flex items-center px-2 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer"
            @click="toggleSchema(schema)">
            <component :is="isSchemaExpanded(schema.name) ? ChevronDownIcon : ChevronRightIcon"
              class="h-4 w-4 text-gray-400 mr-1.5 flex-shrink-0" />
            <span class="font-medium">{{ schema.name }}</span>
            <span class="ml-2 text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
              {{ schema.children?.length || 0 }}
            </span>
          </div>

          <!-- Tables -->
          <div v-if="isSchemaExpanded(schema.name)" :class="[
            'space-y-1',
            schema.name ? 'ml-4 border-l border-gray-200' : '' // Only indent if has schema
          ]">
            <div v-for="table in schema.children" :key="table.name"
              class="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer" :class="[
                selectedTableName === table.name ? 'bg-blue-50 text-blue-700' : 'text-gray-600',
                { 'ml-2': schema.name }
              ]" @click="handleTableSelect(table)">
              <TableCellsIcon class="h-4 w-4 mr-1.5 flex-shrink-0"
                :class="selectedTableName === table.name ? 'text-blue-500' : 'text-gray-400'" />
              <span>{{ table.name }}</span>
              <KeyIcon v-if="table.meta?.PrimaryKeys?.length" class="h-4 w-4 ml-1.5 flex-shrink-0"
                :class="selectedTableName === table.name ? 'text-blue-500' : 'text-blue-400'" />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>