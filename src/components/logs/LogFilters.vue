<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useLogsStore } from '@/stores/logs'
import type { ExportFormat, QueryPurpose } from '@/stores/logs'
import {
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowDownTrayIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronDownIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  FunnelIcon
} from '@heroicons/vue/24/outline'

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
  // Don't trigger shortcuts if typing in an input field (except for specific keys)
  const target = event.target as HTMLElement
  const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

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
  <div class="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
    <div class="flex items-center gap-2">
      <!-- Visual Grouping Toggle -->
      <button
        :class="[
          'flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded transition-colors',
          visuallyGrouped
            ? 'border-gray-400 bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
        ]"
        :title="visuallyGrouped ? 'Hide location headers (G)' : 'Show location headers (G)'"
        @click="toggleVisualGrouping"
      >
        <component :is="visuallyGrouped ? Squares2X2Icon : ListBulletIcon" class="w-4 h-4" />
        <span class="font-medium">{{ visuallyGrouped ? 'Grouped' : 'Ungrouped' }}</span>
      </button>

      <!-- Expand/Collapse Toggle (only visible when visually grouped) -->
      <button
        v-if="visuallyGrouped && hasLocations"
        :class="[
          'flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded transition-colors shadow-sm',
          isAllExpanded
            ? 'bg-white text-gray-600 hover:bg-gray-50'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        ]"
        :title="`${expandCollapseLabel} all location groups (X)`"
        @click="toggleExpandCollapse"
      >
        <component
          :is="isAllExpanded ? ArrowsPointingInIcon : ArrowsPointingOutIcon"
          class="w-4 h-4"
        />
        <span class="font-medium">{{ expandCollapseLabel }}</span>
      </button>

      <!-- Query Type Filter Dropdown -->
      <div ref="queryTypeMenuRef" class="relative">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-colors text-left"
          :title="`Filter by query type (${selectedPurposes.size}/${queryPurposeOptions.length})`"
          @click="showQueryTypeMenu = !showQueryTypeMenu"
        >
          <FunnelIcon class="w-4 h-4 text-gray-600" />
          <span class="text-gray-700 font-medium">{{ queryTypeLabel }}</span>
          <ChevronDownIcon class="w-3.5 h-3.5 text-gray-400" />
        </button>

        <transition
          leave-active-class="transition ease-in duration-100"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="showQueryTypeMenu"
            class="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"
            @click.stop
          >
            <!-- Select All / Clear All -->
            <button
              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 transition-colors"
              @click="selectAllPurposes"
            >
              {{ allPurposesSelected ? '✓ All Selected' : 'Select All' }}
            </button>

            <!-- Query Type Options -->
            <button
              v-for="option in queryPurposeOptions"
              :key="option.value"
              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 transition-colors group"
              @click="toggleQueryPurpose(option.value)"
            >
              <div
                :class="[
                  'w-4 h-4 rounded border transition-colors',
                  selectedPurposes.has(option.value)
                    ? 'bg-gray-700 border-gray-700'
                    : 'border-gray-300 group-hover:border-gray-400'
                ]"
              >
                <span
                  v-if="selectedPurposes.has(option.value)"
                  class="flex items-center justify-center w-full h-full text-white text-xs"
                >
                  ✓
                </span>
              </div>
              <span class="text-gray-700 group-hover:text-gray-900">{{ option.label }}</span>
            </button>
          </div>
        </transition>
      </div>
    </div>

    <div class="hidden sm:block h-6 border-l border-gray-200" />

    <div class="flex items-center gap-2">
      <!-- Sort Order Toggle -->
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
        :title="`Sort: ${sortOrder === 'newest' ? 'Newest on top' : 'Oldest on top'} (S)`"
        @click="toggleSortOrder"
      >
        <component
          :is="sortOrder === 'newest' ? ArrowDownIcon : ArrowUpIcon"
          class="w-3.5 h-3.5 text-gray-600"
        />
        <span class="text-gray-700 font-medium">{{
          sortOrder === 'newest' ? 'Newest' : 'Oldest'
        }}</span>
      </button>

      <!-- Time Window - HIDDEN -->
      <!-- <Listbox v-model="timeWindow" as="div" class="relative">
        <ListboxButton
          class="relative flex items-center gap-1.5 text-xs border border-gray-300 rounded pl-2 pr-6 py-1 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-left min-w-[88px]"
          title="Time Window"
        >
          <ClockIcon class="w-4 h-4 text-gray-500" />
          <span class="flex-1 truncate text-left">{{
            timeWindowOptions.find((o) => o.value === timeWindow)?.label
          }}</span>
          <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
            <ChevronDownIcon class="h-3 w-3 text-gray-400" aria-hidden="true" />
          </span>
        </ListboxButton>
        <transition
          leave-active-class="transition ease-in duration-100"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <ListboxOptions
            class="absolute z-10 mt-1 max-h-60 w-28 overflow-auto rounded-md bg-white py-1 text-xs shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
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
                  <CheckIcon class="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </li>
            </ListboxOption>
          </ListboxOptions>
        </transition>
      </Listbox> -->
    </div>

    <div class="hidden sm:block h-6 border-l border-gray-200" />

    <div class="flex items-center gap-2 flex-1 min-w-0">
      <!-- Search -->
      <div class="flex-1 relative">
        <MagnifyingGlassIcon
          class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
        />
        <input
          ref="searchInputRef"
          v-model="searchText"
          type="text"
          placeholder="Search queries, tables, errors..."
          class="w-full text-xs border border-gray-300 rounded pl-9 pr-3 py-1.5 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        />
      </div>

      <!-- Errors Toggle -->
      <label
        class="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
        :title="'Show only errors (E)'"
      >
        <input v-model="errorsOnly" type="checkbox" class="rounded text-red-600" />
        <ExclamationTriangleIcon class="w-4 h-4 text-red-600" />
        <span class="text-xs font-semibold text-red-600">Errors Only</span>
      </label>
    </div>

    <div class="hidden sm:block h-6 border-l border-gray-200" />

    <div class="flex items-center gap-2">
      <!-- Export Button -->
      <div ref="exportMenuRef" class="relative">
        <button
          title="Export logs"
          class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-gray-600 rounded hover:bg-gray-500 transition-colors shadow-sm"
          @click.stop="toggleExportMenu"
        >
          <ArrowDownTrayIcon class="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        <div
          v-if="showExportMenu"
          class="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded shadow-lg z-50"
        >
          <button
            class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
            @click="selectExportFormat('text')"
          >
            Export as Text
          </button>
          <button
            class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
            @click="selectExportFormat('csv')"
          >
            Export as CSV
          </button>
          <button
            class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
            @click="selectExportFormat('json')"
          >
            Export as JSON
          </button>
        </div>
      </div>

      <!-- Clear Button -->
      <button
        title="Clear logs (K)"
        class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 rounded hover:bg-orange-700 transition-colors shadow-sm"
        @click="clearLogs"
      >
        <TrashIcon class="w-3.5 h-3.5" />
        <span>Clear</span>
      </button>

      <!-- Keyboard Shortcuts Help -->
      <div class="relative">
        <button
          class="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="Keyboard shortcuts"
          @click="showShortcuts = !showShortcuts"
        >
          <QuestionMarkCircleIcon class="w-5 h-5" />
        </button>

        <!-- Shortcuts Tooltip -->
        <div
          v-if="showShortcuts"
          class="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 text-xs"
        >
          <div class="font-semibold text-gray-700 mb-2">Keyboard Shortcuts</div>
          <div class="space-y-1.5">
            <div class="flex justify-between">
              <span class="text-gray-600">Focus search</span>
              <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">F</kbd>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Toggle grouped/ungrouped</span>
              <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">G</kbd>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Toggle expand/collapse</span>
              <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">X</kbd>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Toggle errors only</span>
              <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">E</kbd>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Toggle sort order</span>
              <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">S</kbd>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Clear logs</span>
              <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">K</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
