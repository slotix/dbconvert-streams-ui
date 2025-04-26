<!-- A component for displaying formatted DDL statements -->
<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'sql-formatter'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import SqlCodeBlock from './SqlCodeBlock.vue'
import { getDialectFromConnectionType } from '@/utils/sqlDialect'

const props = defineProps<{
    ddl: {
        createTable: string
        createIndexes?: string[]
    }
    connectionType: string
}>()

const emit = defineEmits<{
    (e: 'refresh-metadata'): void
}>()

const formattedCreateTable = computed(() => {
    return format(props.ddl.createTable, {
        language: getDialectFromConnectionType(props.connectionType),
        keywordCase: 'upper',
        tabWidth: 2
    })
})

const formattedIndexes = computed(() => {
    return props.ddl.createIndexes?.map(indexDdl =>
        format(indexDdl, {
            language: getDialectFromConnectionType(props.connectionType),
            keywordCase: 'upper',
            tabWidth: 2
        })
    ) || []
})
</script>

<template>
    <div class="space-y-8">
        <div class="flex justify-between items-center">
            <h3 class="text-base font-semibold leading-6 text-gray-900">DDL Statements</h3>
            <button @click="emit('refresh-metadata')"
                class="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                <ArrowPathIcon class="h-4 w-4 mr-1" />
                Refresh
            </button>
        </div>

        <!-- Create Table -->
        <div>
            <h4 class="text-sm font-medium text-gray-900 mb-4">Create Table</h4>
            <SqlCodeBlock :code="formattedCreateTable" title="SQL Definition" />
        </div>

        <!-- Create Indexes -->
        <div v-if="formattedIndexes.length">
            <h4 class="text-sm font-medium text-gray-900 mb-4">Create Indexes</h4>
            <div v-for="(indexDdl, i) in formattedIndexes" :key="i" class="mt-4">
                <SqlCodeBlock :code="indexDdl" title="Index" :index="i + 1" />
            </div>
        </div>
    </div>
</template>