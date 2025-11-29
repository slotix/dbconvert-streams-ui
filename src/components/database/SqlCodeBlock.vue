<!-- A reusable component for displaying SQL code with Monaco editor syntax highlighting -->
<script setup lang="ts">
import { computed } from 'vue'
import { SqlViewer } from '@/components/monaco'

interface Props {
  code: string
  title?: string
  index?: number | string
  dialect: string
  compact?: boolean
  showHeader?: boolean
  height?: string
  autoResize?: boolean
  minHeight?: number
  maxHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  showHeader: true
})

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
    :auto-resize="autoResize"
    :min-height="minHeight"
    :max-height="maxHeight"
  />
</template>
