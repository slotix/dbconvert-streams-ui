<template>
  <div :class="['monaco-editor-wrapper', props.fillParent ? 'fill-parent' : '']">
    <div
      ref="editorContainer"
      :class="['monaco-editor-container', props.fillParent ? 'fill-parent' : '']"
      :style="props.fillParent ? {} : { height: containerHeight }"
    ></div>
    <div
      v-if="!props.fillParent"
      class="resize-handle"
      title="Drag to resize"
      @mousedown="startResize"
    >
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path
          d="M9 1L1 9M9 5L5 9M9 9L9 9"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </div>

    <!-- Custom context menu - prevent focus stealing with mousedown.prevent -->
    <Teleport to="body">
      <div
        v-if="contextMenuVisible"
        ref="contextMenuRef"
        class="fixed z-50 bg-white dark:bg-gray-850 shadow-lg dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-md py-1 min-w-36"
        :style="{ left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px' }"
        @mousedown.prevent.stop
      >
        <button
          v-if="!props.readOnly"
          :disabled="!hasSelection"
          :class="[
            'w-full text-left px-3 py-2 text-sm',
            hasSelection
              ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
          ]"
          @mousedown.prevent
          @click.stop="handleCut"
        >
          Cut
        </button>
        <button
          :disabled="!hasSelection"
          :class="[
            'w-full text-left px-3 py-2 text-sm',
            hasSelection
              ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
          ]"
          @mousedown.prevent
          @click.stop="handleCopy"
        >
          Copy
        </button>
        <button
          v-if="!props.readOnly"
          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          @mousedown.prevent
          @click.stop="handlePaste"
        >
          Paste
        </button>
        <div class="border-t border-gray-100 dark:border-gray-700 my-1" />
        <button
          class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          @mousedown.prevent
          @click.stop="handleSelectAll"
        >
          Select All
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, shallowRef, nextTick, computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { initializeMonaco } from '@/utils/monaco-loader'
import { useDesktopZoom } from '@/utils/desktopZoom'

// Import Monaco types
import type * as MonacoTypes from 'monaco-editor'

type MonacoApi = typeof import('monaco-editor')

interface Props {
  modelValue?: string
  language?: string
  theme?: 'vs' | 'vs-dark' | 'hc-black' | 'hc-light'
  height?: string
  readOnly?: boolean
  options?: MonacoTypes.editor.IEditorOptions
  fillParent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  language: 'plaintext',
  theme: undefined, // Auto-detect from theme store if undefined
  height: '400px',
  readOnly: false,
  options: () => ({}),
  fillParent: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'mount', editor: MonacoTypes.editor.IStandaloneCodeEditor, monaco: MonacoApi): void
  (e: 'change', value: string): void
  (e: 'blur'): void
  (e: 'focus'): void
}>()

const editorContainer = ref<HTMLElement>()
const contextMenuRef = ref<HTMLElement>()
const editor = shallowRef<MonacoTypes.editor.IStandaloneCodeEditor>()
const monaco = shallowRef<MonacoApi>()
const themeStore = useThemeStore()
const { isDesktopZoom, zoomLevel } = useDesktopZoom()

// Resize handle state
const containerHeight = ref(props.height)
const isResizing = ref(false)
const startY = ref(0)
const startHeight = ref(0)

// Custom context menu state
const contextMenuVisible = ref(false)
const contextMenuPos = ref({ x: 0, y: 0 })
const hasSelection = ref(false)

function hideContextMenu() {
  contextMenuVisible.value = false
}

function updateSelectionState() {
  const ed = editor.value
  if (!ed) {
    hasSelection.value = false
    return
  }
  const selection = ed.getSelection()
  hasSelection.value = selection ? !selection.isEmpty() : false
}

async function handleCut() {
  hideContextMenu()
  const ed = editor.value
  if (!ed) return
  const selection = ed.getSelection()
  if (selection) {
    const text = ed.getModel()?.getValueInRange(selection) || ''
    await navigator.clipboard.writeText(text)
    ed.executeEdits('cut', [{ range: selection, text: '' }])
  }
  ed.focus()
}

