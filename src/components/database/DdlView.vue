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

const formattedCreateTable = computed(() => {
  try {
    const options = getFormattingOptions(dialect.value)
    return format(props.ddl.createTable, options)
  } catch (error) {
    console.error('Error formatting SQL:', error)
    return props.ddl.createTable
  }
})

const formattedIndexes = computed(() => {
  if (!props.ddl.createIndexes?.length) return ''

  try {
    const options = getFormattingOptions(dialect.value)
    // Format each index, remove trailing semicolons, then join with semicolons and newlines
    return props.ddl.createIndexes
      .map((sql) => format(sql, options).trim().replace(/;+$/, ''))
      .join(';\n')
  } catch (error) {
    console.error('Error formatting indexes:', error)
    return props.ddl.createIndexes.map((sql) => sql.trim().replace(/;+$/, '')).join(';\n')
  }
})
</script>

<template>
  <div class="space-y-8">
    <SqlCodeBlock :code="formattedCreateTable" title="SQL Definition" :dialect="dialect" />
    <SqlCodeBlock
      v-if="formattedIndexes"
      :code="formattedIndexes"
      title="Indexes"
      :dialect="dialect"
    />
  </div>
</template>
