<template>
  <div
    class="bg-white dark:bg-gray-850"
    :class="{
      'h-full flex flex-col': props.compact && !props.showHeader,
      'border-b border-gray-200 dark:border-gray-700': props.showHeader,
      'border-b-0': props.showHeader && isCollapsed
    }"
  >
    <!-- Header -->
    <button
      v-if="props.showHeader"
      class="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      @click="toggleCollapse"
    >
      <!-- Left side: Icon + Label -->
      <div class="flex items-center gap-2.5 shrink-0">
        <Database class="h-4 w-4 text-teal-600 dark:text-teal-400" />
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Data Sources</span>
      </div>

      <!-- Middle: Selected sources preview (only when collapsed) -->
      <div v-if="isCollapsed" class="flex-1 flex items-center justify-end gap-2 mx-4 min-w-0">
        <!-- Source chips -->
        <div v-if="selectedPreview.length > 0" class="hidden sm:flex items-center gap-1.5 min-w-0">
          <span
            v-for="item in selectedPreview"
            :key="item.connectionId"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 max-w-[180px]"
          >
            <span class="font-mono font-medium text-teal-600 dark:text-teal-400">{{
              item.alias
            }}</span>
            <span class="text-gray-300 dark:text-gray-600">·</span>
            <span class="truncate text-gray-500 dark:text-gray-400">{{ item.name }}</span>
          </span>
          <span
            v-if="selectedOverflowCount > 0"
            class="px-1.5 py-0.5 text-xs font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            +{{ selectedOverflowCount }}
          </span>
        </div>

        <!-- Selection count badge -->
        <span
          v-if="selectedCount > 0"
          class="shrink-0 px-2.5 py-1 text-xs font-semibold rounded-md bg-teal-500 dark:bg-teal-600 text-white"
        >
          {{ selectedCount }}
        </span>

        <!-- Add sources button -->
        <span
          class="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors"
          :class="[
            selectedCount > 0
              ? 'bg-transparent border-teal-500 dark:border-teal-600 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20'
              : 'bg-teal-500 dark:bg-teal-600 border-teal-500 dark:border-teal-600 text-white'
          ]"
          :title="collapsedCtaTitle"
        >
          <Plus class="h-3.5 w-3.5" />
          <span class="hidden xs:inline">{{ selectedCount > 0 ? 'Edit' : 'Select' }}</span>
        </span>
      </div>

      <!-- Expanded state: just show selection count -->
      <div v-else class="flex items-center gap-2">
        <span
          v-if="selectedCount > 0"
          class="px-2 py-0.5 text-xs font-medium rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300"
        >
          {{ selectedCount }} selected
        </span>
      </div>

      <!-- Chevron -->
      <ChevronDown
        class="h-4 w-4 text-gray-400 shrink-0 ml-2 transition-transform duration-200"
        :class="{ '-rotate-180': !isCollapsed }"
      />
    </button>

    <!-- Collapsible Content -->
    <div
      v-show="isContentVisible"
      class="px-4 pb-3"
      :class="{
        'flex-1 min-h-0 flex flex-col': props.compact && !props.showHeader,
        'border-t border-gray-100 dark:border-gray-700/50': props.showHeader,
        'pt-2': !props.showHeader
      }"
    >
      <div v-if="props.showHints" class="mt-2 mb-6">
        <button
          type="button"
          class="w-full inline-flex items-center justify-between px-0.5 py-1 text-[11px] text-gray-500 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          @click="isHintsExpanded = !isHintsExpanded"
        >
          <span>Aliases help</span>
          <ChevronDown
            class="h-3.5 w-3.5 transition-transform duration-200"
            :class="{ '-rotate-180': isHintsExpanded }"
          />
        </button>

        <div
          v-if="isHintsExpanded"
          class="mt-1 space-y-1.5 pl-0.5 text-[11px] text-gray-600 dark:text-gray-400"
        >
          <p>
            <strong class="text-gray-700 dark:text-gray-300">Database:</strong>
            <code class="ml-1 px-1 py-0.5 bg-gray-200/80 dark:bg-gray-700/70 rounded font-mono"
              >alias.schema.table</code
            >
          </p>
          <p>
            <strong class="text-gray-700 dark:text-gray-300">S3:</strong>
            <code class="ml-1 px-1 py-0.5 bg-gray-200/80 dark:bg-gray-700/70 rounded font-mono"
              >read_parquet('alias://bucket/path/*.parquet')</code
            >
          </p>
          <p>
            <strong class="text-gray-700 dark:text-gray-300">Local file:</strong>
            <code class="ml-1 px-1 py-0.5 bg-gray-200/80 dark:bg-gray-700/70 rounded font-mono"
              >read_parquet('/path/file.parquet')</code
            >
          </p>
          <p v-if="hasMultipleS3Connections">
            <strong class="text-gray-700 dark:text-gray-300">Multi-S3:</strong>
            <code
              class="ml-1 px-1 py-0.5 bg-gray-200/80 dark:bg-gray-700/70 rounded font-mono text-[10px]"
              >read_parquet('aws://...') JOIN read_parquet('do://...')</code
            >
          </p>
        </div>
      </div>

      <!-- Connection List -->
      <div
        class="overflow-y-auto"
        :class="
          props.compact && !props.showHeader
            ? 'flex-1 min-h-0'
            : props.compact
              ? 'max-h-[70vh]'
              : 'max-h-60'
        "
      >
        <template v-if="connectionGroups.length > 0">
          <div
            v-for="(group, groupIndex) in connectionGroups"
            :key="group.key"
            :class="groupIndex > 0 ? 'mt-3' : ''"
          >
            <div class="flex items-center justify-between px-0.5 pb-1">
              <div class="flex items-center gap-2 flex-1 pr-3">
                <span
                  class="text-[9px] font-semibold tracking-[0.1em] text-gray-500 dark:text-gray-500"
                >
                  {{ group.label }}
                </span>
                <div class="h-px flex-1 bg-gray-200/70 dark:bg-gray-700/60" />
              </div>
              <RouterLink
                v-if="group.showCreateLink"
                :to="createConnectionTo"
                class="text-xs font-medium text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 transition-colors"
                @click.stop
              >
                + Add
              </RouterLink>
            </div>

            <div class="divide-y divide-gray-200 dark:divide-gray-700/70">
              <div
                v-for="conn in group.items"
                :key="conn.id"
                class="flex items-center gap-2 py-2 rounded-sm hover:bg-gray-100/40 dark:hover:bg-gray-800/20"
              >
                <!-- Checkbox -->
                <input
                  :id="`conn-${conn.id}`"
                  type="checkbox"
                  :checked="isSelected(conn.id)"
                  class="h-3 w-3 rounded-[3px] border-gray-400/70 dark:border-gray-600/70 text-teal-500 focus:ring-0 focus:ring-offset-0 bg-transparent"
                  @change="toggleConnection(conn)"
                />

                <!-- Connection Icon -->
                <div class="shrink-0 w-5 flex items-center justify-center">
                  <img
                    v-if="getPrimaryDatabaseLogoForConnection(conn)"
                    :src="getPrimaryDatabaseLogoForConnection(conn)"
                    :alt="`${getConnectionTypeLabelForUI(conn)} logo`"
                    class="h-4 w-4 object-contain opacity-90 dark:opacity-100 dark:brightness-0 dark:invert"
                  />
                  <component
                    :is="getConnectionIcon(getConnectionTypeLabelForUI(conn))"
                    v-else
                    class="h-4 w-4"
                    :class="getConnectionIconColor(getConnectionTypeLabelForUI(conn))"
                  />
                </div>

                <!-- Connection Info -->
                <div class="flex-1 min-w-0">
                  <label
                    :for="`conn-${conn.id}`"
                    class="block font-semibold text-gray-950 dark:text-gray-100 truncate cursor-pointer text-sm"
                  >
                    {{ conn.name }}
                  </label>
                  <p
                    class="truncate text-gray-500 dark:text-gray-400 text-[11px]"
                    :title="getConnectionMeta(conn)"
                  >
                    {{ getConnectionMeta(conn) }}
                  </p>
                </div>

                <!-- Alias Input (shown when selected) - for database and S3 connections -->
                <div
                  v-if="isSelected(conn.id) && showAliasForConnection(conn)"
                  class="flex items-center shrink-0 gap-1 self-start mt-0.5"
                >
                  <span v-if="!props.compact" class="text-xs text-gray-500 dark:text-gray-400"
                    >as</span
                  >
                  <button
                    v-if="editingAliasConnectionId !== conn.id"
                    type="button"
                    :title="`Edit alias for ${conn.name}`"
                    class="alias-inline-display text-xs font-mono leading-none text-gray-600 dark:text-gray-300 focus:outline-none transition-colors"
                    :class="[
                      props.compact ? 'w-[4.25rem] truncate py-0.5' : 'w-[4.25rem] py-0.5',
                      !getAlias(conn.id) && 'text-gray-400 dark:text-gray-500'
                    ]"
                    @click="startAliasEdit(conn.id)"
                  >
                    {{ getAlias(conn.id) || 'alias' }}
                  </button>
                  <input
                    v-else
                    :ref="(el) => setAliasInputRef(conn.id, el as HTMLInputElement | null)"
                    type="text"
                    :value="aliasDraftByConnectionId[conn.id] ?? getAlias(conn.id)"
                    :title="`Alias for ${conn.name}`"
                    placeholder="alias"
                    class="alias-inline-input text-xs font-mono leading-none bg-transparent border-0 border-b border-gray-400 dark:border-gray-500 rounded-none text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-0 focus:border-teal-500 dark:focus:border-teal-400 caret-teal-500"
                    :class="props.compact ? 'w-[4.25rem] py-0.5' : 'w-[4.25rem] py-0.5'"
                    @input="setAliasDraft(conn.id, ($event.target as HTMLInputElement).value)"
                    @blur="finishAliasEdit(conn.id)"
                    @keydown.enter.prevent="finishAliasEdit(conn.id)"
                    @keydown.escape.prevent="cancelAliasEdit(conn.id)"
                  />

                  <!-- Database Selector (for connections with multiple databases) -->
                  <select
                    v-if="conn.databasesInfo && conn.databasesInfo.length > 1"
                    :value="getDatabase(conn.id)"
                    class="text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    :class="props.compact ? 'h-7 px-2 rounded-full' : 'px-2 py-1 rounded'"
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
            </div>
          </div>
        </template>

        <!-- Empty State -->
        <div v-else class="py-6 text-center text-gray-500 dark:text-gray-400">
          <Database class="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p class="text-sm">No connections found</p>
          <p class="text-xs mt-1">
            Add PostgreSQL, MySQL, or file connections to use multi-source queries.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronDown, Cloud, Database, Folder, Plus } from 'lucide-vue-next'
