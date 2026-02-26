<template>
  <div class="flex flex-col min-h-0 h-full">
    <!-- Toolbar -->
    <div
      class="@container/toolbar bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 gap-1.5 px-2.5 @[620px]/toolbar:gap-2 @[620px]/toolbar:px-3 py-1.5 flex items-center"
    >
      <button
        :disabled="isExecuting"
        :title="`Run query (${runShortcutHint})`"
        class="inline-flex items-center whitespace-nowrap px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="handleRunClick"
      >
        <Play class="h-3.5 w-3.5 mr-1.5" />
        {{ isExecuting ? 'Running...' : hasSelectedSql ? 'Run selected' : 'Run' }}
      </button>

      <div ref="formatDropdownRef" class="relative inline-flex">
        <button
          :disabled="isFormatClickDebounced"
          class="inline-flex items-center px-2 py-1.5 border border-gray-300 dark:border-gray-600 border-r-0 text-xs font-medium rounded-l shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          :title="formatButtonTitle"
          @click="handleFormatClick"
        >
          <Wand2 class="h-3.5 w-3.5" />
          <span class="ml-1 hidden @[620px]/toolbar:inline">Format</span>
        </button>

        <button
          :disabled="isFormatClickDebounced"
          class="inline-flex items-center justify-center px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-r shadow-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          :class="formatState === 'compacted' ? 'text-teal-700 dark:text-teal-300' : ''"
          :title="'More formatting options'"
          @click.stop="toggleFormatMenu"
        >
          <ChevronDown class="h-3.5 w-3.5" />
        </button>

        <div
          v-if="showFormatMenu"
          ref="formatMenuRef"
          class="absolute left-0 top-full mt-1 min-w-[140px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-[210] overflow-hidden"
        >
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            :title="compactButtonTitle"
            @click="handleCompactClick"
          >
            <AlignJustify class="h-3.5 w-3.5" />
            <span>Compact</span>
          </button>
        </div>
      </div>

      <button
        :disabled="!hasQueryToCopy"
        class="inline-flex items-center px-2 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
        :title="isCopyFeedbackVisible ? 'Copied' : 'Copy SQL'"
        @click="copyCurrentQuery"
      >
        <Check v-if="isCopyFeedbackVisible" class="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
        <Copy v-else class="h-3.5 w-3.5" />
      </button>

      <!-- Divider -->
      <div class="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>

      <!-- Templates Dropdown -->
      <div v-if="templates.length > 0" ref="templatesDropdownRef" class="relative">
        <button
          class="inline-flex items-center px-2 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          :title="`Open template picker (${shortcutHint})`"
          @click="toggleTemplates"
        >
          <FileText class="h-3.5 w-3.5 @[620px]/toolbar:mr-1" />
          <span class="hidden @[620px]/toolbar:inline">Templates</span>
          <ChevronDown class="h-3 w-3 ml-0.5 @[620px]/toolbar:ml-1" />
        </button>
      </div>
      <SqlTemplatePicker
        ref="templatePickerRef"
        :templates="templates"
        :dialect="dialect"
        :trigger-ref="templatesDropdownRef"
        @select="selectTemplate"
      />

      <!-- History Dropdown -->
      <div ref="historyDropdownRef" class="relative">
        <button
          class="inline-flex items-center px-2 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          :disabled="history.length === 0"
          :class="{ 'opacity-50 cursor-not-allowed': history.length === 0 }"
          :title="historyButtonTitle"
          @click="toggleHistory"
        >
          <Clock class="h-3.5 w-3.5 @[620px]/toolbar:mr-1" />
          <span class="hidden @[620px]/toolbar:inline">History</span>
          <span v-if="history.length > 0" class="ml-1 text-gray-400 hidden @[620px]/toolbar:inline">
            ({{ history.length }})
          </span>
          <span
            v-if="history.length > 0"
            class="ml-1 rounded-full bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] leading-none text-gray-600 dark:text-gray-300 @[620px]/toolbar:hidden"
          >
            {{ history.length }}
          </span>
        </button>
      </div>
      <Teleport to="body">
        <div
          v-if="showHistory && history.length > 0"
          ref="historyMenuRef"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[210] overflow-hidden flex flex-col"
          :style="historyMenuStyle"
        >
          <div class="px-3 pt-2.5 pb-2 border-b border-gray-200 dark:border-gray-700/80">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">History</span>
              <span class="text-[10px] text-gray-500 dark:text-gray-400">
                {{ filteredHistory.length }} / {{ history.length }}
              </span>
            </div>
            <div class="mt-2 relative">
              <Search
                class="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                ref="historySearchInputRef"
                v-model="historySearch"
                type="text"
                placeholder="Search history..."
                class="w-full pl-8 pr-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-850 text-xs text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto p-1.5 pb-3" role="list">
            <div
              v-for="(item, index) in filteredHistory"
              :key="historyKey(item, index)"
              class="group relative flex items-center gap-2 rounded-md px-2 py-1.5 mb-1 transition-colors border border-transparent hover:bg-gray-100/80 dark:hover:bg-gray-700/50 hover:border-gray-200/70 dark:hover:border-gray-600/70"
              :class="{
                'bg-teal-50/70 dark:bg-teal-900/20 border-teal-200/70 dark:border-teal-700/40':
                  mostRecentHistoryId && item.id === mostRecentHistoryId,
                'font-semibold': item.pinned
              }"
              role="listitem"
              tabindex="0"
              @click="selectHistoryItem(item)"
              @keydown.enter.prevent="selectHistoryItem(item)"
              @keydown.space.prevent="selectHistoryItem(item)"
            >
              <span
                class="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-teal-500 opacity-0 group-hover:opacity-70"
                :class="{ 'opacity-100': mostRecentHistoryId && item.id === mostRecentHistoryId }"
              />
              <span class="shrink-0 text-[10px] text-gray-500 dark:text-gray-400 w-[74px]">
                {{ formatHistoryTime(item.timestamp) }}
              </span>
              <span
                class="min-w-0 flex-1 font-mono text-[12px] leading-5 text-gray-700 dark:text-gray-300 truncate"
              >
                {{ historyQueryPreview(item.query) }}
              </span>
              <span
                class="shrink-0 px-1.5 py-0.5 rounded-full border border-gray-300 dark:border-gray-600 text-[10px] leading-none text-gray-600 dark:text-gray-400"
              >
                {{ historyAliasBadge(item) }}
              </span>
              <span
                class="shrink-0 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
              >
                <button
                  type="button"
                  class="p-1 rounded text-gray-500 hover:text-teal-600 hover:bg-teal-100/70 dark:hover:text-teal-300 dark:hover:bg-teal-900/35"
                  title="Re-run"
                  @click.stop="rerunHistoryItem(item)"
                >
                  <Play class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  class="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-200/70 dark:hover:text-gray-200 dark:hover:bg-gray-700/70"
                  title="Copy SQL"
                  @click.stop="copyHistoryQuery(item)"
                >
                  <Copy class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  class="p-1 rounded text-gray-500 hover:text-amber-500 hover:bg-amber-100/70 dark:hover:bg-amber-900/25"
                  :title="item.pinned ? 'Unpin' : 'Pin'"
                  @click.stop="toggleHistoryPin(item)"
                >
                  <Pin
                    class="h-3.5 w-3.5"
                    :class="{ 'fill-current text-amber-500': item.pinned }"
                  />
                </button>
                <button
                  type="button"
                  class="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-100/70 dark:hover:text-blue-300 dark:hover:bg-blue-900/30"
                  title="Open in new tab"
                  @click.stop="openHistoryNewTab(item)"
                >
                  <ExternalLink class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  class="p-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-100/70 dark:hover:text-red-300 dark:hover:bg-red-900/25"
                  title="Delete from history"
                  @click.stop="deleteHistoryItem(item)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </span>
            </div>

            <div
              v-if="filteredHistory.length === 0"
              class="px-2 py-3 text-xs text-gray-500 dark:text-gray-400"
            >
              No history matches "{{ historySearch }}".
            </div>
            <div aria-hidden="true" class="h-2"></div>
          </div>
        </div>
      </Teleport>

      <div class="flex-1"></div>
    </div>

    <!-- SQL Editor -->
    <div class="flex-1 overflow-hidden bg-white dark:bg-gray-900 h-full min-h-0">
      <SqlCodeMirror
        ref="sqlEditorRef"
        :model-value="modelValue"
        :dialect="dialect"
        :lsp-context="lspContext"
        :enable-sql-providers="true"
        :enable-execute="true"
        :enable-format-action="true"
        fill-parent
        @update:model-value="$emit('update:modelValue', $event)"
        @execute="emitExecute"
        @selection-change="hasSelectedSql = $event"
        @format="handleEditorFormatRequest"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import SqlCodeMirror from '@/components/codemirror/SqlCodeMirror.vue'
