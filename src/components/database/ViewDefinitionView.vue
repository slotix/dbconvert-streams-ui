<!-- A component for displaying formatted view definitions -->
<script setup lang="ts">
import { computed } from 'vue'
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
</script>

<template>
  <div class="mt-4">
    <SqlCodeBlock :code="definition" title="SQL Definition" :dialect="dialect" />
  </div>
</template>
