<script setup lang="ts">
import { inject, computed, ref, watch, onBeforeUnmount } from 'vue'
import type { ComputedRef } from 'vue'
import { ChevronDown, ChevronRight, Grid2X2 } from 'lucide-vue-next'
import ObjectList from './ObjectList.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'
import {
  getExplorerObjectSectionKey,
  useExplorerNavigationStore,
  type ExplorerObjectSection,
  type ObjectType
} from '@/stores/explorerNavigation'

interface SchemaInfo {
  name: string
  tables: string[]
  views: string[]
  functions: string[]
  procedures: string[]
  sequences: string[]
}

const props = defineProps<{
  schema: SchemaInfo
  connectionId: string
  database: string
  isExpanded: boolean
  tableSizes?: Record<string, number>
}>()
const navigationStore = useExplorerNavigationStore()

// Inject search query, caret class, and selection from parent
const searchQuery = inject<ComputedRef<string>>('treeSearchQuery')!
const caretClass = inject<string>('treeCaretClass')!
const treeSelection = inject<
  ComputedRef<{
    connectionId?: string
    database?: string
    schema?: string
    type?: ObjectType | null
    name?: string | null
  }>
>('treeSelection')!

// Check if this schema is currently selected (schema selected, but no table/view)
const isSelected = computed(() => {
  return (
    treeSelection.value.connectionId === props.connectionId &&
    treeSelection.value.database === props.database &&
    treeSelection.value.schema === props.schema.name &&
    !treeSelection.value.name
  )
})

const functionsOpen = ref(true)
const proceduresOpen = ref(true)
const sequencesOpen = ref(true)
const highlightedSection = ref<
  'tables' | 'views' | 'functions' | 'procedures' | 'sequences' | null
>(null)
let sectionHighlightTimeout: ReturnType<typeof setTimeout> | null = null

const functionsExpanded = computed(() => functionsOpen.value)
const proceduresExpanded = computed(() => proceduresOpen.value)
const sequencesExpanded = computed(() => sequencesOpen.value)
const hasActiveSearch = computed(() => (searchQuery.value || '').trim().length > 0)
const filteredTables = computed(() => props.schema.tables)
const filteredViews = computed(() => props.schema.views)
const filteredFunctions = computed(() => props.schema.functions)
const filteredProcedures = computed(() => props.schema.procedures)
const filteredSequences = computed(() => props.schema.sequences)

function getSectionKey(section: ExplorerObjectSection): string {
  return getExplorerObjectSectionKey({
    connectionId: props.connectionId,
    database: props.database,
    schema: props.schema.name,
    section
  })
}

const showTablesSection = computed(() =>
  hasActiveSearch.value ? filteredTables.value.length > 0 : true
)
const showViewsSection = computed(() =>
  hasActiveSearch.value ? filteredViews.value.length > 0 : true
)
const showFunctionsSection = computed(() =>
  hasActiveSearch.value ? filteredFunctions.value.length > 0 : props.schema.functions.length > 0
)
const showProceduresSection = computed(() =>
  hasActiveSearch.value ? filteredProcedures.value.length > 0 : props.schema.procedures.length > 0
)
const showSequencesSection = computed(() =>
  hasActiveSearch.value ? filteredSequences.value.length > 0 : props.schema.sequences.length > 0
)

const tablesCount = computed(() =>
  hasActiveSearch.value ? filteredTables.value.length : props.schema.tables.length
)
const viewsCount = computed(() =>
  hasActiveSearch.value ? filteredViews.value.length : props.schema.views.length
)
const functionsCount = computed(() =>
  hasActiveSearch.value ? filteredFunctions.value.length : props.schema.functions.length
)
const proceduresCount = computed(() =>
  hasActiveSearch.value ? filteredProcedures.value.length : props.schema.procedures.length
)
const sequencesCount = computed(() =>
  hasActiveSearch.value ? filteredSequences.value.length : props.schema.sequences.length
)

