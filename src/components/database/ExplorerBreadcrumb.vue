<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { File, Lock } from 'lucide-vue-next'
import ObjectIcon from '@/components/common/ObjectIcon.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'
import type { PathSegment } from '@/utils/pathUtils'
import type { ObjectType } from '@/stores/explorerNavigation'

// File entry for picker
interface FileEntry {
  name: string
  path: string
  type?: 'file' | 'dir'
  format?: string
}

const props = defineProps<{
  // Common
  connectionLabel?: string | null
  name?: string | null

  // Database-specific
  database?: string | null
  schema?: string | null
  objects?: Array<{ name: string; type: ObjectType; schema?: string }>

  // File-specific
  pathSegments?: PathSegment[]
  files?: FileEntry[]
  fileStatusLabel?: 'Editable' | 'Read-only' | null
  fileStatusTooltip?: string | null

  // SQL Console without database - show console name instead
  consoleName?: string | null
}>()

const emit = defineEmits<{
  (e: 'pick-name', payload: { name: string; type: ObjectType; schema?: string }): void
  (e: 'pick-file', payload: { name: string; path: string }): void
}>()

// Determine breadcrumb mode
const isFileMode = computed(() => !!(props.pathSegments && props.pathSegments.length > 0))
const isDatabaseMode = computed(() => !!props.database)
const isConsoleMode = computed(() => !!props.consoleName && !props.database)

// Picker state
const showPicker = ref(false)
const search = ref('')
const anchorRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)

// Filtered lists for picker
const filteredObjects = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = props.objects || []
  if (!q) return list.slice(0, 200)
  return list
    .filter((o) => [o.name, o.schema, o.type].filter(Boolean).join(' ').toLowerCase().includes(q))
    .slice(0, 200)
})

const filteredFiles = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = props.files || []
  if (!q) return list.slice(0, 200)
  return list.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 200)
})

// Show picker conditions
const showObjectPicker = computed(() => isDatabaseMode.value && (props.objects?.length || 0) > 0)
const showFilePicker = computed(() => isFileMode.value && (props.files?.length || 0) > 0)

function togglePicker() {
  showPicker.value = !showPicker.value
  if (showPicker.value) {
    search.value = ''
  }
}

function onPickObject(o: { name: string; type: ObjectType; schema?: string }) {
  emit('pick-name', o)
  showPicker.value = false
  search.value = ''
}

function onPickFile(f: FileEntry) {
  emit('pick-file', { name: f.name, path: f.path })
  showPicker.value = false
  search.value = ''
}