import { useConnectionsStore } from '@/stores/connections'
import type { Connection } from '@/types/connections'
import type { ConnectionMapping } from '@/api/federated'
import { generateTypeBasedAlias } from '@/utils/federatedUtils'
import {
  getConnectionKindFromSpec,
  getConnectionTypeLabel,
  isDatabaseKind,
  isFileBasedKind
} from '@/types/specs'

// Props
interface Props {
  modelValue: ConnectionMapping[]
  /** Show file connections (Files, S3, GCS) in addition to database connections */
  showFileConnections?: boolean
  /** Whether the panel is collapsed initially */
  defaultCollapsed?: boolean
  /** Render dense rows and compact spacing */
  compact?: boolean
  /** Show helper banners inside the panel */
  showHints?: boolean
  /** Show collapsible header */
  showHeader?: boolean
  /** Show a shortcut to the New Connection flow */
  showCreateConnectionLink?: boolean
  /** Route to the New Connection flow */
  createConnectionTo?: string
}

const props = withDefaults(defineProps<Props>(), {
  showFileConnections: false,
  defaultCollapsed: false,
  compact: false,
  showHints: true,
  showHeader: true,
  showCreateConnectionLink: false,
  createConnectionTo: '/explorer/add'
})

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: ConnectionMapping[]): void
}>()

