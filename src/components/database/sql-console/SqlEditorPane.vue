<template>
  <div class="flex flex-col min-h-0 h-full">
    <!-- Toolbar -->
    <div
      class="@container/toolbar bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 gap-1.5 px-2.5 @[620px]/toolbar:gap-2 @[620px]/toolbar:px-3 py-1.5 flex items-center"
    >
      <button
        :disabled="isExecuting"
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
      <Teleport to="body">
        <div
          v-if="showTemplates"
          ref="templateMenuRef"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[200] overflow-hidden flex flex-col"
          :style="templateMenuStyle"
        >
          <div class="px-3 pt-3 pb-2 border-b border-gray-200 dark:border-gray-700/80">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Templates</span>
              <kbd
                class="px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-[10px] text-gray-500 dark:text-gray-400"
                >{{ shortcutHint }}</kbd
              >
            </div>
            <div v-if="templateContextBadge" class="mt-2">
              <span
                class="inline-flex items-center rounded-full border border-teal-500/40 bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-600 dark:text-teal-300"
              >
                {{ templateContextBadge }}
              </span>
            </div>
            <div class="mt-2 relative">
              <Search
                class="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                ref="templateSearchInputRef"
                v-model="templateSearch"
                type="text"
                placeholder="Search templates..."
                class="w-full pl-8 pr-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-850 text-xs text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-[1fr_320px] min-h-0 flex-1">
            <div class="overflow-y-auto p-2 pb-10">
              <template v-if="groupedTemplateSections.length > 0">
                <template v-for="section in groupedTemplateSections" :key="section.name">
                  <div
                    v-if="hasMultipleTemplateSections"
                    class="sticky top-0 z-10 px-2 py-1 text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 bg-white/95 dark:bg-gray-800/95 backdrop-blur"
                  >
                    {{ section.name }}
                  </div>

                  <button
                    v-for="template in section.templates"
                    :key="templateKey(template)"
                    type="button"
                    class="group relative w-full text-left px-3 py-2.5 rounded-lg transition-colors"
                    :class="
                      isTemplateActive(template)
                        ? 'bg-teal-50 dark:bg-teal-900/25'
                        : 'hover:bg-gray-100/80 dark:hover:bg-gray-700/60'
                    "
                    :title="`${template.name}\n\n${template.description || ''}`"
                    @mouseenter="setActiveTemplate(template)"
                    @focus="setActiveTemplate(template)"
                    @click="selectTemplate(template)"
                  >
                    <span
                      class="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full transition-opacity"
                      :class="
                        isTemplateActive(template)
                          ? 'opacity-100 bg-teal-500'
                          : 'opacity-0 group-hover:opacity-70 bg-teal-500'
                      "
                    />
                    <div class="flex items-start gap-2.5">
                      <img
                        v-if="logoForTemplate(template)"
                        :src="logoForTemplate(template) || ''"
                        alt=""
                        class="h-4 w-4 mt-0.5 object-contain shrink-0 opacity-80 dark:brightness-0 dark:invert"
                      />
                      <component
                        :is="iconForTemplate(template)"
                        v-else
                        class="h-4 w-4 mt-0.5 text-gray-500 dark:text-gray-400 shrink-0"
                      />
                      <div class="min-w-0">
                        <div
                          class="text-[13px] leading-tight font-semibold text-gray-900 dark:text-gray-100 truncate"
                        >
                          {{ template.name }}
                        </div>
                        <div
                          class="mt-0.5 text-[12px] leading-tight text-gray-500 dark:text-gray-400 truncate"
                        >
                          {{ templateDescription(template) }}
                        </div>
                      </div>
                    </div>
                  </button>

                  <div
                    v-for="aliasGroup in section.aliasGroups"
                    :key="aliasGroup.key"
                    class="px-1 py-0.5"
                  >
                    <button
                      type="button"
                      class="w-full inline-flex items-center justify-between px-2 py-1.5 rounded-md text-[12px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
                      @click="toggleAliasGroup(aliasGroup.key)"
                    >
                      <span class="inline-flex items-center gap-1.5">
                        <img
                          v-if="logoForAliasLabel(aliasGroup.label)"
                          :src="logoForAliasLabel(aliasGroup.label) || ''"
                          alt=""
                          class="h-4 w-4 object-contain shrink-0 opacity-80 dark:brightness-0 dark:invert"
                        />
                        <component
                          :is="iconForSection(section.name)"
                          v-else
                          class="h-4 w-4 text-gray-500 dark:text-gray-400"
                        />
                        <span>{{ aliasGroup.label }}</span>
                        <span class="text-[10px] text-gray-400 dark:text-gray-500">
                          {{ aliasGroup.items.length }}
                        </span>
                      </span>
                      <ChevronRight
                        class="h-3.5 w-3.5 text-gray-400 transition-transform"
                        :class="{ 'rotate-90': isAliasGroupExpanded(aliasGroup.key) }"
                      />
                    </button>

                    <div v-if="isAliasGroupExpanded(aliasGroup.key)" class="pl-3">
                      <button
                        v-for="template in aliasGroup.items"
                        :key="templateKey(template)"
                        type="button"
                        class="group relative w-full text-left px-3 py-2.5 rounded-lg transition-colors"
                        :class="
                          isTemplateActive(template)
                            ? 'bg-teal-50 dark:bg-teal-900/25'
                            : 'hover:bg-gray-100/80 dark:hover:bg-gray-700/60'
                        "
                        :title="`${template.name}\n\n${template.description || ''}`"
                        @mouseenter="setActiveTemplate(template)"
                        @focus="setActiveTemplate(template)"
                        @click="selectTemplate(template)"
                      >
                        <span
                          class="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full transition-opacity"
                          :class="
                            isTemplateActive(template)
                              ? 'opacity-100 bg-teal-500'
                              : 'opacity-0 group-hover:opacity-70 bg-teal-500'
                          "
                        />
                        <div class="flex items-start gap-2.5">
                          <img
                            v-if="logoForTemplate(template)"
                            :src="logoForTemplate(template) || ''"
                            alt=""
                            class="h-4 w-4 mt-0.5 object-contain shrink-0 opacity-80 dark:brightness-0 dark:invert"
                          />
                          <component
                            :is="iconForTemplate(template)"
                            v-else
                            class="h-4 w-4 mt-0.5 text-gray-500 dark:text-gray-400 shrink-0"
                          />
                          <div class="min-w-0">
                            <div
                              class="text-[13px] leading-tight font-semibold text-gray-900 dark:text-gray-100 truncate"
                            >
                              {{ template.name }}
                            </div>
                            <div
                              class="mt-0.5 text-[12px] leading-tight text-gray-500 dark:text-gray-400 truncate"
                            >
                              {{ templateDescription(template) }}
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </template>
              </template>

              <div v-else class="px-3 py-4 text-xs text-gray-500 dark:text-gray-400">
                No templates match “{{ templateSearch }}”.
              </div>
              <div aria-hidden="true" class="h-10"></div>
            </div>

            <div
              class="hidden md:flex flex-col border-l border-gray-200 dark:border-gray-700/80 bg-gray-50/70 dark:bg-gray-900/60"
            >
              <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-700/80">
                <div
                  class="text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400"
                >
                  Snippet Preview
                </div>
              </div>
              <div v-if="activeTemplate" class="p-3 pb-8 min-h-0 flex-1 overflow-y-auto">
                <div class="flex items-center gap-2 mb-2">
                  <img
                    v-if="logoForTemplate(activeTemplate)"
                    :src="logoForTemplate(activeTemplate) || ''"
                    alt=""
                    class="h-4 w-4 object-contain shrink-0 opacity-80 dark:brightness-0 dark:invert"
                  />
                  <component
                    :is="iconForTemplate(activeTemplate)"
                    v-else
                    class="h-4 w-4 text-gray-500 dark:text-gray-400"
                  />
                  <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {{ activeTemplate.name }}
                  </div>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {{ templateDescription(activeTemplate) }}
                </p>
                <pre
                  class="text-[11px] leading-snug font-mono rounded-md p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words"
                ><code>{{ activeTemplate.query }}</code></pre>
                <div aria-hidden="true" class="h-6"></div>
              </div>
              <div v-else class="p-3 text-xs text-gray-500 dark:text-gray-400">
                Select a template to preview SQL.
              </div>
            </div>
          </div>
        </div>
      </Teleport>

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
              No history matches “{{ historySearch }}”.
            </div>
            <div aria-hidden="true" class="h-2"></div>
          </div>
        </div>
      </Teleport>

      <span class="text-xs text-gray-400 dark:text-gray-500 ml-2 hidden @[620px]/toolbar:inline"
        >Ctrl+Enter</span
      >

      <div class="flex-1"></div>

      <!-- Query Stats -->
      <div v-if="stats" class="flex items-center gap-3 text-xs">
        <span class="text-gray-500 dark:text-gray-400">
          <span class="font-medium text-gray-700 dark:text-gray-300">{{ stats.rowCount }}</span>
          rows
        </span>
        <span class="text-gray-500 dark:text-gray-400">
          <span class="font-medium text-gray-700 dark:text-gray-300">{{ stats.duration }}ms</span>
        </span>
      </div>
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
import type { SqlLspConnectionContext } from '@/composables/useSqlLspProviders'
import type { QueryTemplate } from '@/components/console/queryTemplates'
import type { FormatMode, QueryHistoryItem } from '@/composables/useConsoleTab'
import {
  AlignJustify,
  Check,
  Copy,
  ChevronDown,
  ChevronRight,
  Clock,
  Cloud,
  Code,
  Database,
  ExternalLink,
  FileText,
  Link2,
  Pin,
  Play,
  Puzzle,
  Search,
  Trash2,
  Wand2
} from 'lucide-vue-next'

