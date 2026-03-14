<script setup lang="ts">
import { onMounted } from 'vue'
import { FileText } from 'lucide-vue-next'
import {
  SERVICE_STATUS,
  getServiceStatusLabel,
  type ServiceStatus as HealthStatus
} from '@/constants'
import { useSystemStatus } from '@/composables/useSystemStatus'

type Props = {
  compact?: boolean
  showOpenLogs?: boolean
  showMeta?: boolean
  title?: string
  showTitle?: boolean
  showDescription?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  showOpenLogs: false,
  showMeta: true,
  title: 'System Status',
  showTitle: true,
  showDescription: true
})

const { rows, meta, error, loading, description, canOpenLogsFolder, openLogsFolder, refresh } =
  useSystemStatus()

const getStatusBadgeClass = (status: HealthStatus) => {
  switch (status) {
    case SERVICE_STATUS.PASSING:
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
    case SERVICE_STATUS.CRITICAL:
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
    case SERVICE_STATUS.WARNING:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
    case SERVICE_STATUS.INITIALIZING:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
    default:
      return 'ui-chip-muted'
  }
}

const getStatusLabel = (status: HealthStatus) => getServiceStatusLabel(status)

onMounted(async () => {
  await refresh()
})
</script>

<template>
  <div :class="compact ? 'space-y-2' : 'space-y-3'">
    <div v-if="props.showTitle" class="text-sm font-semibold text-gray-900 dark:text-gray-100">
      {{ props.title }}
    </div>
    <div v-if="props.showDescription" class="text-[11px] text-gray-500 dark:text-gray-400">
      {{ description }}
    </div>

    <div v-if="loading" class="text-[11px] text-gray-400">Checking services...</div>
    <div v-else class="space-y-1.5">
      <div
        v-for="row in rows"
        :key="row.name"
        class="ui-surface-muted flex items-center justify-between rounded-md px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200"
      >
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="truncate">{{ row.label }}</span>
          <span
            v-if="row.meta"
            v-tooltip="row.meta"
            class="text-[10px] text-gray-500 dark:text-gray-400 truncate"
          >
            {{ row.meta }}
          </span>
        </div>
        <span
          :class="[
            'ml-3 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
            getStatusBadgeClass(row.status)
          ]"
        >
          {{ getStatusLabel(row.status) }}
        </span>
      </div>
    </div>

    <div v-if="props.showMeta && meta.length" class="text-[11px] text-gray-500">
      <div v-for="line in meta" :key="line">{{ line }}</div>
    </div>

    <button
      v-if="props.showOpenLogs && canOpenLogsFolder"
      type="button"
      class="ui-surface-muted ui-border-default inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:[background-color:var(--ui-surface-inset)] dark:text-gray-200"
      @click="openLogsFolder"
    >
      <FileText class="h-3.5 w-3.5" />
      Open Logs Folder
    </button>

    <div v-if="error" class="text-[11px] text-red-500 dark:text-red-300 whitespace-pre-wrap">
      {{ error }}
    </div>
  </div>
</template>