function onDocClick(e: MouseEvent) {
  const target = e.target as Node
  if (!showPicker.value) return

  if (
    menuRef.value &&
    !menuRef.value.contains(target) &&
    anchorRef.value &&
    !anchorRef.value.contains(target)
  ) {
    showPicker.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <nav aria-label="Breadcrumb" class="text-sm relative">
    <ol class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
      <!-- Connection label (shown first, except in console mode where consoleName already includes it) -->
      <li v-if="props.connectionLabel && !isConsoleMode" class="inline-flex items-center gap-2">
        <span class="text-gray-700 dark:text-gray-300 font-medium">{{
          props.connectionLabel
        }}</span>
      </li>

      <!-- DATABASE MODE: database / schema / table -->
      <template v-if="isDatabaseMode">
        <!-- Database -->
        <li v-if="props.database" class="inline-flex items-center gap-2">
          <span v-if="props.connectionLabel" class="text-gray-400 dark:text-gray-500">/</span>
          <span class="text-gray-700 dark:text-gray-300 font-medium">
            {{ props.database }}
          </span>
        </li>

        <!-- Schema -->
        <li v-if="props.schema" class="inline-flex items-center gap-2">
          <span class="text-gray-400 dark:text-gray-500">/</span>
          <span class="text-gray-700 dark:text-gray-300 font-medium">
            {{ props.schema }}
          </span>
        </li>

        <!-- Table/View name (clickable picker) -->
        <li v-if="props.name" class="inline-flex items-center gap-2">
          <span class="text-gray-400 dark:text-gray-500">/</span>
          <button
            v-if="showObjectPicker"
            ref="anchorRef"
            type="button"
            class="text-gray-900 dark:text-gray-100 font-medium hover:underline"
            title="Switch object"
            @click.stop="togglePicker"
          >
            {{ props.name }}
          </button>
          <span v-else class="text-gray-900 dark:text-gray-100 font-medium">
            {{ props.name }}
          </span>
        </li>
      </template>

      <!-- CONSOLE MODE: just show console name (it already includes connection info) -->
      <template v-else-if="isConsoleMode">
        <li class="inline-flex items-center gap-2">
          <span class="text-gray-700 dark:text-gray-300 font-medium">
            {{ props.consoleName }}
          </span>
        </li>
      </template>

      <!-- FILE MODE: bucket / folder / ... / file -->
      <template v-else-if="isFileMode">
        <!-- Path segments (bucket, folders) -->
        <li
          v-for="(segment, index) in props.pathSegments"
          :key="segment.path"
          class="inline-flex items-center gap-2"
        >
          <span v-if="index > 0 || props.connectionLabel" class="text-gray-400 dark:text-gray-500"
            >/</span
          >
          <span
            class="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[150px]"
            :title="segment.name"
          >
            {{ segment.name }}
          </span>
        </li>

        <!-- File name (clickable picker) -->
        <li v-if="props.name" class="inline-flex items-center gap-2">
          <span
            v-if="props.pathSegments?.length || props.connectionLabel"
            class="text-gray-400 dark:text-gray-500"
            >/</span
          >
          <button
            v-if="showFilePicker"
            ref="anchorRef"
            type="button"
            class="text-gray-900 dark:text-gray-100 font-medium hover:underline"
            title="Switch file"
            @click.stop="togglePicker"
          >
            {{ props.name }}
          </button>
          <span v-else class="text-gray-900 dark:text-gray-100 font-medium">
            {{ props.name }}
          </span>

          <span
            v-if="props.fileStatusLabel === 'Read-only'"
            class="inline-flex items-center gap-1 rounded-full border border-amber-300 dark:border-amber-600/60 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
            :title="props.fileStatusTooltip || undefined"
          >
            <Lock class="h-3 w-3 shrink-0" />
            Read-only
          </span>
          <span
            v-else-if="props.fileStatusLabel === 'Editable'"
            class="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100/80 dark:bg-gray-800/70 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400"
            :title="props.fileStatusTooltip || undefined"
          >
            Editable
          </span>
        </li>
      </template>
    </ol>

    <!-- Database object picker dropdown -->
    <div
      v-if="showPicker && isDatabaseMode"
      ref="menuRef"
      class="absolute z-30 mt-2 w-80 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg dark:shadow-gray-900/50 p-2"
      style="left: 0"
    >
      <SearchInput v-model="search" placeholder="Search tables or views…" size="md" />
      <div class="h-2"></div>
      <div class="max-h-72 overflow-auto">
        <button
          v-for="o in filteredObjects"
          :key="`${o.schema || ''}:${o.type}:${o.name}`"
          class="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-2"
          :class="{ 'bg-blue-50 dark:bg-blue-900/20': o.name === props.name }"
          @click="onPickObject(o)"
        >
          <ObjectIcon :object-type="o.type" />
          <HighlightedText
            class="text-gray-700 dark:text-gray-300"
            :text="(o.schema ? `${o.schema}.` : '') + o.name"
            :query="search"
          />
        </button>
        <div
          v-if="!filteredObjects.length"
          class="text-xs text-gray-500 dark:text-gray-400 px-2 py-3"
        >
          No matches
        </div>
      </div>
    </div>

    <!-- File picker dropdown -->
    <div
      v-if="showPicker && isFileMode"
      ref="menuRef"
      class="absolute z-30 mt-2 w-80 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg dark:shadow-gray-900/50 p-2"
      style="left: 0"
    >
      <SearchInput v-model="search" placeholder="Search files…" size="md" />
      <div class="h-2"></div>
      <div class="max-h-72 overflow-auto">
        <button
          v-for="f in filteredFiles"
          :key="f.path"
          class="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-2"
          :class="{ 'bg-blue-50 dark:bg-blue-900/20': f.name === props.name }"
          @click="onPickFile(f)"
        >
          <File class="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
          <HighlightedText
            class="text-gray-700 dark:text-gray-300"
            :text="f.name"
            :query="search"
          />
        </button>
        <div
          v-if="!filteredFiles.length"
          class="text-xs text-gray-500 dark:text-gray-400 px-2 py-3"
        >
          No matches
        </div>
      </div>
    </div>
  </nav>
</template>
