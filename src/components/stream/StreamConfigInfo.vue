<template>
  <div v-if="config" class="mt-4 space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button
          class="text-gray-500 hover:text-gray-700 focus:outline-none"
          @click="isExpanded = !isExpanded"
        >
          <ChevronRightIcon
            class="h-5 w-5 transform transition-transform duration-200"
            :class="{ 'rotate-90': isExpanded }"
          />
        </button>
        <h2 class="text-xl font-semibold">Current Stream Configuration</h2>
      </div>
      <div class="flex items-center gap-4">
        <Switch
          v-model="isJsonView"
          class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
          :class="[isJsonView ? 'bg-gray-600' : 'bg-gray-400']"
        >
          <span class="sr-only">Toggle JSON view</span>
          <span
            aria-hidden="true"
            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
            :class="[
              isJsonView ? 'translate-x-5' : 'translate-x-0',
              'shadow-[0_1px_4px_rgba(0,0,0,0.15)]'
            ]"
          />
        </Switch>
        JSON
        <button
          v-tooltip="'Copy configuration'"
          class="text-gray-500 hover:text-gray-700 focus:outline-none"
          @click="copyConfig"
        >
          <ClipboardIcon class="h-5 w-5" />
        </button>
      </div>
    </div>

    <TransitionExpand>
      <div v-if="isExpanded">
        <!-- JSON View -->
        <div v-if="isJsonView" class="bg-gray-50 rounded-lg shadow-sm p-4">
          <pre class="text-sm text-gray-900 whitespace-pre-wrap">{{ prettyConfig }}</pre>
        </div>

        <!-- Table View -->
        <div v-else class="bg-gray-50 rounded-lg shadow-sm divide-y divide-gray-200">
          <!-- Basic Info -->
          <div class="p-4 space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-500">Stream ID</span>
              <span class="text-sm text-gray-900">{{ config.id }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-500">Name</span>
              <span class="text-sm text-gray-900">{{ config.name || 'Unnamed Stream' }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-500">Mode</span>
              <span class="text-sm">
                <span
                  :class="[
                    'rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                    config.mode === 'cdc'
                      ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
                      : 'bg-green-50 text-green-700 ring-green-600/20'
                  ]"
                >
                  {{ config.mode }}
                </span>
              </span>
            </div>
          </div>

          <!-- Selected Tables -->
          <div v-if="config.tables?.length" class="p-4">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Selected Tables</h3>
            <div class="overflow-x-auto">
              <div class="min-w-full border border-gray-200 rounded-lg">
                <div class="grid grid-cols-2 bg-gray-200 p-2 rounded-t-lg">
                  <span class="text-sm font-semibold text-gray-700">Table Name</span>
                  <span class="text-sm font-semibold text-gray-700">
                    {{ config.mode === 'cdc' ? 'Operations' : 'Query' }}
                  </span>
                </div>
                <div class="divide-y divide-gray-200">
                  <div
                    v-for="table in config.tables"
                    :key="table.name"
                    class="grid grid-cols-2 p-2 hover:bg-gray-100 transition-colors"
                  >
                    <span class="text-sm text-gray-900">{{ table.name }}</span>
                    <span class="text-sm text-gray-500">
                      {{
                        config.mode === 'cdc'
                          ? table.operations?.join(', ') || 'None'
                          : table.query || 'None'
                      }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TransitionExpand>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Switch } from '@headlessui/vue'
import { ClipboardIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { StreamConfig } from '@/types/streamConfig'
import { useCommonStore } from '@/stores/common'
import { vTooltip } from '@/directives/tooltip'
import TransitionExpand from '@/components/common/TransitionExpand.vue'

const commonStore = useCommonStore()
const isJsonView = ref(false)
const isExpanded = ref(true) // Start expanded

interface Props {
  config: StreamConfig | null
}

const props = defineProps<Props>()

const prettyConfig = computed(() => {
  return JSON.stringify(props.config, null, 2)
})

function copyConfig() {
  if (props.config) {
    navigator.clipboard.writeText(JSON.stringify(props.config, null, 2))
    commonStore.showNotification('Configuration copied to clipboard', 'success')
  }
}
</script>

<style scoped>
/* Optional: Add any additional scoped styles if needed */
</style>
