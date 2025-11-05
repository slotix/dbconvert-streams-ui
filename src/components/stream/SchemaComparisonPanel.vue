<template>
  <div v-if="comparison" class="border-b bg-white">
    <!-- Collapsed State: Summary with Badges -->
    <button
      class="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
      @click="expanded = !expanded"
    >
      <div class="flex items-center gap-3">
        <Squares2X2Icon class="w-5 h-5 text-gray-500" />
        <span class="text-sm font-medium text-gray-900">Schema Comparison</span>

        <!-- Summary Badges -->
        <div class="flex items-center gap-2">
          <span
            v-if="comparison.matching > 0"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded-md font-medium"
          >
            <CheckCircleIcon class="w-3.5 h-3.5" />
            {{ comparison.matching }} match
          </span>
          <span
            v-if="comparison.typeDiff > 0"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-yellow-50 text-yellow-700 rounded-md font-medium"
          >
            <ExclamationTriangleIcon class="w-3.5 h-3.5" />
            {{ comparison.typeDiff }} type diff
          </span>
          <span
            v-if="comparison.missingInTarget > 0"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 rounded-md font-medium"
          >
            <MinusCircleIcon class="w-3.5 h-3.5" />
            {{ comparison.missingInTarget }} removed
          </span>
          <span
            v-if="comparison.newInTarget > 0"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md font-medium"
          >
            <PlusCircleIcon class="w-3.5 h-3.5" />
            {{ comparison.newInTarget }} added
          </span>
        </div>
      </div>

      <ChevronDownIcon
        :class="['w-5 h-5 text-gray-400 transition-transform', { 'rotate-180': expanded }]"
      />
    </button>

    <!-- Expanded State: Side-by-Side Schema View -->
    <div v-if="expanded" class="bg-gray-50">
      <div class="grid grid-cols-2 gap-4 p-4">
        <!-- Source Schema -->
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div
            class="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between"
          >
            <span class="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Source Schema
            </span>
            <span class="text-xs text-gray-500">{{ sourceColumns.length }} columns</span>
          </div>
          <div class="max-h-80 overflow-y-auto custom-scrollbar">
            <SchemaColumnList :columns="sourceColumns" :differences="comparison.sourceDiffs" />
          </div>
        </div>

        <!-- Target Schema -->
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div
            class="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between"
          >
            <span class="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Target Schema
            </span>
            <span class="text-xs text-gray-500">{{ targetColumns.length }} columns</span>
          </div>
          <div class="max-h-80 overflow-y-auto custom-scrollbar">
            <SchemaColumnList :columns="targetColumns" :differences="comparison.targetDiffs" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  ChevronDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  Squares2X2Icon
} from '@heroicons/vue/24/outline'
import SchemaColumnList from './SchemaColumnList.vue'
import type { SQLColumnMeta } from '@/types/metadata'

interface SchemaDifference {
  icon: string
  label: string
  type: 'match' | 'type-diff' | 'missing' | 'new'
}

interface SchemaComparison {
  matching: number
  typeDiff: number
  missingInTarget: number
  newInTarget: number
  sourceDiffs: Record<string, SchemaDifference>
  targetDiffs: Record<string, SchemaDifference>
}

defineProps<{
  sourceColumns: SQLColumnMeta[]
  targetColumns: SQLColumnMeta[]
  comparison: SchemaComparison | null
}>()

const expanded = ref(false)
</script>
