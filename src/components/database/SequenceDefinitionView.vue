<script setup lang="ts">
import { computed } from 'vue'
import type { SQLSequenceMeta } from '@/types/metadata'
import { formatNumber } from '@/utils/formats'
import SqlCodeBlock from './SqlCodeBlock.vue'

const props = defineProps<{
  sequenceMeta: SQLSequenceMeta
  connectionType: string
  objectKey?: string
}>()

// Determine SQL dialect from connection type (only PostgreSQL and Snowflake support sequences)
const dialect = computed(() => {
  const normalized = props.connectionType.toLowerCase()
  if (normalized.includes('postgre')) return 'postgresql'
  if (normalized.includes('snowflake')) return 'snowflake'
  return 'sql'
})

// Format large numbers for display (e.g., max bigint values)
function formatSequenceValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  // For very large numbers, use scientific notation or abbreviate
  if (Math.abs(value) > 1e15) {
    return value.toExponential(2)
  }
  return formatNumber(value)
}

const ownerInfo = computed(() => {
  if (props.sequenceMeta.ownerTable && props.sequenceMeta.ownerColumn) {
    return `${props.sequenceMeta.ownerTable}.${props.sequenceMeta.ownerColumn}`
  }
  if (props.sequenceMeta.ownerTable) {
    return props.sequenceMeta.ownerTable
  }
  return null
})

const ddlStatement = computed(() => {
  const seq = props.sequenceMeta
  const schemaPrefix = seq.schema ? `"${seq.schema}".` : ''
  let ddl = `CREATE SEQUENCE ${schemaPrefix}"${seq.name}"`
  ddl += `\n    INCREMENT BY ${seq.increment}`
  ddl += `\n    MINVALUE ${seq.minValue}`
  ddl += `\n    MAXVALUE ${seq.maxValue}`
  ddl += `\n    START WITH ${seq.startValue}`
  if (seq.cacheSize > 0) {
    ddl += `\n    CACHE ${seq.cacheSize}`
  }
  ddl += seq.isCycled ? '\n    CYCLE' : '\n    NO CYCLE'
  ddl += ';'
  return ddl
})
</script>

<template>
  <div class="p-4">
    <!-- Metadata Grid -->
    <div class="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300 mb-6">
      <div class="text-gray-500 dark:text-gray-400">Name</div>
      <div class="font-medium">{{ sequenceMeta.name }}</div>

      <div class="text-gray-500 dark:text-gray-400">Schema</div>
      <div>{{ sequenceMeta.schema || 'default' }}</div>

      <div class="text-gray-500 dark:text-gray-400">Start Value</div>
      <div class="font-mono">{{ formatSequenceValue(sequenceMeta.startValue) }}</div>

      <div class="text-gray-500 dark:text-gray-400">Current Value</div>
      <div class="font-mono">
        <span v-if="sequenceMeta.lastValue !== null && sequenceMeta.lastValue !== undefined">
          {{ formatSequenceValue(sequenceMeta.lastValue) }}
        </span>
        <span v-else class="text-gray-400 dark:text-gray-500 italic">not yet used</span>
      </div>

      <div class="text-gray-500 dark:text-gray-400">Increment</div>
      <div class="font-mono">{{ formatSequenceValue(sequenceMeta.increment) }}</div>

      <div class="text-gray-500 dark:text-gray-400">Min Value</div>
      <div class="font-mono">{{ formatSequenceValue(sequenceMeta.minValue) }}</div>

      <div class="text-gray-500 dark:text-gray-400">Max Value</div>
      <div class="font-mono">{{ formatSequenceValue(sequenceMeta.maxValue) }}</div>

      <div class="text-gray-500 dark:text-gray-400">Cache Size</div>
      <div class="font-mono">{{ sequenceMeta.cacheSize || 1 }}</div>

      <div class="text-gray-500 dark:text-gray-400">Cycle</div>
      <div>
        <span
          :class="
            sequenceMeta.isCycled
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-gray-500 dark:text-gray-400'
          "
        >
          {{ sequenceMeta.isCycled ? 'Yes' : 'No' }}
        </span>
      </div>

      <template v-if="ownerInfo">
        <div class="text-gray-500 dark:text-gray-400">Owner Column</div>
        <div class="font-mono text-blue-600 dark:text-blue-400">{{ ownerInfo }}</div>
      </template>
    </div>

    <!-- DDL Section -->
    <div class="mt-4">
      <SqlCodeBlock
        :code="ddlStatement"
        title="DDL Statement"
        :dialect="dialect"
        show-header
        auto-resize
        :min-height="80"
        :max-height="200"
      />
    </div>
  </div>
</template>
