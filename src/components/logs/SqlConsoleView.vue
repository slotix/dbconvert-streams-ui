<script setup lang="ts">
import { computed } from 'vue'
import SqlCodeBlock from '@/components/database/SqlCodeBlock.vue'
import type { SystemLog } from '@/stores/logs'

const props = defineProps<{
  logs: SystemLog[]
}>()

// Helper to extract SQL metadata from log details
function getSQLMetadata(log: SystemLog) {
  if (!log.details) return null

  return {
    query: log.details.query as string,
    queryType: log.details.queryType as string,
    database: log.details.database as string,
    table: log.details.table as string,
    schema: log.details.schema as string,
    durationMs: log.details.durationMs as number,
    rowCount: log.details.rowCount as number,
    connectionId: log.details.connectionId as string,
    error: log.details.error as string
  }
}

// Format timestamp
function formatTime(timestamp: number): string {
  const timestampInMs = timestamp < 1e12 ? timestamp * 1000 : timestamp
  const date = new Date(timestampInMs)
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Combine all SQL logs into one formatted code block
const combinedSQL = computed(() => {
  const sqlParts: string[] = []

  props.logs.forEach((log) => {
    const metadata = getSQLMetadata(log)
    if (!metadata || !metadata.query) return

    // Create SQL comment with metadata
    const time = formatTime(log.timestamp)
    const dbTable = metadata.schema
      ? `${metadata.database}.${metadata.schema}.${metadata.table}`
      : `${metadata.database}.${metadata.table}`

    const comment = `-- [${time}] ${metadata.queryType} | ${dbTable} | ${metadata.durationMs}ms | ${metadata.rowCount} rows`

    // Add error info if present
    const errorComment = metadata.error ? ` -- ERROR: ${metadata.error}` : ''

    // Use the raw query directly from log details (already in single line format)
    let query = metadata.query.trim()
    if (!query.endsWith(';')) {
      query += ';'
    }

    // Format as single line: comment + query on same line
    sqlParts.push(`${comment}\n${query}${errorComment}`)
  })

  return sqlParts.join('\n\n')
})

// Determine dialect based on database type from first log
const dialect = computed(() => {
  if (props.logs.length === 0) return 'sql'

  const firstLog = props.logs[0]
  const metadata = getSQLMetadata(firstLog)
  if (!metadata) return 'sql'

  // Try to determine dialect from database name or type
  const db = metadata.database?.toLowerCase() || ''
  if (db.includes('postgres') || db.includes('pg')) return 'postgresql'
  if (db.includes('mysql') || db.includes('maria')) return 'mysql'
  if (db.includes('snowflake')) return 'snowflake'

  return 'sql'
})

// Determine dialect based on database type from first log
// const dialect = computed(() => {
//   if (props.logs.length === 0) return 'sql'

//   const firstLog = props.logs[0]
//   const metadata = getSQLMetadata(firstLog)
//   if (!metadata) return 'sql'

//   // Try to determine dialect from database name or type
//   const db = metadata.database?.toLowerCase() || ''
//   if (db.includes('postgres') || db.includes('pg')) return 'postgresql'
//   if (db.includes('mysql') || db.includes('maria')) return 'mysql'
//   if (db.includes('snowflake')) return 'snowflake'

//   return 'sql'
// })

// Copy SQL query to clipboard
async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(combinedSQL.value)
  } catch (err) {
    console.error('Failed to copy SQL:', err)
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div v-if="logs.length === 0" class="flex items-center justify-center h-full text-gray-500">
      <p>No SQL queries yet. Execute queries to see them here.</p>
    </div>

    <div v-else class="overflow-auto h-full">
      <!-- Header with copy button -->
      <div
        class="sticky top-0 bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center"
      >
        <span class="text-sm font-medium text-gray-700">SQL Query History</span>
        <button
          class="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded border text-gray-700 hover:text-gray-900 transition-colors"
          @click="copyToClipboard"
        >
          Copy All
        </button>
      </div>

      <!-- SQL display with syntax highlighting -->
      <div class="p-4">
        <SqlCodeBlock
          :code="combinedSQL"
          title="SQL Query History"
          :dialect="dialect"
          :compact="true"
        />
      </div>
    </div>
  </div>
</template>
