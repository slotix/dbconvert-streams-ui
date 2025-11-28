<script setup lang="ts">
import { onMounted, watch, computed, ref, nextTick } from 'vue'
import { useDatabaseOverviewStore } from '@/stores/databaseOverview'
import { useConnectionsStore } from '@/stores/connections'
import { useExplorerNavigationStore } from '@/stores/explorerNavigation'
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
const navigationStore = useExplorerNavigationStore()

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

// Get set of system schema names for filtering
const systemSchemaNames = computed(() => {
  const schemas = navigationStore.getFilteredSchemas(props.connectionId, props.database)
  const allSchemas = navigationStore
    .getDatabasesRaw(props.connectionId)
    ?.find((db) => db.name === props.database)?.schemas
  if (!schemas || !allSchemas) return new Set<string>()

  // Find schemas that are in allSchemas but NOT in filtered schemas (those are system)
  const filteredNames = new Set(schemas.map((s) => s.name))
  const systemNames = new Set<string>()
  for (const schema of allSchemas) {
    if (!filteredNames.has(schema.name)) {
      systemNames.add(schema.name)
    }
  }
  return systemNames
})

// Filter function for tables - checks if table belongs to a system schema
function isSystemTable(tableName: string): boolean {
  // Table names can be "schema.table" or just "table"
  const dotIndex = tableName.indexOf('.')
  if (dotIndex > 0) {
    const schemaName = tableName.substring(0, dotIndex)
    return systemSchemaNames.value.has(schemaName)
  }
  return false
}

// Filter tables based on showSystemObjects setting
const topSize = computed(() => {
  const allTables = overview.value?.allTablesBySize || []
  const filtered = navigationStore.showSystemObjects
    ? allTables
    : allTables.filter((t) => !isSystemTable(t.name))
  return filtered.slice(0, 10)
})

