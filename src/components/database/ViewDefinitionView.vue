<!-- A component for displaying formatted view definitions -->
<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'sql-formatter'
import SqlCodeBlock from './SqlCodeBlock.vue'
import { getFormattingOptions } from '@/components/database/sqlDialect'
// import { getDialectFromConnectionType } from '@/utils/sqlDialect'

const props = defineProps<{
  definition: string
  connectionType: string
}>()

const dialect = computed(() =>
  props.connectionType.toLowerCase().includes('mysql') ? 'mysql' : 'postgresql'
)

const formattedDefinition = computed(() => {
  try {
    return format(props.definition, getFormattingOptions(props.connectionType))
  } catch (error) {
    console.error('Error formatting view definition:', error)
    return props.definition
  }
})
</script>

<template>
  <div class="mt-4">
    <SqlCodeBlock :code="formattedDefinition" title="SQL Definition" :dialect="dialect" />
  </div>
</template>
