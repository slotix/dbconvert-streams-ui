<script setup lang="ts">
import { computed } from 'vue'

type ContextTarget =
  | { kind: 'connection'; connectionId: string }
  | { kind: 'database'; connectionId: string; database: string }
  | { kind: 'schema'; connectionId: string; database: string; schema: string }
  | {
      kind: 'table' | 'view'
      connectionId: string
      database: string
      schema?: string
      name: string
    }

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  target: ContextTarget | null
  canCopyDDL?: boolean
}>()

const emit = defineEmits<{
  (
    e: 'menu-action',
    payload: { action: string; target: ContextTarget; openInRightSplit?: boolean }
  ): void
  (e: 'close'): void
}>()

const hasMenu = computed(() => props.visible && !!props.target)
const target = computed(() => props.target as ContextTarget)
const isTableOrView = computed(
  () => !!props.target && (props.target.kind === 'table' || props.target.kind === 'view')
)

function click(action: string, openInRightSplit?: boolean) {
  if (!props.target) return
  emit('menu-action', { action, target: props.target, openInRightSplit })
}
</script>

<template>
  <teleport to="body">
    <div v-if="hasMenu">
      <div class="fixed inset-0 z-40" @click="emit('close')"></div>
      <div
        class="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 text-sm"
        :style="{ left: x + 'px', top: y + 'px', minWidth: '200px' }"
      >
        <template v-if="target.kind === 'connection'">
          <!-- Connection menu -->
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            @click="click('test-connection')"
          >
            Test connection
          </button>
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            @click="click('refresh-databases')"
          >
            Refresh
          </button>
          <div class="my-1 border-t border-gray-100"></div>
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            @click="click('edit-connection')"
          >
            Edit
          </button>
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            @click="click('clone-connection')"
          >
            Clone
          </button>
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-red-600"
            @click="click('delete-connection')"
          >
            Delete
          </button>
        </template>

        <template v-else-if="target.kind === 'database'">
          <!-- Database menu -->
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            @click="click('refresh-metadata')"
          >
            Refresh metadata
          </button>
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            @click="click('show-diagram')"
          >
            Show diagram
          </button>
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            @click="click('copy-database-name')"
          >
            Copy name
          </button>
        </template>

        <template v-else-if="target.kind === 'schema'">
          <!-- Schema menu -->
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            @click="click('refresh-metadata')"
          >
            Refresh metadata
          </button>
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            @click="click('copy-schema-name')"
          >
            Copy name
          </button>
        </template>

        <template v-else-if="isTableOrView">
          <!-- Table/View menu -->
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            @click="click('open-data', false)"
          >
            Open Data
          </button>
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            @click="click('open-structure', false)"
          >
            Open Structure
          </button>
          <div class="my-1 border-t border-gray-100"></div>
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            @click="click('open-data', true)"
          >
            Open Data in Right Split
          </button>
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            @click="click('open-structure', true)"
          >
            Open Structure in Right Split
          </button>
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            @click="click('copy-object-name')"
          >
            Copy name
          </button>
          <button
            class="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            :disabled="!canCopyDDL"
            @click="click('copy-ddl')"
          >
            Copy DDL
          </button>
        </template>
      </div>
    </div>
  </teleport>
</template>
