<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RadioGroup, RadioGroupLabel, RadioGroupOption } from '@headlessui/vue'
import {
  ChevronDown,
  ChevronUp,
  Download,
  GripVertical,
  Minus,
  Plus,
  Sparkles
} from 'lucide-vue-next'
import type { ExportFormat } from '@/composables/useDiagramExport'

interface Props {
  currentZoom: number
  linkDistance: number
  chargeStrength: number
  collisionRadius: number
  exportOptions: boolean
  exportProgress: boolean
  exportType: ExportFormat
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'zoom', direction: 'in' | 'out'): void
  (e: 'auto'): void
  (e: 'toggle-export'): void
  (e: 'export'): void
  (e: 'update:linkDistance', value: number): void
  (e: 'update:chargeStrength', value: number): void
  (e: 'update:collisionRadius', value: number): void
  (e: 'update:exportType', value: ExportFormat): void
}>()

const panelRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const position = ref({ x: 0, y: 0 })
const isCollapsed = ref(false)

const storageKey = 'dbconvert.diagram.controls.position'
const collapsedStorageKey = 'dbconvert.diagram.controls.collapsed'
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
    const container = getContainer()
    const panel = panelRef.value
    if (container && panel) {
      const containerBox = container.getBoundingClientRect()
      const panelBox = panel.getBoundingClientRect()
      const defaultX = containerBox.width - panelBox.width - margin
      setPosition(defaultX, margin)
    } else {
      setPosition(margin, margin)
    }
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
    class="ui-surface-floating ui-border-default absolute z-10 min-w-[210px] rounded-xl border"
  >
    <div
      class="ui-surface-toolbar ui-border-default flex items-center justify-between border-b px-2.5 py-1.5 select-none touch-none"
      :class="[isDragging ? 'cursor-grabbing' : 'cursor-grab', isCollapsed ? 'border-b-0' : '']"
      @pointerdown="handlePointerDown"
    >
      <span
        class="text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200"
      >
        Diagram Tools
      </span>
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

    <div v-show="!isCollapsed" class="px-2.5 py-2 space-y-2.5">
      <!-- Zoom Controls -->
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-700 dark:text-slate-200">Zoom</span>
        <div class="flex items-center gap-1">
          <button
            class="rounded-md p-0.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:bg-slate-100 focus-visible:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:bg-slate-800 dark:focus-visible:text-white"
            @click="emit('zoom', 'out')"
          >
            <Minus class="w-3.5 h-3.5" />
          </button>
          <span
            class="text-xs text-slate-600 dark:text-slate-400 min-w-10 text-center tabular-nums"
          >
            {{ Math.round(currentZoom * 100) }}%
          </span>
          <button
            class="rounded-md p-0.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:bg-slate-100 focus-visible:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:bg-slate-800 dark:focus-visible:text-white"
            @click="emit('zoom', 'in')"
          >
            <Plus class="w-3.5 h-3.5" />
          </button>
          <button
            class="ml-1 rounded-md p-0.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:bg-slate-100 focus-visible:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:bg-slate-800 dark:focus-visible:text-white"
            title="Auto layout (recenter + retune)"
            @click="emit('auto')"
          >
            <Sparkles class="w-3.5 h-3.5" />
          </button>
          <button
            class="ml-1 rounded-md p-0.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:bg-slate-100 focus-visible:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:bg-slate-800 dark:focus-visible:text-white"
            title="Export diagram"
            @click="emit('toggle-export')"
          >
            <Download class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Export Options Panel -->
      <div v-if="exportOptions" class="ui-surface-muted ui-border-default rounded-lg border p-1.5">
        <div class="flex items-center mb-1.5">
          <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 mr-auto"
            >Export Format</span
          >
        </div>
        <RadioGroup
          :model-value="exportType"
          class="flex gap-2 mb-1.5 flex-wrap"
          @update:model-value="(val: ExportFormat) => emit('update:exportType', val)"
        >
          <RadioGroupOption v-slot="{ checked }" value="svg" as="template">
            <div class="inline-flex items-center cursor-pointer">
              <input
                :checked="checked"
                type="radio"
                class="ui-accent-icon ui-surface-raised ui-border-default h-3.5 w-3.5 border focus:outline-none"
              />
              <RadioGroupLabel
                as="span"
                class="ml-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                >SVG</RadioGroupLabel
              >
            </div>
          </RadioGroupOption>
          <RadioGroupOption v-slot="{ checked }" value="png" as="template">
            <div class="inline-flex items-center cursor-pointer">
              <input
                :checked="checked"
                type="radio"
                class="ui-accent-icon ui-surface-raised ui-border-default h-3.5 w-3.5 border focus:outline-none"
              />
              <RadioGroupLabel
                as="span"
                class="ml-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                >PNG</RadioGroupLabel
              >
            </div>
          </RadioGroupOption>
          <RadioGroupOption v-slot="{ checked }" value="pdf" as="template">
            <div class="inline-flex items-center cursor-pointer">
              <input
                :checked="checked"
                type="radio"
                class="ui-accent-icon ui-surface-raised ui-border-default h-3.5 w-3.5 border focus:outline-none"
              />
              <RadioGroupLabel
                as="span"
                class="ml-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                >PDF</RadioGroupLabel
              >
            </div>
          </RadioGroupOption>
        </RadioGroup>
        <button
          class="w-full rounded-md bg-slate-700 py-1 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:focus-visible:bg-slate-500 disabled:opacity-50"
          :disabled="exportProgress"
          @click="emit('export')"
        >
          <span v-if="exportProgress">Exporting...</span>
          <span v-else>Download {{ exportType.toUpperCase() }}</span>
        </button>
      </div>

      <!-- Force Controls -->
      <div class="space-y-2">
        <div>
          <div class="flex items-center justify-between mb-0.5">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-200"
              >Link Distance</label
            >
            <span class="text-xs text-slate-500 dark:text-slate-400 tabular-nums"
              >{{ linkDistance }}px</span
            >
          </div>
          <input
            :value="linkDistance"
            type="range"
            min="100"
            max="800"
            step="20"
            class="w-full h-1 bg-slate-200 dark:bg-slate-700/70 rounded-lg appearance-none cursor-pointer slider-gray"
            @input="emit('update:linkDistance', Number(($event.target as HTMLInputElement).value))"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-0.5">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-200"
              >Charge Strength</label
            >
            <span class="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{{
              chargeStrength
            }}</span>
          </div>
          <input
            :value="chargeStrength"
            type="range"
            min="-6000"
            max="-200"
            step="100"
            class="w-full h-1 bg-slate-200 dark:bg-slate-700/70 rounded-lg appearance-none cursor-pointer slider-gray"
            @input="
              emit('update:chargeStrength', Number(($event.target as HTMLInputElement).value))
            "
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-0.5">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-200"
              >Collision Radius</label
            >
            <span class="text-xs text-slate-500 dark:text-slate-400 tabular-nums"
              >{{ collisionRadius }}px</span
            >
          </div>
          <input
            :value="collisionRadius"
            type="range"
            min="60"
            max="320"
            step="10"
            class="w-full h-1 bg-slate-200 dark:bg-slate-700/70 rounded-lg appearance-none cursor-pointer slider-gray"
            @input="
              emit('update:collisionRadius', Number(($event.target as HTMLInputElement).value))
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Slider styles */
.slider-gray::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgb(75 85 99);
  cursor: pointer;
  margin-top: -4px;
}

