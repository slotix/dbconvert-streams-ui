<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Download, GripVertical, Minus, Plus, Sparkles } from 'lucide-vue-next'
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

const storageKey = 'dbconvert.diagram.controls.position'
const margin = 12

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
    class="absolute z-10 min-w-[240px] rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white/90 dark:bg-slate-900/80 shadow-[0_18px_36px_-22px_rgba(15,23,42,0.5)] backdrop-blur-md"
  >
    <div
      class="flex items-center justify-between px-3 py-2 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 select-none touch-none"
      :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
      @pointerdown="handlePointerDown"
    >
      <span
        class="text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200"
      >
        Diagram Tools
      </span>
      <GripVertical class="w-4 h-4 text-slate-400 dark:text-slate-500" />
    </div>

    <div class="px-3 py-2.5 space-y-3">
      <!-- Zoom Controls -->
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-700 dark:text-slate-200">Zoom</span>
        <div class="flex items-center gap-1">
          <button
            class="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
            @click="emit('zoom', 'out')"
          >
            <Minus class="w-3.5 h-3.5" />
          </button>
          <span
            class="text-xs text-slate-600 dark:text-slate-400 min-w-[44px] text-center tabular-nums"
          >
            {{ Math.round(currentZoom * 100) }}%
          </span>
          <button
            class="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
            @click="emit('zoom', 'in')"
          >
            <Plus class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1 ml-1 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
            title="Auto layout (recenter + retune)"
            @click="emit('auto')"
          >
            <Sparkles class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1 ml-1 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
            title="Export diagram"
            @click="emit('toggle-export')"
          >
            <Download class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Export Options Panel -->
      <div
        v-if="exportOptions"
        class="p-2 rounded-lg border border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-800/60"
      >
        <div class="flex items-center mb-2">
          <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 mr-auto"
            >Export Format</span
          >
        </div>
        <div class="flex gap-2 mb-2 flex-wrap">
          <label class="inline-flex items-center cursor-pointer">
            <input
              type="radio"
              value="svg"
              :checked="exportType === 'svg'"
              class="form-radio h-3.5 w-3.5 text-slate-500 focus:ring-slate-400"
              @change="emit('update:exportType', 'svg')"
            />
            <span class="ml-1.5 text-xs text-slate-700 dark:text-slate-300">SVG</span>
          </label>
          <label class="inline-flex items-center cursor-pointer">
            <input
              type="radio"
              value="png"
              :checked="exportType === 'png'"
              class="form-radio h-3.5 w-3.5 text-slate-500 focus:ring-slate-400"
              @change="emit('update:exportType', 'png')"
            />
            <span class="ml-1.5 text-xs text-slate-700 dark:text-slate-300">PNG</span>
          </label>
          <label class="inline-flex items-center cursor-pointer">
            <input
              type="radio"
              value="pdf"
              :checked="exportType === 'pdf'"
              class="form-radio h-3.5 w-3.5 text-slate-500 focus:ring-slate-400"
              @change="emit('update:exportType', 'pdf')"
            />
            <span class="ml-1.5 text-xs text-slate-700 dark:text-slate-300">PDF</span>
          </label>
        </div>
        <button
          class="w-full py-1.5 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white text-xs font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 dark:focus:ring-offset-slate-900 transition-colors disabled:opacity-50"
          :disabled="exportProgress"
          @click="emit('export')"
        >
          <span v-if="exportProgress">Exporting...</span>
          <span v-else>Download {{ exportType.toUpperCase() }}</span>
        </button>
      </div>

      <!-- Force Controls -->
      <div class="space-y-2.5">
        <div>
          <div class="flex items-center justify-between mb-1">
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
            class="w-full h-1.5 bg-slate-200 dark:bg-slate-700/70 rounded-lg appearance-none cursor-pointer slider-gray"
            @input="emit('update:linkDistance', Number(($event.target as HTMLInputElement).value))"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
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
            class="w-full h-1.5 bg-slate-200 dark:bg-slate-700/70 rounded-lg appearance-none cursor-pointer slider-gray"
            @input="
              emit('update:chargeStrength', Number(($event.target as HTMLInputElement).value))
            "
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
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
            class="w-full h-1.5 bg-slate-200 dark:bg-slate-700/70 rounded-lg appearance-none cursor-pointer slider-gray"
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
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgb(107 114 128);
  cursor: pointer;
}

.slider-gray::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgb(107 114 128);
  cursor: pointer;
  border: none;
}

.slider-gray:focus {
  outline: none;
}

.slider-gray:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 2px rgb(107 114 128 / 0.25);
}

.slider-gray:focus::-moz-range-thumb {
  box-shadow: 0 0 0 2px rgb(107 114 128 / 0.25);
}

:global(.dark) .slider-gray::-webkit-slider-thumb {
  background: rgb(156 163 175);
}

:global(.dark) .slider-gray::-moz-range-thumb {
  background: rgb(156 163 175);
}

:global(.dark) .slider-gray:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 2px rgb(156 163 175 / 0.25);
}

:global(.dark) .slider-gray:focus::-moz-range-thumb {
  box-shadow: 0 0 0 2px rgb(156 163 175 / 0.25);
}
</style>
