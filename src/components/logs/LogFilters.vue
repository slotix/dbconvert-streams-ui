<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useLogsStore } from '@/stores/logs'
import type { ExportFormat, QueryPurpose } from '@/stores/logs'
import FormCheckbox from '@/components/base/FormCheckbox.vue'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  CircleHelp,
  Download,
  Filter,
  Grid2X2,
  List,
  Maximize2,
  Minimize2,
  Search,
  Trash
} from 'lucide-vue-next'

const logsStore = useLogsStore()
const showShortcuts = ref(false)
const showExportMenu = ref(false)
const exportMenuRef = ref<HTMLDivElement | null>(null)
const showQueryTypeMenu = ref(false)
const queryTypeMenuRef = ref<HTMLDivElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const emit = defineEmits<{
  (e: 'export', format: ExportFormat): void
}>()

const visuallyGrouped = computed(() => logsStore.visuallyGrouped)

// Query purpose filter state
const selectedPurposes = computed({
  get: () => logsStore.filters.purposes,
  set: (val: Set<QueryPurpose>) => {
    logsStore.setQueryPurposes(val)
  }
})

const queryPurposeOptions: Array<{ value: QueryPurpose; label: string }> = [
  { value: 'SCHEMA_INTROSPECTION', label: 'Schema' },
  { value: 'DATA_QUERY', label: 'Data' },
  { value: 'COUNT_QUERY', label: 'Count' },
  { value: 'SCHEMA_CHANGE', label: 'DDL' },
  { value: 'DML_OPERATION', label: 'DML' }
]

function toggleQueryPurpose(purpose: QueryPurpose) {
  const newPurposes = new Set(selectedPurposes.value)
  if (newPurposes.has(purpose)) {
    newPurposes.delete(purpose)
    // Keep at least one selected
    if (newPurposes.size === 0) {
      newPurposes.add(purpose)
      return
    }
  } else {
    newPurposes.add(purpose)
  }
  selectedPurposes.value = newPurposes
}

const allPurposesSelected = computed(
  () => selectedPurposes.value.size === queryPurposeOptions.length
)

function selectAllPurposes() {
  if (allPurposesSelected.value) {
    // Deselect all except one
    selectedPurposes.value = new Set([queryPurposeOptions[0].value])
  } else {
    // Select all
    selectedPurposes.value = new Set(queryPurposeOptions.map((o) => o.value))
  }
}

const queryTypeLabel = computed(() => {
  if (allPurposesSelected.value) return 'All Types'
  return `${selectedPurposes.value.size} Selected`
})

const searchText = computed({
  get: () => logsStore.filters.searchText,
  set: (val: string) => {
    logsStore.filters.searchText = val // Don't persist - session specific
  }
})

const errorsOnly = computed({
  get: () => logsStore.filters.errorsOnly,
  set: (val: boolean) => {
    logsStore.setErrorsOnly(val)
  }
})

const sortOrder = computed(() => logsStore.sortOrder)
const collapsedLocationCount = computed(() => logsStore.collapsedLocations.size)
const hasLocations = computed(() => logsStore.flatLogs.size > 0)

// Determine expand/collapse state
const isAllExpanded = computed(() => collapsedLocationCount.value === 0 && hasLocations.value)
const expandCollapseLabel = computed(() => (isAllExpanded.value ? 'Collapse' : 'Expand'))

function toggleExpandCollapse() {
  if (isAllExpanded.value) {
    logsStore.collapseAllLocations()
  } else {
    logsStore.expandAllLocations()
  }
}

function clearLogs() {
  logsStore.clearSQLLogs()
}

function toggleSortOrder() {
  logsStore.toggleSortOrder()
}

function toggleExportMenu() {
  showExportMenu.value = !showExportMenu.value
}

function toggleVisualGrouping() {
  logsStore.toggleVisualGrouping()
}

function selectExportFormat(format: ExportFormat) {
  emit('export', format)
  showExportMenu.value = false
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Node | null

  if (
    showExportMenu.value &&
    exportMenuRef.value &&
    target &&
    !exportMenuRef.value.contains(target)
  ) {
    showExportMenu.value = false
  }

  if (
    showQueryTypeMenu.value &&
    queryTypeMenuRef.value &&
    target &&
    !queryTypeMenuRef.value.contains(target)
  ) {
    showQueryTypeMenu.value = false
  }
}

