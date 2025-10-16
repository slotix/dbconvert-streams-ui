<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useLogsStore } from '@/stores/logs'
import type { ExportFormat, TimeWindow } from '@/stores/logs'
import {
  ClockIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowDownTrayIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  Bars3BottomLeftIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon
} from '@heroicons/vue/24/outline'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue'

const logsStore = useLogsStore()
const showShortcuts = ref(false)
const showExportMenu = ref(false)
const exportMenuRef = ref<HTMLDivElement | null>(null)
const emit = defineEmits<{
  (e: 'export', format: ExportFormat): void
}>()

// Time window options
const timeWindowOptions = [
  { value: '5m' as TimeWindow, label: '5 min' },
  { value: '1h' as TimeWindow, label: '1 hour' },
  { value: 'session' as TimeWindow, label: 'Session' },
  { value: 'all' as TimeWindow, label: 'All' }
]

const viewMode = computed({
  get: () => logsStore.viewMode,
  set: (val: 'grouped' | 'flat') => {
    logsStore.setViewMode(val)
  }
})

// Logging density toggle state
const isNormalLevel = computed(() => logsStore.filters.level === 'normal')
const levelLabel = computed(() => (isNormalLevel.value ? 'Normal' : 'Minimal'))
const levelIcon = computed(() => (isNormalLevel.value ? DocumentTextIcon : Bars3BottomLeftIcon))

const timeWindow = computed({
  get: () => logsStore.filters.timeWindow,
  set: (val: TimeWindow) => {
    logsStore.setTimeWindow(val)
  }
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
const expandedLocationCount = computed(() => logsStore.expandedLocations.size)
const hasLocations = computed(() => logsStore.flatLogs.size > 0)
const canCollapseGroups = computed(() => expandedLocationCount.value > 0)

function clearLogs() {
  logsStore.clearSQLLogs()
}

function toggleSortOrder() {
  logsStore.toggleSortOrder()
}

function toggleLevel() {
  logsStore.setLevel(isNormalLevel.value ? 'minimal' : 'normal')
}

function toggleExportMenu() {
  showExportMenu.value = !showExportMenu.value
}

function expandAllGroups() {
  if (!hasLocations.value) return
  logsStore.expandAllGroups()
}

function collapseAllGroups() {
  if (!canCollapseGroups.value) return
  logsStore.collapseAllGroups()
}

function selectExportFormat(format: ExportFormat) {
  emit('export', format)
  showExportMenu.value = false
}

function handleDocumentClick(event: MouseEvent) {
  if (!showExportMenu.value) return
  const target = event.target as Node | null
  if (exportMenuRef.value && target && !exportMenuRef.value.contains(target)) {
    showExportMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div
    class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 shadow-sm"
  >
    <div class="flex items-center gap-2">
      <!-- View Mode Switcher -->
      <div class="flex items-center gap-1 bg-white border border-gray-300 rounded p-0.5">
        <button
          :class="[
            'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
            viewMode === 'grouped'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          ]"
          title="Grouped view - Related queries grouped together"
          @click="viewMode = 'grouped'"
        >
          <Squares2X2Icon class="w-4 h-4" />
          <span>Grouped</span>
        </button>
        <button
          :class="[
            'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
            viewMode === 'flat'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          ]"
          title="Flat view - All queries in chronological order"
          @click="viewMode = 'flat'"
        >
          <ListBulletIcon class="w-4 h-4" />
          <span>Flat</span>
        </button>
      </div>

      <!-- Expand/Collapse Controls -->
      <div
        v-if="viewMode === 'grouped'"
        class="flex items-center gap-1 bg-white border border-gray-300 rounded p-0.5"
      >
        <button
          :class="[
            'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
            hasLocations ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'
          ]"
          :disabled="!hasLocations"
          title="Expand all groups"
          @click="expandAllGroups"
        >
          <ArrowsPointingOutIcon class="w-4 h-4" />
          <span>Expand</span>
        </button>
        <button
          :class="[
            'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
            canCollapseGroups
              ? 'text-gray-600 hover:bg-gray-100'
              : 'text-gray-400 cursor-not-allowed'
          ]"
          :disabled="!canCollapseGroups"
          title="Collapse all groups"
          @click="collapseAllGroups"
        >
          <ArrowsPointingInIcon class="w-4 h-4" />
          <span>Collapse</span>
        </button>
      </div>

      <!-- Level Toggle -->
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded transition-colors shadow-sm"
        :class="
          isNormalLevel
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        "
        title="Toggle log density"
        @click="toggleLevel"
      >
        <component :is="levelIcon" class="w-4 h-4" />
        <span class="font-medium">{{ levelLabel }}</span>
      </button>
    </div>

    <div class="hidden sm:block h-6 border-l border-gray-200" />

    <div class="flex items-center gap-2">
      <!-- Sort Order Toggle -->
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        :title="`Sort: ${sortOrder === 'newest' ? 'Newest on top' : 'Oldest on top'} (click to toggle)`"
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

      <!-- Time Window -->
      <Listbox v-model="timeWindow" as="div" class="relative">
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
      </Listbox>
    </div>

    <div class="hidden sm:block h-6 border-l border-gray-200" />

    <div class="flex items-center gap-2 flex-1 min-w-0">
      <!-- Search -->
      <div class="flex-1 relative">
        <MagnifyingGlassIcon
          class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
        />
        <input
          v-model="searchText"
          type="text"
          placeholder="Search queries, tables, errors..."
          class="w-full text-xs border border-gray-300 rounded pl-9 pr-3 py-1.5 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        />
      </div>

      <!-- Errors Toggle -->
      <label
        class="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
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
          class="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors shadow-sm"
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
            class="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors"
            @click="selectExportFormat('text')"
          >
            Export as Text
          </button>
          <button
            class="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors"
            @click="selectExportFormat('csv')"
          >
            Export as CSV
          </button>
          <button
            class="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors"
            @click="selectExportFormat('json')"
          >
            Export as JSON
          </button>
        </div>
      </div>

      <!-- Clear Button -->
      <button
        class="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-sm"
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
              <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">/ </kbd>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Minimal level</span>
              <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">1</kbd>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Normal level</span>
              <kbd class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded">2</kbd>
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
