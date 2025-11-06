<template>
  <div class="space-y-6">
    <!-- Stream Settings -->
    <div
      class="bg-linear-to-br from-slate-50 to-white rounded-xl p-6 border border-gray-100 shadow-sm"
    >
      <StreamSettings />
    </div>

    <!-- Summary Card with warm background -->
    <div class="bg-warm-50 rounded-xl p-6 border border-gray-100 shadow-sm">
      <h4 class="text-base font-semibold text-gray-900 mb-4">Stream Configuration Summary</h4>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Data Flow -->
        <div class="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
          <h5 class="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Data Flow
          </h5>
          <div class="space-y-3">
            <div class="flex items-start text-sm">
              <img
                src="/images/steps/source-step.svg"
                alt="Source"
                class="w-5 h-5 mr-2 mt-0.5 shrink-0"
              />
              <div class="flex-1 min-w-0">
                <div class="text-gray-600 text-xs mb-1">Source:</div>
                <div class="font-medium text-gray-900 truncate">{{ sourceDisplay }}</div>
              </div>
            </div>
            <div class="flex items-center justify-center py-1">
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
            <div class="flex items-start text-sm">
              <img
                src="/images/steps/target-step.svg"
                alt="Target"
                class="w-5 h-5 mr-2 mt-0.5 shrink-0"
              />
              <div class="flex-1 min-w-0">
                <div class="text-gray-600 text-xs mb-1">Target:</div>
                <div class="font-medium text-gray-900 truncate">{{ targetDisplay }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Stream Details -->
        <div class="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
          <h5 class="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Stream Details
          </h5>
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
            <!-- Output format info for file targets -->
            <div
              v-if="isFileTarget && currentStreamConfig?.targetFileFormat"
              class="pt-2 border-t border-gray-100"
            >
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Format:</span>
                <span class="font-medium text-gray-900 uppercase">{{
                  currentStreamConfig.targetFileFormat
                }}</span>
              </div>
              <div class="flex items-center justify-between mt-1">
                <span class="text-gray-600">Compression:</span>
                <span class="font-medium text-gray-900 capitalize">{{
                  currentStreamConfig.compressionType || 'zstd'
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-gray-200">
        <p class="text-sm text-gray-600 text-center">
          Review your settings above. Click "Create Stream" to finalize the configuration.
        </p>
      </div>
    </div>

    <!-- Ready to Create -->
    <div
      class="bg-linear-to-r from-blue-50 to-teal-50 rounded-xl p-4 border border-blue-200 shadow-sm"
    >
      <div class="flex items-center">
        <svg class="w-5 h-5 text-teal-600 mr-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
        <p class="text-sm text-gray-700 font-medium">
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
  if (conn.type?.toLowerCase().includes('file')) {
    const format = currentStreamConfig.value?.targetFileFormat
    if (format) {
      display += ` • ${format.toUpperCase()}`
    }
  }
  return display
})

const tableCount = computed(() => {
  const tables = currentStreamConfig.value?.tables || []
  return tables.filter((t) => t.selected).length
})

const isFileTarget = computed(() => {
  const target = currentStreamConfig.value?.target
  if (!target) return false
  // Check if it's a file connection (starts with / or file://)
  if (target.startsWith('/') || target.startsWith('file://')) return true
  // Or check connection type
  const conn = connectionsStore.connectionByID(target)
  return conn?.type?.toLowerCase().includes('file')
})

// Always allow proceeding to save - validation is handled by StreamSettings
emit('update:can-proceed', true)
</script>