const sectionsAutoExpanded = computed(() => hasActiveSearch.value)
const tablesSectionExpanded = computed(
  () =>
    sectionsAutoExpanded.value || navigationStore.isObjectSectionExpanded(getSectionKey('tables'))
)
const viewsSectionExpanded = computed(
  () =>
    sectionsAutoExpanded.value || navigationStore.isObjectSectionExpanded(getSectionKey('views'))
)
const functionsSectionExpanded = computed(
  () => sectionsAutoExpanded.value || functionsExpanded.value
)
const proceduresSectionExpanded = computed(
  () => sectionsAutoExpanded.value || proceduresExpanded.value
)
const sequencesSectionExpanded = computed(
  () => sectionsAutoExpanded.value || sequencesExpanded.value
)

function highlightSection(section: 'tables' | 'views' | 'functions' | 'procedures' | 'sequences') {
  highlightedSection.value = section
  if (sectionHighlightTimeout) {
    clearTimeout(sectionHighlightTimeout)
  }
  sectionHighlightTimeout = setTimeout(() => {
    highlightedSection.value = null
    sectionHighlightTimeout = null
  }, 900)
}

watch(
  () => treeSelection.value,
  (sel) => {
    if (!sel?.name || !sel?.type) return
    if (sel.connectionId !== props.connectionId || sel.database !== props.database) return
    if ((sel.schema || '') !== (props.schema.name || '')) return

    if (sel.type === 'table') {
      if (!navigationStore.isObjectSectionExpanded(getSectionKey('tables'))) {
        navigationStore.expandObjectSection(getSectionKey('tables'))
        highlightSection('tables')
      }
    } else if (sel.type === 'view') {
      if (!navigationStore.isObjectSectionExpanded(getSectionKey('views'))) {
        navigationStore.expandObjectSection(getSectionKey('views'))
        highlightSection('views')
      }
    } else if (sel.type === 'function') {
      if (!functionsOpen.value) {
        functionsOpen.value = true
        highlightSection('functions')
      }
    } else if (sel.type === 'procedure') {
      if (!proceduresOpen.value) {
        proceduresOpen.value = true
        highlightSection('procedures')
      }
    } else if (sel.type === 'sequence') {
      if (!sequencesOpen.value) {
        sequencesOpen.value = true
        highlightSection('sequences')
      }
    }
  },
  { immediate: true, deep: true }
)

onBeforeUnmount(() => {
  if (sectionHighlightTimeout) {
    clearTimeout(sectionHighlightTimeout)
    sectionHighlightTimeout = null
  }
})

const emit = defineEmits<{
  (e: 'toggle'): void
  (
    e: 'open-object',
    payload: {
      type: ObjectType
      name: string
      schema: string
      mode: 'preview' | 'pinned'
    }
  ): void
  (
    e: 'contextmenu-schema',
    payload: { event: MouseEvent; connectionId: string; database: string; schema: string }
  ): void
  (
    e: 'contextmenu-object',
    payload: {
      event: MouseEvent
      kind: ObjectType
      connectionId: string
      database: string
      schema: string
      name: string
    }
  ): void
}>()

function handleSchemaContextMenu(event: MouseEvent) {
  emit('contextmenu-schema', {
    event,
    connectionId: props.connectionId,
    database: props.database,
    schema: props.schema.name || ''
  })
}

function handleObjectOpen(type: ObjectType, payload: { name: string; mode: 'preview' | 'pinned' }) {
  emit('open-object', {
    type,
    name: payload.name,
    schema: props.schema.name,
    mode: payload.mode
  })
}

function handleObjectContextMenu(payload: {
  event: MouseEvent
  kind: ObjectType
  name: string
  schema?: string
}) {
  emit('contextmenu-object', {
    event: payload.event,
    kind: payload.kind,
    connectionId: props.connectionId,
    database: props.database,
    schema: props.schema.name || '',
    name: payload.name
  })
}

function toggleSection(section: ExplorerObjectSection) {
  navigationStore.toggleObjectSection(getSectionKey(section))
}
</script>

