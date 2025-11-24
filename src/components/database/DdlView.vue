<!-- A component for displaying formatted DDL statements -->
<script setup lang="ts">
import { computed } from 'vue'
import SqlCodeBlock from './SqlCodeBlock.vue'

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

// Combine indexes into a single SQL string
const indexesSql = computed(() => {
  if (!props.ddl.createIndexes?.length) return ''

  // Join indexes with semicolons and newlines (Monaco will format)
  return props.ddl.createIndexes.map((sql) => sql.trim().replace(/;+$/, '')).join(';\n')
})
</script>

<template>
  <div class="space-y-8">
    <SqlCodeBlock
      v-if="ddl.createTable"
      :code="ddl.createTable"
      title="SQL Definition"
      :dialect="dialect"
      compact
    />
    <SqlCodeBlock v-if="indexesSql" :code="indexesSql" title="Indexes" :dialect="dialect" compact />
  </div>
</template>
