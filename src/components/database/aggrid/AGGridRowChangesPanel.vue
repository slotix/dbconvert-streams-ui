<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import SlideOverPanel from '@/components/common/SlideOverPanel.vue'

export type RowChangeRow = {
  rowId: string
  label: string
  items: Array<{ field: string; oldValue: string; newValue: string }>
}

const props = defineProps<{
  open: boolean
  rows: RowChangeRow[]
  tableName?: string
  sourceName?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'revert', rowId: string, field: string): void
  (e: 'revert-row', rowId: string): void
  (e: 'apply'): void
  (e: 'discard'): void
}>()

const totalFields = computed(() => props.rows.reduce((sum, r) => sum + r.items.length, 0))

const title = computed(() => 'Pending Changes')

const subtitle = computed(() => {
  const parts: string[] = []
  if (props.tableName) parts.push(`Table: ${props.tableName}`)
  if (props.sourceName) parts.push(`Source: ${props.sourceName}`)
  return parts.join(' • ')
})

const footerStats = computed(() => {
  const r = props.rows.length
  const f = totalFields.value
  return `${r} row${r === 1 ? '' : 's'} modified  •  ${f} field${f === 1 ? '' : 's'} changed`
})

function formatRowLabel(label: string): string {
  // matches _ROWID=5 or __rowid=5 (one or more leading underscores)
  const rowidMatch = label.match(/^_+ROWID=(\d+)$/i)
  if (rowidMatch) return `Row ${rowidMatch[1]}`
  return label
}

function onKeyDown(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    emit('apply')
  }
}

onMounted(() => document.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <SlideOverPanel :open="open" :title="title" :subtitle="subtitle" @close="emit('close')">
    <div v-if="rows.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
      No pending edits.
    </div>

    <div v-else class="space-y-3">
      <!-- Row card -->
      <div
        v-for="row in rows"
        :key="row.rowId"
        class="flex rounded-md border border-gray-200/80 dark:border-gray-700/50 overflow-hidden group/row"
      >
        <!-- Teal left accent -->
        <div class="w-0.5 shrink-0 bg-teal-500/40 dark:bg-teal-500/30" />

        <div class="flex-1 min-w-0">
          <!-- Row header -->
          <div
            class="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50/80 dark:bg-gray-800/50"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {{ formatRowLabel(row.label) }}
              </span>
              <span
                class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-200/60 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400"
              >
                {{ row.items.length }} {{ row.items.length === 1 ? 'change' : 'changes' }}
              </span>
            </div>
            <button
              v-if="row.items.length > 1"
              type="button"
              class="opacity-0 group-hover/row:opacity-100 text-[11px] px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-300 dark:hover:border-teal-700 transition-all"
              @click="emit('revert-row', row.rowId)"
            >
              ↺ Revert row
            </button>
          </div>

          <!-- Divider -->
          <div class="h-px bg-gray-100 dark:bg-gray-700/50" />

          <!-- Field rows -->
          <div class="divide-y divide-gray-100/80 dark:divide-gray-700/30">
            <div
              v-for="item in row.items"
              :key="item.field"
              class="flex items-center gap-3 px-3 py-1.5 group/field min-w-0"
            >
              <!-- Field name — sans-serif, muted -->
              <span
                class="text-xs text-gray-500 dark:text-gray-400 w-36 shrink-0 truncate"
                :title="item.field"
              >
                {{ item.field }}
              </span>
              <!-- Old value — "already dead" -->
              <span
                class="text-[11px] font-mono text-gray-400 dark:text-gray-500 line-through decoration-[1px] opacity-50 truncate max-w-[6rem]"
                :title="item.oldValue"
              >
                {{ item.oldValue }}
              </span>
              <span class="text-[10px] text-gray-300 dark:text-gray-600 shrink-0">→</span>
              <!-- New value — accent -->
              <span
                class="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-medium truncate max-w-[6rem]"
                :title="item.newValue"
              >
                {{ item.newValue }}
              </span>
              <!-- Per-field revert — appears on row hover -->
              <button
                type="button"
                class="ml-auto shrink-0 text-[11px] text-gray-400 dark:text-gray-600 hover:text-teal-600 dark:hover:text-teal-400 opacity-0 group-hover/field:opacity-100 transition-all"
                title="Revert this field"
                @click="emit('revert', row.rowId, item.field)"
              >
                ↩
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <div class="w-full flex items-center justify-between gap-3 pr-16">
        <span class="text-xs text-gray-500 dark:text-gray-400">{{ footerStats }}</span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="text-xs rounded-md px-3 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            @click="emit('discard')"
          >
            Discard
          </button>
          <button
            type="button"
            class="text-xs rounded-md px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors"
            title="Apply changes (Ctrl+Enter)"
            @click="emit('apply')"
          >
            Apply
          </button>
        </div>
      </div>
    </template>
  </SlideOverPanel>
</template>
