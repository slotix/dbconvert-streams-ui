<template>
  <template v-if="showFallback">
    <section
      v-if="isPanelOpen"
      class="z-[121] h-[560px] w-[360px] overflow-hidden rounded-xl border border-cyan-900/60 bg-gray-950 shadow-2xl"
      :style="{ position: 'fixed', ...panelStyle }"
    >
      <header
        class="flex items-center justify-between border-b border-gray-800 bg-cyan-700 px-3 py-2"
      >
        <p class="text-sm font-semibold text-white">Support Chat</p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            aria-label="Close support chat"
            class="grid h-7 w-7 place-items-center rounded-md text-white transition-colors hover:bg-cyan-600"
            @click="isPanelOpen = false"
          >
            ×
          </button>
        </div>
      </header>

      <iframe
        class="h-[calc(100%-44px)] w-full bg-white"
        :src="TAWK_DIRECT_CHAT_URL"
        title="Support chat"
        loading="lazy"
        allow="clipboard-read; clipboard-write"
      />
    </section>

    <button
      type="button"
      :aria-label="isPanelOpen ? 'Close support chat' : 'Open support chat'"
      :title="isPanelOpen ? 'Close support chat' : 'Open support chat'"
      class="z-[122] grid h-16 w-16 place-items-center rounded-full bg-transparent text-white shadow-lg transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
      :class="[isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab hover:scale-105']"
      :style="{ position: 'fixed', left: btnX + 'px', top: btnY + 'px' }"
      @mousedown="onBtnMouseDown"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        fill="none"
        class="h-14 w-14"
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="30" fill="#0E879E" stroke="#1788FF" stroke-width="2" />
        <path
          d="M32 20c-7.18 0-13 5.37-13 12s5.82 12 13 12c1.28 0 2.51-.17 3.67-.5l6.16 2.98-1.95-5.21c3.31-2.26 5.35-5.66 5.35-9.27 0-6.63-5.82-12-13.23-12z"
          fill="#FFFFFF"
        />
        <path
          d="M28 35.5c1.4 2 6.6 2 8 0"
          stroke="#0E879E"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </template>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useDesktopMode } from '@/composables/useDesktopMode'

const TAWK_DIRECT_CHAT_URL = 'https://tawk.to/chat/69908ca3bf87551c353078f0/1jheaano8'

const { isDesktop } = useDesktopMode()
const isPanelOpen = ref(false)

const showFallback = computed(() => {
  if (!isDesktop.value || typeof navigator === 'undefined') {
    return false
  }
  return navigator.userAgent.toLowerCase().includes('linux')
})

// Button position — starts near bottom-right
const btnX = ref(window.innerWidth - 84)
const btnY = ref(window.innerHeight - 84)

// Drag state
const isDragging = ref(false)
let dragStartX = 0
let dragStartY = 0
let btnStartX = 0
let btnStartY = 0
let didDrag = false

function onMouseMove(e: MouseEvent) {
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY
  if (!isDragging.value && Math.hypot(dx, dy) > 5) isDragging.value = true
  if (!isDragging.value) return
  didDrag = true
  btnX.value = Math.max(0, Math.min(window.innerWidth - 64, btnStartX + dx))
  btnY.value = Math.max(0, Math.min(window.innerHeight - 64, btnStartY + dy))
}

function onMouseUp() {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  document.body.style.userSelect = ''
  isDragging.value = false
  if (!didDrag) togglePanel()
}

function onBtnMouseDown(e: MouseEvent) {
  dragStartX = e.clientX
  dragStartY = e.clientY
  btnStartX = btnX.value
  btnStartY = btnY.value
  didDrag = false
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  document.body.style.userSelect = 'none'
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  document.body.style.userSelect = ''
})

// Panel position — opens next to the button
const panelStyle = computed(() => {
  const PANEL_W = 360
  const PANEL_H = 560
  const MARGIN = 12
  const openLeft = btnX.value > window.innerWidth / 2
  const left = openLeft
    ? Math.max(0, btnX.value - PANEL_W - MARGIN)
    : btnX.value + 64 + MARGIN
  const top = Math.max(0, Math.min(window.innerHeight - PANEL_H, btnY.value - PANEL_H + 64))
  return { left: `${left}px`, top: `${top}px` }
})

const togglePanel = () => {
  isPanelOpen.value = !isPanelOpen.value
}
</script>
