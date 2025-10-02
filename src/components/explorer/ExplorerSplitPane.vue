<template>
  <div v-if="hasSplitContent" ref="splitContainerRef" class="flex flex-row items-stretch min-w-0">
    <!-- Left (primary) -->
    <div
      ref="leftPaneRef"
      :style="{ flexBasis: `${splitGrow}%`, flexGrow: 0, flexShrink: 0 }"
      class="min-w-[300px] pr-2 min-h-[480px]"
      @mousedown="$emit('set-active-pane', 'left')"
    >
      <slot name="left" />
    </div>

    <!-- Divider between primary and right split -->
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

    <!-- Right split -->
    <div
      :style="{ flexBasis: '0px' }"
      class="grow pl-2 min-h-[480px] min-w-[300px] relative"
      @mousedown="$emit('set-active-pane', 'right')"
      @contextmenu.prevent="showRightSplitContextMenu"
    >
      <slot name="right" />
    </div>
  </div>

  <div v-else>
    <slot name="single" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSplitPane } from '@/composables/useSplitPane'

interface Props {
  splitMeta?: object
  splitFileEntry?: object
}

const props = defineProps<Props>()

// Define emits
const emit = defineEmits<{
  'set-active-pane': [pane: 'left' | 'right']
  'promote-right-split': []
}>()

const { splitGrow, splitContainerRef, leftPaneRef, onDividerMouseDown, onDividerDoubleClick } =
  useSplitPane()

// Check if we have split content
const hasSplitContent = computed(() => props.splitMeta || props.splitFileEntry)

function showRightSplitContextMenu(event: MouseEvent) {
  // Simple context menu for right split - just "Make Primary" option
  event.preventDefault()

  // Create a simple context menu
  const menu = document.createElement('div')
  menu.className =
    'fixed z-50 bg-white shadow-lg border border-gray-200 rounded-md py-1 min-w-[120px]'
  menu.style.left = `${event.clientX}px`
  menu.style.top = `${event.clientY}px`

  const menuItem = document.createElement('button')
  menuItem.className =
    'w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2'
  menuItem.innerHTML = '<span>Make Primary</span>'
  menuItem.onclick = () => {
    emit('promote-right-split')
    document.body.removeChild(menu)
  }

  menu.appendChild(menuItem)
  document.body.appendChild(menu)

  // Remove menu when clicking elsewhere
  const removeMenu = () => {
    if (document.body.contains(menu)) {
      document.body.removeChild(menu)
    }
    document.removeEventListener('click', removeMenu)
  }

  setTimeout(() => {
    document.addEventListener('click', removeMenu)
  }, 0)
}
</script>
