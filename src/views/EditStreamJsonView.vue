<template>
  <div>
    <!-- Header -->
    <header
      class="bg-white dark:bg-gray-850 shadow-sm dark:shadow-gray-900/30 border-b border-gray-100 dark:border-gray-700"
    >
      <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <button
              v-if="sidebarMenuToggle"
              type="button"
              class="mr-2 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
              @click="sidebarMenuToggle.openSidebar"
            >
              <Bars3Icon class="h-5 w-5" />
              <span class="sr-only">Open sidebar</span>
            </button>
            <button
              class="mr-4 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="goBack"
            >
              <ArrowLeftIcon class="h-5 w-5" />
            </button>
            <div class="flex items-start gap-3">
              <img
                v-if="!isDesktop"
                class="h-5 w-5 shrink-0 mt-1"
                src="/images/logo.svg"
                alt="DBConvert Streams"
              />
              <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Edit Stream JSON
                </h1>
                <p v-if="stream" class="text-sm text-gray-600 dark:text-gray-400">
                  {{ stream.name }}
                </p>
                <p v-else class="text-sm text-gray-600 dark:text-gray-400">Loading stream...</p>
              </div>
            </div>
          </div>
        </div>
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
import { ArrowLeftIcon, Bars3Icon } from '@heroicons/vue/24/solid'
import { useDesktopMode } from '@/composables/useDesktopMode'
import StreamConfigJsonEditor from '@/components/stream/StreamConfigJsonEditor.vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useCommonStore } from '@/stores/common'
import streamsApi from '@/api/streams'
import type { StreamConfig } from '@/types/streamConfig'

interface Props {
  id: string
}

const props = defineProps<Props>()
const router = useRouter()
const route = useRoute()
const streamsStore = useStreamsStore()
const commonStore = useCommonStore()
const { isDesktop } = useDesktopMode()
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
