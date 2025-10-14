<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import ObjectIcon from '@/components/common/ObjectIcon.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import { highlightParts } from '@/utils/highlight'

type ObjectType = 'table' | 'view'

const props = defineProps<{
  connectionLabel?: string | null
  database?: string | null
  schema?: string | null
  type?: ObjectType | null
  name?: string | null
  objects?: Array<{ name: string; type: ObjectType; schema?: string }>
}>()

const emit = defineEmits<{
  (e: 'navigate', payload: { level: 'database' | 'schema' | 'type' | 'name' }): void
  (e: 'pick-name', payload: { name: string; type: ObjectType; schema?: string }): void
}>()

function labelForType(t: ObjectType | null | undefined) {
  if (!t) return ''
  return t === 'table' ? 'Tables' : 'Views'
}

// Picker state
const showPicker = ref(false)
const search = ref('')
const anchorRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = props.objects || []
  if (!q) return list.slice(0, 200) // cap for performance
  return list
    .filter((o) => [o.name, o.schema, o.type].filter(Boolean).join(' ').toLowerCase().includes(q))
    .slice(0, 200)
})

function onPick(o: { name: string; type: ObjectType; schema?: string }) {
  emit('pick-name', o)
  showPicker.value = false
  search.value = ''
}

function onDocClick(e: MouseEvent) {
  const target = e.target as Node
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
    <ol class="flex items-center gap-2 text-gray-600">
      <li v-if="props.connectionLabel" class="inline-flex items-center gap-2">
        <span class="text-gray-700 font-medium">{{ props.connectionLabel }}</span>
      </li>
      <li v-if="props.database" class="inline-flex items-center gap-2">
        <span v-if="props.connectionLabel" class="text-gray-400">/</span>
        <button
          class="text-gray-700 font-medium hover:underline"
          @click="emit('navigate', { level: 'database' })"
        >
          {{ props.database }}
        </button>
      </li>
      <li v-if="props.schema" class="inline-flex items-center gap-2">
        <span class="text-gray-400">/</span>
        <button
          class="text-gray-700 font-medium hover:underline"
          @click="emit('navigate', { level: 'schema' })"
        >
          {{ props.schema }}
        </button>
      </li>
      <li v-if="props.type" class="inline-flex items-center gap-2">
        <span class="text-gray-400">/</span>
        <button class="text-gray-700 hover:underline" @click="emit('navigate', { level: 'type' })">
          {{ labelForType(props.type) }}
        </button>
      </li>
      <li v-if="props.name" class="inline-flex items-center gap-2">
        <span class="text-gray-400">/</span>
        <button
          ref="anchorRef"
          type="button"
          class="text-gray-900 font-medium hover:underline"
          title="Switch object"
          @click.stop="showPicker = !showPicker"
        >
          {{ props.name }}
        </button>
      </li>
    </ol>

    <!-- Quick object picker dropdown -->
    <div
      v-if="showPicker"
      ref="menuRef"
      class="absolute z-30 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg p-2"
      style="left: 0"
    >
      <SearchInput v-model="search" placeholder="Search tables or views…" size="md" />
      <div class="h-2"></div>
      <div class="max-h-72 overflow-auto">
        <button
          v-for="o in filtered"
          :key="`${o.schema || ''}:${o.type}:${o.name}`"
          class="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
          @click="onPick(o)"
        >
          <ObjectIcon :object-type="o.type" />
          <span class="text-gray-700">
            <template
              v-for="(p, i) in highlightParts((o.schema ? `${o.schema}.` : '') + o.name, search)"
              :key="i"
            >
              <span v-if="p.match" class="bg-yellow-200/60 rounded px-0.5" v-text="p.text"></span>
              <span v-else v-text="p.text"></span>
            </template>
          </span>
        </button>
        <div v-if="!filtered.length" class="text-xs text-gray-500 px-2 py-3">No matches</div>
      </div>
    </div>
  </nav>
</template>
