<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import ObjectIcon from '@/components/common/ObjectIcon.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import HighlightedText from '@/components/common/HighlightedText.vue'

type ObjectType = 'table' | 'view'

const props = defineProps<{
  connectionLabel?: string | null
  database?: string | null
  schema?: string | null
  name?: string | null
  objects?: Array<{ name: string; type: ObjectType; schema?: string }>
}>()

const emit = defineEmits<{
  (e: 'pick-name', payload: { name: string; type: ObjectType; schema?: string }): void
}>()

// Picker state for object/table picker
const showPicker = ref(false)
const search = ref('')
const anchorRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)

const filteredObjects = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = props.objects || []
  if (!q) return list.slice(0, 200)
  return list
    .filter((o) => [o.name, o.schema, o.type].filter(Boolean).join(' ').toLowerCase().includes(q))
    .slice(0, 200)
})

const showObjectPicker = computed(() => (props.objects?.length || 0) > 0)

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
      <!-- Connection label (text only) -->
      <li v-if="props.connectionLabel" class="inline-flex items-center gap-2">
        <span class="text-gray-700 dark:text-gray-300 font-medium">{{
          props.connectionLabel
        }}</span>
      </li>

      <!-- Database (text only) -->
      <li v-if="props.database" class="inline-flex items-center gap-2">
        <span v-if="props.connectionLabel" class="text-gray-400 dark:text-gray-500">/</span>
        <span class="text-gray-700 dark:text-gray-300 font-medium">
          {{ props.database }}
        </span>
      </li>

      <!-- Schema (text only) -->
      <li v-if="props.schema" class="inline-flex items-center gap-2">
        <span class="text-gray-400 dark:text-gray-500">/</span>
        <span class="text-gray-700 dark:text-gray-300 font-medium">
          {{ props.schema }}
        </span>
      </li>

      <!-- Object name (clickable picker) -->
      <li v-if="props.name" class="inline-flex items-center gap-2">
        <span class="text-gray-400 dark:text-gray-500">/</span>
        <button
          v-if="showObjectPicker"
          ref="anchorRef"
          type="button"
          class="text-gray-900 dark:text-gray-100 font-medium hover:underline"
          title="Switch table or view"
          @click.stop="togglePicker"
        >
          {{ props.name }}
        </button>
        <span v-else class="text-gray-900 dark:text-gray-100 font-medium">
          {{ props.name }}
        </span>
      </li>
    </ol>

    <!-- Object picker dropdown -->
    <div
      v-if="showPicker"
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
  </nav>
</template>
