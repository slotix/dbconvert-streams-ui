<template>
  <div v-if="config" class="mt-4 space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button class="text-gray-500 hover:text-gray-700 focus:outline-none" @click="isExpanded = !isExpanded">
          <ChevronRightIcon class="h-5 w-5 transform transition-transform duration-200"
            :class="{ 'rotate-90': isExpanded }" />
        </button>
        <h2 class="text-xl font-semibold">Current Stream Configuration</h2>
      </div>
      <div class="flex items-center gap-4">
        <Switch v-model="isJsonView"
          class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
          :class="[isJsonView ? 'bg-gray-600' : 'bg-gray-400']">
          <span class="sr-only">Toggle JSON view</span>
          <span aria-hidden="true"
            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
            :class="[
              isJsonView ? 'translate-x-5' : 'translate-x-0',
              'shadow-[0_1px_4px_rgba(0,0,0,0.15)]'
            ]" />
        </Switch>
        JSON
        <button v-tooltip="'Copy configuration'" class="text-gray-500 hover:text-gray-700 focus:outline-none"
          @click="copyConfig">
          <ClipboardIcon class="h-5 w-5" />
        </button>
      </div>
    </div>

    <TransitionExpand>
      <div v-if="isExpanded">
        <!-- JSON View -->
        <div v-if="isJsonView" class="bg-gray-50 rounded-lg shadow-sm p-4">
          <pre class="text-sm text-gray-900 whitespace-pre-wrap max-h-[400px] overflow-y-auto">{{ prettyConfig }}</pre>
        </div>

        <!-- Table View -->
        <div v-else class="bg-gray-50 rounded-lg shadow-sm divide-y divide-gray-200">
          <!-- Basic Info -->
          <div class="p-4 space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-500">Stream ID</span>
              <span class="text-sm text-gray-900">{{ config.id }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-500">Name</span>
              <span class="text-sm text-gray-900">{{ config.name || 'Unnamed Stream' }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-500">Mode</span>
              <span class="text-sm">
                <span :class="[
                  'rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                  config.mode === 'cdc'
                    ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
                    : 'bg-green-50 text-green-700 ring-green-600/20'
                ]">
                  {{ config.mode }}
                </span>
              </span>
            </div>
          </div>

          <!-- Selected Tables -->
          <div v-if="config.tables?.length" class="p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-medium text-gray-700">Selected Tables</h3>
              <div class="flex items-center gap-2">
                <!-- Search input -->
                <div class="relative">
                  <input v-model="tableSearch" type="text" placeholder="Search tables..."
                    class="w-48 text-sm rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500" />
                  <MagnifyingGlassIcon class="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                  {{ config.tables.length }} tables
                </span>
              </div>
            </div>

            <!-- Replace the grid with a table view -->
            <div class="overflow-hidden rounded-lg border border-gray-200">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col"
                      class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Table Name
                    </th>
                    <th v-if="config.mode === 'cdc' && hasOperations" scope="col"
                      class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operations
                    </th>
                    <th v-if="config.mode === 'convert' && hasQueries" scope="col"
                      class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Query
                    </th>
                    <th v-if="shouldShowSchema" scope="col"
                      class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schema
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="table in paginatedTables" :key="table.name" class="hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {{ table.name }}
                    </td>
                    <td v-if="config.mode === 'cdc' && hasOperations"
                      class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <span class="inline-flex items-center gap-1">
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium"
                          :class="getOperationsBadgeColor(table.operations?.length || 0)">
                          {{ table.operations?.length || 0 }}
                        </span>
                        {{ table.operations?.join(', ') || 'No ops' }}
                      </span>
                    </td>
                    <td v-if="config.mode === 'convert' && hasQueries"
                      class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {{ table.query || '-' }}
                    </td>
                    <td v-if="shouldShowSchema" class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {{ getTableSchema(table.name) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div class="flex flex-1 justify-between sm:hidden">
                <button :disabled="currentPage === 1" @click="currentPage--"
                  class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  :class="{ 'opacity-50 cursor-not-allowed': currentPage === 1 }">
                  Previous
                </button>
                <button :disabled="currentPage >= totalPages" @click="currentPage++"
                  class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  :class="{ 'opacity-50 cursor-not-allowed': currentPage >= totalPages }">
                  Next
                </button>
              </div>
              <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm text-gray-700">
                    Showing
                    <span class="font-medium">{{ paginationStart }}</span>
                    to
                    <span class="font-medium">{{ paginationEnd }}</span>
                    of
                    <span class="font-medium">{{ filteredTables.length }}</span>
                    results
                  </p>
                </div>
                <div>
                  <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button v-for="page in displayedPages" :key="page" @click="currentPage = page" :class="[
                      currentPage === page
                        ? 'relative z-10 inline-flex items-center bg-gray-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600'
                        : 'relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0',
                    ]">
                      {{ page }}
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TransitionExpand>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Switch } from '@headlessui/vue'
import { ClipboardIcon, ChevronRightIcon, MagnifyingGlassIcon, EyeIcon, PencilIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { type StreamConfig } from '@/types/streamConfig'
import { useCommonStore } from '@/stores/common'
import { vTooltip } from '@/directives/tooltip'
import TransitionExpand from '@/components/common/TransitionExpand.vue'
import { useConnectionsStore } from '@/stores/connections'

const commonStore = useCommonStore()
const connectionStore = useConnectionsStore()
const isJsonView = ref(false)
const isExpanded = ref(true) // Start expanded

interface Props {
  config: StreamConfig | null
}

const props = defineProps<Props>()

const prettyConfig = computed(() => {
  const config = props.config
  if (!config) return ''

  const displayConfig = {
    id: config.id,
    name: config.name,
    mode: config.mode,
    source: sourceConnection.value?.name || config.source,
    target: targetConnection.value?.name || config.target,
    tables: config.tables?.map(t => ({
      name: t.name,
      ...(config.mode === 'cdc' ? { operations: t.operations || [] } : { query: t.query || '' })
    }))
  }

  return JSON.stringify(displayConfig, null, 2)
})

function copyConfig() {
  if (props.config) {
    navigator.clipboard.writeText(JSON.stringify(props.config, null, 2))
    commonStore.showNotification('Configuration copied to clipboard', 'success')
  }
}

// Add helper function for operation count badge colors
function getOperationsBadgeColor(count: number): string {
  if (count === 0) return 'bg-gray-100 text-gray-600'
  if (count < 2) return 'bg-yellow-100 text-yellow-700'
  return 'bg-green-100 text-green-700'
}

const tableSearch = ref('')
const currentPage = ref(1)
const itemsPerPage = 10

const filteredTables = computed(() => {
  if (!props.config?.tables) return []
  return props.config.tables.filter(table =>
    table.name.toLowerCase().includes(tableSearch.value.toLowerCase())
  )
})

const totalPages = computed(() =>
  Math.ceil(filteredTables.value.length / itemsPerPage)
)

const paginatedTables = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredTables.value.slice(start, end)
})

