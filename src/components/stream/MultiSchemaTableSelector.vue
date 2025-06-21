<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium text-gray-900">Select Tables for Migration</h3>
      <div class="flex items-center space-x-2">
        <span class="text-sm text-gray-600">
          {{ selectedTables.length }} tables selected across {{ selectedSchemas.size }} schemas
        </span>
        <button @click="selectAllTables" class="text-sm text-blue-600 hover:text-blue-800">
          Select All
        </button>
        <button @click="clearAllTables" class="text-sm text-gray-600 hover:text-gray-800">
          Clear All
        </button>
      </div>
    </div>

    <!-- Schema Filter (for PostgreSQL) -->
    <div v-if="supportsSchemaFilter" class="bg-blue-50 border border-blue-200 rounded-md p-4">
      <div class="flex items-center space-x-2 mb-3">
        <FunnelIcon class="h-5 w-5 text-blue-600" />
        <h4 class="font-medium text-blue-900">Schema Selection</h4>
      </div>
      <div class="text-sm text-blue-700 mb-3">
        Choose which schemas to include in the migration. Only tables from selected schemas will be
        available.
      </div>
      <div class="flex flex-wrap gap-2">
        <label
          v-for="schema in availableSchemas"
          :key="schema"
          class="inline-flex items-center px-3 py-1 rounded-full text-sm cursor-pointer"
          :class="{
            'bg-blue-100 text-blue-800 border border-blue-300': schemaFilter.includes(schema),
            'bg-gray-100 text-gray-700 border border-gray-300': !schemaFilter.includes(schema)
          }"
        >
          <input type="checkbox" :value="schema" v-model="schemaFilter" class="sr-only" />
          <span>{{ schema }}</span>
          <span v-if="getSchemaTableCount(schema) > 0" class="ml-1 text-xs opacity-75">
            ({{ getSchemaTableCount(schema) }})
          </span>
        </label>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <Spinner size="md" />
      <span class="ml-3 text-gray-600">Loading tables...</span>
    </div>

    <!-- Tables by Schema -->
    <div v-else class="space-y-6">
      <div
        v-for="schema in filteredSchemas"
        :key="schema"
        class="border border-gray-200 rounded-lg overflow-hidden"
      >
        <!-- Schema Header -->
        <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <h4 class="font-medium text-gray-900">{{ schema }}</h4>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
              >
                {{ getSchemaTableCount(schema) }} tables
              </span>
              <span
                v-if="isSystemSchema(schema)"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
              >
                System
              </span>
            </div>
            <div class="flex items-center space-x-2">
              <button
                @click="selectAllInSchema(schema)"
                class="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <button
                @click="clearAllInSchema(schema)"
                class="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <!-- Tables in Schema -->
        <div class="divide-y divide-gray-200">
          <label
            v-for="table in getTablesInSchema(schema)"
            :key="`${schema}.${table.name}`"
            class="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
            :class="{
              'bg-blue-50': isTableSelected(schema, table.name)
            }"
          >
            <input
              type="checkbox"
              :checked="isTableSelected(schema, table.name)"
              @change="toggleTable(schema, table.name)"
              class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div class="ml-3 flex-1">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-900">{{ table.name }}</span>
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-500"
                    >{{ table.columns?.length || 0 }} columns</span
                  >
                  <span
                    v-if="table.primaryKeys?.length"
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                  >
                    PK
                  </span>
                  <span
                    v-if="table.foreignKeys?.length"
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    FK
                  </span>
                </div>
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>

    <!-- No Tables Message -->
    <div v-if="!isLoading && filteredSchemas.length === 0" class="text-center py-8">
      <TableCellsIcon class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">No tables found</h3>
      <p class="mt-1 text-sm text-gray-500">
        {{
          schemaFilter.length === 0
            ? 'Select schemas to view available tables.'
            : 'No tables available in selected schemas.'
        }}
      </p>
    </div>

    <!-- Selection Summary -->
    <div
      v-if="selectedTables.length > 0"
      class="bg-green-50 border border-green-200 rounded-md p-4"
    >
      <div class="flex items-center space-x-2 mb-2">
        <CheckCircleIcon class="h-5 w-5 text-green-600" />
        <h4 class="font-medium text-green-900">Migration Summary</h4>
      </div>
      <div class="text-sm text-green-700">
        <p>{{ selectedTables.length }} tables selected for migration:</p>
        <div class="mt-2 max-h-32 overflow-y-auto">
          <div class="grid grid-cols-2 gap-1">
            <span
              v-for="table in selectedTables"
              :key="table.fullName"
              class="text-xs font-mono bg-green-100 px-2 py-1 rounded"
            >
              {{ table.fullName }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { FunnelIcon, TableCellsIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import Spinner from '@/components/common/Spinner.vue'
import { useDatabaseCapabilities } from '@/composables/useDatabaseCapabilities'
import { type MultiSchemaTable } from '@/types/connections'
import { type SQLTableMeta } from '@/types/metadata'
import connectionsApi from '@/api/connections'

interface Props {
  connectionId: string
  connectionType: string
  modelValue: MultiSchemaTable[]
}

interface Emits {
  (e: 'update:modelValue', tables: MultiSchemaTable[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Database capabilities
const { supportsSchemaFilter, systemSchemas } = useDatabaseCapabilities(
  computed(() => props.connectionType)
)

// State
const isLoading = ref(false)
const availableSchemas = ref<string[]>([])
const schemaFilter = ref<string[]>([])
const tablesBySchema = ref<Record<string, SQLTableMeta[]>>({})

// Computed
const selectedTables = computed(() => props.modelValue)

const selectedSchemas = computed(() => {
  const schemas = new Set<string>()
  selectedTables.value.forEach((table) => schemas.add(table.schema))
  return schemas
})

const filteredSchemas = computed(() => {
  if (schemaFilter.value.length === 0) return []
  return schemaFilter.value.filter(
    (schema) => tablesBySchema.value[schema] && tablesBySchema.value[schema].length > 0
  )
})

// Helper functions
const isSystemSchema = (schema: string): boolean => {
  return systemSchemas.value.includes(schema)
}

const getSchemaTableCount = (schema: string): number => {
  return tablesBySchema.value[schema]?.length || 0
}

const getTablesInSchema = (schema: string): SQLTableMeta[] => {
  return tablesBySchema.value[schema] || []
}

const isTableSelected = (schema: string, tableName: string): boolean => {
  return selectedTables.value.some((table) => table.schema === schema && table.table === tableName)
}

// Actions
const toggleTable = (schema: string, tableName: string) => {
  const fullName = `${schema}.${tableName}`
  const currentTables = [...selectedTables.value]

  const existingIndex = currentTables.findIndex(
    (table) => table.schema === schema && table.table === tableName
  )

  if (existingIndex >= 0) {
    // Remove table
    currentTables.splice(existingIndex, 1)
  } else {
    // Add table
    currentTables.push({
      schema,
      table: tableName,
      fullName
    })
  }

  emit('update:modelValue', currentTables)
}

const selectAllInSchema = (schema: string) => {
  const currentTables = [...selectedTables.value]
  const tablesInSchema = getTablesInSchema(schema)

  tablesInSchema.forEach((table) => {
    const exists = currentTables.some((t) => t.schema === schema && t.table === table.name)
    if (!exists) {
      currentTables.push({
        schema,
        table: table.name,
        fullName: `${schema}.${table.name}`
      })
    }
  })

  emit('update:modelValue', currentTables)
}

const clearAllInSchema = (schema: string) => {
  const currentTables = selectedTables.value.filter((table) => table.schema !== schema)
  emit('update:modelValue', currentTables)
}

const selectAllTables = () => {
  const allTables: MultiSchemaTable[] = []

  filteredSchemas.value.forEach((schema) => {
    getTablesInSchema(schema).forEach((table) => {
      allTables.push({
        schema,
        table: table.name,
        fullName: `${schema}.${table.name}`
      })
    })
  })

  emit('update:modelValue', allTables)
}

const clearAllTables = () => {
  emit('update:modelValue', [])
}

// Load data
const loadMetadata = async () => {
  if (!props.connectionId) return

  isLoading.value = true
  try {
    // Get metadata for the connection
    const metadata = await connectionsApi.getMetadata(props.connectionId, true)

    // Group tables by schema
    const grouped: Record<string, SQLTableMeta[]> = {}
    Object.values(metadata.tables).forEach((table) => {
      const schema = table.schema || 'public'
      if (!grouped[schema]) {
        grouped[schema] = []
      }
      grouped[schema].push(table)
    })

    tablesBySchema.value = grouped
    availableSchemas.value = Object.keys(grouped).sort()

    // Initialize schema filter with non-system schemas
    if (schemaFilter.value.length === 0) {
      schemaFilter.value = availableSchemas.value.filter((schema) => !isSystemSchema(schema))
    }
  } catch (error) {
    console.error('Failed to load table metadata:', error)
  } finally {
    isLoading.value = false
  }
}

// Watchers
watch(() => props.connectionId, loadMetadata, { immediate: true })

onMounted(() => {
  if (props.connectionId) {
    loadMetadata()
  }
})
</script>