type HistoryItem = QueryHistoryItem

type Template = QueryTemplate
type SqlEditorSelectionRange = {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}
type SqlEditorExpose = {
  getCachedSelectionRange?: () => SqlEditorSelectionRange | null
  hasSelection?: () => boolean
  getSelectedSql?: () => string
  formatDocumentWithLsp?: () => Promise<boolean> | boolean
}
type TemplateSection = 'Session' | 'Databases' | 'Files' | 'S3' | 'Joins' | 'Snippets'
type TemplateIcon = 'session' | 'database' | 'file' | 's3' | 'join'
const MYSQL_LOGO = '/images/db-logos/mysql.svg'
const POSTGRES_LOGO = '/images/db-logos/postgresql.svg'

const props = defineProps<{
  modelValue: string
  dialect: string
  lspContext?: SqlLspConnectionContext
  isExecuting: boolean
  formatState?: 'formatted' | 'compacted'
  stats: { rowCount: number; duration: number } | null
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
const hasSelectedSql = ref(false)
const formatDropdownRef = ref<HTMLElement | null>(null)
const formatMenuRef = ref<HTMLElement | null>(null)
const templatesDropdownRef = ref<HTMLElement | null>(null)
const templateMenuRef = ref<HTMLElement | null>(null)
const historyDropdownRef = ref<HTMLElement | null>(null)
const historyMenuRef = ref<HTMLElement | null>(null)
const templateSearchInputRef = ref<HTMLInputElement | null>(null)
const historySearchInputRef = ref<HTMLInputElement | null>(null)
const showTemplates = ref(false)
const showHistory = ref(false)
const showFormatMenu = ref(false)
const templateSearch = ref('')
const historySearch = ref('')
const activeTemplateKey = ref('')
const expandedAliasGroups = ref<Record<string, boolean>>({})
const templateMenuStyle = ref<Record<string, string>>({})
const historyMenuStyle = ref<Record<string, string>>({})
const isMacPlatform = computed(
  () =>
    typeof navigator !== 'undefined' &&
    /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent || '')
)
const shortcutHint = computed(() => (isMacPlatform.value ? '⌘K' : 'Ctrl+K'))
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