const paginationStart = computed(() =>
  ((currentPage.value - 1) * itemsPerPage) + 1
)

const paginationEnd = computed(() =>
  Math.min(currentPage.value * itemsPerPage, filteredTables.value.length)
)

const displayedPages = computed(() => {
  const pages = []
  const maxPages = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxPages / 2))
  let end = Math.min(totalPages.value, start + maxPages - 1)

  if (end - start + 1 < maxPages) {
    start = Math.max(1, end - maxPages + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

// Reset page when search changes
watch(tableSearch, () => {
  currentPage.value = 1
})

const expandedTables = ref<string[]>([])

function toggleTableDetails(tableName: string) {
  const index = expandedTables.value.indexOf(tableName)
  if (index === -1) {
    expandedTables.value.push(tableName)
  } else {
    expandedTables.value.splice(index, 1)
  }
}

const tablesWithNoOps = computed(() =>
  paginatedTables.value.filter(t => !t.operations?.length)
)

const tablesWithPartialOps = computed(() =>
  paginatedTables.value.filter(t => t.operations?.length === 1)
)

const tablesWithFullOps = computed(() =>
  paginatedTables.value.filter(t => t.operations?.length === 2)
)

// Replace the connection-related computed properties with:

const sourceConnection = computed(() => {
  return connectionStore.connections.find(conn => conn.id === props.config?.source)
})

const targetConnection = computed(() => {
  return connectionStore.connections.find(conn => conn.id === props.config?.target)
})

// Update shouldShowSchema to only check source connection
const shouldShowSchema = computed(() => {
  if (!sourceConnection.value) return false
  // Only show schema for PostgreSQL source
  return sourceConnection.value.type === 'postgresql'
})

// Update getTableSchema to be source-specific
function getTableSchema(tableName: string) {
  // Only show schema for PostgreSQL source
  if (!shouldShowSchema.value) return '—'
  const parts = tableName.split('.')
  return parts.length > 1 ? parts[0] : 'public'
}

const hasOperations = computed(() =>
  props.config?.tables?.some(t => t.operations?.length > 0)
)

const hasQueries = computed(() =>
  props.config?.tables?.some(t => t.query)
)
</script>

<style scoped>
/* Update existing styles */
.grid>div {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.grid>div:hover {
  transform: translateY(-2px);
}

/* Add new styles for better animations */
.group:hover .group-hover\:opacity-100 {
  transition-delay: 50ms;
}

/* Improve fade in animation */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.grid>div {
  animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