function handleKeyboardShortcut(event: KeyboardEvent) {
  // Don't trigger shortcuts if typing in an input field or editor
  const target = event.target as HTMLElement
  const isInputField =
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable ||
    target.closest('.cm-editor') !== null

  // F: Focus search box
  if (event.key.toLowerCase() === 'f' && !isInputField) {
    event.preventDefault()
    searchInputRef.value?.focus()
    return
  }

  // G: Toggle grouped/ungrouped
  if (event.key.toLowerCase() === 'g' && !isInputField) {
    event.preventDefault()
    logsStore.toggleVisualGrouping()
    return
  }

  // X: Toggle expand/collapse all
  if (event.key.toLowerCase() === 'x' && !isInputField) {
    event.preventDefault()
    if (logsStore.collapsedLocations.size === 0) {
      logsStore.collapseAllLocations()
    } else {
      logsStore.expandAllLocations()
    }
    return
  }

  // E: Toggle errors only
  if (event.key.toLowerCase() === 'e' && !isInputField) {
    event.preventDefault()
    errorsOnly.value = !errorsOnly.value
    return
  }

  // S: Toggle sort order
  if (event.key.toLowerCase() === 's' && !isInputField) {
    event.preventDefault()
    logsStore.toggleSortOrder()
    return
  }

  // K: Clear logs
  if (event.key.toLowerCase() === 'k' && !isInputField) {
    event.preventDefault()
    logsStore.clearSQLLogs()
    return
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeyboardShortcut)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeyboardShortcut)
})
</script>

