<template>
  <div v-if="hasRightPane" ref="splitContainerRef" class="flex flex-row items-stretch min-w-0">
    <!-- Left pane (always visible) -->
    <div
      ref="leftPaneRef"
      :style="{ flexBasis: `${splitGrow}%`, flexGrow: 0, flexShrink: 0 }"
      :class="[
        'relative min-w-[300px] pr-2 min-h-[480px] transition-all rounded-lg',
        hasRightPane && isLeftActive
          ? 'bg-white dark:bg-gray-900 shadow-[0_0_0_0.5px_rgb(20_184_166),0_0_2px_rgba(20_184_166,0.1)] dark:shadow-[0_0_0_0.5px_rgb(20_184_166),0_0_3px_rgba(20_184_166,0.15)]'
          : hasRightPane
            ? 'bg-white dark:bg-gray-900 opacity-60'
            : 'bg-white dark:bg-gray-900'
      ]"
      @mousedown="$emit('set-active-pane', 'left')"
    >
      <!-- Top accent border for active pane -->
      <div
        v-if="hasRightPane"
        class="pointer-events-none absolute inset-x-4 top-0 rounded-b-md transition-all duration-200"
        :class="[
          isLeftActive
            ? 'h-1 bg-teal-500 dark:bg-teal-500 opacity-100'
            : 'h-0.5 bg-slate-300 dark:bg-gray-600 opacity-20'
        ]"
      />
      <!-- Left pane tabs -->
      <div class="px-2 pt-2">
        <slot name="left-tabs" />
      </div>

      <!-- Left pane breadcrumb -->
      <slot name="left-breadcrumb" />

      <!-- Left pane content -->
      <slot name="left-content" />
    </div>

    <!-- Divider between panes with visual handle -->
    <div
      role="separator"
      aria-orientation="vertical"
      class="relative z-20 mx-1.5 w-3 shrink-0 cursor-col-resize select-none pointer-events-auto group"
      title="Drag to resize • Double-click to reset"
      @mousedown.prevent="onDividerMouseDown"
      @dblclick="onDividerDoubleClick"
    >
      <!-- Vertical divider line -->
      <div
        class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 transition-colors"
      />

      <!-- Centered handle with grip indicator -->
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-12 bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 rounded flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer"
        @click.stop="onDividerDoubleClick"
      >
        <!-- Three horizontal grip dots -->
        <div class="w-2 h-0.5 bg-gray-400 rounded-full"></div>
        <div class="w-2 h-0.5 bg-gray-400 rounded-full"></div>
        <div class="w-2 h-0.5 bg-gray-400 rounded-full"></div>
      </div>
    </div>

    <!-- Right pane (conditional) -->
    <div
      :style="{ flexBasis: '0px' }"
      :class="[
        'relative grow pl-2 min-h-[480px] min-w-[300px] transition-all rounded-lg',
        isRightActive
          ? 'bg-white dark:bg-gray-900 shadow-[0_0_0_0.5px_rgb(20_184_166),0_0_2px_rgba(20_184_166,0.1)] dark:shadow-[0_0_0_0.5px_rgb(20_184_166),0_0_3px_rgba(20_184_166,0.15)]'
          : 'bg-white dark:bg-gray-900 opacity-60'
      ]"
      @mousedown="$emit('set-active-pane', 'right')"
    >
      <!-- Top accent border for active pane -->
      <div
        class="pointer-events-none absolute inset-x-4 top-0 rounded-b-md transition-all duration-200"
        :class="[
          isRightActive
            ? 'h-1 bg-teal-500 dark:bg-teal-500 opacity-100'
            : 'h-0.5 bg-slate-300 dark:bg-gray-600 opacity-20'
        ]"
      />
      <!-- Close right pane button -->
      <button
        type="button"
        class="absolute top-2 right-2 z-10 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
        title="Close right pane"
        @click="$emit('close-right-pane')"
      >
        <X class="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </button>

      <!-- Right pane tabs -->
      <div class="px-2 pt-2">
        <slot name="right-tabs" />
      </div>

      <!-- Right pane breadcrumb -->
      <slot name="right-breadcrumb" />

      <!-- Right pane content -->
      <slot name="right-content" />
    </div>
  </div>

  <!-- Single pane view (left only) - reuse left-content slot -->
  <div v-else>
    <div
      :class="['relative transition-all bg-white dark:bg-gray-900']"
      @mousedown="$emit('set-active-pane', 'left')"
    >
      <!-- Left pane tabs -->
      <div class="px-2 pt-2">
        <slot name="left-tabs" />
      </div>

      <!-- Left pane breadcrumb -->
      <slot name="left-breadcrumb" />

      <!-- Left pane content (same slot as split view) -->
      <slot name="left-content" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import {
  useSplitPaneResize,
  type SplitPaneResizeController
} from '@/composables/useSplitPaneResize'
import { usePaneTabsStore } from '@/stores/paneTabs'

// Define props
const props = defineProps<{
  activePane: 'left' | 'right'
  splitPaneResize?: SplitPaneResizeController
}>()

// Define emits
const emit = defineEmits<{
  'set-active-pane': [pane: 'left' | 'right']
  'close-right-pane': []
}>()

// Use composables and store
const splitPaneResize = props.splitPaneResize ?? useSplitPaneResize()

const { splitGrow, splitContainerRef, leftPaneRef, onDividerMouseDown, onDividerDoubleClick } =
  splitPaneResize
const paneTabsStore = usePaneTabsStore()

// Check if we have right pane content
const hasRightPane = computed(() => paneTabsStore.isRightPaneVisible)

// Computed properties for pane active state
const isLeftActive = computed(() => props.activePane === 'left')
const isRightActive = computed(() => props.activePane === 'right')
</script>
