<template>
  <div v-if="hasRightPane" ref="splitContainerRef" class="flex flex-row items-stretch min-w-0">
    <!-- Left pane (always visible) -->
    <div
      ref="leftPaneRef"
      :style="{ flexBasis: `${splitGrow}%`, flexGrow: 0, flexShrink: 0 }"
      :class="[
        'min-w-[300px] pr-2 min-h-[480px] rounded-lg transition-all',
        'border-2',
        isLeftActive ? 'border-slate-500' : 'border-gray-200'
      ]"
      @mousedown="$emit('set-active-pane', 'left')"
    >
      <!-- Left pane tabs -->
      <div class="px-2 pt-2">
        <slot name="left-tabs" />
      </div>

      <!-- Left pane breadcrumb -->
      <slot name="left-breadcrumb" />

      <!-- Left pane content -->
      <slot name="left-content" />
    </div>

    <!-- Divider between panes -->
    <div
      role="separator"
      aria-orientation="vertical"
      class="relative z-20 mx-1.5 w-3 shrink-0 cursor-col-resize select-none pointer-events-auto"
      @mousedown.prevent="onDividerMouseDown"
      @dblclick="onDividerDoubleClick"
    >
      <div
        class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded bg-gray-200 hover:bg-gray-300"
      />
    </div>

    <!-- Right pane (conditional) -->
    <div
      :style="{ flexBasis: '0px' }"
      :class="[
        'grow pl-2 min-h-[480px] min-w-[300px] relative rounded-lg transition-all',
        'border-2',
        isRightActive ? 'border-slate-500' : 'border-gray-200'
      ]"
      @mousedown="$emit('set-active-pane', 'right')"
    >
      <!-- Close right pane button -->
      <button
        type="button"
        class="absolute top-2 right-2 z-10 p-1 hover:bg-gray-100 rounded transition"
        title="Close right pane"
        @click="$emit('close-right-pane')"
      >
        <XMarkIcon class="h-4 w-4 text-gray-500" />
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

  <!-- Single pane view (left only) -->
  <div v-else>
    <div
      :class="[
        'rounded-lg transition-all',
        'border-2',
        isLeftActive ? 'border-slate-500' : 'border-gray-200'
      ]"
      @mousedown="$emit('set-active-pane', 'left')"
    >
      <!-- Left pane tabs -->
      <div class="px-2 pt-2">
        <slot name="left-tabs" />
      </div>

      <!-- Left pane breadcrumb -->
      <slot name="left-breadcrumb" />

      <!-- Left pane content -->
      <slot name="single-content" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { XMarkIcon } from '@heroicons/vue/20/solid'
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
