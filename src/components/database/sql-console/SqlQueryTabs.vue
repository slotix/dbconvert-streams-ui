<template>
  <div
    class="bg-gray-100 dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700 flex items-center"
  >
    <div class="flex-1 flex items-center overflow-x-auto scrollbar-thin">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="group flex items-center gap-1 px-3 py-1.5 border-r border-gray-200 dark:border-gray-700 cursor-pointer text-xs transition-colors min-w-0"
        :class="[
          tab.id === activeTabId
            ? 'bg-white dark:bg-gray-900 text-teal-600 dark:text-teal-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        ]"
        @click="$emit('select', tab.id)"
        @dblclick="startRename(tab)"
      >
        <span v-if="renamingTabId !== tab.id" class="truncate max-w-[120px]">{{ tab.name }}</span>
        <input
          v-else
          ref="renameInputRef"
          v-model="renameValue"
          type="text"
          class="w-24 px-1 py-0 text-xs bg-white dark:bg-gray-800 border border-teal-500 rounded focus:outline-none"
          @blur="finishRename"
          @keydown.enter="finishRename"
          @keydown.escape="cancelRename"
          @click.stop
        />
        <button
          v-if="tabs.length > 1 && renamingTabId !== tab.id"
          class="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
          title="Close tab"
          @click.stop="$emit('close', tab.id)"
        >
          <XMarkIcon class="h-3 w-3" />
        </button>
      </div>
    </div>
    <!-- Add Tab Button -->
    <button
      class="px-2 py-1.5 text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      title="New Query Tab"
      @click="$emit('add')"
    >
      <PlusIcon class="h-4 w-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import type { SqlQueryTab } from '@/stores/sqlConsole'

defineProps<{
  tabs: SqlQueryTab[]
  activeTabId: string | null
}>()

const emit = defineEmits<{
  select: [tabId: string]
  close: [tabId: string]
  add: []
  rename: [tabId: string, newName: string]
}>()

// Tab renaming state
const renamingTabId = ref<string | null>(null)
const renameValue = ref('')
const renameInputRef = ref<HTMLInputElement[]>()

function startRename(tab: SqlQueryTab) {
  renamingTabId.value = tab.id
  renameValue.value = tab.name
  nextTick(() => {
    const inputs = renameInputRef.value
    if (inputs && inputs.length > 0) {
      inputs[0].focus()
      inputs[0].select()
    }
  })
}

function finishRename() {
  if (renamingTabId.value && renameValue.value.trim()) {
    emit('rename', renamingTabId.value, renameValue.value.trim())
  }
  renamingTabId.value = null
  renameValue.value = ''
}

function cancelRename() {
  renamingTabId.value = null
  renameValue.value = ''
}
</script>
