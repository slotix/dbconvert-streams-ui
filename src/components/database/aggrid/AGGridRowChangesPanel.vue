<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import SlideOverPanel from '@/components/common/SlideOverPanel.vue'
import type { RowChangeRow, RowChangeRowKind } from '@/utils/rowChangeRows'

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
  (e: 'discard-kind', kind: 'insert' | 'edit' | 'delete'): void
}>()

const expandedRowIds = ref<Set<string>>(new Set())
const selectedKind = ref<'all' | RowChangeRowKind>('all')
const showAllInsertColumns = ref(false)

const totalFields = computed(() => props.rows.reduce((sum, row) => sum + row.items.length, 0))
const title = computed(() => `Pending changes (${props.rows.length})`)

const subtitle = computed(() => {
  const parts: string[] = []
  if (props.tableName) parts.push(props.tableName)
  if (props.sourceName) parts.push(props.sourceName)
  return parts.join(' • ')
})

const insertRows = computed(() => props.rows.filter((row) => getRowKind(row) === 'insert'))
const editRows = computed(() => props.rows.filter((row) => getRowKind(row) === 'edit'))
const deleteRows = computed(() => props.rows.filter((row) => getRowKind(row) === 'delete'))

const visibleKinds = computed(() => {
  if (selectedKind.value === 'all') return ['insert', 'edit', 'delete'] as const
  return [selectedKind.value] as const
})

const summaryLine = computed(
  () =>
    `${insertRows.value.length} ${insertRows.value.length === 1 ? 'insert' : 'inserts'} • ${editRows.value.length} ${editRows.value.length === 1 ? 'update' : 'updates'} • ${deleteRows.value.length} ${deleteRows.value.length === 1 ? 'delete' : 'deletes'}`
)

const footerStats = computed(() => {
  const rowCount = props.rows.length
  const changedFields = totalFields.value
  return `${rowCount} row${rowCount === 1 ? '' : 's'} staged • ${changedFields} field${changedFields === 1 ? '' : 's'} changed`
})

function getRowKind(row: RowChangeRow): RowChangeRowKind {
  return row.kind || 'edit'
}

function kindBadgeClass(kind: RowChangeRowKind): string {
  if (kind === 'insert') return 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
  if (kind === 'delete') return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  return 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
}

function kindLabel(kind: RowChangeRowKind): string {
  if (kind === 'insert') return 'Inserted'
  if (kind === 'delete') return 'Deleted'
  return 'Updated'
}

function kindFilterLabel(kind: 'all' | RowChangeRowKind): string {
  if (kind === 'all') return 'All'
  if (kind === 'insert') return 'Inserts'
  if (kind === 'delete') return 'Deletes'
  return 'Updates'
}

function sectionTitle(kind: RowChangeRowKind): string {
  if (kind === 'insert') return 'Inserts'
  if (kind === 'delete') return 'Deletes'
  return 'Updates'
}

function sectionRows(kind: RowChangeRowKind): RowChangeRow[] {
  if (kind === 'insert') return insertRows.value
  if (kind === 'delete') return deleteRows.value
  return editRows.value
}

function sectionCount(kind: RowChangeRowKind): number {
  return sectionRows(kind).length
}

function formatRowLabel(label: string): string {
  const rowIdMatch = label.match(/^_+ROWID=(\d+)$/i)
  if (rowIdMatch) return `row_id=${rowIdMatch[1]}`
  const pendingInsertMatch = label.match(/^__pending_insert__=(.+)$/i)
  if (pendingInsertMatch) return pendingInsertMatch[1]
  return label
}

function insertLabel(row: RowChangeRow): string {
  const index = insertRows.value.findIndex((r) => r.rowId === row.rowId)
  return String(index + 1)
}

function getVisibleItems(row: RowChangeRow) {
  return row.items
}

const insertTableColumns = computed(() => {
  const columns: string[] = []
  for (const row of insertRows.value) {
    for (const item of getVisibleItems(row)) {
      if (!columns.includes(item.field)) columns.push(item.field)
    }
  }
  return columns
})

const visibleInsertColumns = computed(() => {
  if (showAllInsertColumns.value) return insertTableColumns.value
  return insertTableColumns.value.slice(0, 6)
})

function isLikelyAutoIdField(field: string): boolean {
  const f = field.toLowerCase()
  return f === 'id' || f.endsWith('_id')
}

function getInsertFieldValue(row: RowChangeRow, field: string): string {
  const item = getVisibleItems(row).find((entry) => entry.field === field)
  if (item) return item.newValue
  if (isLikelyAutoIdField(field)) return '(auto)'
  return '—'
}

function truncateValue(value: string, limit = 36): string {
  if (value.length <= limit) return value
  return `${value.slice(0, Math.max(0, limit - 1))}…`
}

function insertExpandedItems(row: RowChangeRow) {
  const visible = new Set(visibleInsertColumns.value)
  return getVisibleItems(row).filter((item) => !visible.has(item.field))
}