// Stores
const connectionsStore = useConnectionsStore()

// Local State
const isCollapsed = ref(props.showHeader ? props.defaultCollapsed : false)
const isContentVisible = computed(() => (props.showHeader ? !isCollapsed.value : true))
const isHintsExpanded = ref(false)
const editingAliasConnectionId = ref<string | null>(null)
const aliasDraftByConnectionId = ref<Record<string, string>>({})
const aliasInputByConnectionId = ref<Record<string, HTMLInputElement | null>>({})

function isDatabaseConnection(conn: Connection): boolean {
  const kind = getConnectionKindFromSpec(conn.spec)
  return isDatabaseKind(kind)
}

function isFileConnectionKind(conn: Connection): boolean {
  const kind = getConnectionKindFromSpec(conn.spec)
  return isFileBasedKind(kind)
}

function getConnectionTypeLabelForUI(conn: Connection): string {
  return getConnectionTypeLabel(conn.spec, conn.type) || ''
}

// Computed
const availableConnections = computed(() => {
  return connectionsStore.connections.filter((conn) => {
    // Always include database connections
    if (isDatabaseConnection(conn)) {
      return true
    }
    // Include file connections only if showFileConnections is true
    if (props.showFileConnections && isFileConnectionKind(conn)) {
      return true
    }
    return false
  })
})

