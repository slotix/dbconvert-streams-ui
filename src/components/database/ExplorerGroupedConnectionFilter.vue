<template>
  <div class="flex items-center gap-1 shrink-0">
    <button
      type="button"
      data-testid="explorer-filter-chip-all"
      class="inline-flex h-8 shrink-0 items-center rounded-md border px-3 text-xs font-medium transition-colors"
      :class="allChipClass"
      :aria-pressed="selectedTypes.length === 0 ? 'true' : 'false'"
      title="Show all connection types"
      @click="clearAll"
    >
      All
    </button>

    <div v-for="group in filterGroups" :key="group.key" class="relative shrink-0">
      <button
        :ref="(el) => setChipRef(group.key, el)"
        type="button"
        :data-testid="`explorer-filter-chip-${group.key}`"
        class="inline-flex h-8 items-center rounded-md border pl-3 text-xs font-medium transition-colors"
        :class="groupChipClass(group.key)"
        :aria-pressed="groupSelectedTypes(group.key).length > 0 ? 'true' : 'false'"
        :title="groupTooltip(group.key)"
        @click="toggleDropdown(group.key)"
      >
        <component :is="group.icon" class="mr-1.5 h-3.5 w-3.5 shrink-0" />
        <span class="truncate">{{ groupLabel(group.key) }}</span>
        <ChevronDown
          class="ml-1 h-3.5 w-3.5 shrink-0 transition-transform"
          :class="openGroup === group.key ? 'rotate-180' : ''"
        />
      </button>

      <button
        v-if="groupSelectedTypes(group.key).length > 0"
        type="button"
        :data-testid="`explorer-filter-clear-${group.key}`"
        class="absolute right-1 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-slate-500 hover:bg-slate-200/80 hover:text-slate-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
        :title="`Clear ${group.title.toLowerCase()} filters`"
        @click.stop="clearGroup(group.key)"
      >
        <X class="h-3 w-3" />
      </button>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="openGroup"
      ref="dropdownRef"
      data-testid="explorer-filter-dropdown"
      :style="dropdownStyle"
      class="fixed z-50 w-72 overflow-hidden rounded-md border border-slate-200/90 bg-white shadow-lg shadow-slate-900/8 dark:border-gray-700 dark:bg-gray-850 dark:shadow-gray-950/30"
    >
      <div
        class="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-gray-700"
      >
        <span
          class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400"
        >
          {{ groupTitle(openGroup) }}
        </span>
        <button
          type="button"
          data-testid="explorer-filter-action-toggle-all"
          class="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
          @click.stop="toggleAllInGroup(openGroup)"
        >
          {{ groupActionLabel(openGroup) }}
        </button>
      </div>

      <div class="max-h-72 overflow-auto py-1">
        <div
          v-for="option in groupOptions(openGroup)"
          :key="option.type"
          class="px-3 py-2"
          :class="
            isComingSoon(option) ? 'opacity-65' : 'hover:bg-slate-50/80 dark:hover:bg-gray-800'
          "
        >
          <div
            :data-testid="`explorer-filter-option-${option.type}`"
            class="flex min-w-0 flex-1 items-center gap-2"
            :class="isComingSoon(option) ? 'cursor-not-allowed' : 'cursor-pointer'"
            @click.stop="toggleType(option.type)"
          >
            <input
              type="checkbox"
              :checked="isTypeSelected(option.type)"
              :disabled="isComingSoon(option)"
              tabindex="-1"
              class="pointer-events-none h-4 w-4 shrink-0 rounded border-gray-300 bg-white text-sky-600 dark:border-gray-600 dark:bg-gray-800 focus:ring-sky-500"
            />
            <img
              :src="option.logo"
              :alt="option.type"
              class="h-5 w-5 shrink-0 dark:brightness-0 dark:invert dark:opacity-70"
            />
            <span class="truncate text-sm text-slate-900 dark:text-gray-100">{{
              option.type
            }}</span>
            <span
              v-if="isComingSoon(option)"
              class="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            >
              Coming soon
            </span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComponentPublicInstance
} from 'vue'
import { ChevronDown, Database, FolderArchive, X } from 'lucide-vue-next'
import { useConnectionsStore } from '@/stores/connections'
import type { DbType } from '@/types/connections'
import { matchesConnectionTypeFilter } from '@/types/specs'