const hasFederatedTemplateSections = computed(() =>
  templates.value.some((template) =>
    ['Session', 'Databases', 'Files', 'S3', 'Joins'].includes((template.section || '').trim())
  )
)

const templateContextBadge = computed(() => {
  if (hasFederatedTemplateSections.value) return 'Federated (DuckDB)'
  if (props.dialect === 'pgsql') return 'Direct (PostgreSQL)'
  if (props.dialect === 'mysql') return 'Direct (MySQL)'
  if (props.dialect === 'sql') return 'Files (DuckDB)'
  return ''
})

const templateSectionPriority: TemplateSection[] = [
  'Session',
  'Databases',
  'Files',
  'S3',
  'Joins',
  'Snippets'
]

function normalizeSection(section?: string): TemplateSection {
  const value = section?.trim()
  if (!value) return 'Snippets'
  if (
    value === 'Session' ||
    value === 'Databases' ||
    value === 'Files' ||
    value === 'S3' ||
    value === 'Joins'
  ) {
    return value
  }
  return 'Snippets'
}

function templateDescription(template: Template): string {
  if (template.description?.trim()) return template.description

  const firstSqlLine = template.query
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('--'))

  if (!firstSqlLine) return 'SQL snippet'
  return firstSqlLine.length > 88 ? `${firstSqlLine.slice(0, 85)}...` : firstSqlLine
}