import SqlTemplatePicker from '@/components/database/sql-console/SqlTemplatePicker.vue'
import type {
  SqlCodeMirrorExpose,
  SqlCodeMirrorSelectionRange
} from '@/components/codemirror/sqlCodeMirrorTypes'
import type { SqlLspConnectionContext } from '@/composables/useSqlLspProviders'
import type { QueryTemplate } from '@/components/console/queryTemplates'
import type { FormatMode, QueryHistoryItem } from '@/composables/useConsoleTab'
import {
  AlignJustify,
  Check,
  Copy,
  ChevronDown,
  Clock,
  ExternalLink,
  FileText,
  Pin,
  Play,
  Search,
  Trash2,
  Wand2
} from 'lucide-vue-next'

type HistoryItem = QueryHistoryItem

type Template = QueryTemplate
type SqlEditorExpose = SqlCodeMirrorExpose & { hasSelection?: () => boolean }

const props = defineProps<{
  modelValue: string
  dialect: string
  lspContext?: SqlLspConnectionContext
  isExecuting: boolean
  formatState?: 'formatted' | 'compacted'
  templates?: Template[]
  history?: HistoryItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  execute: [selectedSql?: string]
  format: [mode?: FormatMode]
  'select-template': [query: string]
  'select-history': [item: HistoryItem]
  'rerun-history': [item: HistoryItem]
  'delete-history': [item: HistoryItem]
  'toggle-history-pin': [item: HistoryItem]
  'open-history-new-tab': [item: HistoryItem]
}>()

