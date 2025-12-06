<template>
  <div
    class="bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700"
    :class="{ 'border-b-0': isCollapsed }"
  >
    <!-- Header -->
    <button
      class="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      @click="toggleCollapse"
    >
      <div class="flex items-center space-x-2">
        <CircleStackIcon class="h-4 w-4 text-teal-600 dark:text-teal-400" />
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100"> Data Sources </span>
        <span
          v-if="selectedCount > 0"
          class="px-1.5 py-0.5 text-xs font-medium rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300"
        >
          {{ selectedCount }} selected
        </span>
      </div>
      <ChevronDownIcon
        class="h-4 w-4 text-gray-400 transition-transform duration-200"
        :class="{ '-rotate-180': !isCollapsed }"
      />
    </button>

    <!-- Collapsible Content -->
    <div v-show="!isCollapsed" class="px-4 pb-3 border-t border-gray-100 dark:border-gray-700/50">
      <!-- Info Banner -->
      <div
        class="mt-3 mb-3 flex items-start space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md text-xs"
      >
        <InformationCircleIcon class="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
        <div class="text-blue-700 dark:text-blue-300">
          <p>
            Select database connections to query. Use aliases in your SQL:
            <code class="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded font-mono"
              >pg1.schema.table</code
            >
          </p>
          <p class="mt-1 text-blue-600 dark:text-blue-400">
            <strong>Files:</strong> Query files directly without selecting a connection:
            <code class="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded font-mono"
              >read_parquet('/path/file.parquet')</code
            >
          </p>
        </div>
      </div>

      <!-- Connection List -->
      <div class="space-y-2 max-h-60 overflow-y-auto">
        <div
          v-for="conn in databaseConnections"
          :key="conn.id"
          class="flex items-center space-x-3 p-2 rounded-md transition-colors"
          :class="[
            isSelected(conn.id)
              ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
          ]"
        >
          <!-- Checkbox -->
          <input
            :id="`conn-${conn.id}`"
            type="checkbox"
            :checked="isSelected(conn.id)"
            class="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500 bg-white dark:bg-gray-800"
            @change="toggleConnection(conn)"
          />

          <!-- Connection Icon -->
          <div class="shrink-0">
            <component
              :is="getConnectionIcon(conn.type)"
              class="h-5 w-5"
              :class="getConnectionIconColor(conn.type)"
            />
          </div>

          <!-- Connection Info -->
          <div class="flex-1 min-w-0">
            <label
              :for="`conn-${conn.id}`"
              class="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate cursor-pointer"
            >
              {{ conn.name }}
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
              {{ conn.type }} · {{ getConnectionHost(conn) }}
            </p>
          </div>

          <!-- Alias Input (shown when selected) -->
          <div v-if="isSelected(conn.id)" class="flex items-center space-x-2 shrink-0">
            <span class="text-xs text-gray-500 dark:text-gray-400">as</span>
            <input
              type="text"
              :value="getAlias(conn.id)"
              class="w-20 px-2 py-1 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              placeholder="alias"
              @input="updateAlias(conn.id, ($event.target as HTMLInputElement).value)"
            />

            <!-- Database Selector (for connections with multiple databases) -->
            <select
              v-if="conn.databasesInfo && conn.databasesInfo.length > 1"
              :value="getDatabase(conn.id)"
              class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              @change="updateDatabase(conn.id, ($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="db in conn.databasesInfo.filter((d) => !d.isSystem)"
                :key="db.name"
                :value="db.name"
              >
                {{ db.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="databaseConnections.length === 0"
          class="py-6 text-center text-gray-500 dark:text-gray-400"
        >
          <CircleStackIcon class="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p class="text-sm">No database connections found</p>
          <p class="text-xs mt-1">Add PostgreSQL or MySQL connections to use federated queries.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CircleStackIcon, ChevronDownIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'
import { useConnectionsStore } from '@/stores/connections'
import type { Connection } from '@/types/connections'
import type { ConnectionMapping } from '@/api/federated'

// Props
interface Props {
  modelValue: ConnectionMapping[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: ConnectionMapping[]): void
}>()

// Stores
const connectionsStore = useConnectionsStore()

// Local State
const isCollapsed = ref(false)

// Computed
const databaseConnections = computed(() => {
  return connectionsStore.connections.filter((conn) => {
    const type = conn.type?.toLowerCase() || ''
    return type === 'postgresql' || type === 'postgres' || type === 'mysql' || type === 'mariadb'
  })
})

const selectedCount = computed(() => props.modelValue.length)

// Methods
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

function isSelected(connectionId: string): boolean {
  return props.modelValue.some((m) => m.connectionId === connectionId)
}

function getAlias(connectionId: string): string {
  const mapping = props.modelValue.find((m) => m.connectionId === connectionId)
  return mapping?.alias || ''
}

function getDatabase(connectionId: string): string {
  const mapping = props.modelValue.find((m) => m.connectionId === connectionId)
  return mapping?.database || ''
}

function generateAlias(conn: Connection): string {
  const type = conn.type?.toLowerCase() || 'db'
  let prefix = 'db'

  if (type === 'postgresql' || type === 'postgres') {
    prefix = 'pg'
  } else if (type === 'mysql' || type === 'mariadb') {
    prefix = 'my'
  }

  // Find next available number
  const existingAliases = props.modelValue.map((m) => m.alias)
  let counter = 1
  while (existingAliases.includes(`${prefix}${counter}`)) {
    counter++
  }

  return `${prefix}${counter}`
}

function toggleConnection(conn: Connection) {
  const newMappings = [...props.modelValue]
  const existingIndex = newMappings.findIndex((m) => m.connectionId === conn.id)

  if (existingIndex >= 0) {
    // Remove
    newMappings.splice(existingIndex, 1)
  } else {
    // Add with auto-generated alias
    const alias = generateAlias(conn)
    // Get default database if available
    const defaultDb = conn.databasesInfo?.find((d) => !d.isSystem)?.name || ''

    newMappings.push({
      alias,
      connectionId: conn.id,
      database: defaultDb
    })
  }

  emit('update:modelValue', newMappings)
}

function updateAlias(connectionId: string, alias: string) {
  // Sanitize alias: alphanumeric and underscore only
  const sanitized = alias.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()

  const newMappings = props.modelValue.map((m) => {
    if (m.connectionId === connectionId) {
      return { ...m, alias: sanitized }
    }
    return m
  })

  emit('update:modelValue', newMappings)
}

function updateDatabase(connectionId: string, database: string) {
  const newMappings = props.modelValue.map((m) => {
    if (m.connectionId === connectionId) {
      return { ...m, database }
    }
    return m
  })

  emit('update:modelValue', newMappings)
}

function getConnectionHost(conn: Connection): string {
  if (conn.spec?.database) {
    const { host, port } = conn.spec.database
    if (host) {
      return port ? `${host}:${port}` : host
    }
  }
  return 'localhost'
}

function getConnectionIcon(_type: string) {
  // Return the CircleStackIcon for all - can be enhanced later
  return CircleStackIcon
}

function getConnectionIconColor(type: string): string {
  const normalized = type?.toLowerCase() || ''
  if (normalized === 'postgresql' || normalized === 'postgres') {
    return 'text-blue-500 dark:text-blue-400'
  }
  if (normalized === 'mysql' || normalized === 'mariadb') {
    return 'text-orange-500 dark:text-orange-400'
  }
  return 'text-gray-500 dark:text-gray-400'
}

// Load connections if not already loaded
watch(
  () => connectionsStore.connections,
  () => {},
  { immediate: true }
)
</script>
