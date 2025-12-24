<template>
  <div class="min-h-full">
    <!-- Header - matches StreamsView/CreateStreamView style -->
    <header
      class="sticky top-0 z-30 bg-linear-to-r from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 border-b border-slate-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 lg:-ml-[var(--sidebar-width)] lg:w-[calc(100%+var(--sidebar-width))]"
    >
      <div class="px-6 py-4 flex items-center gap-4">
        <div class="flex items-center gap-3">
          <!-- Mobile sidebar toggle -->
          <button
            v-if="sidebarMenuToggle"
            type="button"
            class="group flex items-center justify-center p-2 -ml-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 lg:hidden"
            @click="sidebarMenuToggle.openSidebar"
          >
            <Menu class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
            <span class="sr-only">Open sidebar</span>
          </button>

          <!-- Desktop sidebar toggle -->
          <button
            v-if="sidebarWidthToggle"
            type="button"
            class="group hidden lg:flex items-center justify-center p-2 -ml-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
            @click="sidebarWidthToggle.toggleSidebarWidth"
          >
            <Menu class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
            <span class="sr-only">Toggle sidebar width</span>
          </button>

          <!-- Back -->
          <button
            type="button"
            class="group flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
            @click="goBack"
          >
            <ArrowLeft class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
            <span class="sr-only">Back</span>
          </button>

          <img
            v-if="!isDesktop"
            class="h-5 w-5 shrink-0"
            src="/images/logo.svg"
            alt="DBConvert Streams"
          />

          <div class="flex flex-col">
            <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Stream JSON</h1>
            <p v-if="stream" class="text-xs text-gray-500 dark:text-gray-400">{{ stream.name }}</p>
            <p v-else class="text-xs text-gray-500 dark:text-gray-400">Loading stream...</p>
          </div>
        </div>

        <div class="flex-1"></div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="bg-gray-50 dark:bg-gray-900 pt-8 pb-8">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <StreamConfigJsonEditor
          v-if="stream"
          ref="jsonEditorRef"
          :config="stream"
          height="600px"
          @save="handleSaveConfig"
        />
        <div v-else class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { ArrowLeft, Menu } from 'lucide-vue-next'
import { useDesktopMode } from '@/composables/useDesktopMode'
import StreamConfigJsonEditor from '@/components/stream/StreamConfigJsonEditor.vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useCommonStore } from '@/stores/common'
import streamsApi from '@/api/streams'
import type { StreamConfig } from '@/types/streamConfig'

const { strokeWidth: iconStroke } = useLucideIcons()

interface Props {
  id: string
}

const props = defineProps<Props>()
const router = useRouter()
const route = useRoute()
const streamsStore = useStreamsStore()
const commonStore = useCommonStore()
const { isDesktop } = useDesktopMode()
const sidebarWidthToggle = inject<{
  isSidebarExpanded: { value: boolean }
  toggleSidebarWidth: () => void
}>('sidebarWidthToggle')
const sidebarMenuToggle = inject<{ openSidebar: () => void }>('sidebarMenuToggle')

const jsonEditorRef = ref<InstanceType<typeof StreamConfigJsonEditor>>()

const streamId = computed(() => props.id || (route.params.id as string))

const stream = computed(() => {
  if (!streamId.value) return null
  return streamsStore.streamConfigs.find((s) => s.id === streamId.value) || null
})

onMounted(async () => {
  if (!stream.value && streamId.value) {
    // Load streams if not already loaded
    await streamsStore.refreshStreams()
  }
})

function goBack() {
  // Navigate back to streams view with the stream selected
  if (streamId.value) {
    router.push({ name: 'Streams', query: { selected: streamId.value } })
  } else {
    router.push({ name: 'Streams' })
  }
}

async function handleSaveConfig(config: StreamConfig) {
  if (!streamId.value) {
    jsonEditorRef.value?.onSaveError('Stream ID is missing')
    return
  }

  try {
    const updatedConfig = await streamsApi.updateStreamConfig(streamId.value, config)
    jsonEditorRef.value?.onSaveSuccess()

    // Update the store with the new config
    const index = streamsStore.streamConfigs.findIndex((c) => c.id === streamId.value)
    if (index !== -1) {
      streamsStore.streamConfigs[index] = updatedConfig
    }

    commonStore.showNotification('Stream configuration saved successfully', 'success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration'
    jsonEditorRef.value?.onSaveError(errorMessage)
  }
}
</script>