// Use defaults for optional props
const templates = computed(() => props.templates || [])
const history = computed(() => props.history || [])

const sqlEditorRef = ref<SqlEditorExpose | null>(null)
const templatePickerRef = ref<InstanceType<typeof SqlTemplatePicker> | null>(null)
const hasSelectedSql = ref(false)
const formatDropdownRef = ref<HTMLElement | null>(null)
const formatMenuRef = ref<HTMLElement | null>(null)
const templatesDropdownRef = ref<HTMLElement | null>(null)
const historyDropdownRef = ref<HTMLElement | null>(null)
const historyMenuRef = ref<HTMLElement | null>(null)
const historySearchInputRef = ref<HTMLInputElement | null>(null)
const showHistory = ref(false)
const showFormatMenu = ref(false)
const historySearch = ref('')
const historyMenuStyle = ref<Record<string, string>>({})
const isMacPlatform = computed(
  () =>
    typeof navigator !== 'undefined' &&
    /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent || '')
)
const shortcutHint = computed(() => (isMacPlatform.value ? '⌘K' : 'Ctrl+K'))
const runShortcutHint = computed(() => (isMacPlatform.value ? '⌘Enter' : 'Ctrl+Enter'))
const historyButtonTitle = computed(() =>
  history.value.length > 0 ? `History (${history.value.length})` : 'History'
)
const hasQueryToCopy = computed(() => props.modelValue.trim().length > 0)
const formatButtonTitle = computed(() => 'Format SQL via LSP (Shift+Alt+F)')
const compactButtonTitle = computed(() => 'Compact SQL')
const isFormatClickDebounced = ref(false)
const isCopyFeedbackVisible = ref(false)
let formatDebounceTimer: ReturnType<typeof setTimeout> | null = null
let copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null
let viewportUpdateRafId: number | null = null

const sortedHistory = computed(() =>
  [...history.value].sort((a, b) => {
    const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
    if (pinDiff !== 0) return pinDiff
    return b.timestamp - a.timestamp
  })
)

