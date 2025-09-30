<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import connections from '@/api/connections'
import type { DatabaseOverview } from '@/types/overview'
import { formatDataSize } from '@/utils/formats'

const props = defineProps<{
  connectionId: string
  database: string
}>()

const emit = defineEmits<{
  (e: 'show-diagram', payload: { connectionId: string; database: string }): void
}>()

const isLoading = ref(true)
const error = ref<string | null>(null)
const overview = ref<DatabaseOverview | null>(null)

async function load(refresh = false) {
  isLoading.value = true
  error.value = null
  overview.value = null
  try {
    overview.value = await connections.getDatabaseOverview(props.connectionId, props.database, {
      refresh
    })
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load database overview'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
watch(
  () => [props.connectionId, props.database],
  () => load()
)

const topSize = computed(() => (overview.value?.topTablesBySize || []).slice(0, 10))
const topRows = computed(() => (overview.value?.topTablesByRows || []).slice(0, 10))

// Safe display for total database size
const sizeBytes = computed(() => overview.value?.sizeBytes)
const sizeDisplay = computed(() => {
  const b = sizeBytes.value
  return typeof b === 'number' && Number.isFinite(b) ? formatDataSize(b) : '—'
})
</script>

<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-base font-semibold text-gray-900">Database Overview</h3>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          @click="load(true)"
        >
          Refresh
        </button>
        <button
          type="button"
          class="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          @click="
            emit('show-diagram', {
              connectionId: props.connectionId,
              database: props.database
            })
          "
        >
          Show diagram
        </button>
      </div>
    </div>
    <div v-if="isLoading" class="text-sm text-gray-500 py-8 text-center">Loading overview…</div>
    <div v-else-if="error" class="text-sm text-red-600 py-8 text-center">{{ error }}</div>
    <div v-else-if="overview" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Essentials -->
      <div class="bg-white ring-1 ring-gray-900/5 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-500">Essentials</div>
          <span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700"
            >{{ overview.engine }} {{ overview.version }}</span
          >
        </div>
        <div class="mt-3 text-sm text-gray-700 space-y-1">
          <div v-if="overview.encoding">
            Encoding: <span class="font-medium">{{ overview.encoding }}</span>
          </div>
          <div v-if="overview.collation">
            Collation: <span class="font-medium">{{ overview.collation }}</span>
          </div>
          <div>
            Size:
            <span
              class="font-medium"
              :title="
                typeof sizeBytes === 'number'
                  ? Intl.NumberFormat().format(sizeBytes || 0) + ' bytes'
                  : ''
              "
              >{{ sizeDisplay }}</span
            >
          </div>
          <div>
            Tables: <span class="font-medium">{{ overview.counts.tables }}</span>
          </div>
          <div>
            Views: <span class="font-medium">{{ overview.counts.views }}</span>
          </div>
          <div v-if="overview.counts.schemas">
            Schemas: <span class="font-medium">{{ overview.counts.schemas }}</span>
          </div>
        </div>
      </div>

      <!-- Top by size -->
      <div class="bg-white ring-1 ring-gray-900/5 rounded-lg p-4">
        <div class="text-sm text-gray-500">Top tables by size</div>
        <ul class="mt-2 text-sm text-gray-700 space-y-1">
          <li v-for="t in topSize" :key="t.name" class="flex items-center justify-between">
            <span class="truncate" :title="t.name">{{ t.name }}</span>
            <span
              class="ml-2 shrink-0 text-gray-500"
              :title="Intl.NumberFormat().format(t.sizeBytes) + ' bytes'"
              >{{ formatDataSize(t.sizeBytes) }}</span
            >
          </li>
        </ul>
      </div>

      <!-- Top by rows -->
      <div class="bg-white ring-1 ring-gray-900/5 rounded-lg p-4">
        <div class="text-sm text-gray-500">
          Top tables by rows
          <span v-if="overview.engine === 'mysql'" class="ml-1 text-xs text-amber-600"
            >(approx)</span
          >
        </div>
        <ul class="mt-2 text-sm text-gray-700 space-y-1">
          <li v-for="t in topRows" :key="t.name" class="flex items-center justify-between">
            <span class="truncate" :title="t.name">{{ t.name }}</span>
            <span class="ml-2 shrink-0 text-gray-500">
              {{ Intl.NumberFormat().format(t.approxRows) }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
