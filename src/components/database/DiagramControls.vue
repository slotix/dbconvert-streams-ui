<script setup lang="ts">
import { PlusIcon, MinusIcon, SparklesIcon, ArrowDownTrayIcon } from '@heroicons/vue/24/outline'
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
</script>

<template>
  <div
    class="absolute top-4 right-4 p-3 min-w-[220px] rounded-lg border bg-white/95 dark:bg-gray-850/95 border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-900/40 backdrop-blur-sm space-y-2.5 z-10"
  >
    <!-- Zoom Controls -->
    <div class="flex items-center justify-between mb-1">
      <span class="text-xs font-medium text-gray-700 dark:text-gray-200">Zoom</span>
      <div class="flex items-center gap-1">
        <button
          class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-offset-1 dark:focus:ring-offset-gray-850"
          @click="emit('zoom', 'out')"
        >
          <MinusIcon class="w-3.5 h-3.5" />
        </button>
        <span
          class="text-xs text-gray-600 dark:text-gray-400 min-w-[40px] text-center tabular-nums"
        >
          {{ Math.round(currentZoom * 100) }}%
        </span>
        <button
          class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-offset-1 dark:focus:ring-offset-gray-850"
          @click="emit('zoom', 'in')"
        >
          <PlusIcon class="w-3.5 h-3.5" />
        </button>
        <button
          class="p-1 ml-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-offset-1 dark:focus:ring-offset-gray-850"
          title="Auto layout (recenter + retune)"
          @click="emit('auto')"
        >
          <SparklesIcon class="w-3.5 h-3.5" />
        </button>
        <button
          class="p-1 ml-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-offset-1 dark:focus:ring-offset-gray-850"
          title="Export diagram"
          @click="emit('toggle-export')"
        >
          <ArrowDownTrayIcon class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Export Options Panel -->
    <div
      v-if="exportOptions"
      class="p-2 mb-1 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center mb-2">
        <span class="text-xs font-medium text-gray-700 dark:text-gray-200 mr-auto"
          >Export Format</span
        >
      </div>
      <div class="flex gap-2 mb-2 flex-wrap">
        <label class="inline-flex items-center cursor-pointer">
          <input
            type="radio"
            value="svg"
            :checked="exportType === 'svg'"
            class="form-radio h-3.5 w-3.5 text-gray-500 focus:ring-gray-400"
            @change="emit('update:exportType', 'svg')"
          />
          <span class="ml-1.5 text-xs text-gray-700 dark:text-gray-300">SVG</span>
        </label>
        <label class="inline-flex items-center cursor-pointer">
          <input
            type="radio"
            value="png"
            :checked="exportType === 'png'"
            class="form-radio h-3.5 w-3.5 text-gray-500 focus:ring-gray-400"
            @change="emit('update:exportType', 'png')"
          />
          <span class="ml-1.5 text-xs text-gray-700 dark:text-gray-300">PNG</span>
        </label>
        <label class="inline-flex items-center cursor-pointer">
          <input
            type="radio"
            value="pdf"
            :checked="exportType === 'pdf'"
            class="form-radio h-3.5 w-3.5 text-gray-500 focus:ring-gray-400"
            @change="emit('update:exportType', 'pdf')"
          />
          <span class="ml-1.5 text-xs text-gray-700 dark:text-gray-300">PDF</span>
        </label>
      </div>
      <button
        class="w-full py-1 bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-400 text-white text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 dark:focus:ring-offset-gray-850 transition-colors disabled:opacity-50"
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
        <div class="flex items-center justify-between mb-1">
          <label class="text-xs font-medium text-gray-700 dark:text-gray-200">Link Distance</label>
          <span class="text-xs text-gray-500 dark:text-gray-400 tabular-nums"
            >{{ linkDistance }}px</span
          >
        </div>
        <input
          :value="linkDistance"
          type="range"
          min="100"
          max="800"
          step="20"
          class="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-gray"
          @input="emit('update:linkDistance', Number(($event.target as HTMLInputElement).value))"
        />
      </div>

      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-xs font-medium text-gray-700 dark:text-gray-200"
            >Charge Strength</label
          >
          <span class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{{
            chargeStrength
          }}</span>
        </div>
        <input
          :value="chargeStrength"
          type="range"
          min="-6000"
          max="-200"
          step="100"
          class="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-gray"
          @input="emit('update:chargeStrength', Number(($event.target as HTMLInputElement).value))"
        />
      </div>

      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-xs font-medium text-gray-700 dark:text-gray-200"
            >Collision Radius</label
          >
          <span class="text-xs text-gray-500 dark:text-gray-400 tabular-nums"
            >{{ collisionRadius }}px</span
          >
        </div>
        <input
          :value="collisionRadius"
          type="range"
          min="60"
          max="320"
          step="10"
          class="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-gray"
          @input="emit('update:collisionRadius', Number(($event.target as HTMLInputElement).value))"
        />
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
