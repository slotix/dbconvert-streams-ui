<!-- A component for displaying formatted view definitions -->
<script setup lang="ts">
import { computed } from 'vue'
import { format as formatSql } from 'sql-formatter'
import SqlCodeBlock from './SqlCodeBlock.vue'

const props = defineProps<{
  definition: string
  connectionType: string
}>()

// Determine SQL dialect from connection type
const dialect = computed(() => {
  const normalized = props.connectionType.toLowerCase()
  if (normalized.includes('mysql')) return 'mysql'
  if (normalized.includes('postgre')) return 'postgresql'
  if (normalized.includes('snowflake')) return 'snowflake'
  return 'sql' // Generic SQL fallback
})

const formattedDefinition = computed(() => {
  const raw = (props.definition || '').trim()
  if (!raw) return ''

  // Avoid re-formatting already multi-line SQL (tables look good as-is; views are often single-line).
  if (raw.includes('\n')) return raw

  try {
    return formatSql(raw, {
      language: dialect.value as never,
      keywordCase: 'upper'
    })
  } catch {
    return raw
  }
})
</script>

<template>
  <div class="mt-4">
    <SqlCodeBlock :code="formattedDefinition" title="SQL Definition" :dialect="dialect" />
  </div>
</template>
