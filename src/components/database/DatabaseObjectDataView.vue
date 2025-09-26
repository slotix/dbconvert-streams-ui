<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ArrowPathIcon, KeyIcon, LinkIcon } from '@heroicons/vue/24/outline'
import { type SQLTableMeta, type SQLViewMeta } from '@/types/metadata'
import connections from '@/api/connections'
import { formatTableValue } from '@/utils/dataUtils'

// Define brand colors as constants for consistency (matching DatabaseDiagramD3.vue)
const BRAND_COLORS = {
  primary: '#00B2D6', // Teal/Cyan blue (from logo)
  secondary: '#F26627', // Orange (from logo)
  highlight: {
    blue: '#DBEAFE', // Light blue highlight
    orange: '#FFEDD5' // Light orange highlight
  }
}

const props = defineProps<{
  tableMeta: SQLTableMeta | SQLViewMeta
  connectionId: string
  database: string
  isView?: boolean
}>()

interface TableData {
  columns: string[]
  rows: unknown[][]
  count: number
  total_count: number
  limit: number
  offset: number
  status: string
}

const isLoading = ref(false)
const error = ref<string>()
const tableData = ref<TableData>()
const currentPage = ref(1)
const itemsPerPage = ref(25)
const skipCount = ref(false)

// Helper to get object name regardless of case
function getObjectName(meta: SQLTableMeta | SQLViewMeta): string {
  return props.isView ? (meta as SQLViewMeta).name : (meta as SQLTableMeta).name
}

// Helper to get schema regardless of case
function getObjectSchema(meta: SQLTableMeta | SQLViewMeta): string {
  return props.isView ? (meta as SQLViewMeta).schema : (meta as SQLTableMeta).schema
}

