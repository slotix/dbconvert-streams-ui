<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <iframe
      ref="iframeRef"
      :src="docsUrl"
      class="flex-1 w-full border-0"
      title="Documentation"
      allow="clipboard-read; clipboard-write"
      @load="syncState"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useDesktopZoom } from '@/utils/desktopZoom'

const baseUrl = import.meta.env.DEV
  ? 'http://localhost:3000/docs/'
  : 'https://streams.dbconvert.com/docs/'

const themeStore = useThemeStore()
const { zoomLevel } = useDesktopZoom()
const iframeRef = ref<HTMLIFrameElement | null>(null)

const docsUrl = computed(() => {
  const theme = themeStore.isDark ? 'dark' : 'light'
  return `${baseUrl}?embed=1&theme=${theme}&zoom=${zoomLevel.value}`
})

function postToIframe(message: Record<string, unknown>) {
  iframeRef.value?.contentWindow?.postMessage(message, '*')
}

function syncState() {
  postToIframe({ type: 'theme', value: themeStore.isDark ? 'dark' : 'light' })
  postToIframe({ type: 'zoom', value: zoomLevel.value })
}

watch(
  () => themeStore.isDark,
  (isDark) => {
    postToIframe({ type: 'theme', value: isDark ? 'dark' : 'light' })
  }
)

watch(zoomLevel, (level) => {
  postToIframe({ type: 'zoom', value: level })
})
</script>
