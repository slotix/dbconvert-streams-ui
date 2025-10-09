<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { GridApi, Column } from 'ag-grid-community'

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
</script>

<template>
  <div
    ref="menuRef"
    class="column-context-menu"
    :style="menuStyle"
  >
    <div class="menu-section">
      <button @click="sortAscending" class="menu-item">
        <span class="menu-icon">↑</span>
        <span>Sort Ascending</span>
      </button>
      <button @click="sortDescending" class="menu-item">
        <span class="menu-icon">↓</span>
        <span>Sort Descending</span>
      </button>
      <button @click="clearSort" class="menu-item">
        <span class="menu-icon">⊗</span>
        <span>Clear Sort</span>
      </button>
    </div>

    <div class="menu-separator"></div>

    <div class="menu-section">
      <button @click="pinLeft" class="menu-item">
        <span class="menu-icon">📌</span>
        <span>Pin Left</span>
      </button>
      <button @click="pinRight" class="menu-item">
        <span class="menu-icon">📌</span>
        <span>Pin Right</span>
      </button>
      <button @click="unpinColumn" class="menu-item">
        <span class="menu-icon">📍</span>
        <span>Unpin</span>
      </button>
    </div>

    <div class="menu-separator"></div>

    <div class="menu-section">
      <button @click="openFilter" class="menu-item">
        <span class="menu-icon">⚙</span>
        <span>Filter...</span>
      </button>
    </div>

    <div class="menu-separator"></div>

    <div class="menu-section">
      <button @click="autoSizeColumn" class="menu-item">
        <span class="menu-icon">↔</span>
        <span>Autosize This Column</span>
      </button>
      <button @click="autoSizeAllColumns" class="menu-item">
        <span class="menu-icon">↔</span>
        <span>Autosize All Columns</span>
      </button>
    </div>

    <div class="menu-separator"></div>

    <div class="menu-section">
      <button @click="resetColumns" class="menu-item">
        <span class="menu-icon">⟲</span>
        <span>Reset Columns</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.column-context-menu {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  padding: 4px;
  z-index: 10000;
  font-size: 14px;
}

.menu-section {
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s;
  color: #374151;
  font-size: 14px;
}

.menu-item:hover {
  background-color: #f3f4f6;
}

.menu-item:active {
  background-color: #e5e7eb;
}

.menu-icon {
  width: 20px;
  display: inline-flex;
  justify-content: center;
  font-size: 16px;
}

.menu-separator {
  height: 1px;
  background-color: #e5e7eb;
  margin: 4px 0;
}
</style>
