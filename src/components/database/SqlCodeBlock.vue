<!-- A reusable component for displaying SQL code with CodeMirror syntax highlighting -->
<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import SqlCodeMirror from '@/components/codemirror/SqlCodeMirror.vue'

interface Props {
  code: string
  title?: string
  index?: number | string
  dialect: string
  compact?: boolean
  showHeader?: boolean
  height?: string
  autoResize?: boolean
  minHeight?: number
  maxHeight?: number
  rounded?: boolean
  showCopyButton?: boolean
  resizable?: boolean
  maxResizableHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  showHeader: false,
  rounded: true,
  showCopyButton: false,
  resizable: false
})

const editorContainerRef = ref<HTMLElement | null>(null)
const copied = ref(false)
const manualHeightPx = ref<number | null>(null)
let copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null
let resizeMoveListener: ((event: MouseEvent) => void) | null = null
let resizeUpListener: (() => void) | null = null
let isResizing = false

// Compute display title
const displayTitle = computed(() => {
  if (props.index) {
    return `${props.title} ${props.index}`
  }
  return props.title || 'SQL'
})

const resolvedHeight = computed(() => {
  if (props.height) {
    return props.height
  }
  if (!props.autoResize) {
    return props.compact ? '140px' : '200px'
  }

  const lines = Math.max(props.code.split('\n').length, 1)
  const estimated = lines * 22 + 24
  const min = props.minHeight ?? 96
  const max = props.maxHeight ?? 480
  const bounded = Math.min(max, Math.max(min, estimated))
  return `${bounded}px`
})

const effectiveHeight = computed(() => {
  if (manualHeightPx.value !== null) {
    return `${manualHeightPx.value}px`
  }
  return resolvedHeight.value
})

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function parsePxHeight(value: string): number | null {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function setCopiedFeedback() {
  copied.value = true
  if (copyFeedbackTimer) {
    clearTimeout(copyFeedbackTimer)
  }
  copyFeedbackTimer = setTimeout(() => {
    copied.value = false
    copyFeedbackTimer = null
  }, 1200)
}

function fallbackCopy(text: string): boolean {
  if (typeof document === 'undefined') return false
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  let copiedText = false
  try {
    copiedText = document.execCommand('copy')
  } catch {
    copiedText = false
  }
  document.body.removeChild(textarea)
  return copiedText
}

async function copyCode() {
  const text = props.code || ''
  if (!text) return
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      setCopiedFeedback()
      return
    }
  } catch {
    // Fall through to legacy fallback.
  }
  if (fallbackCopy(text)) {
    setCopiedFeedback()
  }
}

function cleanupResizeListeners() {
  if (resizeMoveListener) {
    window.removeEventListener('mousemove', resizeMoveListener)
    resizeMoveListener = null
  }
  if (resizeUpListener) {
    window.removeEventListener('mouseup', resizeUpListener)
    resizeUpListener = null
  }
}

function stopResize() {
  if (!isResizing) return
  isResizing = false
  cleanupResizeListeners()
  if (typeof document !== 'undefined') {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
}

function startResize(event: MouseEvent) {
  if (!props.resizable) return
  event.preventDefault()

  const effectiveHeightValue = parsePxHeight(effectiveHeight.value)
  const computedHeightValue =
    editorContainerRef.value && typeof window !== 'undefined' && typeof document !== 'undefined'
      ? parsePxHeight(getComputedStyle(editorContainerRef.value).height)
      : null

  const startHeight =
    manualHeightPx.value ??
    effectiveHeightValue ??
    computedHeightValue ??
    (props.compact ? 140 : 200)
  const startY = event.clientY
  const minHeight = props.minHeight ?? 96
  const maxHeight = props.maxResizableHeight ?? 1400
  manualHeightPx.value = clamp(startHeight, minHeight, maxHeight)

  resizeMoveListener = (moveEvent: MouseEvent) => {
    const delta = moveEvent.clientY - startY
    manualHeightPx.value = clamp(startHeight + delta, minHeight, maxHeight)
  }
  resizeUpListener = () => stopResize()
  window.addEventListener('mousemove', resizeMoveListener)
  window.addEventListener('mouseup', resizeUpListener)

  if (typeof document !== 'undefined') {
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }
  isResizing = true
}

onBeforeUnmount(() => {
  stopResize()
  if (copyFeedbackTimer) {
    clearTimeout(copyFeedbackTimer)
  }
})
</script>

<template>
  <div class="flex flex-col">
    <div
      v-if="showHeader"
      :class="[
        'px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 border border-b-0 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850',
        rounded ? 'rounded-t-md' : 'rounded-none'
      ]"
    >
      {{ displayTitle }}
    </div>
    <div ref="editorContainerRef" class="relative">
      <SqlCodeMirror
        :model-value="code"
        :dialect="dialect"
        :height="effectiveHeight"
        :read-only="true"
        :enable-sql-providers="false"
        :rounded="rounded"
        :class="{ 'rounded-t-none': showHeader && rounded }"
      />

      <button
        v-if="showCopyButton"
        type="button"
        class="sql-code-overlay-control sql-code-copy-control absolute top-2 right-2 z-10 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white/95 dark:bg-gray-800/95 px-2 py-1 text-[11px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        :title="copied ? 'Copied' : 'Copy SQL'"
        @click="copyCode"
      >
        {{ copied ? 'Copied' : 'Copy' }}
      </button>

      <button
        v-if="resizable"
        type="button"
        class="sql-code-overlay-control sql-code-resize-grip absolute bottom-0 right-0 z-10 cursor-nwse-resize"
        aria-label="Resize SQL block"
        title="Resize SQL block"
        @mousedown="startResize"
      />
    </div>
  </div>
</template>

<style scoped>
@reference '../../assets/style.css';

.sql-code-resize-grip {
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: rgba(107, 114, 128, 0.85);
}

.sql-code-resize-grip::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(135deg, transparent 0 58%, currentColor 58% 62%, transparent 62% 100%),
    linear-gradient(135deg, transparent 0 70%, currentColor 70% 74%, transparent 74% 100%),
    linear-gradient(135deg, transparent 0 82%, currentColor 82% 86%, transparent 86% 100%);
  pointer-events: none;
}

.sql-code-resize-grip:hover {
  color: rgba(20, 184, 166, 0.9);
}

:global(.dark) .sql-code-resize-grip {
  color: rgba(156, 163, 175, 0.9);
}

:global(.dark) .sql-code-resize-grip:hover {
  color: rgba(45, 212, 191, 0.95);
}
</style>
