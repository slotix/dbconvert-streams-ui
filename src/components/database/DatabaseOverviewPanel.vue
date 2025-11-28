<script setup lang="ts">
import { onMounted, watch, computed, ref, nextTick } from 'vue'
import { useDatabaseOverviewStore } from '@/stores/databaseOverview'
import { useConnectionsStore } from '@/stores/connections'
import { useDatabaseCapabilities } from '@/composables/useDatabaseCapabilities'
import { formatDataSize } from '@/utils/formats'
import BaseButton from '@/components/base/BaseButton.vue'
import FormInput from '@/components/base/FormInput.vue'
import {
  CircleStackIcon,
  SignalIcon,
  ChartBarIcon,
  TableCellsIcon,
  InformationCircleIcon,
  CommandLineIcon,
  PlusIcon,
  ChevronDownIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  connectionId: string
  database: string
}>()

const emit = defineEmits<{
  (e: 'show-diagram', payload: { connectionId: string; database: string }): void
  (e: 'open-table', payload: { name: string }): void
  (e: 'open-sql-console', payload: { connectionId: string; database: string }): void
  (e: 'create-schema', schemaName: string): void
}>()

const overviewStore = useDatabaseOverviewStore()
const connectionsStore = useConnectionsStore()

// Schema creation state
const newSchemaName = ref('')
const isCreatingSchema = ref(false)
const showNewDropdown = ref(false)
const schemaInputRef = ref<InstanceType<typeof FormInput> | null>(null)

// Get connection type for capabilities
const connectionType = computed(() => {
  const conn = connectionsStore.connectionByID(props.connectionId)
  return conn?.type || ''
})

// Database capabilities
const { canCreateSchema } = useDatabaseCapabilities(connectionType)

// Toggle dropdown and focus input
function toggleNewDropdown() {
  showNewDropdown.value = !showNewDropdown.value
  if (showNewDropdown.value) {
    nextTick(() => {
      schemaInputRef.value?.$el?.querySelector('input')?.focus()
    })
  }
}

// Close dropdown
function closeDropdown() {
  showNewDropdown.value = false
  newSchemaName.value = ''
}

// Get overview and loading state for this specific connection + database
const overview = computed(() => overviewStore.getOverview(props.connectionId, props.database))
const isLoading = computed(() =>
  overviewStore.isLoadingOverview(props.connectionId, props.database)
)
const error = computed(() => overviewStore.getError(props.connectionId, props.database))

async function load() {
  // Guard: Don't load if either connectionId or database is missing
  if (!props.connectionId || !props.database) {
    return
  }

  try {
    await overviewStore.fetchOverview(props.connectionId, props.database)
  } catch (e) {
    // Silently ignore "not found" errors which can occur during connection switching
    // when props are temporarily mismatched (e.g., new connectionId with old database name)
    if (e instanceof Error && e.message.includes('not found')) {
      console.warn(
        `Skipping overview load for ${props.database} on connection ${props.connectionId}: database not found (likely during connection switch)`
      )
      // Clear the error from store since this is an expected transient error
      overviewStore.clearOverview(props.connectionId, props.database)
      return
    }
    // Re-throw other errors
    console.error('Failed to load overview:', e)
    throw e
  }
}

onMounted(load)

watch(
  () => [props.connectionId, props.database],
  () => {
    // Only load if both props are present
    // This prevents attempting to load during prop transition when switching connections
    if (props.connectionId && props.database) {
      load()
    }
  },
  { deep: true }
)

const topSize = computed(() => (overview.value?.allTablesBySize || []).slice(0, 10))
const topRows = computed(() => (overview.value?.allTablesByRows || []).slice(0, 10))
const counts = computed(() => overview.value?.counts)
const activity = computed(() => overview.value?.activity)

// Safe display for total database size
const sizeBytes = computed(() => overview.value?.sizeBytes)
const sizeDisplay = computed(() => {
  const b = sizeBytes.value
  return typeof b === 'number' && Number.isFinite(b) ? formatDataSize(b) : '—'
})