<template>
  <div>
    <div
      :class="[
        'flex items-center rounded-md px-2 py-1 text-sm ui-text-default hover:[background-color:var(--ui-surface-muted)] cursor-pointer select-none',
        isSelected ? 'ui-tree-active' : ''
      ]"
      :data-explorer-schema="`${connectionId}:${database}:${schema.name}`"
      data-tree-node="true"
      data-node-kind="schema"
      data-tree-depth="2"
      :data-connection-id="connectionId"
      :data-database="database"
      :data-schema="schema.name || ''"
      role="treeitem"
      aria-level="3"
      :aria-expanded="isExpanded ? 'true' : 'false'"
      :aria-selected="isSelected ? 'true' : 'false'"
      tabindex="-1"
      @click="$emit('toggle')"
      @contextmenu.stop.prevent="handleSchemaContextMenu"
    >
      <component :is="isExpanded ? ChevronDown : ChevronRight" :class="caretClass" />
      <Grid2X2 class="ui-icon-muted mr-1.5 h-4 w-4 shrink-0" />
      <HighlightedText
        class="font-medium ui-text-default"
        :text="schema.name || 'default'"
        :query="searchQuery"
      />
    </div>
    <div v-if="isExpanded" role="group" class="ui-border-default ml-4 border-l pl-2">
      <button
        v-if="showTablesSection"
        type="button"
        class="ui-tree-section-button mt-1 flex w-full items-center justify-between px-2 text-left text-xs uppercase tracking-wide"
        :class="{
          'animate-pulse ui-tree-section-button-active': highlightedSection === 'tables'
        }"
        :aria-expanded="tablesSectionExpanded"
        @click.stop="toggleSection('tables')"
      >
        <span class="flex items-center gap-1">
          <component
            :is="tablesSectionExpanded ? ChevronDown : ChevronRight"
            class="ui-icon-muted h-3 w-3"
          />
          <span>Tables</span>
        </span>
        <span class="ui-text-subtle text-[11px] font-medium normal-case">
          {{ tablesCount }}
        </span>
      </button>
      <ObjectList
        v-if="showTablesSection && tablesSectionExpanded"
        :items="filteredTables"
        object-type="table"
        :connection-id="connectionId"
        :database="database"
        :schema="schema.name"
        :depth="3"
        :explorer-obj-prefix="`${connectionId}:${database}:${schema.name || ''}`"
        :table-sizes="tableSizes"
        @click="(p) => handleObjectOpen('table', p)"
        @dblclick="(p) => handleObjectOpen('table', p)"
        @middleclick="(p) => handleObjectOpen('table', p)"
        @contextmenu="handleObjectContextMenu"
      />
      <button
        v-if="showViewsSection"
        type="button"
        class="ui-tree-section-button mt-2 flex w-full items-center justify-between px-2 text-left text-xs uppercase tracking-wide"
        :class="{
          'animate-pulse ui-tree-section-button-active': highlightedSection === 'views'
        }"
        :aria-expanded="viewsSectionExpanded"
        @click.stop="toggleSection('views')"
      >
        <span class="flex items-center gap-1">
          <component
            :is="viewsSectionExpanded ? ChevronDown : ChevronRight"
            class="ui-icon-muted h-3 w-3"
          />
          <span>Views</span>
        </span>
        <span class="ui-text-subtle text-[11px] font-medium normal-case">
          {{ viewsCount }}
        </span>
      </button>
      <ObjectList
        v-if="showViewsSection && viewsSectionExpanded"
        :items="filteredViews"
        object-type="view"
        :connection-id="connectionId"
        :database="database"
        :schema="schema.name"
        :depth="3"
        :explorer-obj-prefix="`${connectionId}:${database}:${schema.name || ''}`"
        @click="(p) => handleObjectOpen('view', p)"
        @dblclick="(p) => handleObjectOpen('view', p)"
        @middleclick="(p) => handleObjectOpen('view', p)"
        @contextmenu="handleObjectContextMenu"
      />
      <button
        v-if="showFunctionsSection"
        type="button"
        class="ui-tree-section-button mt-2 flex w-full items-center justify-between px-2 text-left text-xs uppercase tracking-wide"
        :class="{
          'animate-pulse ui-tree-section-button-active': highlightedSection === 'functions'
        }"
        :aria-expanded="functionsSectionExpanded"
        @click.stop="functionsOpen = !functionsOpen"
      >
        <span class="flex items-center gap-1">
          <component
            :is="functionsSectionExpanded ? ChevronDown : ChevronRight"
            class="ui-icon-muted h-3 w-3"
          />
          <span>Functions</span>
        </span>
        <span class="ui-text-subtle text-[11px] font-medium normal-case">
          {{ functionsCount }}
        </span>
      </button>
      <ObjectList
        v-if="showFunctionsSection && functionsSectionExpanded"
        :items="filteredFunctions"
        object-type="function"
        :connection-id="connectionId"
        :database="database"
        :schema="schema.name"
        :depth="3"
        :explorer-obj-prefix="`${connectionId}:${database}:${schema.name || ''}`"
        @click="(p) => handleObjectOpen('function', p)"
        @dblclick="(p) => handleObjectOpen('function', p)"
        @middleclick="(p) => handleObjectOpen('function', p)"
        @contextmenu="handleObjectContextMenu"
      />
      <button
        v-if="showProceduresSection"
        type="button"
        class="ui-tree-section-button mt-2 flex w-full items-center justify-between px-2 text-left text-xs uppercase tracking-wide"
        :class="{
          'animate-pulse ui-tree-section-button-active': highlightedSection === 'procedures'
        }"
        :aria-expanded="proceduresSectionExpanded"
        @click.stop="proceduresOpen = !proceduresOpen"
      >
        <span class="flex items-center gap-1">
          <component
            :is="proceduresSectionExpanded ? ChevronDown : ChevronRight"
            class="ui-icon-muted h-3 w-3"
          />
          <span>Procedures</span>
        </span>
        <span class="ui-text-subtle text-[11px] font-medium normal-case">
          {{ proceduresCount }}
        </span>
      </button>
      <ObjectList
        v-if="showProceduresSection && proceduresSectionExpanded"
        :items="filteredProcedures"
        object-type="procedure"
        :connection-id="connectionId"
        :database="database"
        :schema="schema.name"
        :depth="3"
        :explorer-obj-prefix="`${connectionId}:${database}:${schema.name || ''}`"
        @click="(p) => handleObjectOpen('procedure', p)"
        @dblclick="(p) => handleObjectOpen('procedure', p)"
        @middleclick="(p) => handleObjectOpen('procedure', p)"
        @contextmenu="handleObjectContextMenu"
      />
      <button
        v-if="showSequencesSection"
        type="button"
        class="ui-tree-section-button mt-2 flex w-full items-center justify-between px-2 text-left text-xs uppercase tracking-wide"
        :class="{
          'animate-pulse ui-tree-section-button-active': highlightedSection === 'sequences'
        }"
        :aria-expanded="sequencesSectionExpanded"
        @click.stop="sequencesOpen = !sequencesOpen"
      >
        <span class="flex items-center gap-1">
          <component
            :is="sequencesSectionExpanded ? ChevronDown : ChevronRight"
            class="ui-icon-muted h-3 w-3"
          />
          <span>Sequences</span>
        </span>
        <span class="ui-text-subtle text-[11px] font-medium normal-case">
          {{ sequencesCount }}
        </span>
      </button>
      <ObjectList
        v-if="showSequencesSection && sequencesSectionExpanded"
        :items="filteredSequences"
        object-type="sequence"
        :connection-id="connectionId"
        :database="database"
        :schema="schema.name"
        :depth="3"
        :explorer-obj-prefix="`${connectionId}:${database}:${schema.name || ''}`"
        @click="(p) => handleObjectOpen('sequence', p)"
        @dblclick="(p) => handleObjectOpen('sequence', p)"
        @middleclick="(p) => handleObjectOpen('sequence', p)"
        @contextmenu="handleObjectContextMenu"
      />
    </div>
  </div>
</template>
