<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <header class="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700">
      <div class="px-4 py-2 flex items-center gap-3">
        <button
          type="button"
          class="lg:hidden flex items-center justify-center p-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
          @click="sidebarMenuToggle?.openSidebar()"
        >
          <Menu class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
          <span class="sr-only">Open sidebar</span>
        </button>
        <button
          type="button"
          class="flex items-center justify-center p-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
          @click="goBack"
        >
          <ArrowLeft class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
          <span class="sr-only">Back</span>
        </button>
        <h1 class="text-base font-semibold text-gray-900 dark:text-gray-100">Edit Stream JSON</h1>
        <span v-if="stream" class="text-xs text-gray-500 dark:text-gray-400">— {{ stream.name }}</span>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 py-8">
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
import { ref, computed, inject, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { ArrowLeft, Menu } from 'lucide-vue-next'
import StreamConfigJsonEditor from '@/components/stream/StreamConfigJsonEditor.vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useCommonStore } from '@/stores/common'
import { setSelectedStreamInViewState } from '@/utils/streamsViewState'
import streamsApi from '@/api/streams'
import type { StreamConfig } from '@/types/streamConfig'

const { strokeWidth: iconStroke } = useLucideIcons()
const sidebarMenuToggle = inject<{ openSidebar: () => void }>('sidebarMenuToggle')

interface Props {
  id: string
}

const props = defineProps<Props>()
const router = useRouter()
const route = useRoute()
const streamsStore = useStreamsStore()
const commonStore = useCommonStore()

const jsonEditorRef = ref<InstanceType<typeof StreamConfigJsonEditor>>()

const streamId = computed(() => props.id || (route.params.id as string))

const stream = computed(() => {
  if (!streamId.value) return null
  return streamsStore.streamConfigs.find((s) => s.id === streamId.value) || null
})

onMounted(async () => {
  if (!stream.value && streamId.value) {
    await streamsStore.refreshStreams()
  }
})

function goBack() {
  if (streamId.value) {
    setSelectedStreamInViewState(streamId.value)
    router.push({ name: 'Streams' })
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
