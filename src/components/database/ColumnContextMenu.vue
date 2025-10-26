<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { GridApi, Column } from 'ag-grid-community'
import { useContextualIconSizes } from '@/composables/useIconSizes'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  XCircleIcon,
  FunnelIcon,
  ArrowsPointingOutIcon,
  ArrowPathIcon,
  MapPinIcon,
  NoSymbolIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  x: number
  y: number
  column: Column | null
  gridApi: GridApi | null
}>()

const emit = defineEmits<{
  close: []
  openAdvancedFilter: []
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
const sortAscending = () => {
  if (props.column && props.gridApi) {
    props.gridApi.applyColumnState({
      state: [{ colId: props.column.getColId(), sort: 'asc' }],
      defaultState: { sort: null }
    })
  }
  emit('close')
}

const sortDescending = () => {
  if (props.column && props.gridApi) {
    props.gridApi.applyColumnState({
      state: [{ colId: props.column.getColId(), sort: 'desc' }],
      defaultState: { sort: null }
    })
  }
  emit('close')
}

const clearSort = () => {
  if (props.column && props.gridApi) {
    props.gridApi.applyColumnState({
      state: [{ colId: props.column.getColId(), sort: null }]
    })
  }
  emit('close')
}

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

const openFilter = () => {
  if (props.column && props.gridApi) {
    props.gridApi.showColumnFilter(props.column.getColId())
  }
  emit('close')
}

const openAdvancedFilter = () => {
  emit('openAdvancedFilter')
  emit('close')
}
</script>

<template>
  <div
    ref="menuRef"
    class="fixed bg-white border border-gray-300 rounded-md shadow-lg min-w-[200px] py-1 z-[10000]"
    :style="menuStyle"
  >
    <!-- Sort Section -->
    <div class="py-1">
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        @click="sortAscending"
      >
        <ArrowUpIcon :class="[iconSizes.contextMenu, 'text-gray-500']" />
        <span>Sort Ascending</span>
      </button>
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        @click="sortDescending"
      >
        <ArrowDownIcon :class="[iconSizes.contextMenu, 'text-gray-500']" />
        <span>Sort Descending</span>
      </button>
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        @click="clearSort"
      >
        <XCircleIcon :class="[iconSizes.contextMenu, 'text-gray-500']" />
        <span>Clear Sort</span>
      </button>
    </div>

    <div class="border-t border-gray-200"></div>

    <!-- Pin Section -->
    <div class="py-1">
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        @click="pinLeft"
      >
        <MapPinIcon :class="[iconSizes.contextMenu, 'text-gray-500 -rotate-45']" />
        <span>Pin Left</span>
      </button>
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        @click="pinRight"
      >
        <MapPinIcon :class="[iconSizes.contextMenu, 'text-gray-500 rotate-45']" />
        <span>Pin Right</span>
      </button>
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        @click="unpinColumn"
      >
        <NoSymbolIcon :class="[iconSizes.contextMenu, 'text-gray-500']" />
        <span>Unpin</span>
      </button>
    </div>

    <div class="border-t border-gray-200"></div>

    <!-- Filter Section -->
    <div class="py-1">
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        @click="openFilter"
      >
        <FunnelIcon :class="[iconSizes.contextMenu, 'text-gray-500']" />
        <span>Filter...</span>
      </button>
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        @click="openAdvancedFilter"
      >
        <AdjustmentsHorizontalIcon :class="[iconSizes.contextMenu, 'text-gray-500']" />
        <span>Advanced Filter...</span>
      </button>
    </div>

    <div class="border-t border-gray-200"></div>

    <!-- Resize Section -->
    <div class="py-1">
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        @click="autoSizeColumn"
      >
        <ArrowsPointingOutIcon :class="[iconSizes.contextMenu, 'text-gray-500']" />
        <span>Autosize This Column</span>
      </button>
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        @click="autoSizeAllColumns"
      >
        <ArrowsPointingOutIcon :class="[iconSizes.contextMenu, 'text-gray-500']" />
        <span>Autosize All Columns</span>
      </button>
    </div>

    <div class="border-t border-gray-200"></div>

    <!-- Reset Section -->
    <div class="py-1">
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        @click="resetColumns"
      >
        <ArrowPathIcon :class="[iconSizes.contextMenu, 'text-gray-500']" />
        <span>Reset Columns</span>
      </button>
    </div>
  </div>
</template>