function templateKey(template: Template): string {
  return `${normalizeSection(template.section)}|${template.sourceAlias || ''}|${template.name}|${template.query}`
}

function iconForTemplate(template: Template) {
  const icon = template.icon as TemplateIcon | undefined
  if (icon === 'session') return Puzzle
  if (icon === 'database') return Database
  if (icon === 'file') return FileText
  if (icon === 's3') return Cloud
  if (icon === 'join') return Link2

  const section = normalizeSection(template.section)
  if (section === 'Session') return Puzzle
  if (section === 'Databases') return Database
  if (section === 'Files') return FileText
  if (section === 'S3') return Cloud
  if (section === 'Joins') return Link2
  return Code
}

function iconForSection(section: TemplateSection) {
  if (section === 'Session') return Puzzle
  if (section === 'Databases') return Database
  if (section === 'Files') return FileText
  if (section === 'S3') return Cloud
  if (section === 'Joins') return Link2
  return Code
}

function logoForAliasLabel(label?: string): string | null {
  if (!label) return null
  const lowered = label.toLowerCase()
  if (lowered.includes('mysql')) return MYSQL_LOGO
  if (lowered.includes('postgres')) return POSTGRES_LOGO
  return null
}

function logoForTemplate(template: Template | null): string | null {
  if (!template) return null

  const byAliasLabel = logoForAliasLabel(template.sourceLabel)
  if (byAliasLabel) return byAliasLabel

  const haystack = [template.name, template.description || '', template.sourceAlias || '']
    .join(' ')
    .toLowerCase()

  if (haystack.includes('mysql') || /\bmy\d*\b/.test(haystack)) return MYSQL_LOGO
  if (haystack.includes('postgres') || haystack.includes('pgsql') || /\bpg\d*\b/.test(haystack)) {
    return POSTGRES_LOGO
  }

  return null
}

