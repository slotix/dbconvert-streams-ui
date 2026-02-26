<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type CSSProperties } from 'vue'
import {
  CODEMIRROR_MENU_DEFINITIONS,
  CODEMIRROR_MENU_LAYOUT,
  type CodeMirrorMenuAction,
  type CodeMirrorMenuCapability
} from './codeMirrorContextMenuConfig'

interface Props {
  x: number
  y: number
  canUndo: boolean
  canRedo: boolean
  canCut: boolean
  canCopy: boolean
  canPaste: boolean
  canDelete: boolean
  canFormat: boolean
  canSelectAll: boolean
}

interface MenuItem {
  action: CodeMirrorMenuAction
  label: string
  disabled: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'action', action: CodeMirrorMenuAction): void
}>()

const menuRef = ref<HTMLElement | null>(null)
let listenerAttachTimer: ReturnType<typeof setTimeout> | null = null

function getZoomFactor() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 1
  }
  const zoomValue = getComputedStyle(document.documentElement).getPropertyValue('--app-zoom')
  return Number.parseFloat(zoomValue) || 1
}

const menuStyle = computed<CSSProperties>(() => {
  const zoom = getZoomFactor()
  return {
    position: 'fixed',
    left: `${props.x / zoom}px`,
    top: `${props.y / zoom}px`,
    minWidth: `${160 * zoom}px`,
    borderRadius: `${6 * zoom}px`
  }
})
const menuItemStyle = computed<CSSProperties>(() => {
  const zoom = getZoomFactor()
  return {
    padding: `${6 * zoom}px ${12 * zoom}px`,
    fontSize: `${14 * zoom}px`,
    lineHeight: '1.3'
  }
})
const sectionDividerStyle = computed<CSSProperties>(() => {
  const zoom = getZoomFactor()
  return {
    margin: `${4 * zoom}px 0`
  }
})
const capabilities = computed<Record<CodeMirrorMenuCapability, boolean>>(() => ({
  canUndo: props.canUndo,
  canRedo: props.canRedo,
  canCut: props.canCut,
  canCopy: props.canCopy,
  canPaste: props.canPaste,
  canDelete: props.canDelete,
  canSelectAll: props.canSelectAll,
  canFormat: props.canFormat
}))
const menuSections = computed<MenuItem[][]>(() => {
  const sections = CODEMIRROR_MENU_LAYOUT.map((section) =>
    section
      .map((action) => {
        const definition = CODEMIRROR_MENU_DEFINITIONS[action]
        const enabled = capabilities.value[definition.capability]
        if (!enabled && definition.hideWhenDisabled) {
          return null
        }
        return {
          action,
          label: definition.label,
          disabled: !enabled
        }
      })
      .filter((item): item is MenuItem => item !== null)
  )
  return sections.filter((section) => section.length > 0)
})
const itemButtonClass =
  'w-full text-left text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-gray-200 dark:hover:bg-gray-800 dark:disabled:text-gray-500'

function closeMenu() {
  emit('close')
}

function handleClickOutside(event: MouseEvent) {
  if (!menuRef.value || menuRef.value.contains(event.target as Node)) {
    return
  }
  closeMenu()
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMenu()
  }
}

function emitAction(action: CodeMirrorMenuAction) {
  emit('action', action)
  closeMenu()
}

onMounted(() => {
  listenerAttachTimer = setTimeout(() => {
    listenerAttachTimer = null
    document.addEventListener('click', handleClickOutside)
    window.addEventListener('keydown', handleEscape)
  }, 0)
})

onUnmounted(() => {
  if (listenerAttachTimer) {
    clearTimeout(listenerAttachTimer)
    listenerAttachTimer = null
  }
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div
    ref="menuRef"
    class="fixed z-1200 border border-gray-300 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-850 dark:shadow-gray-900/50"
    role="menu"
    :style="menuStyle"
    @click.stop
    @contextmenu.prevent.stop
  >
    <template v-for="(section, sectionIndex) in menuSections" :key="`section-${sectionIndex}`">
      <button
        v-for="item in section"
        :key="item.action"
        type="button"
        :class="itemButtonClass"
        :style="menuItemStyle"
        :disabled="item.disabled"
        @click="emitAction(item.action)"
      >
        {{ item.label }}
      </button>
      <div
        v-if="sectionIndex < menuSections.length - 1"
        class="my-1 border-t border-gray-200 dark:border-gray-700"
        :style="sectionDividerStyle"
      ></div>
    </template>
  </div>
</template>
