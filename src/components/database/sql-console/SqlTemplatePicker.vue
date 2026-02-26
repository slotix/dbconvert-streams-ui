<template>
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
          <Search class="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
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
            No templates match "{{ templateSearch }}".
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
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { QueryTemplate } from '@/components/console/queryTemplates'
import {
  ChevronRight,
  Cloud,
  Code,
  Database,
  FileText,
  Link2,
  Puzzle,
  Search
} from 'lucide-vue-next'

type Template = QueryTemplate
type TemplateSection = 'Session' | 'Databases' | 'Files' | 'S3' | 'Joins' | 'Snippets'
type TemplateIcon = 'session' | 'database' | 'file' | 's3' | 'join'

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

const MYSQL_LOGO = '/images/db-logos/mysql.svg'
const POSTGRES_LOGO = '/images/db-logos/postgresql.svg'

interface Props {
  templates: QueryTemplate[]
  dialect?: string
  triggerRef?: HTMLElement | null
}

const props = withDefaults(defineProps<Props>(), {
  dialect: '',
  triggerRef: null
})

const emit = defineEmits<{
  select: [query: string]
}>()

const showTemplates = ref(false)
const templateSearch = ref('')
const activeTemplateKey = ref('')
const expandedAliasGroups = ref<Record<string, boolean>>({})
const templateMenuStyle = ref<Record<string, string>>({})
const templateMenuRef = ref<HTMLElement | null>(null)
const templateSearchInputRef = ref<HTMLInputElement | null>(null)
let viewportUpdateRafId: number | null = null

const isMacPlatform = computed(
  () =>
    typeof navigator !== 'undefined' &&
    /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent || '')
)
const shortcutHint = computed(() => (isMacPlatform.value ? '\u2318K' : 'Ctrl+K'))

const hasFederatedTemplateSections = computed(() =>
  props.templates.some((template) =>
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
  if (!query) return props.templates

  return props.templates.filter((template) => {
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
  const trigger = props.triggerRef
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

function selectTemplate(template: Template) {
  emit('select', template.query)
  showTemplates.value = false
}

async function open() {
  showTemplates.value = true
  updateTemplateMenuPosition()
  const firstTemplate = visibleTemplates.value[0]
  if (firstTemplate) {
    activeTemplateKey.value = templateKey(firstTemplate)
  }
  await focusTemplateSearch()
}

function close() {
  showTemplates.value = false
}

function toggle() {
  if (showTemplates.value) {
    close()
    return
  }
  void open()
}

const isOpen = computed(() => showTemplates.value)

// Click-outside handler
function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node | null
  if (!target) return

  const clickedInTrigger = !!props.triggerRef?.contains(target)
  const clickedInMenu = !!templateMenuRef.value?.contains(target)

  if (!clickedInTrigger && !clickedInMenu) {
    showTemplates.value = false
  }
}

// Escape key handler
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showTemplates.value) {
    showTemplates.value = false
  }
}

function handleViewportChange() {
  if (!showTemplates.value) return
  if (typeof window !== 'undefined') {
    if (viewportUpdateRafId !== null) {
      window.cancelAnimationFrame(viewportUpdateRafId)
    }
    viewportUpdateRafId = window.requestAnimationFrame(() => {
      viewportUpdateRafId = null
      updateTemplateMenuPosition()
    })
    return
  }
  updateTemplateMenuPosition()
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

watch(showTemplates, async (isOpenNow) => {
  if (!isOpenNow) return
  await nextTick()
  updateTemplateMenuPosition()
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
  if (viewportUpdateRafId !== null && typeof window !== 'undefined') {
    window.cancelAnimationFrame(viewportUpdateRafId)
    viewportUpdateRafId = null
  }
})

defineExpose({
  toggle,
  open,
  close,
  isOpen
})
</script>
