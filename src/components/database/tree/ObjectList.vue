<script setup lang="ts">
import ObjectIcon from '@/components/common/ObjectIcon.vue'
import { highlightParts as splitHighlight } from '@/utils/highlight'

type ObjectType = 'table' | 'view'

interface ObjectItem {
  name: string
  schema?: string
}

const props = defineProps<{
  items: string[]
  objectType: ObjectType
  connectionId: string
  database: string
  schema?: string
  searchQuery: string
  explorerObjPrefix: string
}>()

const emit = defineEmits<{
  (e: 'click', payload: { name: string; mode: 'preview' }): void
  (e: 'dblclick', payload: { name: string; mode: 'pinned' }): void
  (e: 'middleclick', payload: { name: string; mode: 'pinned' }): void
  (
    e: 'contextmenu',
    payload: { event: MouseEvent; kind: ObjectType; name: string; schema?: string }
  ): void
}>()

const highlightParts = (text: string) => splitHighlight(text, props.searchQuery)

function handleClick(name: string) {
  emit('click', { name, mode: 'preview' })
}

function handleDblClick(name: string) {
  emit('dblclick', { name, mode: 'pinned' })
}

function handleMiddleClick(name: string) {
  emit('middleclick', { name, mode: 'pinned' })
}

function handleContextMenu(event: MouseEvent, name: string) {
  emit('contextmenu', {
    event,
    kind: props.objectType,
    name,
    schema: props.schema
  })
}

const filteredItems = () => {
  if (!props.searchQuery) return props.items
  return props.items.filter((n) => n.toLowerCase().includes(props.searchQuery.toLowerCase()))
}
</script>

<template>
  <div
    v-for="item in filteredItems()"
    :key="item"
    class="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer"
    :data-explorer-obj="`${explorerObjPrefix}:${objectType}:${item}`"
    @click.stop="handleClick(item)"
    @dblclick.stop="handleDblClick(item)"
    @click.middle.stop="handleMiddleClick(item)"
    @contextmenu.stop.prevent="handleContextMenu($event, item)"
  >
    <ObjectIcon :object-type="objectType" class="mr-1.5" />
    <span>
      <template v-for="(p, i) in highlightParts(item)" :key="i">
        <span v-if="p.match" class="bg-yellow-200/60 rounded px-0.5" v-text="p.text"></span>
        <span v-else v-text="p.text"></span>
      </template>
    </span>
  </div>
</template>
