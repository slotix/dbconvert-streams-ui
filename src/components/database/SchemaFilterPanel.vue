<template>
  <div class="bg-white border border-gray-200 rounded-lg shadow-sm">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <FunnelIcon class="h-5 w-5 text-gray-600" />
          <h3 class="text-sm font-medium text-gray-900">Schema Filter</h3>
          <span 
            v-if="schemaFilterSummary"
            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
            :class="{
              'bg-blue-100 text-blue-800': schemaFilterSummary.isFiltered,
              'bg-gray-100 text-gray-800': !schemaFilterSummary.isFiltered
            }"
          >
            {{ schemaFilterSummary.active }}/{{ schemaFilterSummary.total }}
          </span>
        </div>
        
        <div class="flex items-center space-x-2">
          <button
            @click="resetFilter"
            class="text-xs text-gray-600 hover:text-gray-800"
            title="Show all schemas"
          >
            Reset
          </button>
          <button
            @click="applyDefaults"
            class="text-xs text-blue-600 hover:text-blue-800"
            title="Hide system schemas"
          >
            Defaults
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="p-4">
      <div class="flex items-center justify-center">
        <Spinner size="sm" />
        <span class="ml-2 text-sm text-gray-600">Loading schemas...</span>
      </div>
    </div>

    <!-- Schema List -->
    <div v-else class="max-h-64 overflow-y-auto">
      <div class="divide-y divide-gray-200">
        <label
          v-for="schema in allSchemas"
          :key="schema"
          class="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
          :class="{
            'bg-blue-50': activeSchemas.includes(schema)
          }"
        >
          <input
            type="checkbox"
            :value="schema"
            :checked="activeSchemas.includes(schema)"
            @change="toggleSchema(schema)"
            class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div class="ml-3 flex-1 flex items-center justify-between">
            <span class="text-sm text-gray-900">{{ schema }}</span>
            <div class="flex items-center space-x-1">
              <span
                v-if="isSystemSchema(schema)"
                class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
              >
                System
              </span>
              <span
                v-if="getSchemaTableCount(schema) > 0"
                class="text-xs text-gray-500"
              >
                {{ getSchemaTableCount(schema) }} tables
              </span>
            </div>
          </div>
        </label>
      </div>
    </div>

    <!-- No Schemas Message -->
    <div v-if="!isLoading && allSchemas.length === 0" class="p-4 text-center">
      <p class="text-sm text-gray-500">No schemas found</p>
    </div>

    <!-- Performance Warning -->
    <div v-if="hasSystemSchemasSelected" class="p-3 bg-yellow-50 border-t border-yellow-200">
      <div class="flex items-start space-x-2">
        <ExclamationTriangleIcon class="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div class="text-xs text-yellow-700">
          <p class="font-medium">System schemas selected</p>
          <p>May impact performance and show internal objects.</p>
        </div>
      </div>
    </div>

    <!-- Apply Button -->
    <div v-if="hasChanges" class="p-3 bg-gray-50 border-t border-gray-200">
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-600">
          {{ pendingChanges }} changes pending
        </span>
        <div class="flex space-x-2">
          <button
            @click="cancelChanges"
            class="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            @click="applyChanges"
            :disabled="isApplying"
            class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <template v-if="isApplying">
              <Spinner size="sm" class="mr-1" />
              Applying...
            </template>
            <template v-else>
              Apply
            </template>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { 
  FunnelIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/vue/24/outline'
import Spinner from '@/components/common/Spinner.vue'
import { useSchemaFilterStore } from '@/stores/schemaFilter'
import { useDatabaseCapabilities } from '@/composables/useDatabaseCapabilities'
import { storeToRefs } from 'pinia'

interface Props {
  connectionId: string
  connectionType: string
  tableCountBySchema?: Record<string, number>
}

interface Emits {
  (e: 'filterChanged', activeSchemas: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Stores and composables
const schemaFilterStore = useSchemaFilterStore()
const { isLoading } = storeToRefs(schemaFilterStore)
const { systemSchemas } = useDatabaseCapabilities(computed(() => props.connectionType))

// Local state for pending changes
const pendingActiveSchemas = ref<string[]>([])
const isApplying = ref(false)

// Computed properties
const schemaFilter = computed(() => 
  schemaFilterStore.getSchemaFilter(props.connectionId)
)

const schemaFilterSummary = computed(() => 
  schemaFilterStore.getSchemaFilterSummary(props.connectionId)
)

const allSchemas = computed(() => 
  schemaFilterStore.getAllSchemas(props.connectionId)
)

const activeSchemas = computed(() => 
  schemaFilterStore.getActiveSchemas(props.connectionId)
)

const hasChanges = computed(() => {
  if (!activeSchemas.value.length) return false
  return JSON.stringify(pendingActiveSchemas.value.sort()) !== 
         JSON.stringify(activeSchemas.value.sort())
})

const pendingChanges = computed(() => {
  if (!hasChanges.value) return 0
  const added = pendingActiveSchemas.value.filter(s => !activeSchemas.value.includes(s))
  const removed = activeSchemas.value.filter(s => !pendingActiveSchemas.value.includes(s))
  return added.length + removed.length
})

const hasSystemSchemasSelected = computed(() => 
  pendingActiveSchemas.value.some(schema => isSystemSchema(schema))
)

// Helper functions
const isSystemSchema = (schema: string): boolean => {
  return systemSchemas.value.includes(schema)
}

const getSchemaTableCount = (schema: string): number => {
  return props.tableCountBySchema?.[schema] || 0
}

// Actions
const toggleSchema = (schema: string) => {
  const index = pendingActiveSchemas.value.indexOf(schema)
  if (index >= 0) {
    pendingActiveSchemas.value.splice(index, 1)
  } else {
    pendingActiveSchemas.value.push(schema)
  }
}

const resetFilter = () => {
  pendingActiveSchemas.value = [...allSchemas.value]
}

const applyDefaults = () => {
  pendingActiveSchemas.value = allSchemas.value.filter(schema => !isSystemSchema(schema))
}

const cancelChanges = () => {
  pendingActiveSchemas.value = [...activeSchemas.value]
}

const applyChanges = async () => {
  if (!hasChanges.value) return
  
  isApplying.value = true
  try {
    await schemaFilterStore.updateSchemaFilter(props.connectionId, pendingActiveSchemas.value)
    emit('filterChanged', pendingActiveSchemas.value)
  } catch (error) {
    console.error('Failed to apply schema filter:', error)
    // TODO: Show error notification
  } finally {
    isApplying.value = false
  }
}

// Initialize
const initializeFilter = async () => {
  try {
    await schemaFilterStore.loadSchemaFilter(props.connectionId)
    pendingActiveSchemas.value = [...activeSchemas.value]
  } catch (error) {
    console.error('Failed to load schema filter:', error)
  }
}

// Watchers
watch(() => props.connectionId, initializeFilter, { immediate: true })

watch(activeSchemas, (newSchemas) => {
  if (!hasChanges.value) {
    pendingActiveSchemas.value = [...newSchemas]
  }
}, { immediate: true })

onMounted(() => {
  if (props.connectionId) {
    initializeFilter()
  }
})
</script> 