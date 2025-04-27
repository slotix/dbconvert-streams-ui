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
}>()

const dialect = computed(() => props.connectionType.toLowerCase().includes('mysql') ? 'mysql' : 'postgresql')

const formattedCreateTable = computed(() => {
    return format(props.ddl.createTable, getFormattingOptions(props.connectionType))
})

const formattedIndexes = computed(() => {
    if (!props.ddl.createIndexes?.length) return ''

    // Format each index separately and then join with semicolons and newlines
    return props.ddl.createIndexes
        .map(sql => format(sql, getFormattingOptions(props.connectionType)).trim())
        .join(';\n') + ';'
})
</script>

<template>
    <div class="space-y-8">
        <SqlCodeBlock :code="formattedCreateTable" title="SQL Definition" :dialect="dialect" />
        <SqlCodeBlock v-if="formattedIndexes" :code="formattedIndexes" title="Indexes" :dialect="dialect" />
    </div>
</template>