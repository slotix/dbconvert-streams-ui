<!-- A reusable component for displaying SQL code with Monaco editor syntax highlighting -->
<script setup lang="ts">
import { computed } from 'vue'
import { SqlViewer } from '@/components/monaco'

const props = defineProps<{
  code: string
  title?: string
  index?: number | string
  dialect: string
  compact?: boolean
  showHeader?: boolean
  height?: string
}>()

// Compute display title
const displayTitle = computed(() => {
  if (props.index) {
    return `${props.title} ${props.index}`
  }
  return props.title || 'SQL'
})
</script>

<template>
  <SqlViewer
    :code="code"
    :title="displayTitle"
    :dialect="dialect"
    :compact="compact"
    :show-header="showHeader"
    :height="height"
  />
</template>
