<template>
  <!-- Inline mode: no wrapper, just content -->
  <div v-if="inline">
    <div class="flex items-start justify-between gap-2 mb-2">
      <div class="flex items-start gap-2 min-w-0 flex-1">
        <DatabaseIcon
          v-if="connection && connectionType && logoSrc"
          :db-type="connectionType"
          :logo-src="logoSrc"
          size="SM"
          container-class="hover:shadow-md shrink-0"
        />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1">
            <span
              class="font-medium text-gray-900 dark:text-gray-100 truncate"
              :class="{ 'text-red-500 dark:text-red-400': !hasConnection }"
              :title="connection?.name"
            >
              {{ connection?.name || 'N/A' }}
            </span>
            <CloudProviderBadge
              v-if="connection"
              :cloud-provider="connection.cloud_provider"
              :db-type="connectionType"
              class="shrink-0"
            />
            <AlertCircle
              v-if="!hasConnection"
              class="h-4 w-4 text-red-500 dark:text-red-400 shrink-0"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
      <button
        v-if="connection?.id"
        v-tooltip="'View connection in Explorer'"
        type="button"
        class="shrink-0 inline-flex items-center px-2 py-1 text-xs font-medium text-teal-600 dark:text-teal-300 bg-white dark:bg-gray-900 border border-teal-200 dark:border-teal-700 rounded-md hover:bg-teal-50 dark:hover:bg-gray-800 transition-colors"
        @click="emit('navigate')"
      >
        <ExternalLink class="w-3 h-3 mr-1" />
        Explore
      </button>
    </div>
    <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
      <ConnectionStringDisplay v-if="connection" :connection="connection" />
      <span v-else class="text-red-500 dark:text-red-400">Connection not found</span>
    </div>
  </div>

  <!-- Standard mode: with label and wrapper -->
  <div v-else>
    <label
      v-if="label"
      class="block text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2"
    >
      {{ label }}
    </label>
    <div
      class="bg-gray-50 dark:bg-gray-900/40 rounded-md p-4 border border-gray-300 dark:border-gray-700"
    >
      <div class="flex items-center justify-between gap-3 mb-2">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <DatabaseIcon
            v-if="connection && connectionType && logoSrc"
            :db-type="connectionType"
            :logo-src="logoSrc"
            size="SM"
            container-class="hover:shadow-md"
          />
          <span
            class="font-medium text-gray-900 dark:text-gray-100 truncate"
            :class="{ 'text-red-500 dark:text-red-400': !hasConnection }"
          >
            {{ connection?.name || 'N/A' }}
          </span>
          <CloudProviderBadge
            v-if="connection"
            :cloud-provider="connection.cloud_provider"
            :db-type="connectionType"
          />
          <AlertCircle
            v-if="!hasConnection"
            class="h-4 w-4 text-red-500 dark:text-red-400 shrink-0"
            aria-hidden="true"
          />
        </div>
        <button
          v-if="connection?.id"
          v-tooltip="'View connection in Explorer'"
          type="button"
          class="shrink-0 inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-teal-600 dark:text-teal-300 bg-white dark:bg-gray-900 border border-teal-200 dark:border-teal-700 rounded-md hover:bg-teal-50 dark:hover:bg-gray-800 transition-colors"
          @click="emit('navigate')"
        >
          <ExternalLink class="w-3.5 h-3.5 mr-1" />
          Explore
        </button>
      </div>
      <div class="text-sm text-gray-600 dark:text-gray-400">
        <ConnectionStringDisplay v-if="connection" :connection="connection" />
        <span v-else class="text-red-500 dark:text-red-400 text-xs">Connection not found</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { vTooltip } from '@/directives/tooltip'

export default {
  directives: {
    tooltip: vTooltip
  }
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import ConnectionStringDisplay from '@/components/common/ConnectionStringDisplay.vue'
import DatabaseIcon from '@/components/base/DatabaseIcon.vue'
import { AlertCircle, ExternalLink } from 'lucide-vue-next'
import type { Connection } from '@/types/connections'
import { getConnectionTypeLabel } from '@/types/specs'

const props = withDefaults(
  defineProps<{
    label?: string
    connection?: Connection
    logoSrc?: string
    hasConnection: boolean
    inline?: boolean
  }>(),
  {
    label: '',
    inline: false
  }
)

const connectionType = computed(
  () => getConnectionTypeLabel(props.connection?.spec, props.connection?.type) || ''
)

const emit = defineEmits<{
  (e: 'navigate'): void
}>()
</script>