async function loadTableData() {
  isLoading.value = true
  error.value = undefined

  try {
    const objectName = getObjectName(props.tableMeta)
    const objectSchema = getObjectSchema(props.tableMeta)

    if (!objectName) {
      throw new Error('Table/View name is undefined')
    }

    // Reset to page 1 if we enable skip count and we're not on the first page
    if (skipCount.value && currentPage.value !== 1) {
      currentPage.value = 1
      return // loadTableData will be called again by the watcher
    }

    const offset = skipCount.value
      ? (currentPage.value - 1) * itemsPerPage.value
      : Math.max(0, (currentPage.value - 1) * itemsPerPage.value)

    // For non-public schemas, use schema-qualified name in the URL path
    // For public schema or no schema, use just the table name
    const apiObjectName =
      objectSchema && objectSchema !== 'public' && objectSchema !== ''
        ? `${objectSchema}.${objectName}`
        : objectName

    const params = {
      limit: itemsPerPage.value,
      offset: offset,
      skip_count: skipCount.value
    }

    const data = props.isView
      ? await connections.getViewData(props.connectionId, props.database, apiObjectName, params)
      : await connections.getTableData(props.connectionId, props.database, apiObjectName, params)

    tableData.value = data

    // If skip_count is true and we got less rows than limit, we're on the last page
    if (skipCount.value && data.rows.length < itemsPerPage.value) {
      currentPage.value = Math.max(1, currentPage.value - 1)
    }
  } catch (err) {
    console.error('Error loading data:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load data'
    // Reset to page 1 if we get an error about negative offset
    if (err instanceof Error && err.message.includes('offset must be non-negative')) {
      currentPage.value = 1
      loadTableData()
    }
  } finally {
    isLoading.value = false
  }
}

// Reset pagination and reload data when table changes
watch(
  () => props.tableMeta,
  () => {
    currentPage.value = 1
    loadTableData()
  },
  { deep: true }
)

// Reload data when page or items per page changes
watch([currentPage, skipCount], () => {
  loadTableData()
})

// Handle items per page changes separately
watch(itemsPerPage, () => {
  // Calculate the first item index of the current page
  const firstItemIndex = (currentPage.value - 1) * itemsPerPage.value

  // Calculate what page this item would be on with the new items per page
  currentPage.value = Math.floor(firstItemIndex / itemsPerPage.value) + 1

  // Ensure we don't exceed the total pages
  if (tableData.value?.total_count) {
    const maxPage = Math.ceil(tableData.value.total_count / itemsPerPage.value)
    currentPage.value = Math.min(currentPage.value, maxPage)
  }

  // Always ensure we're at least on page 1
  currentPage.value = Math.max(1, currentPage.value)

  loadTableData()
})

// Load data initially
loadTableData()

const totalPages = computed(() => {
  if (!tableData.value?.total_count) return 1
  return Math.ceil(tableData.value.total_count / itemsPerPage.value)
})

const displayedPages = computed(() => {
  if (!tableData.value?.total_count) return []

  const totalPages = Math.ceil(tableData.value.total_count / itemsPerPage.value)
  const current = currentPage.value
  const pages: (number | string)[] = []

  // Always show first page
  pages.push(1)

  if (current <= 4) {
    // If current page is near start, show first 5 pages + ellipsis + last
    for (let i = 2; i <= Math.min(5, totalPages); i++) {
      pages.push(i)
    }
    if (totalPages > 5) {
      pages.push('...')
      pages.push(totalPages)
    }
  } else if (current > totalPages - 4) {
    // If current page is near end, show first + ellipsis + last 5 pages
    if (totalPages > 5) {
      pages.push('...')
    }
    for (let i = Math.max(totalPages - 4, 2); i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // If current page is in middle, show first + ellipsis + current±2 + ellipsis + last
    pages.push('...')
    for (let i = current - 2; i <= current + 2; i++) {
      pages.push(i)
    }
    pages.push('...')
    pages.push(totalPages)
  }

  return pages
})

// Add this computed property after other computed properties
const primaryKeyColumns = computed(() => {
  if (props.isView) return new Set()
  return new Set((props.tableMeta as SQLTableMeta).primaryKeys || [])
})

const foreignKeyColumns = computed(() => {
  if (props.isView) return new Set()
  const foreignKeys = (props.tableMeta as SQLTableMeta).foreignKeys || []
  return new Set(foreignKeys.map((fk) => fk.sourceColumn))
})
</script>

<template>
  <div
    :class="[
      'bg-white',
      $attrs.class ? $attrs.class : 'shadow-sm ring-1 ring-gray-900/5 rounded-lg'
    ]"
  >
    <!-- Header -->
    <div class="px-4 py-3 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium leading-6 text-gray-900">
          <template
            v-if="
              getObjectSchema(tableMeta) &&
              getObjectSchema(tableMeta) !== 'public' &&
              getObjectSchema(tableMeta) !== ''
            "
          >
            {{ getObjectSchema(tableMeta) }}.{{ getObjectName(tableMeta) || 'Unnamed' }}
          </template>
          <template v-else>
            {{ getObjectName(tableMeta) || 'Unnamed' }}
          </template>
          <span v-if="isView" class="ml-2 text-sm text-blue-500">(View)</span>
        </h3>
        <div class="flex items-center gap-4">
          <!-- Items per page selector -->
          <div class="flex items-center gap-2">
            <label for="items-per-page" class="text-sm text-gray-600">Rows per page:</label>
            <select
              id="items-per-page"
              v-model="itemsPerPage"
              class="rounded-md border-gray-300 py-1.5 text-sm focus:border-gray-500 focus:ring-gray-500"
            >
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
          <!-- Skip count toggle - show for both tables and views -->
          <div class="flex items-center gap-2">
            <input
              id="skip-count"
              v-model="skipCount"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500"
            />
            <label for="skip-count" class="text-sm text-gray-600">Skip row count</label>
          </div>
        </div>
        <!-- Refresh button -->
        <button
          type="button"
          class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          :disabled="isLoading"
          @click="loadTableData"
        >
          <ArrowPathIcon :class="['h-5 w-5 text-gray-400 mr-2', { 'animate-spin': isLoading }]" />
          Refresh Data
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex flex-col h-[calc(100vh-16rem)] p-4">
      <!-- Loading state -->
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <ArrowPathIcon class="h-8 w-8 text-gray-400 animate-spin" />
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-8">
        <p class="text-sm text-red-600">{{ error }}</p>
      </div>

      <!-- Data table -->
      <div v-else-if="tableData?.rows?.length" class="flex flex-col flex-1 min-h-0">
        <div class="flex-1 overflow-x-auto border border-gray-200 rounded-lg">
          <div class="min-w-[640px]">
            <table class="w-full divide-y divide-gray-300">
              <!-- Table headers -->
              <thead class="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th
                    v-for="column in tableData.columns"
                    :key="column"
                    class="px-3 py-2 text-left text-sm font-semibold text-gray-900 bg-gray-50 sticky top-0 whitespace-nowrap"
                  >
                    <div class="flex items-center gap-1">
                      <KeyIcon
                        v-if="primaryKeyColumns.has(column)"
                        :style="`color: ${BRAND_COLORS.primary}`"
                        class="h-4 w-4"
                        title="Primary Key"
                      />
                      <LinkIcon
                        v-if="foreignKeyColumns.has(column)"
                        :style="`color: ${BRAND_COLORS.secondary}`"
                        class="h-4 w-4"
                        title="Foreign Key"
                      />
                      {{ column }}
                    </div>
                  </th>
                </tr>
              </thead>
              <!-- Table body -->
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr
                  v-for="(row, rowIndex) in tableData.rows"
                  :key="rowIndex"
                  class="hover:bg-gray-50"
                >
                  <td
                    v-for="(value, colIndex) in row"
                    :key="colIndex"
                    class="px-3 py-2 text-sm text-gray-500 whitespace-nowrap"
                  >
                    {{ formatTableValue(value) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination -->
        <div class="mt-4 flex items-center justify-between border-t border-gray-200 bg-white py-3">
          <div class="flex flex-1 justify-between sm:hidden">
            <button
              :disabled="currentPage === 1"
              class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              :class="{ 'opacity-50 cursor-not-allowed': currentPage === 1 }"
              @click="currentPage = Math.max(1, currentPage - 1)"
            >
              Previous
            </button>
            <button
              :disabled="
                (skipCount && tableData?.rows?.length < itemsPerPage) ||
                (!skipCount && currentPage === totalPages)
              "
              class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              :class="{
                'opacity-50 cursor-not-allowed':
                  (skipCount && tableData?.rows?.length < itemsPerPage) ||
                  (!skipCount && currentPage === totalPages)
              }"
              @click="currentPage = currentPage + 1"
            >
              Next
            </button>
          </div>
          <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div class="text-sm text-gray-700">
              Showing {{ tableData.offset + 1 }} to {{ tableData.offset + tableData.rows.length }}
              <template v-if="!skipCount"> of {{ tableData.total_count }} </template>
              rows
            </div>
            <nav
              class="isolate inline-flex -space-x-px rounded-md shadow-sm"
              aria-label="Pagination"
            >
              <button
                class="relative inline-flex items-center px-3 py-1.5 text-sm font-medium ring-1 ring-inset ring-gray-300"
                :class="[
                  currentPage === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-900 hover:bg-gray-50 cursor-pointer'
                ]"
                :disabled="currentPage === 1"
                @click="currentPage = Math.max(1, currentPage - 1)"
              >
                Previous
              </button>
              <template v-if="!skipCount">
                <button
                  v-for="page in displayedPages"
                  :key="page"
                  :class="[
                    'relative inline-flex items-center px-3 py-1.5 text-sm font-medium ring-1 ring-inset ring-gray-300',
                    typeof page === 'number'
                      ? currentPage === page
                        ? 'bg-gray-600 text-white'
                        : 'text-gray-900 hover:bg-gray-50 cursor-pointer'
                      : 'text-gray-400 cursor-default'
                  ]"
                  @click="typeof page === 'number' ? (currentPage = page) : null"
                >
                  {{ page }}
                </button>
              </template>
              <button
                class="relative inline-flex items-center px-3 py-1.5 text-sm font-medium ring-1 ring-inset ring-gray-300"
                :class="[
                  (skipCount && tableData?.rows?.length < itemsPerPage) ||
                  (!skipCount && currentPage === totalPages)
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-900 hover:bg-gray-50 cursor-pointer'
                ]"
                :disabled="
                  (skipCount && tableData?.rows?.length < itemsPerPage) ||
                  (!skipCount && currentPage === totalPages)
                "
                @click="currentPage = currentPage + 1"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-8">
        <p class="text-sm text-gray-500">No data available</p>
      </div>
    </div>
  </div>
</template>
