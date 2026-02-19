<!-- A reusable component for displaying SQL code with CodeMirror syntax highlighting -->
<script setup lang="ts">
import { computed } from 'vue'
import SqlCodeMirror from '@/components/codemirror/SqlCodeMirror.vue'

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
  showHeader: false
})

// Compute display title
const displayTitle = computed(() => {
  if (props.index) {
    return `${props.title} ${props.index}`
  }
  return props.title || 'SQL'
})

const resolvedHeight = computed(() => {
  if (props.height) {
    return props.height
  }
  if (!props.autoResize) {
    return props.compact ? '140px' : '200px'
  }

  const lines = Math.max(props.code.split('\n').length, 1)
  const estimated = lines * 22 + 24
  const min = props.minHeight ?? 96
  const max = props.maxHeight ?? 480
  const bounded = Math.min(max, Math.max(min, estimated))
  return `${bounded}px`
})
</script>

<template>
  <div class="flex flex-col">
    <div
      v-if="showHeader"
      class="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 border border-b-0 border-gray-200 dark:border-gray-700 rounded-t-md bg-gray-50 dark:bg-gray-850"
    >
      {{ displayTitle }}
    </div>
    <SqlCodeMirror
      :model-value="code"
      :dialect="dialect"
      :height="resolvedHeight"
      :read-only="true"
      :enable-sql-providers="false"
      :class="{ 'rounded-t-none': showHeader }"
    />
  </div>
</template>
