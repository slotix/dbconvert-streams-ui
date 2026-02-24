<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown, ChevronUp, Focus, GripVertical } from 'lucide-vue-next'

const panelRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const position = ref({ x: 0, y: 0 })
const isCollapsed = ref(false)

const storageKey = 'dbconvert.diagram.legend.position'
const collapsedStorageKey = 'dbconvert.diagram.legend.collapsed'
const margin = 12

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
  try {
    window.localStorage.setItem(collapsedStorageKey, JSON.stringify(isCollapsed.value))
  } catch {
    // Ignore storage failures
  }
}

const restoreCollapsedState = () => {
  try {
    const stored = window.localStorage.getItem(collapsedStorageKey)
    if (stored) {
      isCollapsed.value = JSON.parse(stored) === true
    }
  } catch {
    // Ignore storage failures
  }
}

const panelStyle = computed(() => ({
  left: '0px',
  top: '0px',
  transform: `translate3d(${position.value.x}px, ${position.value.y}px, 0)`
}))

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const getContainer = () => panelRef.value?.offsetParent as HTMLElement | null

const setPosition = (x: number, y: number) => {
  const container = getContainer()
  const panel = panelRef.value
  if (!container || !panel) {
    position.value = { x, y }
    return
  }

  const containerBox = container.getBoundingClientRect()
  const panelBox = panel.getBoundingClientRect()
  const maxX = Math.max(margin, containerBox.width - panelBox.width - margin)
  const maxY = Math.max(margin, containerBox.height - panelBox.height - margin)

  position.value = {
    x: clamp(x, margin, maxX),
    y: clamp(y, margin, maxY)
  }
}

const savePosition = () => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(position.value))
  } catch {
    // Ignore storage failures (private mode, quota).
  }
}

const restorePosition = () => {
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return false
    const parsed = JSON.parse(stored) as { x?: number; y?: number }
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return false
    setPosition(parsed.x, parsed.y)
    return true
  } catch {
    return false
  }
}

let dragStart: { x: number; y: number; left: number; top: number } | null = null

const handlePointerMove = (event: PointerEvent) => {
  if (!dragStart) return
  const nextX = dragStart.left + (event.clientX - dragStart.x)
  const nextY = dragStart.top + (event.clientY - dragStart.y)
  setPosition(nextX, nextY)
}

const handlePointerUp = () => {
  if (!dragStart) return
  dragStart = null
  isDragging.value = false
  savePosition()
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
}

const handlePointerDown = (event: PointerEvent) => {
  if (event.button !== 0) return
  event.preventDefault()
  dragStart = {
    x: event.clientX,
    y: event.clientY,
    left: position.value.x,
    top: position.value.y
  }
  isDragging.value = true
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

const handleResize = () => {
  setPosition(position.value.x, position.value.y)
}

onMounted(async () => {
  restoreCollapsedState()
  await nextTick()
  if (!restorePosition()) {
    setPosition(margin, margin)
  }
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
})
</script>

<template>
  <div
    ref="panelRef"
    :style="panelStyle"
    class="absolute z-10 w-[180px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg"
  >
    <div
      class="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 select-none touch-none"
      :class="[isDragging ? 'cursor-grabbing' : 'cursor-grab', isCollapsed ? 'border-b-0' : '']"
      @pointerdown="handlePointerDown"
    >
      <h4
        class="text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200"
      >
        Legend
      </h4>
      <div class="flex items-center gap-1">
        <button
          class="p-0.5 rounded text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle collapse"
          @pointerdown.stop
          @click="toggleCollapse"
        >
          <ChevronUp v-if="!isCollapsed" class="w-3.5 h-3.5" />
          <ChevronDown v-else class="w-3.5 h-3.5" />
        </button>
        <GripVertical class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
      </div>
    </div>

    <div v-show="!isCollapsed" class="px-2.5 py-2 space-y-1.5 text-xs">
      <div class="flex items-center gap-2 px-1 py-0.5">
        <div
          class="w-3.5 h-3.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
        ></div>
        <span class="font-medium text-slate-700 dark:text-slate-200">Table</span>
      </div>
      <div class="flex items-center gap-2 px-1 py-0.5">
        <Focus class="w-3.5 h-3.5 text-purple-500 dark:text-purple-300" />
        <span class="font-medium italic text-slate-700 dark:text-slate-200">View</span>
      </div>
      <div class="flex items-center gap-2 px-1 py-0.5">
        <div class="w-4 h-0.5 bg-teal-500 rounded-full"></div>
        <span class="font-medium text-slate-700 dark:text-slate-200">Foreign Key</span>
      </div>
      <div class="flex items-center gap-2 px-1 py-0.5">
        <div class="w-4 h-0.5 bg-orange-500 rounded-full"></div>
        <span class="font-medium text-slate-700 dark:text-slate-200">Junction Table</span>
      </div>
      <div class="flex items-center gap-2 px-1 py-0.5">
        <div class="w-4 h-0.5 border-t border-dashed border-slate-400 dark:border-slate-500"></div>
        <span class="font-medium text-slate-700 dark:text-slate-200">View Dependency</span>
      </div>
    </div>
  </div>
</template>
