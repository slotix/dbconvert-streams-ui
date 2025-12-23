<template>
  <div class="space-y-0">
    <div
      v-for="col in columns"
      :key="col.name"
      class="px-4 py-2.5 text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      :class="getDiffClass(col)"
    >
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <span class="font-mono font-medium text-gray-900 dark:text-gray-100">{{ col.name }}</span>
        <span class="text-gray-600 dark:text-gray-400 text-xs">{{ col.dataType }}</span>
        <span
          v-if="col.isPrimaryKey"
          class="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-medium"
        >
          PK
        </span>
        <span
          v-if="!col.isNullable"
          class="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded font-medium"
        >
          NN
        </span>
      </div>

      <div v-if="differences[col.name]" class="flex items-center gap-1.5 ml-2 shrink-0">
        <component :is="getDiffIcon(col)" class="w-3.5 h-3.5" :class="getDiffIconColor(col)" />
        <span class="text-xs text-gray-600 dark:text-gray-400">{{
          differences[col.name].label
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle, CheckCircle, MinusCircle, PlusCircle } from 'lucide-vue-next'
import type { SQLColumnMeta } from '@/types/metadata'

interface SchemaDifference {
  icon: string
  label: string
  type: 'match' | 'type-diff' | 'missing' | 'new'
}

const props = defineProps<{
  columns: SQLColumnMeta[]
  differences: Record<string, SchemaDifference>
}>()

function getDiffClass(col: SQLColumnMeta) {
  const diff = props.differences[col.name]
  if (!diff) return ''

  return {
    'border-l-2 border-green-500': diff.type === 'match',
    'border-l-2 border-yellow-500': diff.type === 'type-diff',
    'border-l-2 border-red-500': diff.type === 'missing',
    'border-l-2 border-blue-500': diff.type === 'new'
  }
}

function getDiffIcon(col: SQLColumnMeta) {
  const diff = props.differences[col.name]
  if (!diff) return null

  const iconMap = {
    match: CheckCircle,
    'type-diff': AlertTriangle,
    missing: MinusCircle,
    new: PlusCircle
  }

  return iconMap[diff.type] || null
}

function getDiffIconColor(col: SQLColumnMeta) {
  const diff = props.differences[col.name]
  if (!diff) return ''

  return {
    'text-green-600': diff.type === 'match',
    'text-yellow-600': diff.type === 'type-diff',
    'text-red-600': diff.type === 'missing',
    'text-blue-600': diff.type === 'new'
  }
}
</script>
