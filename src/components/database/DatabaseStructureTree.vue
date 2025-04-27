<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChevronRightIcon,
  ChevronDownIcon,
  TableCellsIcon,
  ViewfinderCircleIcon,
  ListBulletIcon,
  RectangleStackIcon,
  Square2StackIcon,
  Squares2X2Icon,
  RectangleGroupIcon,
  EyeIcon,
  PresentationChartLineIcon,
  ChartBarIcon,
  WindowIcon,
  QueueListIcon
} from '@heroicons/vue/24/outline'
import { type DatabaseMetadata } from '@/types/metadata'

const props = defineProps<{
  metadata: DatabaseMetadata
  selectedName: string | null
  selectedType: 'table' | 'view' | null
}>()

const emit = defineEmits<{
  (e: 'select', name: string, type: 'table' | 'view'): void
}>()

const expandedSchemas = ref(new Set<string>())

interface TreeNode {
  name: string
  type: 'schema' | 'table' | 'view'
  children: TreeNode[]
  schema?: string
}

const treeData = computed<TreeNode[]>(() => {
  // Return empty array if metadata is not properly initialized
  if (!props.metadata?.tables && !props.metadata?.views) {
    return []
  }

  const schemaMap = new Map<string, TreeNode>()

  // Helper function to ensure schema exists
  function ensureSchema(schemaName: string) {
    if (!schemaMap.has(schemaName)) {
      schemaMap.set(schemaName, {
        name: schemaName,
        type: 'schema',
        children: []
      })
      // Auto-expand MySQL (empty schema) and public schema
      if (!schemaName || schemaName === 'public') {
        expandedSchemas.value.add(schemaName)
      }
    }
    return schemaMap.get(schemaName)!
  }

  // Process tables
  if (props.metadata.tables) {
    Object.entries(props.metadata.tables).forEach(([tableName, tableMeta]) => {
      if (tableMeta) {
        const schemaName = tableMeta.schema || ''
        const schema = ensureSchema(schemaName)
        schema.children.push({
          name: tableMeta.name || tableName,
          type: 'table',
          children: [],
          schema: schemaName
        })
      }
    })
  }

  // Process views
  if (props.metadata.views) {
    Object.entries(props.metadata.views).forEach(([viewName, viewMeta]) => {
      if (viewMeta) {
        const schemaName = viewMeta.schema || ''
        const schema = ensureSchema(schemaName)
        schema.children.push({
          name: viewMeta.name || viewName,
          type: 'view',
          children: [],
          schema: schemaName
        })
      }
    })
  }

  // Sort schemas and their children
  return Array.from(schemaMap.values())
    .sort((a, b) => {
      if (!a.name) return -1 // Empty schema (MySQL) comes first
      if (!b.name) return 1
      if (a.name === 'public') return -1
      if (b.name === 'public') return 1
      return (a.name || '').localeCompare(b.name || '')
    })
    .map((schema) => ({
      ...schema,
      children: schema.children.sort((a, b) => {
        // Sort by type first (tables before views), then by name
        if (a.type !== b.type) {
          return a.type === 'table' ? -1 : 1
        }
        return (a.name || '').localeCompare(b.name || '')
      })
    }))
})

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

function handleObjectSelect(item: TreeNode) {
  if (item.type === 'table' || item.type === 'view') {
    emit('select', item.name, item.type)
  }
}

function isSelected(item: TreeNode): boolean {
  return item.name === props.selectedName && item.type === props.selectedType
}
</script>

<template>
  <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg divide-y divide-gray-200">
    <div class="px-14 py-3">
      <h3 class="text-base font-semibold leading-6 text-gray-900">Database Objects</h3>
    </div>

    <div class="p-4">
      <div v-if="!treeData.length" class="text-center text-gray-500 py-4">
        No database objects found
      </div>
      <div v-else class="space-y-1">
        <template v-for="schema in treeData" :key="schema.name">
          <!-- Schema (only show if has name - i.e. not MySQL) -->
          <div v-if="schema.name"
            class="flex items-center px-2 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer"
            @click="toggleSchema(schema)">
            <component :is="isSchemaExpanded(schema.name) ? ChevronDownIcon : ChevronRightIcon"
              class="h-4 w-4 text-gray-400 mr-1.5 flex-shrink-0" />
            <span class="font-medium">{{ schema.name || 'Default' }}</span>
            <span class="ml-2 text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
              {{ schema.children.length }}
            </span>
          </div>

          <!-- Tables and Views -->
          <div v-if="isSchemaExpanded(schema.name)"
            :class="['space-y-1', schema.name ? 'ml-4 border-l border-gray-200' : '']">
            <div v-for="item in schema.children" :key="`${item.type}-${item.name}`"
              class="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer" :class="[
                isSelected(item) ? 'bg-blue-50 text-blue-700' : 'text-gray-600',
                { 'ml-2': schema.name }
              ]" @click="handleObjectSelect(item)">
              <component :is="item.type === 'table' ? TableCellsIcon : ViewfinderCircleIcon"
                class="h-4 w-4 mr-1.5 flex-shrink-0" :class="isSelected(item) ? 'text-blue-500' : 'text-gray-400'" />
              <span>{{ item.name }}</span>
              <span v-if="item.type === 'view'" class="ml-2 text-xs text-gray-500">(View)</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
