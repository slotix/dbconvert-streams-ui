<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { type SQLTableMeta } from '@/types/metadata'
import connections from '@/api/connections'

const props = defineProps<{
    tableMeta: SQLTableMeta
    connectionId: string
}>()

interface TableData {
    rows: Record<string, any>[]
    count: number
    total_count: number
    limit: number
    offset: number
}

const isLoading = ref(false)
const error = ref<string>()
const tableData = ref<TableData>()
const currentPage = ref(1)
const itemsPerPage = ref(100)
const skipCount = ref(false)

async function loadTableData() {
    isLoading.value = true
    error.value = undefined

    try {
        const offset = (currentPage.value - 1) * itemsPerPage.value
        const params = {
            limit: itemsPerPage.value,
            offset: offset,
            skip_count: skipCount.value,
            schema: props.tableMeta.Type?.toLowerCase() === 'postgresql' ? props.tableMeta.Schema : undefined
        }

        const data = await connections.getTableData(props.connectionId, props.tableMeta.Name, params)
        tableData.value = data
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load table data'
    } finally {
        isLoading.value = false
    }
}

// Reset pagination and reload data when table changes
watch(() => props.tableMeta, () => {
    currentPage.value = 1
    loadTableData()
}, { deep: true })

// Reload data when page or items per page changes
watch([currentPage, itemsPerPage, skipCount], () => {
    loadTableData()
})

// Load data initially
loadTableData()

const totalPages = computed(() => {
    if (!tableData.value?.total_count) return 1
    return Math.ceil(tableData.value.total_count / itemsPerPage.value)
})

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
</script>

<template>
    <div :class="[
        'bg-white',
        $attrs.class ? $attrs.class : 'shadow-sm ring-1 ring-gray-900/5 rounded-lg'
    ]">
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-200">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-medium leading-6 text-gray-900">
                    Table Data
                </h3>
                <div class="flex items-center gap-4">
                    <!-- Items per page selector -->
                    <div class="flex items-center gap-2">
                        <label for="items-per-page" class="text-sm text-gray-600">Rows per page:</label>
                        <select id="items-per-page" v-model="itemsPerPage"
                            class="rounded-md border-gray-300 py-1.5 text-sm focus:border-gray-500 focus:ring-gray-500">
                            <option :value="10">10</option>
                            <option :value="25">25</option>
                            <option :value="50">50</option>
                            <option :value="100">100</option>
                            <option :value="500">500</option>
                            <option :value="1000">1000</option>
                        </select>
                    </div>
                    <!-- Skip count toggle -->
                    <div class="flex items-center gap-2">
                        <input id="skip-count" v-model="skipCount" type="checkbox"
                            class="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500" />
                        <label for="skip-count" class="text-sm text-gray-600">Skip row count</label>
                    </div>
                </div>
            </div>
        </div>

        <!-- Content -->
        <div class="p-4">
            <!-- Loading state -->
            <div v-if="isLoading" class="flex items-center justify-center py-8">
                <ArrowPathIcon class="h-8 w-8 text-gray-400 animate-spin" />
            </div>

            <!-- Error state -->
            <div v-else-if="error" class="text-center py-8">
                <p class="text-sm text-red-600">{{ error }}</p>
            </div>

            <!-- Data table -->
            <div v-else-if="tableData?.rows?.length" class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-300">
                    <!-- Table headers -->
                    <thead>
                        <tr class="bg-gray-50">
                            <th v-for="(value, key) in tableData.rows[0]" :key="key"
                                class="px-3 py-2 text-left text-sm font-semibold text-gray-900">
                                {{ key }}
                            </th>
                        </tr>
                    </thead>
                    <!-- Table body -->
                    <tbody class="divide-y divide-gray-200 bg-white">
                        <tr v-for="(row, index) in tableData.rows" :key="index">
                            <td v-for="(value, key) in row" :key="key"
                                class="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                                {{ value }}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- Pagination -->
                <div class="mt-4 flex items-center justify-between">
                    <div class="text-sm text-gray-700">
                        Showing {{ tableData.offset + 1 }} to {{ tableData.offset + tableData.rows.length }}
                        <template v-if="!skipCount">
                            of {{ tableData.total_count }}
                        </template>
                        rows
                    </div>
                    <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm">
                        <button v-for="page in displayedPages" :key="page" :class="[
                            'relative inline-flex items-center px-3 py-1.5 text-sm font-medium',
                            currentPage === page
                                ? 'bg-gray-600 text-white'
                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                        ]" @click="currentPage = page">
                            {{ page }}
                        </button>
                    </nav>
                </div>
            </div>

            <!-- Empty state -->
            <div v-else class="text-center py-8">
                <p class="text-sm text-gray-500">No data available</p>
            </div>
        </div>
    </div>
</template>