type FilterGroupKey = 'database' | 'file'

interface Props {
  selectedTypes?: string[]
}

const emit = defineEmits<{
  'update:selectedTypes': [value: string[]]
}>()

const props = withDefaults(defineProps<Props>(), {
  selectedTypes: () => []
})

const connectionsStore = useConnectionsStore()
const openGroup = ref<FilterGroupKey | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})
const chipRefs: Record<FilterGroupKey, HTMLElement | null> = {
  database: null,
  file: null
}

const filterGroups = [
  { key: 'database' as const, title: 'Databases', icon: Database },
  { key: 'file' as const, title: 'Files and S3', icon: FolderArchive }
]

const groupTypeMap = computed<Record<FilterGroupKey, DbType[]>>(() => ({
  database: connectionsStore.dbTypes.filter((type) => type.category === 'database'),
  file: connectionsStore.dbTypes.filter((type) => type.category === 'file')
}))

const selectedTypes = computed(() => props.selectedTypes || [])

const allChipClass = computed(() =>
  selectedTypes.value.length === 0
    ? 'border-slate-400 bg-slate-100 text-slate-700 dark:border-slate-500 dark:bg-slate-700/30 dark:text-slate-200'
    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-850 dark:text-gray-300 dark:hover:bg-gray-800'
)

function setChipRef(key: FilterGroupKey, element: Element | ComponentPublicInstance | null) {
  if (element instanceof HTMLElement) {
    chipRefs[key] = element
    return
  }

  const componentRoot =
    element && '$el' in element ? (element.$el as Element | null | undefined) : null
  chipRefs[key] = componentRoot instanceof HTMLElement ? componentRoot : null
}

function groupTitle(group: FilterGroupKey): string {
  return filterGroups.find((entry) => entry.key === group)?.title || ''
}

function groupOptions(group: FilterGroupKey): DbType[] {
  return groupTypeMap.value[group]
}

function isComingSoon(option: DbType): boolean {
  return option.type === 'Snowflake'
}

function groupSelectableOptions(group: FilterGroupKey): DbType[] {
  return groupOptions(group).filter((option) => !isComingSoon(option))
}

function groupSelectedTypes(group: FilterGroupKey): string[] {
  const groupTypeNames = new Set(groupOptions(group).map((option) => option.type))
  return selectedTypes.value.filter((type) => groupTypeNames.has(type))
}

function groupMatchedConnectionCount(group: FilterGroupKey): number {
  const activeTypes = groupSelectedTypes(group)
  if (activeTypes.length === 0) return 0

  return connectionsStore.connections.filter((connection) =>
    activeTypes.some((type) => matchesConnectionTypeFilter(connection.spec, connection.type, type))
  ).length
}

function groupLabel(group: FilterGroupKey): string {
  const count = groupMatchedConnectionCount(group)
  return groupSelectedTypes(group).length > 0
    ? `${groupTitle(group)} (${count})`
    : groupTitle(group)
}

function groupTooltip(group: FilterGroupKey): string {
  const activeTypes = groupSelectedTypes(group)
  return activeTypes.length > 0
    ? `${groupTitle(group)}: ${activeTypes.join(', ')} · ${groupMatchedConnectionCount(group)} matching`
    : `Filter ${groupTitle(group).toLowerCase()}`
}

function groupChipClass(group: FilterGroupKey): string {
  const isActive = groupSelectedTypes(group).length > 0
  return [
    isActive
      ? 'border-slate-400 bg-slate-100 pr-7 text-slate-700 dark:border-slate-500 dark:bg-slate-700/30 dark:text-slate-200'
      : 'border-slate-300 bg-white pr-2 text-slate-600 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-850 dark:text-gray-300 dark:hover:bg-gray-800',
    openGroup.value === group ? 'ring-1 ring-slate-300 dark:ring-slate-500' : ''
  ].join(' ')
}

