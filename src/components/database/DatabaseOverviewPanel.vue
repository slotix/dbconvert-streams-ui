<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useDatabaseOverviewStore } from '@/stores/databaseOverview'
import { formatDataSize } from '@/utils/formats'

const props = defineProps<{
  connectionId: string
  database: string
}>()

const emit = defineEmits<{
  (e: 'show-diagram', payload: { connectionId: string; database: string }): void
  (e: 'open-table', payload: { name: string }): void
}>()

const overviewStore = useDatabaseOverviewStore()
const error = ref<string | null>(null)

// Get overview data from store (reactive)
const overview = computed(() => overviewStore.getOverview(props.connectionId, props.database))
const isLoading = computed(() => overviewStore.isLoading(props.connectionId, props.database))

async function load(refresh = false) {
  error.value = null
  try {
    await overviewStore.fetchOverview(props.connectionId, props.database, refresh)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load database overview'
  }
}

onMounted(load)
watch(
  () => [props.connectionId, props.database],
  () => load()
)

const topSize = computed(() => (overview.value?.allTablesBySize || []).slice(0, 10))
const topRows = computed(() => (overview.value?.allTablesByRows || []).slice(0, 10))

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
    <div v-else-if="overview" class="grid grid-cols-1 md:grid-cols-6 gap-4">
      <!-- Essentials -->
      <div class="bg-white ring-1 ring-gray-900/5 rounded-lg p-4 md:col-span-2">
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

      <!-- CDC readiness -->
      <div class="bg-white ring-1 ring-gray-900/5 rounded-lg p-4 md:col-span-2">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-500">CDC readiness</div>
          <span
            v-if="overview.engine === 'mysql'"
            class="text-xs px-1.5 py-0.5 rounded"
            :class="{
              'bg-green-100 text-green-700':
                overview.health?.binlog?.enabled &&
                overview.health?.binlog?.format === 'ROW' &&
                overview.health?.binlog?.rowImage === 'FULL',
              'bg-amber-100 text-amber-700':
                overview.health?.binlog?.enabled &&
                (overview.health?.binlog?.format !== 'ROW' ||
                  overview.health?.binlog?.rowImage !== 'FULL'),
              'bg-red-100 text-red-700': !overview.health?.binlog?.enabled
            }"
          >
            {{ overview.health?.binlog?.enabled ? 'Enabled' : 'Not enabled' }}
          </span>
          <span
            v-else-if="overview.engine === 'postgres'"
            class="text-xs px-1.5 py-0.5 rounded"
            :class="{
              'bg-green-100 text-green-700': overview.health?.wal?.level === 'logical',
              'bg-red-100 text-red-700': overview.health?.wal?.level !== 'logical'
            }"
          >
            {{ overview.health?.wal?.level || 'unknown' }}
          </span>
        </div>
        <div class="mt-3 text-sm text-gray-700 space-y-1">
          <template v-if="overview.engine === 'mysql'">
            <div>
              Binary log:
              <span class="font-medium">{{ overview.health?.binlog?.enabled ? 'ON' : 'OFF' }}</span>
            </div>
            <div v-if="overview.health?.binlog?.format">
              Format:
              <span class="font-medium">{{ overview.health?.binlog?.format }}</span>
            </div>
            <div v-if="overview.health?.binlog?.rowImage">
              Row image:
              <span class="font-medium">{{ overview.health?.binlog?.rowImage }}</span>
            </div>
            <!-- GTID mode intentionally omitted per product scope -->
            <div v-if="typeof overview.health?.binlog?.serverId === 'number'">
              Server ID:
              <span class="font-medium">{{ overview.health?.binlog?.serverId }}</span>
            </div>
          </template>
          <template v-else>
            <div>
              wal_level:
              <span class="font-medium">{{ overview.health?.wal?.level || 'unknown' }}</span>
            </div>
            <div v-if="typeof overview.health?.wal?.maxReplicationSlots === 'number'">
              Replication slots (max):
              <span class="font-medium">{{ overview.health?.wal?.maxReplicationSlots }}</span>
            </div>
            <div v-if="typeof overview.health?.wal?.freeReplicationSlots === 'number'">
              Replication slots (free):
              <span class="font-medium">{{ overview.health?.wal?.freeReplicationSlots }}</span>
            </div>
            <div v-if="typeof overview.health?.wal?.maxWalSenders === 'number'">
              Wal senders (max):
              <span class="font-medium">{{ overview.health?.wal?.maxWalSenders }}</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Activity (compact) -->
      <div class="bg-white ring-1 ring-gray-900/5 rounded-lg p-4 md:col-span-2">
        <div class="text-sm text-gray-500">Activity</div>
        <div class="mt-2 text-sm text-gray-700 space-y-1">
          <div>
            Connections:
            <span class="font-medium">{{ overview.activity.connections.used }}</span>
            <span v-if="overview.activity.connections.max" class="text-gray-500">
              / {{ overview.activity.connections.max }}
            </span>
          </div>
          <div>
            Active sessions:
            <span class="font-medium">{{ overview.activity.activeSessions }}</span>
          </div>
        </div>
        <div v-if="overview.activity.longRunning?.length" class="mt-3">
          <div class="text-xs uppercase tracking-wide text-gray-500">Long-running queries</div>
          <ul class="mt-1 text-sm text-gray-700 space-y-1">
            <li
              v-for="(q, idx) in overview.activity.longRunning.slice(0, 5)"
              :key="q.pid || q.threadId || idx"
              class="flex items-start justify-between gap-3"
            >
              <div class="truncate">
                <span class="text-gray-500 mr-2">{{ q.user }}</span>
                <span class="truncate" :title="q.query">{{ q.query }}</span>
              </div>
              <span class="ml-2 shrink-0 text-gray-500">{{ q.duration }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Top by size -->
      <div class="bg-white ring-1 ring-gray-900/5 rounded-lg p-4 md:col-span-3">
        <div class="text-sm text-gray-500">Top tables by size</div>
        <ul class="mt-2 text-sm text-gray-700 space-y-1">
          <li v-for="t in topSize" :key="t.name" class="flex items-center justify-between">
            <button
              type="button"
              class="truncate text-left hover:underline"
              :title="t.name"
              @click="$emit('open-table', { name: t.name })"
            >
              {{ t.name }}
            </button>
            <span
              class="ml-2 shrink-0 text-gray-500"
              :title="Intl.NumberFormat().format(t.sizeBytes) + ' bytes'"
              >{{ formatDataSize(t.sizeBytes) }}</span
            >
          </li>
        </ul>
      </div>

      <!-- Top by rows -->
      <div class="bg-white ring-1 ring-gray-900/5 rounded-lg p-4 md:col-span-3">
        <div class="text-sm text-gray-500">
          Top tables by rows
          <span v-if="overview.engine === 'mysql'" class="ml-1 text-xs text-amber-600"
            >(approx)</span
          >
        </div>
        <ul class="mt-2 text-sm text-gray-700 space-y-1">
          <li v-for="t in topRows" :key="t.name" class="flex items-center justify-between">
            <button
              type="button"
              class="truncate text-left hover:underline"
              :title="t.name"
              @click="$emit('open-table', { name: t.name })"
            >
              {{ t.name }}
            </button>
            <span class="ml-2 shrink-0 text-gray-500">
              {{ Intl.NumberFormat().format(t.approxRows) }}
            </span>
          </li>
        </ul>
      </div>

      <!-- Notes -->
      <div
        v-if="overview.notes?.length"
        class="bg-white ring-1 ring-gray-900/5 rounded-lg p-4 md:col-span-6"
      >
        <div class="text-sm text-gray-500">Notes</div>
        <ul class="mt-2 space-y-1 text-sm">
          <li v-for="(n, i) in overview.notes" :key="i" class="flex items-start gap-2">
            <span
              class="mt-0.5 inline-block w-2 h-2 rounded-full"
              :class="{
                'bg-sky-500': n.severity === 'info',
                'bg-amber-500': n.severity === 'warn',
                'bg-red-500': n.severity === 'error'
              }"
            />
            <div class="flex-1">
              <span class="text-gray-700">{{ n.message }}</span>
              <a
                v-if="n.doc"
                :href="n.doc"
                class="ml-2 text-xs text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                >docs</a
              >
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
