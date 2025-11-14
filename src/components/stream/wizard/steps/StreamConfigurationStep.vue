<template>
  <div class="space-y-6">
    <!-- Stream Settings -->
    <div
      class="bg-linear-to-br from-slate-50 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-850 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30"
    >
      <StreamSettings />
    </div>

    <!-- Summary Card with warm background -->
    <div
      class="bg-warm-50 dark:bg-gray-900/60 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30"
    >
      <TabGroup :selected-index="selectedViewIndex" @change="selectedViewIndex = $event">
        <!-- Header with View Toggle -->
        <div class="flex items-center justify-between p-6 pb-4">
          <h4 class="text-base font-semibold text-gray-900 dark:text-gray-100">
            Stream Configuration Summary
          </h4>
          <TabList
            class="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 border border-gray-200 dark:border-gray-700"
          >
            <Tab v-slot="{ selected }" as="template">
              <button
                :class="[
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                  selected
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                ]"
              >
                <ViewColumnsIcon class="w-4 h-4" />
                Visual
              </button>
            </Tab>
            <Tab v-slot="{ selected }" as="template">
              <button
                :class="[
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                  selected
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                ]"
              >
                <CodeBracketIcon class="w-4 h-4" />
                JSON
              </button>
            </Tab>
          </TabList>
        </div>

        <TabPanels class="px-6 pb-6">
          <!-- Visual View -->
          <TabPanel>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Data Flow -->
              <div
                class="bg-white dark:bg-gray-850 rounded-lg p-4 border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30"
              >
                <h5
                  class="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3"
                >
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
                      <div class="text-gray-600 dark:text-gray-400 text-xs mb-1">Source:</div>
                      <div class="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {{ sourceDisplay }}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center justify-center py-1">
                    <svg
                      class="w-5 h-5 text-gray-400 dark:text-gray-500"
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
                      <div class="text-gray-600 dark:text-gray-400 text-xs mb-1">Target:</div>
                      <div class="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {{ targetDisplay }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Stream Details -->
              <div
                class="bg-white dark:bg-gray-850 rounded-lg p-4 border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30"
              >
                <h5
                  class="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3"
                >
                  Stream Details
                </h5>
                <div class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <div class="flex items-center justify-between">
                    <span>Mode:</span>
                    <span class="font-medium text-gray-900 dark:text-gray-100 capitalize">{{
                      currentStreamConfig?.mode || 'convert'
                    }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span>Tables:</span>
                    <span class="font-medium text-gray-900 dark:text-gray-100"
                      >{{ tableCount }} selected</span
                    >
                  </div>
                  <div v-if="customQueriesCount > 0" class="flex items-center justify-between">
                    <span>Custom Queries:</span>
                    <span class="font-medium text-teal-600 dark:text-teal-400"
                      >{{ customQueriesCount }} table{{ customQueriesCount > 1 ? 's' : '' }}</span
                    >
                  </div>
                  <div class="flex items-center justify-between">
                    <span>Bundle Size:</span>
                    <span class="font-medium text-gray-900 dark:text-gray-100">{{
                      currentStreamConfig?.source?.options?.dataBundleSize || 500
                    }}</span>
                  </div>
                  <!-- Output format info for file targets -->
                  <div
                    v-if="isFileTarget && currentStreamConfig?.target?.fileFormat"
                    class="pt-2 border-t border-gray-100 dark:border-gray-700"
                  >
                    <div class="flex items-center justify-between">
                      <span>Format:</span>
                      <span class="font-medium text-gray-900 dark:text-gray-100 uppercase">{{
                        currentStreamConfig.target.fileFormat
                      }}</span>
                    </div>
                    <div class="flex items-center justify-between mt-1">
                      <span>Compression:</span>
                      <span class="font-medium text-gray-900 dark:text-gray-100 capitalize">{{
                        currentStreamConfig.target?.options?.compressionType || 'zstd'
                      }}</span>
                    </div>
                    <div class="flex items-center justify-between mt-1">
                      <span>Writer:</span>
                      <span
                        class="font-medium"
                        :class="
                          currentStreamConfig.target?.options?.useDuckDBWriter
                            ? 'text-teal-600 dark:text-teal-400'
                            : 'text-gray-900 dark:text-gray-100'
                        "
                        >{{
                          currentStreamConfig.target?.options?.useDuckDBWriter
                            ? 'DuckDB'
                            : 'Standard'
                        }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Custom Queries Details (if any) -->
            <div
              v-if="customQueriesCount > 0"
              class="mt-4 bg-white dark:bg-gray-850 rounded-lg p-4 border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30"
            >
              <h5
                class="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3"
              >
                Custom Queries
              </h5>
              <div class="space-y-2">
                <div
                  v-for="table in customQueryTables.slice(0, 5)"
                  :key="table.name"
                  class="text-sm"
                >
                  <div class="flex items-start gap-2">
                    <span class="text-gray-600 dark:text-gray-400 font-mono"
                      >{{ table.name }}:</span
                    >
                    <code
                      class="flex-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 truncate"
                      >{{ table.query }}</code
                    >
                  </div>
                </div>
                <div
                  v-if="customQueriesCount > 5"
                  class="text-xs text-gray-500 dark:text-gray-400 italic pt-1"
                >
                  ... and {{ customQueriesCount - 5 }} more custom
                  {{ customQueriesCount - 5 > 1 ? 'queries' : 'query' }}
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- JSON View -->
          <TabPanel>
            <div
              class="rounded-md bg-gray-50 dark:bg-gray-900 p-4 border border-gray-300 dark:border-gray-700 overflow-auto custom-scrollbar max-h-96"
            >
              <pre v-highlightjs class="text-sm">
<code class="language-json block text-sm leading-6 select-text">{{ configJson }}</code>
              </pre>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  </div>
</template>

<script lang="ts">
import { vHighlightjs } from '@/directives/highlightjs'

export default {
  directives: {
    highlightjs: vHighlightjs
  }
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/vue'
import { ViewColumnsIcon, CodeBracketIcon } from '@heroicons/vue/24/outline'
import { useStreamsStore, buildStreamPayload } from '@/stores/streamConfig'
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

const selectedViewIndex = ref(0)

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
    const format = currentStreamConfig.value?.target?.fileFormat
    if (format) {
      display += ` • ${format.toUpperCase()}`
    }
  }
  return display
})

const tableCount = computed(() => {
  const tables = currentStreamConfig.value?.source?.tables || []
  return tables.filter((t) => t.selected).length
})

const isFileTarget = computed(() => {
  const targetId = currentStreamConfig.value?.target?.id
  if (!targetId) return false
  // Check connection type
  const conn = connectionsStore.connectionByID(targetId)
  return conn?.type?.toLowerCase().includes('file')
})

// Custom queries
const customQueryTables = computed(() => {
  const tables = currentStreamConfig.value?.source?.tables || []
  return tables.filter((t) => t.selected && t.query && t.query.trim().length > 0)
})

const customQueriesCount = computed(() => customQueryTables.value.length)

// JSON configuration
const configJson = computed(() => {
  const config = currentStreamConfig.value
  if (!config) return '{}'
  const refinedConfig = buildStreamPayload(config)
  return JSON.stringify(refinedConfig, null, 2)
})

// Always allow proceeding to save - validation is handled by StreamSettings
emit('update:can-proceed', true)
</script>

<style>
/* Component-specific styles only - code highlighting styles are centralized in src/styles/codeHighlighting.css */
</style>