<template>
  <div
    class="ui-surface-panel ui-border-default flex items-center gap-2 px-4 py-2 border-b shadow-sm"
  >
    <div class="flex items-center gap-2">
      <!-- Visual Grouping Toggle -->
      <button
        v-tooltip="visuallyGrouped ? 'Hide location headers (G)' : 'Show location headers (G)'"
        :class="[
          'flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded transition-colors',
          visuallyGrouped
            ? 'ui-surface-muted ui-border-default text-gray-700 dark:text-gray-200 hover:bg-[var(--ui-surface-inset)]'
            : 'ui-surface-raised ui-border-default text-gray-600 dark:text-gray-300 hover:bg-(--ui-surface-muted)'
        ]"
        @click="toggleVisualGrouping"
      >
        <component :is="visuallyGrouped ? Grid2X2 : List" class="w-4 h-4" />
        <span class="font-medium">{{ visuallyGrouped ? 'Grouped' : 'Ungrouped' }}</span>
      </button>

      <!-- Expand/Collapse Toggle (only visible when visually grouped) -->
      <button
        v-if="visuallyGrouped && hasLocations"
        v-tooltip="`${expandCollapseLabel} all location groups (X)`"
        class="ui-surface-raised ui-border-default flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs text-gray-600 transition-colors shadow-sm hover:bg-(--ui-surface-muted) dark:text-gray-300"
        @click="toggleExpandCollapse"
      >
        <component :is="isAllExpanded ? Minimize2 : Maximize2" class="w-4 h-4" />
        <span class="font-medium">{{ expandCollapseLabel }}</span>
      </button>

      <!-- Query Type Filter Dropdown -->
      <div ref="queryTypeMenuRef" class="relative">
        <button
          v-tooltip="
            `Filter by query type (${selectedPurposes.size}/${queryPurposeOptions.length})`
          "
          class="ui-accent-focus ui-surface-raised ui-border-default flex items-center gap-1.5 rounded border px-3 py-1.5 text-left text-xs transition-colors hover:bg-(--ui-surface-muted)"
          @click="showQueryTypeMenu = !showQueryTypeMenu"
        >
          <Filter class="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span class="text-gray-700 dark:text-gray-200 font-medium">{{ queryTypeLabel }}</span>
          <ChevronDown class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
        </button>

        <transition
          leave-active-class="transition ease-in duration-100"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="showQueryTypeMenu"
            class="ui-surface-floating absolute left-0 mt-2 w-48 border rounded-md z-50"
            @click.stop
          >
            <!-- Select All / Clear All -->
            <button
              class="ui-border-default w-full border-b px-3 py-2 text-left text-xs font-semibold text-gray-700 transition-colors hover:bg-(--ui-surface-muted) dark:text-gray-200"
              @click="selectAllPurposes"
            >
              {{ allPurposesSelected ? '✓ All Selected' : 'Select All' }}
            </button>

            <!-- Query Type Options -->
            <button
              v-for="option in queryPurposeOptions"
              :key="option.value"
              class="group flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-(--ui-surface-muted)"
              @click="toggleQueryPurpose(option.value)"
            >
              <div
                :class="[
                  'w-4 h-4 rounded border transition-colors',
                  selectedPurposes.has(option.value)
                    ? 'ui-accent-selection-checked ui-accent-text'
                    : 'ui-surface-raised ui-border-default group-hover:border-gray-400 dark:group-hover:border-gray-500'
                ]"
              >
                <span
                  v-if="selectedPurposes.has(option.value)"
                  class="flex items-center justify-center w-full h-full text-white text-xs"
                >
                  ✓
                </span>
              </div>
              <span
                class="text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white"
                >{{ option.label }}</span
              >
            </button>
          </div>
        </transition>
      </div>
    </div>

    <div class="ui-border-default hidden h-6 border-l sm:block" />

    <div class="flex items-center gap-2">
      <!-- Sort Order Toggle -->
      <button
        v-tooltip="`Sort: ${sortOrder === 'newest' ? 'Newest on top' : 'Oldest on top'} (S)`"
        class="ui-surface-raised ui-border-default flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs transition-colors hover:bg-(--ui-surface-muted)"
        @click="toggleSortOrder"
      >
        <component
          :is="sortOrder === 'newest' ? ArrowDown : ArrowUp"
          class="w-3.5 h-3.5 text-gray-600 dark:text-gray-400"
        />
        <span class="text-gray-700 dark:text-gray-200 font-medium">{{
          sortOrder === 'newest' ? 'Newest' : 'Oldest'
        }}</span>
      </button>

      <!-- Time Window - HIDDEN -->
      <!-- <Listbox v-model="timeWindow" as="div" class="relative">
        <ListboxButton
          class="ui-accent-focus ui-surface-raised ui-border-default relative flex min-w-[88px] items-center gap-1.5 rounded border pl-2 pr-6 py-1 text-left text-xs transition-colors hover:border-(--ui-accent-soft-border)"
          title="Time Window"
        >
          <ClockIcon class="w-4 h-4 text-gray-500" />
          <span class="flex-1 truncate text-left">{{
            timeWindowOptions.find((o) => o.value === timeWindow)?.label
          }}</span>
          <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
            <ChevronDown class="h-3 w-3 text-gray-400" aria-hidden="true" />
          </span>
        </ListboxButton>
        <transition
          leave-active-class="transition ease-in duration-100"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <ListboxOptions
            class="ui-surface-floating ui-border-default absolute z-10 mt-1 max-h-60 w-28 overflow-auto rounded-md border py-1 text-xs focus:outline-none"
          >
            <ListboxOption
              v-for="option in timeWindowOptions"
              :key="option.value"
              v-slot="{ active, selected }"
              :value="option.value"
              as="template"
            >
              <li
                :class="[
                  active ? 'bg-blue-600 text-white' : 'text-gray-900',
                  'relative cursor-pointer select-none py-1.5 pl-2 pr-8'
                ]"
              >
                <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">
                  {{ option.label }}
                </span>
                <span
                  v-if="selected"
                  :class="[
                    active ? 'text-white' : 'text-blue-600',
                    'absolute inset-y-0 right-0 flex items-center pr-2'
                  ]"
                >
                  <Check class="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </li>
            </ListboxOption>
          </ListboxOptions>
        </transition>
      </Listbox> -->
    </div>

    <div class="ui-border-default hidden h-6 border-l sm:block" />

    <div class="flex items-center gap-2 flex-1 min-w-0">
      <!-- Search -->
      <div class="flex-1 relative">
        <Search
          class="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2"
        />
        <input
          ref="searchInputRef"
          v-model="searchText"
          type="text"
          placeholder="Search queries, tables, errors..."
          class="ui-accent-focus ui-surface-raised ui-border-default w-full rounded border pl-9 pr-3 py-1.5 text-xs transition-colors hover:border-(--ui-accent-soft-border) dark:text-gray-200 dark:placeholder-gray-500"
        />
      </div>

      <!-- Errors Toggle -->
      <div v-tooltip="'Show only errors (E)'" class="flex items-center gap-1">
        <FormCheckbox v-model="errorsOnly">
          <span class="flex items-center gap-1.5">
            <AlertTriangle class="w-4 h-4 text-red-600 dark:text-red-300" />
            <span class="text-xs font-semibold text-red-600 dark:text-red-300">Errors Only</span>
          </span>
        </FormCheckbox>
      </div>
    </div>

    <div class="ui-border-default hidden h-6 border-l sm:block" />

    <div class="flex items-center gap-2">
      <!-- Export Button -->
      <div ref="exportMenuRef" class="relative">
        <button
          title="Export logs"
          class="ui-surface-raised ui-border-default ui-accent-action inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors shadow-sm dark:text-gray-200"
          @click.stop="toggleExportMenu"
        >
          <Download class="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        <div
          v-if="showExportMenu"
          class="ui-surface-floating ui-border-default absolute right-0 z-50 mt-2 w-36 rounded border"
        >
          <button
            class="w-full px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-(--ui-surface-muted) dark:text-gray-200"
            @click="selectExportFormat('text')"
          >
            Export as Text
          </button>
          <button
            class="w-full px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-(--ui-surface-muted) dark:text-gray-200"
            @click="selectExportFormat('csv')"
          >
            Export as CSV
          </button>
          <button
            class="w-full px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-(--ui-surface-muted) dark:text-gray-200"
            @click="selectExportFormat('json')"
          >
            Export as JSON
          </button>
        </div>
      </div>

      <!-- Clear Button -->
      <button
        title="Clear logs (K)"
        class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 dark:bg-orange-500 rounded hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors shadow-sm"
        @click="clearLogs"
      >
        <Trash class="w-3.5 h-3.5" />
        <span>Clear Logs</span>
      </button>

      <!-- Keyboard Shortcuts Help -->
      <div class="relative">
        <button
          class="rounded p-1.5 text-gray-500 transition-colors hover:text-gray-700 hover:bg-(--ui-surface-muted) dark:text-gray-400 dark:hover:text-gray-300"
          title="Keyboard shortcuts"
          @click="showShortcuts = !showShortcuts"
        >
          <CircleHelp class="w-5 h-5" />
        </button>

        <!-- Shortcuts Tooltip -->
        <div
          v-if="showShortcuts"
          class="ui-surface-floating ui-border-default absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border p-3 text-xs"
        >
          <div class="font-semibold text-gray-700 dark:text-gray-200 mb-2">Keyboard Shortcuts</div>
          <div class="space-y-1.5">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-300">Focus search</span>
              <kbd
                class="ui-surface-muted ui-border-default rounded border px-2 py-0.5 text-gray-700 dark:text-gray-300"
                >F</kbd
              >
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-300">Toggle grouped/ungrouped</span>
              <kbd
                class="ui-surface-muted ui-border-default rounded border px-2 py-0.5 text-gray-700 dark:text-gray-300"
                >G</kbd
              >
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-300">Toggle expand/collapse</span>
              <kbd
                class="ui-surface-muted ui-border-default rounded border px-2 py-0.5 text-gray-700 dark:text-gray-300"
                >X</kbd
              >
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-300">Toggle errors only</span>
              <kbd
                class="ui-surface-muted ui-border-default rounded border px-2 py-0.5 text-gray-700 dark:text-gray-300"
                >E</kbd
              >
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-300">Toggle sort order</span>
              <kbd
                class="ui-surface-muted ui-border-default rounded border px-2 py-0.5 text-gray-700 dark:text-gray-300"
                >S</kbd
              >
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-300">Clear logs</span>
              <kbd
                class="ui-surface-muted ui-border-default rounded border px-2 py-0.5 text-gray-700 dark:text-gray-300"
                >K</kbd
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