.slider-gray::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 9999px;
  background: rgb(75 85 99 / 0.45);
}

.slider-gray::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgb(75 85 99);
  cursor: pointer;
  border: none;
}

.slider-gray::-moz-range-track {
  height: 6px;
  border-radius: 9999px;
  background: rgb(75 85 99 / 0.45);
}

.slider-gray::-moz-range-progress {
  height: 6px;
  border-radius: 9999px;
  background: rgb(75 85 99 / 0.45);
}

.slider-gray:focus {
  outline: none;
}

.slider-gray:focus::-webkit-slider-thumb {
  box-shadow: none;
}

.slider-gray:focus::-moz-range-thumb {
  box-shadow: none;
}

:global(.dark) .slider-gray::-webkit-slider-thumb {
  background: rgb(113 113 122);
}

:global(.dark) .slider-gray::-webkit-slider-runnable-track {
  background: rgb(113 113 122 / 0.45);
}

:global(.dark) .slider-gray::-moz-range-thumb {
  background: rgb(113 113 122);
}

:global(.dark) .slider-gray::-moz-range-track {
  background: rgb(113 113 122 / 0.45);
}

:global(.dark) .slider-gray::-moz-range-progress {
  background: rgb(113 113 122 / 0.45);
}

:global(.dark) .slider-gray:focus::-webkit-slider-thumb {
  box-shadow: none;
}

:global(.dark) .slider-gray:focus::-moz-range-thumb {
  box-shadow: none;
}
</style>
