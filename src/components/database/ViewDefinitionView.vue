<!-- A component for displaying formatted view definitions -->
<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'sql-formatter'
import SqlCodeBlock from './SqlCodeBlock.vue'
import { getDialectFromConnectionType } from '@/utils/sqlDialect'

const props = defineProps<{
    definition: string
    connectionType: string
}>()

const formattedDefinition = computed(() => {
    return format(props.definition, {
        language: getDialectFromConnectionType(props.connectionType),
        keywordCase: 'upper',
        tabWidth: 2,
        indentStyle: 'standard'
    })
})
</script>

<template>
    <div class="space-y-4">
        <h4 class="text-sm font-medium text-gray-900">View Definition</h4>
        <SqlCodeBlock :code="formattedDefinition" title="View Definition" />
    </div>
</template>