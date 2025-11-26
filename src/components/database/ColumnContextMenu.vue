<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { GridApi, Column } from 'ag-grid-community'
import { useContextualIconSizes } from '@/composables/useIconSizes'
import {
  ArrowsPointingOutIcon,
  ArrowPathIcon,
  MapPinIcon,
  NoSymbolIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  x: number
  y: number
  column: Column | null
  gridApi: GridApi | null
}>()

const emit = defineEmits<{
  close: []
}>()

const menuRef = ref<HTMLElement | null>(null)

// Icon sizes
const iconSizes = useContextualIconSizes()

// Adjust menu position if it goes off-screen
const menuStyle = computed(() => {
  const style: any = {
    position: 'fixed',
    left: `${props.x}px`,
    top: `${props.y}px`
  }

  return style
})

// Close menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close')
  }
}

onMounted(() => {
  // Delay adding listeners to avoid closing immediately on the same click that opened it
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('contextmenu', handleClickOutside)
  }, 100)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('contextmenu', handleClickOutside)
})

// Menu actions
const pinLeft = () => {
  if (props.column && props.gridApi) {
    props.gridApi.applyColumnState({
      state: [{ colId: props.column.getColId(), pinned: 'left' }]
    })
  }
  emit('close')
}

const pinRight = () => {
  if (props.column && props.gridApi) {
    props.gridApi.applyColumnState({
      state: [{ colId: props.column.getColId(), pinned: 'right' }]
    })
  }
  emit('close')
}

const unpinColumn = () => {
  if (props.column && props.gridApi) {
    props.gridApi.applyColumnState({
      state: [{ colId: props.column.getColId(), pinned: null }]
    })
  }
  emit('close')
}

const autoSizeColumn = () => {
  if (props.column && props.gridApi) {
    props.gridApi.autoSizeColumns([props.column.getColId()])
  }
  emit('close')
}

const autoSizeAllColumns = () => {
  if (props.gridApi) {
    props.gridApi.autoSizeAllColumns()
  }
  emit('close')
}

const resetColumns = () => {
  if (props.gridApi) {
    props.gridApi.resetColumnState()
  }
  emit('close')
}
</script>

<template>
  <div
    ref="menuRef"
    class="fixed bg-white dark:bg-gray-850 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg dark:shadow-gray-900/50 min-w-[200px] py-1 z-[10000]"
    :style="menuStyle"
  >
    <!-- Pin Section -->
    <div class="py-1">
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="pinLeft"
      >
        <MapPinIcon
          :class="[iconSizes.contextMenu, 'text-gray-500 dark:text-gray-400 -rotate-45']"
        />
        <span>Pin Left</span>
      </button>
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="pinRight"
      >
        <MapPinIcon
          :class="[iconSizes.contextMenu, 'text-gray-500 dark:text-gray-400 rotate-45']"
        />
        <span>Pin Right</span>
      </button>
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="unpinColumn"
      >
        <NoSymbolIcon :class="[iconSizes.contextMenu, 'text-gray-500 dark:text-gray-400']" />
        <span>Unpin</span>
      </button>
    </div>

    <div class="border-t border-gray-200 dark:border-gray-700"></div>

    <!-- Resize Section -->
    <div class="py-1">
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="autoSizeColumn"
      >
        <ArrowsPointingOutIcon
          :class="[iconSizes.contextMenu, 'text-gray-500 dark:text-gray-400']"
        />
        <span>Autosize This Column</span>
      </button>
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="autoSizeAllColumns"
      >
        <ArrowsPointingOutIcon
          :class="[iconSizes.contextMenu, 'text-gray-500 dark:text-gray-400']"
        />
        <span>Autosize All Columns</span>
      </button>
    </div>

    <div class="border-t border-gray-200 dark:border-gray-700"></div>

    <!-- Reset Section -->
    <div class="py-1">
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="resetColumns"
      >
        <ArrowPathIcon :class="[iconSizes.contextMenu, 'text-gray-500 dark:text-gray-400']" />
        <span>Reset Columns</span>
      </button>
    </div>
  </div>
</template>