// Schema creation handler
async function handleCreateSchema() {
  const schemaName = newSchemaName.value.trim()
  if (!schemaName) return

  isCreatingSchema.value = true
  try {
    emit('create-schema', schemaName)
    newSchemaName.value = '' // Clear input on success
    showNewDropdown.value = false // Close dropdown on success
  } finally {
    isCreatingSchema.value = false
  }
}
</script>

<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Database Overview</h3>
      <div class="flex items-center gap-2">
        <BaseButton
          variant="primary"
          size="sm"
          @click="
            emit('open-sql-console', {
              connectionId: props.connectionId,
              database: props.database
            })
          "
        >
          <CommandLineIcon class="w-4 h-4 mr-1.5" />
          SQL Console
        </BaseButton>
        <BaseButton variant="secondary" size="sm" @click="load()"> Refresh </BaseButton>
        <BaseButton
          variant="secondary"
          size="sm"
          @click="
            emit('show-diagram', {
              connectionId: props.connectionId,
              database: props.database
            })
          "
        >
          Show diagram
        </BaseButton>

        <!-- New Schema Dropdown -->
        <div v-if="canCreateSchema" class="relative">
          <BaseButton variant="secondary" size="sm" @click="toggleNewDropdown">
            <PlusIcon class="w-4 h-4 mr-1" />
            New Schema
            <ChevronDownIcon class="w-3 h-3 ml-1" />
          </BaseButton>

          <!-- Dropdown Panel -->
          <div
            v-if="showNewDropdown"
            class="absolute right-0 top-full mt-1 z-50 w-64 bg-white dark:bg-gray-850 rounded-lg shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-3"
          >
            <!-- Click outside overlay -->
            <div class="fixed inset-0 z-[-1]" @click="closeDropdown"></div>

            <div class="flex gap-2">
              <FormInput
                ref="schemaInputRef"
                v-model="newSchemaName"
                placeholder="schema_name"
                class="flex-1"
                :disabled="isCreatingSchema"
                @keyup.enter="handleCreateSchema"
                @keyup.escape="closeDropdown"
              />
              <BaseButton
                variant="primary"
                size="sm"
                :disabled="!newSchemaName.trim() || isCreatingSchema"
                @click="handleCreateSchema"
              >
                Create
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
      Loading overview…
    </div>
    <div v-else-if="error" class="text-sm text-red-600 dark:text-red-400 py-8 text-center">
      {{ error }}
    </div>
    <div v-else-if="overview" class="grid grid-cols-1 md:grid-cols-6 gap-4">
      <!-- Essentials -->
      <div
        class="group bg-white dark:bg-gray-900/40 ring-1 ring-slate-200/70 dark:ring-gray-800 rounded-xl p-4 md:col-span-2 hover:shadow-lg dark:hover:shadow-gray-900/40 hover:ring-slate-300 dark:hover:ring-gray-600 transition-all duration-200"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div
              class="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-linear-to-br group-hover:from-blue-100 group-hover:to-teal-100 dark:group-hover:from-blue-900/30 dark:group-hover:to-teal-900/30 transition-all duration-200"
            >
              <CircleStackIcon class="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Essentials</span>
          </div>
          <span
            class="inline-flex items-center text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium ring-1 ring-inset ring-slate-200 dark:ring-slate-700"
            >{{ overview.engine }} {{ overview.version }}</span
          >
        </div>
        <div class="mt-3 text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <div v-if="overview.encoding" class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Encoding:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{{
              overview.encoding
            }}</span>
          </div>
          <div v-if="overview.collation" class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Collation:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{{
              overview.collation
            }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Size:</span>
            <span
              class="font-semibold text-gray-900 dark:text-gray-100"
              :title="
                typeof sizeBytes === 'number'
                  ? Intl.NumberFormat().format(sizeBytes || 0) + ' bytes'
                  : ''
              "
              >{{ sizeDisplay }}</span
            >
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Tables:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{{
              counts?.tables ?? '—'
            }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Views:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{{
              counts?.views ?? '—'
            }}</span>
          </div>
          <div v-if="typeof counts?.schemas === 'number'" class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Schemas:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{{ counts.schemas }}</span>
          </div>
        </div>
      </div>

      <!-- CDC readiness -->
      <div
        class="group bg-white dark:bg-gray-900/40 ring-1 ring-slate-200/70 dark:ring-gray-800 rounded-xl p-4 md:col-span-2 hover:shadow-lg dark:hover:shadow-gray-900/40 hover:ring-slate-300 dark:hover:ring-gray-600 transition-all duration-200"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div
              class="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg group-hover:bg-linear-to-br group-hover:from-teal-100 group-hover:to-blue-100 dark:group-hover:from-teal-900/30 dark:group-hover:to-blue-900/30 transition-all duration-200"
            >
              <SignalIcon class="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
              >CDC readiness</span
            >
          </div>
          <span
            v-if="overview.engine === 'mysql'"
            class="inline-flex items-center text-xs px-2 py-1 rounded-md font-medium ring-1 ring-inset shadow-sm"
            :class="{
              'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/40 dark:text-green-200 dark:ring-green-500/40':
                overview.health?.binlog?.enabled &&
                overview.health?.binlog?.format === 'ROW' &&
                overview.health?.binlog?.rowImage === 'FULL',
              'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-500/40':
                overview.health?.binlog?.enabled &&
                (overview.health?.binlog?.format !== 'ROW' ||
                  overview.health?.binlog?.rowImage !== 'FULL'),
              'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/40 dark:text-red-200 dark:ring-red-500/40':
                !overview.health?.binlog?.enabled
            }"
          >
            <span
              class="mr-1.5 h-1.5 w-1.5 rounded-full"
              :class="{
                'bg-green-600 dark:bg-green-400':
                  overview.health?.binlog?.enabled &&
                  overview.health?.binlog?.format === 'ROW' &&
                  overview.health?.binlog?.rowImage === 'FULL',
                'bg-amber-600 dark:bg-amber-400':
                  overview.health?.binlog?.enabled &&
                  (overview.health?.binlog?.format !== 'ROW' ||
                    overview.health?.binlog?.rowImage !== 'FULL'),
                'bg-red-600 dark:bg-red-400': !overview.health?.binlog?.enabled
              }"
            ></span>
            {{ overview.health?.binlog?.enabled ? 'Enabled' : 'Not enabled' }}
          </span>
          <span
            v-else-if="overview.engine === 'postgres'"
            class="inline-flex items-center text-xs px-2 py-1 rounded-md font-medium ring-1 ring-inset shadow-sm"
            :class="{
              'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/40 dark:text-green-200 dark:ring-green-500/40':
                overview.health?.wal?.level === 'logical',
              'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/40 dark:text-red-200 dark:ring-red-500/40':
                overview.health?.wal?.level !== 'logical'
            }"
          >
            <span
              class="mr-1.5 h-1.5 w-1.5 rounded-full"
              :class="{
                'bg-green-600 dark:bg-green-400': overview.health?.wal?.level === 'logical',
                'bg-red-600 dark:bg-red-400': overview.health?.wal?.level !== 'logical'
              }"
            ></span>
            {{ overview.health?.wal?.level || 'unknown' }}
          </span>
        </div>
        <div class="mt-3 text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <template v-if="overview.engine === 'mysql'">
            <div class="flex justify-between items-center">
              <span class="text-gray-600 dark:text-gray-400">Binary log:</span>
              <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                overview.health?.binlog?.enabled ? 'ON' : 'OFF'
              }}</span>
            </div>
            <div v-if="overview.health?.binlog?.format" class="flex justify-between items-center">
              <span class="text-gray-600 dark:text-gray-400">Format:</span>
              <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                overview.health?.binlog?.format
              }}</span>
            </div>
            <div v-if="overview.health?.binlog?.rowImage" class="flex justify-between items-center">
              <span class="text-gray-600 dark:text-gray-400">Row image:</span>
              <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                overview.health?.binlog?.rowImage
              }}</span>
            </div>
            <!-- GTID mode intentionally omitted per product scope -->
            <div
              v-if="typeof overview.health?.binlog?.serverId === 'number'"
              class="flex justify-between items-center"
            >
              <span class="text-gray-600 dark:text-gray-400">Server ID:</span>
              <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                overview.health?.binlog?.serverId
              }}</span>
            </div>
          </template>
          <template v-else>
            <div class="flex justify-between items-center">
              <span class="text-gray-600 dark:text-gray-400">wal_level:</span>
              <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                overview.health?.wal?.level || 'unknown'
              }}</span>
            </div>
            <div
              v-if="typeof overview.health?.wal?.maxReplicationSlots === 'number'"
              class="flex justify-between items-center"
            >
              <span class="text-gray-600 dark:text-gray-400">Replication slots (max):</span>
              <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                overview.health?.wal?.maxReplicationSlots
              }}</span>
            </div>
            <div
              v-if="typeof overview.health?.wal?.freeReplicationSlots === 'number'"
              class="flex justify-between items-center"
            >
              <span class="text-gray-600 dark:text-gray-400">Replication slots (free):</span>
              <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                overview.health?.wal?.freeReplicationSlots
              }}</span>
            </div>
            <div
              v-if="typeof overview.health?.wal?.maxWalSenders === 'number'"
              class="flex justify-between items-center"
            >
              <span class="text-gray-600 dark:text-gray-400">Wal senders (max):</span>
              <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                overview.health?.wal?.maxWalSenders
              }}</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Activity (compact) -->
      <div
        class="group bg-white dark:bg-gray-900/40 ring-1 ring-slate-200/70 dark:ring-gray-800 rounded-xl p-4 md:col-span-2 hover:shadow-lg dark:hover:shadow-gray-900/40 hover:ring-slate-300 dark:hover:ring-gray-600 transition-all duration-200"
      >
        <div class="flex items-center gap-2 mb-3">
          <div
            class="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg group-hover:bg-linear-to-br group-hover:from-orange-100 group-hover:to-amber-100 dark:group-hover:from-orange-900/30 dark:group-hover:to-amber-900/30 transition-all duration-200"
          >
            <ChartBarIcon class="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Activity</span>
        </div>
        <div class="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Connections:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">
              {{ activity?.connections?.used ?? '—' }}
              <span
                v-if="activity?.connections?.max"
                class="text-gray-500 dark:text-gray-400 font-normal"
              >
                / {{ activity.connections.max }}
              </span>
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600 dark:text-gray-400">Active sessions:</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{{
              activity?.activeSessions ?? '—'
            }}</span>
          </div>
        </div>
        <div
          v-if="activity?.longRunning?.length"
          class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700"
        >
          <div
            class="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 mb-2"
          >
            Long-running queries
          </div>
          <ul class="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <li
              v-for="(q, idx) in activity.longRunning.slice(0, 5)"
              :key="q.pid || q.threadId || idx"
              class="flex items-start justify-between gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div class="truncate min-w-0 flex-1">
                <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">{{
                  q.user
                }}</span>
                <div
                  class="truncate text-xs text-gray-700 dark:text-gray-300 mt-0.5"
                  :title="q.query"
                >
                  {{ q.query }}
                </div>
              </div>
              <span class="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">{{
                q.duration
              }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Top by size -->
      <div
        class="group bg-white dark:bg-gray-900/40 ring-1 ring-slate-200/70 dark:ring-gray-800 rounded-xl p-4 md:col-span-3 hover:shadow-lg dark:hover:shadow-gray-900/40 hover:ring-slate-300 dark:hover:ring-gray-600 transition-all duration-200"
      >
        <div class="flex items-center gap-2 mb-3">
          <div
            class="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:bg-linear-to-br group-hover:from-purple-100 group-hover:to-pink-100 dark:group-hover:from-purple-900/30 dark:group-hover:to-pink-900/30 transition-all duration-200"
          >
            <ServerIcon class="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
            >Top tables by size</span
          >
        </div>
        <ul class="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li
            v-for="t in topSize"
            :key="t.name"
            class="flex items-center justify-between p-2 rounded-lg hover:bg-linear-to-r hover:from-blue-50 hover:to-teal-50 dark:hover:from-blue-900/20 dark:hover:to-teal-900/20 transition-all duration-150"
          >
            <button
              type="button"
              class="truncate text-left hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors min-w-0 flex-1"
              :title="t.name"
              @click="$emit('open-table', { name: t.name })"
            >
              {{ t.name }}
            </button>
            <span
              class="ml-2 shrink-0 text-gray-500 dark:text-gray-400 text-xs font-medium"
              :title="Intl.NumberFormat().format(t.sizeBytes) + ' bytes'"
              >{{ formatDataSize(t.sizeBytes) }}</span
            >
          </li>
        </ul>
      </div>

      <!-- Top by rows -->
      <div
        class="group bg-white dark:bg-gray-900/40 ring-1 ring-slate-200/70 dark:ring-gray-800 rounded-xl p-4 md:col-span-3 hover:shadow-lg dark:hover:shadow-gray-900/40 hover:ring-slate-300 dark:hover:ring-gray-600 transition-all duration-200"
      >
        <div class="flex items-center gap-2 mb-3">
          <div
            class="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg group-hover:bg-linear-to-br group-hover:from-indigo-100 group-hover:to-purple-100 dark:group-hover:from-indigo-900/30 dark:group-hover:to-purple-900/30 transition-all duration-200"
          >
            <TableCellsIcon class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Top tables by rows
            <span
              v-if="overview.engine === 'mysql'"
              class="ml-1 text-xs text-amber-600 dark:text-amber-400 font-normal"
              >(approx)</span
            >
          </span>
        </div>
        <ul class="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li
            v-for="t in topRows"
            :key="t.name"
            class="flex items-center justify-between p-2 rounded-lg hover:bg-linear-to-r hover:from-blue-50 hover:to-teal-50 dark:hover:from-blue-900/20 dark:hover:to-teal-900/20 transition-all duration-150"
          >
            <button
              type="button"
              class="truncate text-left hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors min-w-0 flex-1"
              :title="t.name"
              @click="$emit('open-table', { name: t.name })"
            >
              {{ t.name }}
            </button>
            <span class="ml-2 shrink-0 text-gray-500 dark:text-gray-400 text-xs font-medium">
              {{ Intl.NumberFormat().format(t.approxRows) }}
            </span>
          </li>
        </ul>
      </div>

      <!-- Notes -->
      <div
        v-if="overview.notes?.length"
        class="group bg-white dark:bg-gray-900/40 ring-1 ring-slate-200/70 dark:ring-gray-800 rounded-xl p-4 md:col-span-6 hover:shadow-lg dark:hover:shadow-gray-900/40 hover:ring-slate-300 dark:hover:ring-gray-600 transition-all duration-200"
      >
        <div class="flex items-center gap-2 mb-3">
          <div
            class="p-2 bg-sky-50 dark:bg-sky-900/20 rounded-lg group-hover:bg-linear-to-br group-hover:from-sky-100 group-hover:to-blue-100 dark:group-hover:from-sky-900/30 dark:group-hover:to-blue-900/30 transition-all duration-200"
          >
            <InformationCircleIcon class="h-4 w-4 text-sky-600 dark:text-sky-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Notes</span>
        </div>
        <ul class="mt-2 space-y-2 text-sm">
          <li
            v-for="(n, i) in overview.notes"
            :key="i"
            class="flex items-start gap-3 p-3 rounded-lg transition-colors"
            :class="{
              'bg-sky-50 dark:bg-sky-900/20': n.severity === 'info',
              'bg-amber-50 dark:bg-amber-900/20': n.severity === 'warn',
              'bg-red-50 dark:bg-red-900/20': n.severity === 'error'
            }"
          >
            <span
              class="mt-0.5 inline-block w-2 h-2 rounded-full shrink-0"
              :class="{
                'bg-sky-500': n.severity === 'info',
                'bg-amber-500': n.severity === 'warn',
                'bg-red-500': n.severity === 'error'
              }"
            />
            <div class="flex-1 min-w-0">
              <span
                class="text-gray-800 dark:text-gray-200 font-medium"
                :class="{
                  'text-sky-900 dark:text-sky-300': n.severity === 'info',
                  'text-amber-900 dark:text-amber-300': n.severity === 'warn',
                  'text-red-900 dark:text-red-300': n.severity === 'error'
                }"
                >{{ n.message }}</span
              >
              <a
                v-if="n.doc"
                :href="n.doc"
                class="ml-2 text-xs font-medium hover:underline"
                :class="{
                  'text-sky-600 dark:text-sky-400': n.severity === 'info',
                  'text-amber-600 dark:text-amber-400': n.severity === 'warn',
                  'text-red-600 dark:text-red-400': n.severity === 'error'
                }"
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
