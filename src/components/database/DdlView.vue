<!-- A component for displaying formatted DDL statements -->
<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'sql-formatter'
import SqlCodeBlock from './SqlCodeBlock.vue'
import { getFormattingOptions } from '@/components/database/sqlDialect'

const props = defineProps<{
    ddl: {
        createTable: string
        createIndexes?: string[]
    }
    connectionType: string
    onRefreshMetadata?: () => void
}>()

const dialect = computed(() => props.connectionType.toLowerCase().includes('mysql') ? 'mysql' : 'postgresql')

const formattedCreateTable = computed(() => {
    try {
        return format(props.ddl.createTable, getFormattingOptions(props.connectionType))
    } catch (error) {
        console.error('Error formatting SQL:', error)
        return props.ddl.createTable
    }
})

const formattedIndexes = computed(() => {
    if (!props.ddl.createIndexes?.length) return ''

    try {
        // Format each index separately and then join with semicolons and newlines
        return props.ddl.createIndexes
            .map(sql => format(sql, getFormattingOptions(props.connectionType)).trim())
            .join(';\n') + ';'
    } catch (error) {
        console.error('Error formatting indexes:', error)
        return props.ddl.createIndexes.join(';\n') + ';'
    }
})
</script>

<template>
    <div class="space-y-8">
        <SqlCodeBlock :code="formattedCreateTable" title="SQL Definition" :dialect="dialect" />
        <SqlCodeBlock v-if="formattedIndexes" :code="formattedIndexes" title="Indexes" :dialect="dialect" />
    </div>
</template>