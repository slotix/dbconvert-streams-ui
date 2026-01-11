<script setup lang="ts">
import { computed } from 'vue'
import { Download } from 'lucide-vue-next'
import { useCommonStore } from '@/stores/common'
import type { ColumnSummary } from '@/types/tableSummary'
import { type SummaryResponse, isTableSummary } from '@/types/fileSummary'

const props = defineProps<{
  summary: SummaryResponse | null
  exportBaseName?: string
  disabled?: boolean
}>()

const commonStore = useCommonStore()

const summaryName = computed(() => {
  if (props.exportBaseName) return props.exportBaseName
  const summary = props.summary
  if (!summary) return 'summary'
  if (isTableSummary(summary)) {
    return summary.schema ? `${summary.schema}.${summary.table}` : summary.table
  }
  return summary.path || 'summary'
})

const isDisabled = computed(() => props.disabled || !props.summary)

const summaryJson = computed(() => {
  if (!props.summary) return ''
  return JSON.stringify(props.summary, null, 2)
})

const summaryMarkdown = computed(() => {
  if (!props.summary) return ''
  return buildMarkdown(props.summary, summaryName.value)
})

const summaryCsv = computed(() => {
  if (!props.summary) return ''
  return buildCsv(props.summary)
})

function handleDownloadJson() {
  if (!props.summary) return
  downloadText(summaryJson.value, buildExportFileName('json'), 'application/json')
}

function handleDownloadMarkdown() {
  if (!props.summary) return
  downloadText(summaryMarkdown.value, buildExportFileName('md'), 'text/markdown')
}

function handleDownloadCsv() {
  if (!props.summary) return
  downloadText(summaryCsv.value, buildExportFileName('csv'), 'text/csv')
}

function buildExportFileName(extension: string): string {
  const base = sanitizeFileName(summaryName.value)
  return `${base}_summary.${extension}`
}

function sanitizeFileName(value: string): string {
  return (
    value
      .trim()
      .replace(/[\\/]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .slice(0, 120) || 'summary'
  )
}

function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  commonStore.showNotification(`Downloaded ${filename}`, 'success')
}

function buildMarkdown(summary: SummaryResponse, name: string): string {
  const lines: string[] = []
  lines.push(`# Summary: ${name}`)
  if (isTableSummary(summary)) {
    const tableName = summary.schema ? `${summary.schema}.${summary.table}` : summary.table
    lines.push(`- Table: ${tableName}`)
    if (summary.database) {
      lines.push(`- Database: ${summary.database}`)
    }
  } else {
    lines.push(`- Path: ${summary.path}`)
    lines.push(`- Format: ${summary.format}`)
  }

  lines.push(`- Rows: ${summary.rowCount}`)
  lines.push(`- Columns: ${summary.columnCount}`)
  if (summary.sampled && summary.samplePercent) {
    lines.push(`- Sample: ${summary.samplePercent}%`)
  }
  lines.push(`- Execution: ${summary.executionTimeMs}ms`)
  lines.push('')

  const headers = exportHeaders()
  lines.push(`| ${headers.join(' | ')} |`)
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`)

  summary.columns.forEach((col) => {
    const values = exportRow(col)
    const row = values.map((v) => escapeMarkdownCell(v))
    lines.push(`| ${row.join(' | ')} |`)
  })

  return lines.join('\n')
}

function buildCsv(summary: SummaryResponse): string {
  const headers = exportHeaders()
  const rows = summary.columns.map(exportRow)
  const lines = [headers, ...rows].map((line) => line.map(escapeCsvValue).join(','))
  return lines.join('\n')
}

function exportHeaders(): string[] {
  return [
    'column',
    'type',
    'nullPercent',
    'distinct',
    'min',
    'max',
    'avg',
    'std',
    'q25',
    'q50',
    'q75',
    'count',
    'minLength',
    'maxLength',
    'avgLength'
  ]
}

function exportRow(col: ColumnSummary): string[] {
  return [
    col.name,
    col.type,
    toExportString(col.nullPercentage),
    toExportString(col.approxUnique),
    toExportString(col.min),
    toExportString(col.max),
    toExportString(col.avg),
    toExportString(col.std),
    toExportString(col.q25),
    toExportString(col.q50),
    toExportString(col.q75),
    toExportString(col.count),
    toExportString(col.minLength),
    toExportString(col.maxLength),
    toExportString(col.avgLength)
  ]
}

function toExportString(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <button
      type="button"
      class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="isDisabled"
      @click="handleDownloadMarkdown"
    >
      <Download class="h-3.5 w-3.5 mr-1.5" />
      Markdown
    </button>
    <button
      type="button"
      class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="isDisabled"
      @click="handleDownloadJson"
    >
      <Download class="h-3.5 w-3.5 mr-1.5" />
      JSON
    </button>
    <button
      type="button"
      class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="isDisabled"
      @click="handleDownloadCsv"
    >
      <Download class="h-3.5 w-3.5 mr-1.5" />
      CSV
    </button>
  </div>
</template>