async function handleCopy() {
  hideContextMenu()
  const ed = editor.value
  if (!ed) return
  try {
    const selection = ed.getSelection()
    if (selection && !selection.isEmpty()) {
      const text = ed.getModel()?.getValueInRange(selection) || ''
      if (text) {
        await navigator.clipboard.writeText(text)
      }
    }
  } catch (err) {
    console.warn('Copy failed:', err)
  }
  ed.focus()
}

async function handlePaste() {
  hideContextMenu()
  const ed = editor.value
  if (!ed) return
  try {
    const text = await navigator.clipboard.readText()
    const selection = ed.getSelection()
    if (selection) {
      ed.executeEdits('paste', [
        {
          range: selection,
          text: text,
          forceMoveMarkers: true
        }
      ])
    }
  } catch {
    console.warn('Clipboard access denied')
  }
  ed.focus()
}

function handleSelectAll() {
  hideContextMenu()
  const ed = editor.value
  if (!ed) return
  const model = ed.getModel()
  if (model) {
    ed.setSelection(model.getFullModelRange())
  }
  ed.focus()
}

const startResize = (e: MouseEvent) => {
  isResizing.value = true
  startY.value = e.clientY
  const container = editorContainer.value
  if (container) {
    startHeight.value = container.offsetHeight
  }
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

const onResize = (e: MouseEvent) => {
  if (!isResizing.value) return
  // Account for CSS zoom when calculating resize delta
  const zoom = getZoomFactor()
  const deltaY = (e.clientY - startY.value) / zoom
  const newHeight = Math.max(100, startHeight.value + deltaY)
  containerHeight.value = `${newHeight}px`
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

// Base font size that gets scaled by zoom level
const BASE_FONT_SIZE = 14

// Get current zoom factor from CSS variable (more reliable than reactive ref on startup)
const getZoomFactor = (): number => {
  const zoomValue = getComputedStyle(document.documentElement).getPropertyValue('--app-zoom')
  return parseFloat(zoomValue) || 1
}

// Computed font size that scales with zoom to compensate for CSS zoom exclusion
const scaledFontSize = computed(() => {
  if (!isDesktopZoom.value) return BASE_FONT_SIZE
  return Math.round(BASE_FONT_SIZE * zoomLevel.value)
})

// Get theme from props or theme store
const currentTheme = ref<string>(props.theme || (themeStore.isDark ? 'vs-dark' : 'vs'))

// Watch theme store changes
watch(
  () => themeStore.isDark,
  (isDark) => {
    if (!props.theme) {
      // Only auto-update if theme not explicitly set
      currentTheme.value = isDark ? 'vs-dark' : 'vs'
      // currentTheme.value = isDark ? 'hc-black' : 'hc-light'
      if (monaco.value) {
        monaco.value.editor.setTheme(currentTheme.value)
      }
    }
  }
)

// Watch manual theme changes
watch(
  () => props.theme,
  (newTheme) => {
    if (newTheme && monaco.value) {
      currentTheme.value = newTheme
      monaco.value.editor.setTheme(currentTheme.value)
    }
  }
)

// Watch model value changes from parent
watch(
  () => props.modelValue,
  (newValue) => {
    if (editor.value && newValue !== editor.value.getValue()) {
      editor.value.setValue(newValue || '')
    }
  }
)

// Watch language changes
watch(
  () => props.language,
  (newLang) => {
    if (editor.value && monaco.value) {
      const model = editor.value.getModel()
      if (model) {
        monaco.value.editor.setModelLanguage(model, newLang)
      }
    }
  }
)

// Watch options changes
watch(
  () => props.options,
  (newOptions) => {
    if (editor.value && newOptions) {
      editor.value.updateOptions(newOptions)
    }
  },
  { deep: true }
)

// Watch readOnly changes
watch(
  () => props.readOnly,
  (newReadOnly) => {
    if (editor.value) {
      editor.value.updateOptions({ readOnly: newReadOnly })
    }
  }
)

// Watch zoom level changes to update font size (compensates for CSS zoom exclusion)
// Use immediate: true to apply correct font size when zoom is restored from storage on startup
watch(
  scaledFontSize,
  (newFontSize) => {
    if (editor.value) {
      editor.value.updateOptions({ fontSize: newFontSize })
    }
  },
  { immediate: true }
)

onMounted(async () => {
  // Wait for next tick to ensure DOM is fully rendered
  await nextTick()

  if (!editorContainer.value) return

  try {
    // Load Monaco using lazy loader (only loads workers on first use)
    const monacoInstance = (await initializeMonaco()) as MonacoApi
    monaco.value = monacoInstance

    // Check again after async operation - container might be gone if component unmounted
    if (!editorContainer.value) {
      console.warn('Monaco editor container no longer available after initialization')
      return
    }

    // Default editor options
    const defaultOptions: MonacoTypes.editor.IStandaloneEditorConstructionOptions = {
      value: props.modelValue,
      language: props.language,
      theme: currentTheme.value,
      readOnly: props.readOnly,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      // Font size is scaled by zoom level to compensate for CSS zoom exclusion
      fontSize: scaledFontSize.value,
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10
      },
      // Fix for CSS zoom coordinate issues in desktop app
      fixedOverflowWidgets: true,
      ...props.options,
      // Disable default context menu - we use our own custom one
      // This MUST be after ...props.options to prevent override
      contextmenu: false
    }

    // Create editor instance
    editor.value = monacoInstance.editor.create(editorContainer.value, defaultOptions)

    // Disable Command Palette (F1) - many commands don't work in standalone Monaco
    editor.value.addCommand(monacoInstance.KeyCode.F1, () => {
      // Do nothing - command palette disabled
    })

    // Attach custom context menu to Monaco's DOM
    editor.value.onContextMenu((e) => {
      e.event.preventDefault()
      e.event.stopPropagation()
      updateSelectionState()
      contextMenuPos.value = { x: e.event.posx, y: e.event.posy }
      contextMenuVisible.value = true
    })

    // Listen to content changes
    editor.value.onDidChangeModelContent(() => {
      const value = editor.value?.getValue() || ''
      emit('update:modelValue', value)
      emit('change', value)
    })

    // Listen to blur/focus events
    editor.value.onDidBlurEditorText(() => {
      emit('blur')
    })

    editor.value.onDidFocusEditorText(() => {
      emit('focus')
    })

    // Emit mount event with editor instance
    emit('mount', editor.value, monaco.value)

    // Ensure correct font size is applied after editor creation
    // Read directly from CSS variable to handle app startup timing
    const currentZoom = getZoomFactor()
    if (currentZoom !== 1) {
      const correctFontSize = Math.round(BASE_FONT_SIZE * currentZoom)
      editor.value.updateOptions({ fontSize: correctFontSize })
    }
  } catch (error) {
    console.error('Failed to initialize Monaco Editor:', error)
  }
})

// Close context menu when clicking outside
function handleDocumentClick(e: MouseEvent) {
  if (contextMenuRef.value && !contextMenuRef.value.contains(e.target as Node)) {
    hideContextMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  editor.value?.dispose()
  // Clean up resize event listeners
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('click', handleDocumentClick)
})

// Expose editor instance for parent components
defineExpose({
  editor,
  monaco
})
</script>

<style scoped>
.monaco-editor-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.monaco-editor-wrapper.fill-parent {
  height: 100%;
}

.monaco-editor-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  min-height: 300px;
}

.monaco-editor-container.fill-parent {
  height: 100%;
  min-height: 0;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-gray-500);
  opacity: 0.5;
  transition: opacity 0.15s;
  z-index: 10;
}

.resize-handle:hover {
  opacity: 1;
  color: var(--color-gray-400);
}
</style>