const filteredTemplates = computed(() => {
  const query = templateSearch.value.trim().toLowerCase()
  if (!query) return templates.value

  return templates.value.filter((template) => {
    const haystack = [
      template.name,
      template.description || '',
      template.section || '',
      template.sourceAlias || '',
      template.sourceLabel || ''
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })
})

interface TemplateAliasGroup {
  key: string
  label: string
  items: Template[]
}

interface GroupedTemplateSection {
  name: TemplateSection
  templates: Template[]
  aliasGroups: TemplateAliasGroup[]
}

const groupedTemplateSections = computed<GroupedTemplateSection[]>(() => {
  const grouped = new Map<
    TemplateSection,
    { templates: Template[]; aliasGroups: Map<string, TemplateAliasGroup> }
  >()

  for (const template of filteredTemplates.value) {
    const section = normalizeSection(template.section)
    let sectionGroup = grouped.get(section)
    if (!sectionGroup) {
      sectionGroup = { templates: [], aliasGroups: new Map<string, TemplateAliasGroup>() }
      grouped.set(section, sectionGroup)
    }

    if (template.sourceAlias) {
      const key = `${section}|${template.sourceAlias}`
      const label = template.sourceLabel || template.sourceAlias
      const aliasGroup = sectionGroup.aliasGroups.get(key)
      if (aliasGroup) {
        aliasGroup.items.push(template)
      } else {
        sectionGroup.aliasGroups.set(key, { key, label, items: [template] })
      }
      continue
    }

    sectionGroup.templates.push(template)
  }

  const ordered: GroupedTemplateSection[] = []
  for (const section of templateSectionPriority) {
    const sectionGroup = grouped.get(section)
    if (!sectionGroup) continue
    ordered.push({
      name: section,
      templates: sectionGroup.templates,
      aliasGroups: Array.from(sectionGroup.aliasGroups.values()).sort((a, b) =>
        a.label.localeCompare(b.label)
      )
    })
    grouped.delete(section)
  }

  for (const [section, sectionGroup] of Array.from(grouped.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    ordered.push({
      name: section,
      templates: sectionGroup.templates,
      aliasGroups: Array.from(sectionGroup.aliasGroups.values()).sort((a, b) =>
        a.label.localeCompare(b.label)
      )
    })
  }

  return ordered.filter((section) => section.templates.length > 0 || section.aliasGroups.length > 0)
})

const hasMultipleTemplateSections = computed(() => groupedTemplateSections.value.length > 1)

function isAliasGroupExpanded(key: string): boolean {
  if (templateSearch.value.trim()) return true
  return expandedAliasGroups.value[key] || false
}

function toggleAliasGroup(key: string) {
  expandedAliasGroups.value[key] = !isAliasGroupExpanded(key)
}

const visibleTemplates = computed(() => {
  const result: Template[] = []
  for (const section of groupedTemplateSections.value) {
    result.push(...section.templates)
    for (const aliasGroup of section.aliasGroups) {
      if (isAliasGroupExpanded(aliasGroup.key)) {
        result.push(...aliasGroup.items)
      }
    }
  }
  return result
})

const activeTemplate = computed(() => {
  const active = visibleTemplates.value.find(
    (template) => templateKey(template) === activeTemplateKey.value
  )
  return active || visibleTemplates.value[0] || null
})

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

function setActiveTemplate(template: Template) {
  activeTemplateKey.value = templateKey(template)
}

function isTemplateActive(template: Template): boolean {
  return templateKey(template) === activeTemplateKey.value
}

async function focusTemplateSearch() {
  await nextTick()
  templateSearchInputRef.value?.focus()
  templateSearchInputRef.value?.select()
}

async function focusHistorySearch() {
  await nextTick()
  historySearchInputRef.value?.focus()
  historySearchInputRef.value?.select()
}

async function openTemplates() {
  showTemplates.value = true
  showHistory.value = false
  updateTemplateMenuPosition()
  const firstTemplate = visibleTemplates.value[0]
  if (firstTemplate) {
    activeTemplateKey.value = templateKey(firstTemplate)
  }
  await focusTemplateSearch()
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

function updateTemplateMenuPosition() {
  if (!showTemplates.value) return
  const trigger = templatesDropdownRef.value
  if (!trigger) return

  const gap = 6
  const viewportPadding = 8
  const minWidth = 360
  const maxWidth = 840
  const minHeight = 180

  const triggerRect = trigger.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const maxHeight = Math.min(680, Math.max(440, Math.floor(viewportHeight * 0.78)))
  const horizontalBounds = getHorizontalMenuBounds(trigger, viewportPadding)

  const preferredWidth = Math.max(minWidth, Math.min(maxWidth, viewportWidth - viewportPadding * 2))
  const width = Math.min(preferredWidth, horizontalBounds.availableWidth)
  let left = triggerRect.left
  if (left + width > horizontalBounds.maxRight) {
    left = horizontalBounds.maxRight - width
  }
  if (left < horizontalBounds.minLeft) left = horizontalBounds.minLeft

  const spaceBelow = viewportHeight - triggerRect.bottom - gap - viewportPadding
  const spaceAbove = triggerRect.top - gap - viewportPadding
  const maxFitHeight = Math.max(120, viewportHeight - viewportPadding * 2)
  const preferredSideSpace = Math.max(spaceBelow, spaceAbove)
  let panelHeight = Math.min(maxHeight, Math.max(minHeight, preferredSideSpace))
  panelHeight = Math.min(panelHeight, maxFitHeight)

  let top = triggerRect.bottom + gap
  if (top + panelHeight > viewportHeight - viewportPadding) {
    top = triggerRect.top - gap - panelHeight
  }
  if (top < viewportPadding) {
    top = viewportPadding
  }
  if (top + panelHeight > viewportHeight - viewportPadding) {
    top = viewportHeight - viewportPadding - panelHeight
  }

  templateMenuStyle.value = {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(width)}px`,
    height: `${Math.round(panelHeight)}px`
  }
}

function toggleTemplates() {
  showFormatMenu.value = false
  if (showTemplates.value) {
    showTemplates.value = false
    return
  }
  void openTemplates()
}

function toggleHistory() {
  if (history.value.length === 0) return
  showFormatMenu.value = false
  if (showHistory.value) {
    showHistory.value = false
    return
  }
  showHistory.value = true
  showTemplates.value = false
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
  showTemplates.value = false
  showHistory.value = false
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

function selectTemplate(template: Template) {
  emit('select-template', template.query)
  showTemplates.value = false
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
      ? (sqlEditorRef.value.getCachedSelectionRange() as {
          startLineNumber: number
          startColumn: number
          endLineNumber: number
          endColumn: number
        } | null)
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
  const clickedInTemplates = !!templatesDropdownRef.value?.contains(target)
  const clickedInTemplateMenu = !!templateMenuRef.value?.contains(target)
  const clickedInHistory = !!historyDropdownRef.value?.contains(target)
  const clickedInHistoryMenu = !!historyMenuRef.value?.contains(target)

  if (!clickedInFormat && !clickedInFormatMenu) {
    showFormatMenu.value = false
  }
  if (!clickedInTemplates && !clickedInTemplateMenu) {
    showTemplates.value = false
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
      if (showTemplates.value) {
        updateTemplateMenuPosition()
      }
      if (showHistory.value) {
        updateHistoryMenuPosition()
      }
    })
    return
  }

  if (showTemplates.value) {
    updateTemplateMenuPosition()
  }
  if (showHistory.value) {
    updateHistoryMenuPosition()
  }
}

function handleGlobalShortcut(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    void openTemplates()
  }
}

watch(visibleTemplates, (templatesList) => {
  if (!showTemplates.value) return

  const hasActive = templatesList.some(
    (template) => templateKey(template) === activeTemplateKey.value
  )
  if (!hasActive && templatesList[0]) {
    activeTemplateKey.value = templateKey(templatesList[0])
  }
})

watch(showTemplates, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  updateTemplateMenuPosition()
})

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
