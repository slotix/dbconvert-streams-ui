<template>
  <div
    :class="[
      'px-3 py-3 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between group',
      isSelected ? 'bg-blue-50 border-l-2 border-l-blue-600' : 'border-l-2 border-l-transparent'
    ]"
    @click="selectStream"
  >
    <!-- Stream Info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <h3 class="text-sm font-medium text-gray-900 truncate">{{ stream.name }}</h3>
        <span
          :class="[
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset flex-shrink-0',
            stream.mode === 'cdc'
              ? 'bg-orange-50 text-orange-700 ring-orange-600/20'
              : 'bg-green-50 text-green-700 ring-green-600/20'
          ]"
        >
          {{ stream.mode }}
        </span>
      </div>

      <!-- Connection Info -->
      <div class="flex items-center gap-1 text-xs text-gray-500">
        <span v-if="source" class="truncate" :title="source.name">{{ source.name }}</span>
        <span v-else class="text-gray-400">Unknown source</span>
        <ArrowRightIcon class="h-3 w-3 flex-shrink-0 text-gray-400" />
        <span v-if="target" class="truncate" :title="target.name">{{ target.name }}</span>
        <span v-else class="text-gray-400">Unknown target</span>
      </div>

      <!-- Table count -->
      <div v-if="stream.tables && stream.tables.length > 0" class="mt-1 text-xs text-gray-400">
        {{ stream.tables.length }} table{{ stream.tables.length !== 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Action Buttons -->
    <div
      class="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      @click.stop
    >
      <!-- Edit Button -->
      <router-link :to="{ name: 'EditStream', params: { id: stream.id } }">
        <button
          v-tooltip="'Edit stream'"
          type="button"
          class="p-1.5 rounded-md hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <PencilIcon class="h-4 w-4" />
        </button>
      </router-link>

      <!-- Delete Button -->
      <button
        v-tooltip="'Delete stream'"
        type="button"
        class="p-1.5 rounded-md hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
        @click.stop="deleteStream"
      >
        <TrashIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { vTooltip } from '@/directives/tooltip'

export default {
  directives: {
    tooltip: vTooltip
  }
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { PencilIcon, TrashIcon, ArrowRightIcon } from '@heroicons/vue/24/outline'
import type { StreamConfig } from '@/types/streamConfig'
import type { Connection } from '@/types/connections'

const props = defineProps<{
  stream: StreamConfig
  isSelected: boolean
  source?: Connection
  target?: Connection
}>()

const emit = defineEmits<{
  (e: 'select', payload: { streamId: string }): void
  (e: 'delete', payload: { streamId: string }): void
  (e: 'edit', payload: { streamId: string }): void
}>()

const tableCount = computed(() => {
  return props.stream.tables?.length || 0
})

function selectStream() {
  emit('select', { streamId: props.stream.id })
}

function deleteStream() {
  emit('delete', { streamId: props.stream.id })
}
</script>