const topRows = computed(() => {
  const allTables = overview.value?.allTablesByRows || []
  const filtered = navigationStore.showSystemObjects
    ? allTables
    : allTables.filter((t) => !isSystemTable(t.name))
  return filtered.slice(0, 10)
})

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
        class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700 md:col-span-2"
      >
        <div class="flex items-center gap-2 mb-3">
          <div class="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <CircleStackIcon class="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Essentials</span>
        </div>

        <div class="space-y-3">
          <!-- Engine/Version Badge -->
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize"
              :class="
                overview.engine === 'postgres'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
              "
            >
              {{ overview.engine === 'postgres' ? 'PostgreSQL' : 'MySQL' }}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ overview.version }}</span>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 gap-2">
            <div v-if="overview.encoding">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Encoding</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.encoding }}
              </p>
            </div>
            <div v-if="overview.collation">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Collation</label
              >
              <p
                class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm truncate"
                :title="overview.collation"
              >
                {{ overview.collation }}
              </p>
            </div>
            <div>
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Size</label
              >
              <p
                class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-base"
                :title="
                  typeof sizeBytes === 'number'
                    ? Intl.NumberFormat().format(sizeBytes || 0) + ' bytes'
                    : ''
                "
              >
                {{ sizeDisplay }}
              </p>
            </div>
            <div>
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Tables</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-base">
                {{ counts?.tables ?? '—' }}
              </p>
            </div>
            <div>
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Views</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-base">
                {{ counts?.views ?? '—' }}
              </p>
            </div>
            <div v-if="typeof counts?.schemas === 'number'">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Schemas</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-base">
                {{ counts.schemas }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- CDC readiness -->
      <div
        class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700 md:col-span-2"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <SignalIcon class="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
              >CDC readiness</span
            >
          </div>
          <!-- Status Badge -->
          <span
            v-if="overview.engine === 'mysql'"
            class="inline-flex items-center text-xs px-2 py-0.5 rounded font-medium"
            :class="{
              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300':
                overview.health?.binlog?.enabled &&
                overview.health?.binlog?.format === 'ROW' &&
                overview.health?.binlog?.rowImage === 'FULL',
              'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300':
                overview.health?.binlog?.enabled &&
                (overview.health?.binlog?.format !== 'ROW' ||
                  overview.health?.binlog?.rowImage !== 'FULL'),
              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300':
                !overview.health?.binlog?.enabled
            }"
          >
            {{ overview.health?.binlog?.enabled ? 'enabled' : 'disabled' }}
          </span>
          <span
            v-else-if="overview.engine === 'postgres'"
            class="inline-flex items-center text-xs px-2 py-0.5 rounded font-medium"
            :class="{
              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300':
                overview.health?.wal?.level === 'logical',
              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300':
                overview.health?.wal?.level !== 'logical'
            }"
          >
            {{ overview.health?.wal?.level || 'unknown' }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <template v-if="overview.engine === 'mysql'">
            <div>
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Binary log</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.binlog?.enabled ? 'ON' : 'OFF' }}
              </p>
            </div>
            <div v-if="overview.health?.binlog?.format">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Format</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.binlog?.format }}
              </p>
            </div>
            <div v-if="overview.health?.binlog?.rowImage">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Row image</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.binlog?.rowImage }}
              </p>
            </div>
            <div v-if="typeof overview.health?.binlog?.serverId === 'number'">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Server ID</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.binlog?.serverId }}
              </p>
            </div>
          </template>
          <template v-else>
            <div>
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >wal_level</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.wal?.level || 'unknown' }}
              </p>
            </div>
            <div v-if="typeof overview.health?.wal?.maxReplicationSlots === 'number'">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Slots (max)</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.wal?.maxReplicationSlots }}
              </p>
            </div>
            <div v-if="typeof overview.health?.wal?.freeReplicationSlots === 'number'">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >Slots (free)</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.wal?.freeReplicationSlots }}
              </p>
            </div>
            <div v-if="typeof overview.health?.wal?.maxWalSenders === 'number'">
              <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >WAL senders</label
              >
              <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {{ overview.health?.wal?.maxWalSenders }}
              </p>
            </div>
          </template>
        </div>
      </div>

      <!-- Activity -->
      <div
        class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700 md:col-span-2"
      >
        <div class="flex items-center gap-2 mb-3">
          <div class="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <ChartBarIcon class="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Activity</span>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
              >Connections</label
            >
            <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-base">
              {{ activity?.connections?.used ?? '—' }}
              <span
                v-if="activity?.connections?.max"
                class="text-xs font-normal text-gray-500 dark:text-gray-400"
              >
                / {{ activity.connections.max }}
              </span>
            </p>
          </div>
          <div>
            <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
              >Active sessions</label
            >
            <p class="mt-0.5 font-semibold text-gray-900 dark:text-gray-100 text-base">
              {{ activity?.activeSessions ?? '—' }}
            </p>
          </div>
        </div>

        <!-- Long-running queries -->
        <div
          v-if="activity?.longRunning?.length"
          class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
        >
          <label class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2 block"
            >Long-running queries</label
          >
          <ul class="space-y-1.5">
            <li
              v-for="(q, idx) in activity.longRunning.slice(0, 3)"
              :key="q.pid || q.threadId || idx"
              class="flex items-center justify-between gap-2 text-xs"
            >
              <div class="truncate min-w-0 flex-1">
                <span class="text-gray-500 dark:text-gray-400">{{ q.user }}:</span>
                <span class="ml-1 text-gray-700 dark:text-gray-300 truncate" :title="q.query">
                  {{ q.query.slice(0, 40) }}{{ q.query.length > 40 ? '...' : '' }}
                </span>
              </div>
              <span class="shrink-0 font-medium text-gray-500 dark:text-gray-400">{{
                q.duration
              }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Top by size -->
      <div
        class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700 md:col-span-3"
      >
        <div class="flex items-center gap-2 mb-3">
          <div class="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <ServerIcon class="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
            >Top tables by size</span
          >
        </div>
        <ul class="space-y-1">
          <li
            v-for="t in topSize"
            :key="t.name"
            class="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <button
              type="button"
              class="truncate text-left text-sm hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors min-w-0 flex-1"
              :title="t.name"
              @click="$emit('open-table', { name: t.name })"
            >
              {{ t.name }}
            </button>
            <span
              class="ml-2 shrink-0 text-gray-500 dark:text-gray-400 text-xs font-medium"
              :title="
                t.sizeBytes > 0
                  ? Intl.NumberFormat().format(t.sizeBytes) + ' bytes'
                  : 'Size not available'
              "
              >{{ formatDataSize(t.sizeBytes, true) }}</span
            >
          </li>
          <li
            v-if="!topSize.length"
            class="text-xs text-gray-500 dark:text-gray-400 py-2 text-center"
          >
            No tables
          </li>
        </ul>
      </div>

      <!-- Top by rows -->
      <div
        class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700 md:col-span-3"
      >
        <div class="flex items-center gap-2 mb-3">
          <div class="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
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
        <ul class="space-y-1">
          <li
            v-for="t in topRows"
            :key="t.name"
            class="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <button
              type="button"
              class="truncate text-left text-sm hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors min-w-0 flex-1"
              :title="t.name"
              @click="$emit('open-table', { name: t.name })"
            >
              {{ t.name }}
            </button>
            <span class="ml-2 shrink-0 text-gray-500 dark:text-gray-400 text-xs font-medium">
              {{ Intl.NumberFormat().format(t.approxRows) }}
            </span>
          </li>
          <li
            v-if="!topRows.length"
            class="text-xs text-gray-500 dark:text-gray-400 py-2 text-center"
          >
            No tables
          </li>
        </ul>
      </div>

      <!-- Notes -->
      <div
        v-if="overview.notes?.length"
        class="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-4 ring-1 ring-slate-200/70 dark:ring-gray-700 md:col-span-6"
      >
        <div class="flex items-center gap-2 mb-3">
          <div class="p-1.5 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
            <InformationCircleIcon class="h-4 w-4 text-sky-600 dark:text-sky-400" />
          </div>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Notes</span>
        </div>
        <ul class="space-y-2">
          <li
            v-for="(n, i) in overview.notes"
            :key="i"
            class="flex items-start gap-2 p-2 rounded-lg text-sm"
            :class="{
              'bg-sky-100/50 dark:bg-sky-900/20': n.severity === 'info',
              'bg-amber-100/50 dark:bg-amber-900/20': n.severity === 'warn',
              'bg-red-100/50 dark:bg-red-900/20': n.severity === 'error'
            }"
          >
            <span
              class="mt-1.5 inline-block w-1.5 h-1.5 rounded-full shrink-0"
              :class="{
                'bg-sky-500': n.severity === 'info',
                'bg-amber-500': n.severity === 'warn',
                'bg-red-500': n.severity === 'error'
              }"
            />
            <div class="flex-1 min-w-0">
              <span
                :class="{
                  'text-sky-800 dark:text-sky-300': n.severity === 'info',
                  'text-amber-800 dark:text-amber-300': n.severity === 'warn',
                  'text-red-800 dark:text-red-300': n.severity === 'error'
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
