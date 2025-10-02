<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { type FileSystemEntry } from '@/api/fileSystem'
import { type FileMetadata, type FileDataResponse } from '@/types/files'
import { getFileFormat } from '@/utils/fileFormat'
import filesApi from '@/api/files'
import { formatTableValue } from '@/utils/dataUtils'

const props = defineProps<{
  entry: FileSystemEntry
  metadata: FileMetadata | null
  connectionId: string
}>()

// const emit = defineEmits<{
//   (e: 'refresh-metadata'): void
// }>()

const isLoading = ref(false)
const error = ref<string>()
const fileData = ref<FileDataResponse>()
const currentPage = ref(1)
const itemsPerPage = ref(100)

const fileFormat = computed(() => getFileFormat(props.entry.name))

const totalPages = computed(() => {
  if (!fileData.value || !props.metadata) return 0
  return Math.ceil(props.metadata.rowCount / itemsPerPage.value)
})

const formatNumber = (num: number): string => {
  return num.toLocaleString()
}

async function loadFileData() {
  if (!fileFormat.value) return

  isLoading.value = true
  error.value = undefined
  try {
    const offset = (currentPage.value - 1) * itemsPerPage.value
    fileData.value = await filesApi.getFileData(props.entry.path, fileFormat.value, {
      limit: itemsPerPage.value,
      offset: offset
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load file data'
  } finally {
    isLoading.value = false
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

// function goToPage(page: number) {
//   if (page >= 1 && page <= totalPages.value) {
//     currentPage.value = page
//   }
// }

// Watch for changes to reload data
watch([currentPage, itemsPerPage], loadFileData)
watch(
  () => props.entry.path,
  () => {
    currentPage.value = 1
    loadFileData()
  }
)

// Load data on mount
onMounted(() => {
  loadFileData()
})

// Expose refresh method for parent container
defineExpose({
  refresh: loadFileData
})
</script>

<template>
  <div
    :class="[
      'bg-white',
      $attrs.class ? $attrs.class : 'shadow-sm ring-1 ring-gray-900/5 rounded-lg'
    ]"
  >
    <!-- Toolbar: pagination controls -->
    <div class="px-4 py-3 border-b border-gray-200">
      <div class="flex items-center justify-end gap-4">
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
      </div>
    </div>

    <!-- Content -->
    <div class="flex flex-col h-[calc(100vh-16rem)] p-4">
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <ArrowPathIcon class="h-8 w-8 text-gray-400 animate-spin" />
      </div>
      <div v-else-if="error" class="text-center py-8">
        <p class="text-sm text-red-600">{{ error }}</p>
      </div>
      <div v-else-if="fileData?.data?.length" class="flex flex-col flex-1 min-h-0">
        <div class="flex-1 overflow-x-auto border border-gray-200 rounded-lg">
          <div class="min-w-[640px]">
            <table class="w-full divide-y divide-gray-300">
              <thead class="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th
                    v-for="column in fileData.schema"
                    :key="column.name"
                    class="px-3 py-2 text-left text-sm font-semibold text-gray-900 bg-gray-50 sticky top-0 whitespace-nowrap"
                  >
                    {{ column.name }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr
                  v-for="(row, rowIndex) in fileData.data"
                  :key="rowIndex"
                  class="hover:bg-gray-50"
                >
                  <td
                    v-for="column in fileData.schema"
                    :key="column.name"
                    class="px-3 py-2 text-sm text-gray-500 whitespace-nowrap"
                  >
                    {{ formatTableValue(row[column.name], column.type) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-between border-t border-gray-200 bg-white py-3">
          <div class="flex flex-1 justify-between sm:hidden">
            <button
              :disabled="currentPage === 1"
              class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
              @click="prevPage"
            >
              Previous
            </button>
            <button
              :disabled="currentPage === totalPages"
              class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
              @click="nextPage"
            >
              Next
            </button>
          </div>
          <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                Showing
                <span class="font-medium">{{ (currentPage - 1) * itemsPerPage + 1 }}</span>
                to
                <span class="font-medium">{{
                  Math.min(currentPage * itemsPerPage, metadata?.rowCount || 0)
                }}</span>
                of
                <span class="font-medium">{{ formatNumber(metadata?.rowCount || 0) }}</span>
                results
              </p>
            </div>
            <div>
              <nav
                class="isolate inline-flex -space-x-px rounded-md shadow-sm"
                aria-label="Pagination"
              >
                <button
                  :disabled="currentPage === 1"
                  class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                  @click="prevPage"
                >
                  <span class="sr-only">Previous</span>
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fill-rule="evenodd"
                      d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
                <span
                  class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0"
                >
                  {{ currentPage }} / {{ totalPages }}
                </span>
                <button
                  :disabled="currentPage === totalPages"
                  class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                  @click="nextPage"
                >
                  <span class="sr-only">Next</span>
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fill-rule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-8">
        <p class="text-sm text-gray-500">No data available</p>
      </div>
    </div>
  </div>
</template>
