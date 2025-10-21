<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="text-center">
      <h2 class="text-lg font-medium text-gray-900">Configure Stream Settings</h2>
      <p class="mt-2 text-sm text-gray-600">Set stream name, mode, and performance options</p>
    </div>

    <!-- Stream Settings -->
    <div class="bg-white border border-gray-200 rounded-lg p-6">
      <StreamSettings />
    </div>

    <!-- Summary Card -->
    <div class="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
      <h4 class="text-sm font-semibold text-gray-900 mb-4 flex items-center">
        <svg
          class="w-5 h-5 mr-2 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        Stream Configuration Summary
      </h4>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Source & Target -->
        <div class="bg-white rounded-lg p-4 shadow-sm">
          <h5 class="text-xs font-medium text-gray-500 uppercase mb-2">Data Flow</h5>
          <div class="space-y-2">
            <div class="flex items-center text-sm">
              <svg class="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"
                />
              </svg>
              <span class="text-gray-600">Source:</span>
              <span class="ml-2 font-medium text-gray-900">{{ sourceDisplay }}</span>
            </div>
            <div class="flex items-center justify-center">
              <svg
                class="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
            <div class="flex items-center text-sm">
              <svg class="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"
                />
              </svg>
              <span class="text-gray-600">Target:</span>
              <span class="ml-2 font-medium text-gray-900">{{ targetDisplay }}</span>
            </div>
          </div>
        </div>

        <!-- Stream Details -->
        <div class="bg-white rounded-lg p-4 shadow-sm">
          <h5 class="text-xs font-medium text-gray-500 uppercase mb-2">Stream Details</h5>
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Mode:</span>
              <span class="font-medium text-gray-900 capitalize">{{
                currentStreamConfig?.mode || 'convert'
              }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Tables:</span>
              <span class="font-medium text-gray-900">{{ tableCount }} selected</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Bundle Size:</span>
              <span class="font-medium text-gray-900">{{
                currentStreamConfig?.dataBundleSize || 500
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-blue-200">
        <p class="text-xs text-gray-600 text-center">
          Review your settings above. Click "Create Stream" to finalize the configuration.
        </p>
      </div>
    </div>

    <!-- Ready to Create -->
    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
      <div class="flex items-center">
        <svg class="w-5 h-5 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
        <p class="text-sm text-green-700 font-medium">
          Configuration complete! Click "Create Stream" to save your stream configuration.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import StreamSettings from '@/components/settings/StreamSettings.vue'

interface Props {
  sourceConnectionId?: string | null
  targetConnectionId?: string | null
  sourceDatabase?: string | null
  targetDatabase?: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:can-proceed': [value: boolean]
}>()

const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()

const currentStreamConfig = computed(() => streamsStore.currentStreamConfig)

const sourceDisplay = computed(() => {
  if (!props.sourceConnectionId) return 'Not selected'
  const conn = connectionsStore.connectionByID(props.sourceConnectionId)
  if (!conn) return props.sourceConnectionId
  let display = conn.name
  if (props.sourceDatabase) display += ` / ${props.sourceDatabase}`
  return display
})

const targetDisplay = computed(() => {
  if (!props.targetConnectionId) return 'Not selected'
  const conn = connectionsStore.connectionByID(props.targetConnectionId)
  if (!conn) return props.targetConnectionId
  let display = conn.name
  if (props.targetDatabase) display += ` / ${props.targetDatabase}`
  return display
})

const tableCount = computed(() => {
  const tables = currentStreamConfig.value?.tables || []
  return tables.filter((t) => t.selected).length
})

// Always allow proceeding to save - validation is handled by StreamSettings
emit('update:can-proceed', true)
</script>