// Check if multiple S3 connections are selected (show info about multi-S3 queries)
const hasMultipleS3Connections = computed(() => {
  const s3ConnectionCount = props.modelValue.filter((m) => {
    const conn = connectionsStore.connections.find((c) => c.id === m.connectionId)
    const kind = getConnectionKindFromSpec(conn?.spec)
    return kind === 's3'
  }).length
  return s3ConnectionCount > 1
})

const selectedCount = computed(() => props.modelValue.length)
const collapsedCtaTitle = computed(() =>
  selectedCount.value > 0 ? 'Expand to add more sources' : 'Expand to select one or more sources'
)

const selectedPreview = computed(() => {
  const previewLimit = 2
  return props.modelValue.slice(0, previewLimit).map((m) => {
    const conn = connectionsStore.connectionByID(m.connectionId)
    return {
      connectionId: m.connectionId,
      alias: m.alias,
      name: conn?.name || conn?.host || 'Connection'
    }
  })
})

const selectedOverflowCount = computed(() => Math.max(0, props.modelValue.length - 2))

const connectionGroups = computed(() => {
  const groups: Array<{
    key: 'databases' | 'files'
    label: string
    items: Connection[]
    showCreateLink: boolean
  }> = []

  const databaseItems = availableConnections.value.filter((conn) => isDatabaseConnection(conn))
  const fileItems = availableConnections.value.filter((conn) => isFileConnectionKind(conn))

  if (databaseItems.length > 0) {
    groups.push({
      key: 'databases',
      label: 'DATABASES',
      items: databaseItems,
      showCreateLink: false
    })
  }

  if (fileItems.length > 0) {
    groups.push({
      key: 'files',
      label: 'FILES',
      items: fileItems,
      showCreateLink: false
    })
  }

  if (props.showCreateConnectionLink) {
    const firstGroup = groups[0]
    if (firstGroup) {
      firstGroup.showCreateLink = true
    }
  }

  return groups
})

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

function setAliasInputRef(connectionId: string, inputEl: HTMLInputElement | null) {
  if (inputEl) {
    aliasInputByConnectionId.value[connectionId] = inputEl
    return
  }
  delete aliasInputByConnectionId.value[connectionId]
}

function startAliasEdit(connectionId: string) {
  editingAliasConnectionId.value = connectionId
  aliasDraftByConnectionId.value[connectionId] = getAlias(connectionId)

  nextTick(() => {
    const aliasInput = aliasInputByConnectionId.value[connectionId]
    aliasInput?.focus()
    aliasInput?.select()
  })
}

function setAliasDraft(connectionId: string, alias: string) {
  aliasDraftByConnectionId.value[connectionId] = alias
}

function finishAliasEdit(connectionId: string) {
  const nextAlias = aliasDraftByConnectionId.value[connectionId] ?? getAlias(connectionId)
  updateAlias(connectionId, nextAlias)
  editingAliasConnectionId.value = null
  delete aliasDraftByConnectionId.value[connectionId]
}

function cancelAliasEdit(connectionId: string) {
  editingAliasConnectionId.value = null
  delete aliasDraftByConnectionId.value[connectionId]
}

function getDatabase(connectionId: string): string {
  const mapping = props.modelValue.find((m) => m.connectionId === connectionId)
  return mapping?.database || ''
}

