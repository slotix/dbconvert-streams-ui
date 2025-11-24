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
}>()

// Compute display title
const displayTitle = computed(() => {
  if (props.index) {
    return `${props.title} ${props.index}`
  }
  return props.title || 'SQL'
})

// Compute height based on compact mode
const viewerHeight = computed(() => {
  if (props.compact) {
    return '200px'
  }
  // Auto-size based on content (with reasonable limits)
  const lines = props.code.split('\n').length
  const minHeight = 150
  const maxHeight = 600
  const lineHeight = 24
  const calculatedHeight = Math.max(minHeight, Math.min(lines * lineHeight + 80, maxHeight))
  return `${calculatedHeight}px`
})
</script>

<template>
  <SqlViewer
    :code="code"
    :title="displayTitle"
    :dialect="dialect"
    :compact="compact"
    :height="viewerHeight"
  />
</template>