function splitSelectionsByGroup() {
  const databaseTypes = new Set(groupOptions('database').map((option) => option.type))
  const fileTypes = new Set(groupOptions('file').map((option) => option.type))

  const grouped = {
    database: [] as string[],
    file: [] as string[],
    unknown: [] as string[]
  }

  for (const type of selectedTypes.value) {
    if (databaseTypes.has(type)) {
      grouped.database.push(type)
      continue
    }
    if (fileTypes.has(type)) {
      grouped.file.push(type)
      continue
    }
    grouped.unknown.push(type)
  }

  return grouped
}

function emitGroupedSelection(nextSelection: {
  database: string[]
  file: string[]
  unknown?: string[]
}) {
  emit('update:selectedTypes', [
    ...nextSelection.database,
    ...nextSelection.file,
    ...(nextSelection.unknown || [])
  ])
}

function clearAll() {
  openGroup.value = null
  emit('update:selectedTypes', [])
}

function clearGroup(group: FilterGroupKey) {
  const grouped = splitSelectionsByGroup()
  grouped[group] = []
  emitGroupedSelection(grouped)
}

function areAllGroupOptionsSelected(group: FilterGroupKey): boolean {
  const options = groupSelectableOptions(group)
  if (options.length === 0) return false
  return options.every((option) => isTypeSelected(option.type))
}

function groupActionLabel(group: FilterGroupKey): string {
  return areAllGroupOptionsSelected(group) ? 'Deselect all' : 'Select all'
}

function toggleAllInGroup(group: FilterGroupKey) {
  const grouped = splitSelectionsByGroup()
  grouped[group] = areAllGroupOptionsSelected(group)
    ? []
    : groupSelectableOptions(group).map((option) => option.type)
  emitGroupedSelection(grouped)
}

function toggleType(type: string) {
  const group = filterGroups.find((entry) =>
    groupOptions(entry.key).some((option) => option.type === type)
  )?.key

  if (!group) return

  const option = groupOptions(group).find((entry) => entry.type === type)
  if (!option || isComingSoon(option)) return

  const grouped = splitSelectionsByGroup()
  const currentSelection = grouped[group]
  const existingIndex = currentSelection.indexOf(type)

  if (existingIndex >= 0) {
    currentSelection.splice(existingIndex, 1)
  } else {
    currentSelection.push(type)
  }

  emitGroupedSelection(grouped)
}

function isTypeSelected(type: string): boolean {
  return selectedTypes.value.includes(type)
}

async function positionDropdown() {
  await nextTick()
  if (!openGroup.value) return

  const chip = chipRefs[openGroup.value]
  if (!chip) return

  const chipRect = chip.getBoundingClientRect()
  const dropdownHeight = 360
  const spaceBelow = window.innerHeight - chipRect.bottom
  const spaceAbove = chipRect.top

  if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
    dropdownStyle.value = {
      top: `${chipRect.bottom + window.scrollY + 6}px`,
      left: `${chipRect.left + window.scrollX}px`
    }
    return
  }

  dropdownStyle.value = {
    bottom: `${window.innerHeight - chipRect.top - window.scrollY + 6}px`,
    left: `${chipRect.left + window.scrollX}px`
  }
}

function toggleDropdown(group: FilterGroupKey) {
  openGroup.value = openGroup.value === group ? null : group
}

function handleClickOutside(event: MouseEvent) {
  if (!openGroup.value) return

  const target = event.target as Node
  if (dropdownRef.value?.contains(target)) return
  if (chipRefs.database?.contains(target) || chipRefs.file?.contains(target)) return
  openGroup.value = null
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    openGroup.value = null
  }
}

function handleViewportChange() {
  if (openGroup.value) {
    void positionDropdown()
  }
}

watch(openGroup, async (group) => {
  if (group) {
    await positionDropdown()
  }
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
})
</script>