function generateAlias(conn: Connection): string {
  const existingAliases = props.modelValue.map((m) => m.alias)
  const typeLabel = getConnectionTypeLabelForUI(conn) || undefined
  return generateTypeBasedAlias(typeLabel, existingAliases)
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
  const kind = getConnectionKindFromSpec(conn.spec)

  // For file connections, show the path/bucket
  if (kind === 'files') {
    return conn.spec?.files?.basePath || 'local files'
  }
  if (kind === 's3') {
    const bucket = conn.spec?.s3?.scope?.bucket
    return bucket ? `s3://${bucket}` : 'S3'
  }
  if (kind === 'gcs') {
    const bucket = conn.spec?.gcs?.scope?.bucket
    return bucket ? `gs://${bucket}` : 'GCS'
  }
  if (kind === 'azure') {
    const container = conn.spec?.azure?.scope?.container
    return container ? `azure://${container}` : 'Azure Blob'
  }

  // For database connections
  if (conn.spec?.database) {
    const { host, port } = conn.spec.database
    if (host) {
      return port ? `${host}:${port}` : host
    }
  }
  return 'localhost'
}

function normalizeHomePath(path: string): string {
  if (!path.startsWith('/home/')) {
    return path
  }

  const segments = path.split('/')
  if (segments.length <= 3) {
    return '~'
  }

  return `~/${segments.slice(3).join('/')}`
}

function getConnectionMeta(conn: Connection): string {
  const kind = getConnectionKindFromSpec(conn.spec)
  const location = getConnectionHost(conn)
  const normalizedLocation = kind === 'files' ? normalizeHomePath(location) : location
  const typeLabel = getConnectionTypeLabelForUI(conn)
  return `${typeLabel} — ${normalizedLocation}`
}

function getPrimaryDatabaseLogoForConnection(conn: Connection): string {
  const typeLabel = getConnectionTypeLabelForUI(conn).toLowerCase()
  if (typeLabel === 'mysql' || typeLabel === 'mariadb') {
    return '/images/db-logos/mysql.svg'
  }
  if (
    typeLabel === 'postgresql' ||
    typeLabel === 'postgres' ||
    typeLabel === 'pg' ||
    typeLabel === 'pgsql'
  ) {
    return '/images/db-logos/postgresql.svg'
  }
  return ''
}

function getConnectionIcon(type: string) {
  const normalized = type?.toLowerCase() || ''
  if (normalized === 'files') {
    return Folder
  }
  if (normalized === 's3' || normalized === 'gcs' || normalized === 'azure') {
    return Cloud
  }
  return Database
}

function getConnectionIconColor(type: string): string {
  const normalized = type?.toLowerCase() || ''
  if (normalized === 'postgresql' || normalized === 'postgres') {
    return 'text-blue-400 dark:text-blue-500'
  }
  if (normalized === 'mysql' || normalized === 'mariadb') {
    return 'text-orange-400 dark:text-orange-500'
  }
  if (normalized === 's3') {
    return 'text-amber-400 dark:text-amber-500'
  }
  if (normalized === 'gcs') {
    return 'text-red-400 dark:text-red-500'
  }
  if (normalized === 'azure') {
    return 'text-sky-400 dark:text-sky-500'
  }
  if (normalized === 'files') {
    return 'text-emerald-400 dark:text-emerald-500'
  }
  return 'text-gray-400 dark:text-gray-500'
}

// Determine if alias input should be shown for a connection
// Show for: databases and S3 connections (which support alias-based routing)
function showAliasForConnection(conn: Connection): boolean {
  const kind = getConnectionKindFromSpec(conn.spec)
  return isDatabaseKind(kind) || kind === 's3'
}

// Load connections if not already loaded
watch(
  () => connectionsStore.connections,
  () => {},
  { immediate: true }
)
</script>

<style scoped>
.alias-inline-display,
.alias-inline-input {
  min-height: 1.25rem;
}

.alias-inline-display {
  border-bottom: 1px solid transparent;
}

.alias-inline-display:hover {
  border-bottom-color: rgb(156 163 175 / 0.75);
}

:global(.dark) .alias-inline-display:hover {
  border-bottom-color: rgb(107 114 128 / 0.9);
}

.alias-inline-display:focus-visible {
  border-bottom-color: rgb(20 184 166 / 0.9);
}
</style>
