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
  dialect: string
  onRefreshMetadata?: () => void
}>()

// Use the explicitly passed dialect
const dialect = computed(() => props.dialect)

const ddlFormatOverrides = {
  indentStyle: 'standard' as const,
  expressionWidth: 40
}

const formatWithOverrides = (sql: string) => {
  const options = getFormattingOptions(dialect.value)
  return format(sql, {
    ...options,
    ...ddlFormatOverrides
  })
}

const formattedCreateTable = computed(() => {
  if (!props.ddl?.createTable) {
    return ''
  }

  try {
    return formatWithOverrides(props.ddl.createTable)
  } catch (error) {
    console.error('Error formatting SQL:', error)
    return props.ddl.createTable
  }
})

const formattedIndexes = computed(() => {
  if (!props.ddl.createIndexes?.length) return ''

  try {
    // Format each index, remove trailing semicolons, then join with semicolons and newlines
    return props.ddl.createIndexes
      .map((sql) => formatWithOverrides(sql).trim().replace(/;+$/, ''))
      .join(';\n')
  } catch (error) {
    console.error('Error formatting indexes:', error)
    return props.ddl.createIndexes.map((sql) => sql.trim().replace(/;+$/, '')).join(';\n')
  }
})
</script>

<template>
  <div class="space-y-8">
    <SqlCodeBlock :code="formattedCreateTable" title="SQL Definition" :dialect="dialect" compact />
    <SqlCodeBlock
      v-if="formattedIndexes"
      :code="formattedIndexes"
      title="Indexes"
      :dialect="dialect"
      compact
    />
  </div>
</template>