function canExpandInsertRow(row: RowChangeRow): boolean {
  return insertExpandedItems(row).length > 0
}

function toggleInsertColumns(): void {
  showAllInsertColumns.value = !showAllInsertColumns.value
}

function undoAllInserts(): void {
  onDiscardKind('insert')
}

function isExpanded(rowId: string): boolean {
  return expandedRowIds.value.has(rowId)
}

function toggleExpanded(rowId: string): void {
  const next = new Set(expandedRowIds.value)
  if (next.has(rowId)) next.delete(rowId)
  else next.add(rowId)
  expandedRowIds.value = next
}

function shouldConfirmDiscard(count: number): boolean {
  if (count <= 3) return true
  return window.confirm(`Discard ${count} staged changes?`)
}

function onDiscardAll(): void {
  if (!shouldConfirmDiscard(props.rows.length)) return
  emit('discard')
}

function onDiscardKind(kind: RowChangeRowKind): void {
  const count = sectionCount(kind)
  if (!count) return
  if (!shouldConfirmDiscard(count)) return
  emit('discard-kind', kind)
}

function onKeyDown(event: KeyboardEvent): void {
  if (!props.open) return
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    emit('apply')
  }
}

onMounted(() => document.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <SlideOverPanel :open="open" :title="title" :subtitle="subtitle" @close="emit('close')">
    <div v-if="rows.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
      No pending changes.
    </div>

    <div v-else class="space-y-4">
      <div class="space-y-2 rounded-md border border-gray-200/80 dark:border-gray-700/60 p-3">
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ summaryLine }}</p>
        <div
          class="flex items-center gap-1 pt-1 border-b border-gray-200/70 dark:border-gray-700/60"
        >
          <button
            v-for="kind in ['all', 'insert', 'edit', 'delete'] as const"
            :key="kind"
            type="button"
            class="text-xs px-2 py-1.5 border-b-2 -mb-px transition-colors"
            :class="
              selectedKind === kind
                ? 'border-teal-500 text-teal-700 dark:text-teal-300'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            "
            @click="selectedKind = kind"
          >
            {{ kindFilterLabel(kind) }}
          </button>
        </div>
      </div>

      <div v-for="kind in visibleKinds" :key="kind" class="space-y-2">
        <div v-if="sectionCount(kind) > 0" class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <h3
              class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              {{ sectionTitle(kind) }}
            </h3>
            <span
              class="text-[10px] px-1.5 py-0.5 rounded bg-gray-200/60 dark:bg-gray-700/60 text-gray-500 dark:text-gray-300"
            >
              {{ sectionCount(kind) }}
            </span>
          </div>

          <div v-if="kind === 'insert'" class="flex items-center gap-2">
            <button
              type="button"
              class="text-xs rounded-md px-2 py-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              @click="undoAllInserts"
            >
              Undo all
            </button>
            <button
              v-if="insertTableColumns.length > 6"
              type="button"
              class="text-xs rounded-md px-2 py-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              @click="toggleInsertColumns"
            >
              {{ showAllInsertColumns ? 'Collapse' : 'Expand' }}
            </button>
          </div>
        </div>

        <div
          v-if="kind === 'insert' && sectionCount(kind) > 0"
          class="rounded-md border border-gray-200/80 dark:border-gray-700/60"
        >
          <div class="overflow-x-auto">
            <table class="min-w-full text-xs">
              <thead class="bg-gray-50/70 dark:bg-gray-800/70">
                <tr>
                  <th
                    class="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap"
                  >
                    #
                  </th>
                  <th
                    v-for="field in visibleInsertColumns"
                    :key="`insert-col-${field}`"
                    class="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap"
                  >
                    {{ field }}
                  </th>
                  <th
                    class="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <template v-for="row in insertRows" :key="`insert-table-${row.rowId}`">
                  <tr
                    class="border-t border-gray-100 dark:border-gray-700/50"
                    :class="
                      canExpandInsertRow(row)
                        ? 'cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                        : ''
                    "
                    @click="canExpandInsertRow(row) ? toggleExpanded(row.rowId) : undefined"
                  >
                    <td
                      class="px-3 py-2 text-sm text-gray-800 dark:text-gray-100 whitespace-nowrap"
                    >
                      {{ insertLabel(row) }}
                    </td>
                    <td
                      v-for="field in visibleInsertColumns"
                      :key="`insert-cell-${row.rowId}-${field}`"
                      class="px-3 py-2 font-mono text-teal-600 dark:text-teal-400 whitespace-nowrap"
                      :title="getInsertFieldValue(row, field)"
                    >
                      {{ truncateValue(getInsertFieldValue(row, field)) }}
                    </td>
                    <td class="px-3 py-2 text-right" @click.stop>
                      <button
                        type="button"
                        class="text-[12px] rounded border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400 w-6 h-6 inline-flex items-center justify-center transition-colors"
                        title="Undo"
                        @click="emit('revert-row', row.rowId)"
                      >
                        ↩
                      </button>
                    </td>
                  </tr>

                  <tr
                    v-if="isExpanded(row.rowId) && canExpandInsertRow(row)"
                    class="border-t border-gray-100 dark:border-gray-700/50"
                  >
                    <td
                      :colspan="visibleInsertColumns.length + 2"
                      class="px-3 py-2 bg-gray-50/40 dark:bg-gray-800/30"
                    >
                      <ul class="space-y-1 text-xs">
                        <li
                          v-for="item in insertExpandedItems(row)"
                          :key="`insert-expanded-${row.rowId}-${item.field}`"
                          class="flex items-start gap-2"
                        >
                          <span class="text-gray-500 dark:text-gray-400 min-w-[110px]"
                            >{{ item.field }}:</span
                          >
                          <span
                            class="font-mono text-teal-600 dark:text-teal-400"
                            :title="item.newValue"
                            >{{ truncateValue(item.newValue) }}</span
                          >
                        </li>
                      </ul>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <div
          v-else-if="kind === 'delete' && sectionCount(kind) > 0"
          class="rounded-md border border-gray-200/80 dark:border-gray-700/60"
        >
          <ul class="divide-y divide-gray-100 dark:divide-gray-700/50">
            <li
              v-for="row in deleteRows"
              :key="`delete-list-${row.rowId}`"
              class="flex items-center justify-between gap-3 px-3 py-2"
            >
              <span class="text-sm text-gray-800 dark:text-gray-100">{{
                formatRowLabel(row.label)
              }}</span>
              <button
                type="button"
                class="text-[11px] px-2 py-0.5 rounded border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Undo"
                @click="emit('revert-row', row.rowId)"
              >
                Undo
              </button>
            </li>
          </ul>
        </div>

        <div v-else-if="sectionCount(kind) > 0" class="space-y-2">
          <div
            v-for="row in sectionRows(kind)"
            :key="`${kind}-${row.rowId}`"
            class="rounded-md border border-gray-200/80 dark:border-gray-700/60 overflow-hidden"
          >
            <div
              class="flex items-start justify-between gap-3 px-3 py-2 bg-gray-50/70 dark:bg-gray-800/50"
            >
              <div class="min-w-0 space-y-1">
                <div class="flex items-center gap-2">
                  <span
                    class="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    :class="kindBadgeClass(kind)"
                  >
                    {{ kindLabel(kind) }}
                  </span>
                  <span class="text-sm text-gray-800 dark:text-gray-100 truncate">
                    {{ formatRowLabel(row.label) }}
                  </span>
                </div>

                <ul v-if="kind === 'edit'" class="space-y-1 text-xs">
                  <li
                    v-for="item in getVisibleItems(row)"
                    :key="`${kind}-preview-${row.rowId}-${item.field}`"
                    class="flex items-start gap-2"
                  >
                    <span class="text-gray-500 dark:text-gray-400 min-w-[110px]"
                      >{{ item.field }}:</span
                    >

                    <template v-if="kind === 'edit'">
                      <span
                        class="font-mono text-gray-400 dark:text-gray-500 line-through decoration-1"
                        :title="item.oldValue"
                        >{{ truncateValue(item.oldValue) }}</span
                      >
                      <span class="text-gray-400 dark:text-gray-500">→</span>
                      <span
                        class="font-mono text-teal-600 dark:text-teal-400"
                        :title="item.newValue"
                        >{{ truncateValue(item.newValue) }}</span
                      >
                    </template>
                  </li>
                </ul>
              </div>

              <div class="flex items-center gap-2" @click.stop>
                <button
                  type="button"
                  class="text-[11px] px-2 py-0.5 rounded border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Undo"
                  @click="emit('revert-row', row.rowId)"
                >
                  Undo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="w-full flex items-center justify-between gap-3 pr-16">
        <span class="text-xs text-gray-500 dark:text-gray-400">{{ footerStats }}</span>

        <div class="flex items-center gap-2">
          <div class="flex items-center">
            <button
              type="button"
              class="text-xs rounded-l-md px-3 py-1.5 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 bg-white dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors whitespace-nowrap"
              @click="onDiscardAll"
            >
              Discard all
            </button>

            <details class="relative">
              <summary
                class="list-none text-xs rounded-r-md px-2 py-1.5 border border-l-0 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 bg-white dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
              >
                ▾
              </summary>
              <div
                class="absolute right-0 bottom-8 min-w-[170px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm py-1 z-20"
              >
                <button
                  type="button"
                  class="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  @click="onDiscardKind('insert')"
                >
                  Discard inserts
                </button>
                <button
                  type="button"
                  class="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  @click="onDiscardKind('edit')"
                >
                  Discard updates
                </button>
                <button
                  type="button"
                  class="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  @click="onDiscardKind('delete')"
                >
                  Discard deletes
                </button>
              </div>
            </details>
          </div>

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