const mostRecentHistoryId = computed(() => {
  const newest = history.value.reduce<HistoryItem | null>((latest, item) => {
    if (!latest) return item
    return item.timestamp > latest.timestamp ? item : latest
  }, null)
  return newest?.id || ''
})

const filteredHistory = computed(() => {
  const query = historySearch.value.trim().toLowerCase()
  if (!query) return sortedHistory.value

  return sortedHistory.value.filter((item) => {
    const aliases = item.context?.aliases || []
    const haystack = [
      item.query,
      item.context?.alias || '',
      aliases.join(' '),
      item.context?.mode || '',
      item.context?.sourceType || '',
      historyAliasBadge(item)
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })
})

async function focusHistorySearch() {
  await nextTick()
  historySearchInputRef.value?.focus()
  historySearchInputRef.value?.select()
}

function toggleTemplates() {
  showFormatMenu.value = false
  templatePickerRef.value?.toggle()
}

function toggleHistory() {
  if (history.value.length === 0) return
  showFormatMenu.value = false
  if (showHistory.value) {
    showHistory.value = false
    return
  }
  showHistory.value = true
  templatePickerRef.value?.close()
  historySearch.value = ''
  updateHistoryMenuPosition()
  void focusHistorySearch()
}

function toggleFormatMenu() {
  if (showFormatMenu.value) {
    showFormatMenu.value = false
    return
  }
  showFormatMenu.value = true
  templatePickerRef.value?.close()
  showHistory.value = false
}

function getHorizontalMenuBounds(trigger: HTMLElement, viewportPadding: number) {
  const viewportMinLeft = viewportPadding
  const viewportMaxRight = window.innerWidth - viewportPadding
  const viewportAvailableWidth = Math.max(0, viewportMaxRight - viewportMinLeft)

  const consoleSurface = trigger.closest('.console-tab') as HTMLElement | null
  if (!consoleSurface) {
    return {
      minLeft: viewportMinLeft,
      maxRight: viewportMaxRight,
      availableWidth: viewportAvailableWidth
    }
  }

  const surfaceRect = consoleSurface.getBoundingClientRect()
  const minLeft = Math.max(viewportMinLeft, surfaceRect.left + viewportPadding)
  const maxRight = Math.min(viewportMaxRight, surfaceRect.right - viewportPadding)
  const availableWidth = Math.max(0, maxRight - minLeft)

  if (availableWidth < 220) {
    return {
      minLeft: viewportMinLeft,
      maxRight: viewportMaxRight,
      availableWidth: viewportAvailableWidth
    }
  }

  return {
    minLeft,
    maxRight,
    availableWidth
  }
}

function updateHistoryMenuPosition() {
  if (!showHistory.value) return
  const trigger = historyDropdownRef.value
  if (!trigger) return

  const gap = 6
  const viewportPadding = 8
  const viewportBottomPadding = 14
  const maxWidth = 760
  const minHeight = 180

  const triggerRect = trigger.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const maxHeight = Math.min(620, Math.max(320, Math.floor(viewportHeight * 0.72)))
  const horizontalBounds = getHorizontalMenuBounds(trigger, viewportPadding)

  const availableWidth = Math.max(280, viewportWidth - viewportPadding * 2)
  const preferredWidth = Math.max(420, Math.floor(viewportWidth * 0.56))
  const width = Math.min(maxWidth, preferredWidth, availableWidth, horizontalBounds.availableWidth)
  let left = triggerRect.left
  if (left + width > horizontalBounds.maxRight) {
    left = horizontalBounds.maxRight - width
  }
  if (left < horizontalBounds.minLeft) left = horizontalBounds.minLeft

  const spaceBelow = viewportHeight - triggerRect.bottom - gap - viewportBottomPadding
  const spaceAbove = triggerRect.top - gap - viewportPadding
  const maxFitHeight = Math.max(120, viewportHeight - viewportPadding - viewportBottomPadding)
  const preferredSideSpace = Math.max(spaceBelow, spaceAbove)
  let panelHeight = Math.min(maxHeight, Math.max(minHeight, preferredSideSpace))
  panelHeight = Math.min(panelHeight, maxFitHeight)

  let top = triggerRect.bottom + gap
  if (top + panelHeight > viewportHeight - viewportBottomPadding) {
    top = triggerRect.top - gap - panelHeight
  }
  if (top < viewportPadding) {
    top = viewportPadding
  }
  if (top + panelHeight > viewportHeight - viewportBottomPadding) {
    top = viewportHeight - viewportBottomPadding - panelHeight
  }

  historyMenuStyle.value = {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(width)}px`,
    height: `${Math.round(panelHeight)}px`
  }
}

function selectTemplate(query: string) {
  emit('select-template', query)
}

function selectHistoryItem(item: HistoryItem) {
  emit('select-history', item)
  showHistory.value = false
}

function rerunHistoryItem(item: HistoryItem) {
  emit('rerun-history', item)
  showHistory.value = false
}

function toggleHistoryPin(item: HistoryItem) {
  emit('toggle-history-pin', item)
}

function deleteHistoryItem(item: HistoryItem) {
  emit('delete-history', item)
}

function openHistoryNewTab(item: HistoryItem) {
  emit('open-history-new-tab', item)
  showHistory.value = false
}

function emitExecute(selectedSql?: string) {
  if (selectedSql !== undefined) {
    emit('execute', selectedSql || undefined)
    return
  }

  const hasLiveSelection = sqlEditorRef.value?.hasSelection?.() ?? hasSelectedSql.value

  if (!hasLiveSelection) {
    emit('execute', undefined)
    return
  }

  const selected = sqlEditorRef.value?.getSelectedSql?.() || ''
  emit('execute', selected || undefined)
}

function extractSqlFromRange(
  text: string,
  range?: {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  } | null
): string {
  if (!range) return ''

  const lines = text.split('\n')
  const startLineIndex = Math.max(0, range.startLineNumber - 1)
  const endLineIndex = Math.min(lines.length - 1, Math.max(0, range.endLineNumber - 1))
  if (startLineIndex > endLineIndex || startLineIndex >= lines.length) return ''

  if (startLineIndex === endLineIndex) {
    const line = lines[startLineIndex] || ''
    const start = Math.max(0, range.startColumn - 1)
    const end = Math.max(start, range.endColumn - 1)
    return line.slice(start, end).trim()
  }

  const selectedLines: string[] = []
  for (let i = startLineIndex; i <= endLineIndex; i += 1) {
    const line = lines[i] || ''
    if (i === startLineIndex) {
      selectedLines.push(line.slice(Math.max(0, range.startColumn - 1)))
      continue
    }
    if (i === endLineIndex) {
      selectedLines.push(line.slice(0, Math.max(0, range.endColumn - 1)))
      continue
    }
    selectedLines.push(line)
  }

  return selectedLines.join('\n').trim()
}

function handleRunClick() {
  const cachedSelectionRange =
    hasSelectedSql.value && typeof sqlEditorRef.value?.getCachedSelectionRange === 'function'
      ? (sqlEditorRef.value.getCachedSelectionRange() as SqlCodeMirrorSelectionRange | null)
      : null

  const cachedSelection = extractSqlFromRange(props.modelValue, cachedSelectionRange)

  const selectedSql = cachedSelection.trim() || undefined

  emit('execute', selectedSql)
}

async function runFormatAction(mode: FormatMode) {
  showFormatMenu.value = false
  if (isFormatClickDebounced.value) return

  isFormatClickDebounced.value = true
  if (formatDebounceTimer) {
    clearTimeout(formatDebounceTimer)
  }
  formatDebounceTimer = setTimeout(() => {
    isFormatClickDebounced.value = false
    formatDebounceTimer = null
  }, 180)

  if (mode === 'format') {
    try {
      const applied = await sqlEditorRef.value?.formatDocumentWithLsp?.()
      if (applied) {
        emit('format', 'format')
        return
      }
    } catch {
      return
    }
    return
  }

  emit('format', 'compact')
}

function handleEditorFormatRequest() {
  void runFormatAction('format')
}

function handleFormatClick() {
  void runFormatAction('format')
}

function handleCompactClick() {
  void runFormatAction('compact')
}

async function copyCurrentQuery() {
  const query = props.modelValue?.trim()
  if (!query) return
  try {
    await navigator.clipboard.writeText(props.modelValue)
    isCopyFeedbackVisible.value = true
    if (copyFeedbackTimer) {
      clearTimeout(copyFeedbackTimer)
    }
    copyFeedbackTimer = setTimeout(() => {
      isCopyFeedbackVisible.value = false
      copyFeedbackTimer = null
    }, 1400)
  } catch {
    // Clipboard can fail in some browser/permission contexts; keep UI silent.
  }
}

async function copyHistoryQuery(item: HistoryItem) {
  if (!item.query) return
  try {
    await navigator.clipboard.writeText(item.query)
  } catch {
    // Clipboard can fail in some browser/permission contexts; keep UI silent.
  }
}

function historyKey(item: HistoryItem, index: number): string {
  if (item.id && item.id.trim()) return item.id
  return `${item.timestamp}-${index}-${historyQueryPreview(item.query)}`
}

function historyAliasBadge(item: HistoryItem): string {
  const mode = item.context?.mode
  const alias = item.context?.alias?.trim()
  const aliases = (item.context?.aliases || []).map((entry) => entry.trim()).filter(Boolean)
  const sourceType = item.context?.sourceType

  if (mode === 'federated') {
    if (alias) return alias
    if (aliases.length === 1) return aliases[0]
    if (aliases.length > 1) return 'multi'
    return 'multi'
  }

  if (mode === 'file') {
    if (alias) return alias
    if (sourceType === 's3') return 's3'
    return 'files'
  }

  if (alias) return alias
  if (aliases.length === 1) return aliases[0]
  return 'db'
}

function formatHistoryTime(timestamp: number): string {
  const now = new Date()
  const date = new Date(timestamp)
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (isToday) return time
  if (isYesterday) return `Yday ${time}`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function historyQueryPreview(query: string): string {
  const lines = query
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const firstExecutable =
    lines.find(
      (line) => !line.startsWith('--') && !line.startsWith('#') && !line.startsWith('/*')
    ) ||
    lines[0] ||
    ''

  const normalized = firstExecutable.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 120) return normalized
  return `${normalized.slice(0, 117)}...`
}

// Close dropdowns when clicking outside
function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node | null
  if (!target) return

  const clickedInFormat = !!formatDropdownRef.value?.contains(target)
  const clickedInFormatMenu = !!formatMenuRef.value?.contains(target)
  const clickedInHistory = !!historyDropdownRef.value?.contains(target)
  const clickedInHistoryMenu = !!historyMenuRef.value?.contains(target)

  if (!clickedInFormat && !clickedInFormatMenu) {
    showFormatMenu.value = false
  }
  if (!clickedInHistory && !clickedInHistoryMenu) {
    showHistory.value = false
  }
}

function handleViewportChange() {
  if (typeof window !== 'undefined') {
    if (viewportUpdateRafId !== null) {
      window.cancelAnimationFrame(viewportUpdateRafId)
    }
    viewportUpdateRafId = window.requestAnimationFrame(() => {
      viewportUpdateRafId = null
      if (showHistory.value) {
        updateHistoryMenuPosition()
      }
    })
    return
  }

  if (showHistory.value) {
    updateHistoryMenuPosition()
  }
}

function handleGlobalShortcut(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    templatePickerRef.value?.open()
  }
}

watch(showHistory, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  updateHistoryMenuPosition()
  await focusHistorySearch()
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleGlobalShortcut)
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleGlobalShortcut)
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
  if (viewportUpdateRafId !== null && typeof window !== 'undefined') {
    window.cancelAnimationFrame(viewportUpdateRafId)
    viewportUpdateRafId = null
  }
  if (formatDebounceTimer) {
    clearTimeout(formatDebounceTimer)
    formatDebounceTimer = null
  }
  if (copyFeedbackTimer) {
    clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = null
  }
})

// Expose editor ref for parent to access if needed
defineExpose({
  editorRef: sqlEditorRef,
  getSelectedSql() {
    return sqlEditorRef.value?.getSelectedSql?.() || ''
  }
})
</script>
