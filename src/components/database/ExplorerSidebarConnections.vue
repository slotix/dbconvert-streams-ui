<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
    ChevronRightIcon,
    ChevronDownIcon,
    TableCellsIcon,
    ViewfinderCircleIcon,
    ArrowPathIcon,
    CubeIcon
} from '@heroicons/vue/24/outline'
import { useConnectionsStore } from '@/stores/connections'
import connectionsApi from '@/api/connections'
import type { Connection } from '@/types/connections'
import type { DatabaseMetadata, SQLTableMeta, SQLViewMeta } from '@/types/metadata'

type ObjectType = 'table' | 'view'

const props = defineProps<{
    initialExpandedConnectionId?: string
    selected?: {
        database?: string
        schema?: string
        type?: ObjectType | null
        name?: string | null
    }
}>()

const emit = defineEmits<{
    (
        e: 'open',
        payload: {
            connectionId: string
            database: string
            schema?: string
            type: ObjectType
            name: string
            meta: SQLTableMeta | SQLViewMeta
            mode: 'preview' | 'pinned'
        }
    ): void
    (e: 'expanded-connection', payload: { connectionId: string }): void
}>()

const connectionsStore = useConnectionsStore()
const isLoadingConnections = ref(false)
const loadError = ref<string | null>(null)
const expandedConnections = ref(new Set<string>())
const expandedDatabases = ref(new Set<string>())
const expandedSchemas = ref(new Set<string>())

// per-connection database list and metadata caches
const databasesByConn = ref<Record<string, Array<{ name: string }>>>({})
const metadataByConnDb = ref<Record<string, Record<string, DatabaseMetadata>>>({})

const searchQuery = ref('')

async function loadConnections() {
    isLoadingConnections.value = true
    loadError.value = null
    try {
        await connectionsStore.refreshConnections()
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load connections'
        loadError.value = msg
    } finally {
        isLoadingConnections.value = false
    }
}

async function ensureDatabases(connectionId: string) {
    if (databasesByConn.value[connectionId]) return
    try {
        const dbs = await connectionsApi.getDatabases(connectionId)
        databasesByConn.value[connectionId] = dbs.map((d) => ({ name: d.name }))
    } catch {
        // store empty to avoid loops; UI will show empty state
        databasesByConn.value[connectionId] = []
    }
}

async function ensureMetadata(connectionId: string, db: string) {
    if (!metadataByConnDb.value[connectionId]) metadataByConnDb.value[connectionId] = {}
    if (metadataByConnDb.value[connectionId][db]) return
    try {
        const meta = await connectionsApi.getMetadata(connectionId, db)
        metadataByConnDb.value[connectionId][db] = meta
    } catch {
        // leave undefined; UI can handle missing meta
    }
}

function toggleConnection(connId: string) {
    if (expandedConnections.value.has(connId)) {
        expandedConnections.value.delete(connId)
    } else {
        expandedConnections.value.add(connId)
        ensureDatabases(connId).catch(() => { })
        emit('expanded-connection', { connectionId: connId })
    }
}

function toggleDb(connId: string, db: string) {
    const key = `${connId}:${db}`
    if (expandedDatabases.value.has(key)) {
        expandedDatabases.value.delete(key)
    } else {
        expandedDatabases.value.add(key)
        ensureMetadata(connId, db).catch(() => { })
    }
}

function toggleSchema(connId: string, db: string, schema: string) {
    const key = `${connId}:${db}:${schema}`
    if (expandedSchemas.value.has(key)) expandedSchemas.value.delete(key)
    else expandedSchemas.value.add(key)
}

const normalized = (s: string) => s.toLowerCase()

function highlightParts(text: string) {
    const q = searchQuery.value.trim()
    if (!q) return [{ text, match: false }]
    const lower = text.toLowerCase()
    const ql = q.toLowerCase()
    const parts: Array<{ text: string; match: boolean }> = []
    let i = 0
    let idx = lower.indexOf(ql, i)
    while (idx !== -1) {
        if (idx > i) parts.push({ text: text.slice(i, idx), match: false })
        parts.push({ text: text.slice(idx, idx + q.length), match: true })
        i = idx + q.length
        idx = lower.indexOf(ql, i)
    }
    if (i < text.length) parts.push({ text: text.slice(i), match: false })
    return parts
}

function isConnExpanded(connId: string) {
    return expandedConnections.value.has(connId)
}
function isDbExpanded(connId: string, db: string) {
    return expandedDatabases.value.has(`${connId}:${db}`)
}
function isSchemaExpanded(connId: string, db: string, schema: string) {
    return expandedSchemas.value.has(`${connId}:${db}:${schema}`)
}

function onOpen(
    connId: string,
    db: string,
    type: ObjectType,
    name: string,
    mode: 'preview' | 'pinned',
    schema?: string
) {
    const meta = metadataByConnDb.value[connId]?.[db]
    if (!meta) return
    let obj: SQLTableMeta | SQLViewMeta | undefined
    if (type === 'table') obj = Object.values(meta.tables || {}).find((t) => t.name === name)
    else obj = Object.values(meta.views || {}).find((v) => v.name === name)
    if (!obj) return
    emit('open', { connectionId: connId, database: db, schema, type, name, meta: obj, mode })
}

// Build schema list and items for a given connection/database
function getSchemas(
    connId: string,
    db: string
): Array<{ name: string; tables: string[]; views: string[] }> {
    const meta = metadataByConnDb.value[connId]?.[db]
    if (!meta) return []
    const buckets = new Map<string, { tables: string[]; views: string[] }>()
    Object.values(meta.tables || {}).forEach((t) => {
        const s = t.schema || ''
        if (!buckets.has(s)) buckets.set(s, { tables: [], views: [] })
        buckets.get(s)!.tables.push(t.name)
    })
    Object.values(meta.views || {}).forEach((v) => {
        const s = v.schema || ''
        if (!buckets.has(s)) buckets.set(s, { tables: [], views: [] })
        buckets.get(s)!.views.push(v.name)
    })
    const arr = Array.from(buckets.entries()).map(([name, bucket]) => ({
        name,
        tables: bucket.tables.sort((a, b) => a.localeCompare(b)),
        views: bucket.views.sort((a, b) => a.localeCompare(b))
    }))
    // Filter out MySQL default/system schemas
    const mysqlSystemSchemas = new Set(['information_schema', 'mysql', 'performance_schema', 'sys'])
    const filtered = isMySQL(connId)
        ? arr.filter((s) => !mysqlSystemSchemas.has((s.name || '').toLowerCase()))
        : arr
    return filtered.sort((a, b) => {
        const an = a.name
        const bn = b.name
        if (!an) return -1
        if (!bn) return 1
        if (an === 'public') return -1
        if (bn === 'public') return 1
        return an.localeCompare(bn)
    })
}

onMounted(async () => {
    await loadConnections()
    if (props.initialExpandedConnectionId) {
        expandedConnections.value.add(props.initialExpandedConnectionId)
        ensureDatabases(props.initialExpandedConnectionId).catch(() => { })
    }
})

// auto-expand selection path if provided
watch(
    () => props.selected,
    async (sel) => {
        if (!sel) return
        const connId = props.initialExpandedConnectionId
        if (!connId) return
        expandedConnections.value.add(connId)
        await ensureDatabases(connId)
    },
    { immediate: false }
)

const filteredConnections = computed<Connection[]>(() => {
    const q = normalized(searchQuery.value.trim())
    if (!q) return connectionsStore.connections
    return connectionsStore.connections.filter((c) => {
        const label = `${c.name || ''} ${c.host || ''} ${c.type || ''}`
        return normalized(label).includes(q)
    })
})

function getDbLogoForType(dbType?: string): string {
    const t = (dbType || '').toString().toLowerCase()
    const found = connectionsStore.dbTypes.find((d) => d.type.toLowerCase() === t)
    return found?.logo || '/images/db-logos/all.svg'
}

function isMySQL(connId: string): boolean {
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    return (conn?.type || '').toLowerCase() === 'mysql'
}

function isPostgres(connId: string): boolean {
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    return (conn?.type || '').toLowerCase() === 'postgresql'
}

function isSnowflake(connId: string): boolean {
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    return (conn?.type || '').toLowerCase() === 'snowflake'
}

function hasSchemas(connId: string): boolean {
    // Show schemas for PostgreSQL and Snowflake; hide for others
    return isPostgres(connId) || isSnowflake(connId)
}

function getFlatTables(connId: string, db: string): string[] {
    const meta = metadataByConnDb.value[connId]?.[db]
    if (!meta) return []
    return Object.values(meta.tables || {})
        .map((t) => t.name)
        .sort((a, b) => a.localeCompare(b))
}

function getFlatViews(connId: string, db: string): string[] {
    const meta = metadataByConnDb.value[connId]?.[db]
    if (!meta) return []
    return Object.values(meta.views || {})
        .map((v) => v.name)
        .sort((a, b) => a.localeCompare(b))
}
</script>

<template>
    <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg divide-y divide-gray-200 overflow-hidden">
        <div class="px-3 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900">Connections</h3>
            <div class="flex items-center gap-2 w-full md:w-auto min-w-0">
                <input v-model="searchQuery"
                    class="px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-400 w-full md:w-40 lg:w-48 xl:w-56 min-w-0"
                    placeholder="Filter..." type="text" />
                <button
                    class="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 whitespace-nowrap"
                    :disabled="isLoadingConnections" @click="loadConnections">
                    <ArrowPathIcon :class="['h-4 w-4', isLoadingConnections ? 'animate-spin' : '']" />
                    Refresh
                </button>
            </div>
        </div>

        <div class="p-2">
            <div v-if="isLoadingConnections" class="text-center py-6 text-gray-500">
                <ArrowPathIcon class="h-6 w-6 animate-spin inline-block" />
            </div>
            <div v-else-if="loadError" class="text-center py-6 text-red-600">{{ loadError }}</div>
            <div v-else>
                <div v-if="!filteredConnections.length" class="text-center py-6 text-gray-500">
                    <CubeIcon class="h-6 w-6 inline-block mr-2" /> No connections
                </div>
                <div v-else class="space-y-1">
                    <div v-for="conn in filteredConnections" :key="conn.id">
                        <div class="flex items-center px-2 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer"
                            @click="toggleConnection(conn.id)">
                            <component :is="isConnExpanded(conn.id) ? ChevronDownIcon : ChevronRightIcon"
                                class="h-4 w-4 text-gray-400 mr-1.5" />
                            <img :src="getDbLogoForType(conn.type)" :alt="conn.type || 'db'"
                                class="h-5 w-5 mr-1.5 object-contain" />
                            <span class="font-medium">
                                <template v-for="(p, i) in highlightParts(conn.name || conn.host || 'Connection')"
                                    :key="i">
                                    <span v-if="p.match" class="bg-yellow-200/60 rounded px-0.5" v-text="p.text"></span>
                                    <span v-else v-text="p.text"></span>
                                </template>
                            </span>
                            <span v-if="conn.host && conn.port" class="ml-2 text-xs text-gray-500">
                                {{ conn.host }}:{{ conn.port }}
                            </span>
                        </div>

                        <!-- Databases under connection -->
                        <div v-if="isConnExpanded(conn.id)" class="ml-4 border-l border-gray-200 pl-2 space-y-1">
                            <div v-if="!databasesByConn[conn.id]?.length" class="text-xs text-gray-500 px-2 py-1">
                                No databases
                            </div>
                            <div v-for="db in databasesByConn[conn.id] || []" :key="db.name">
                                <div class="flex items-center px-2 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer"
                                    @click="toggleDb(conn.id, db.name)">
                                    <component :is="isDbExpanded(conn.id, db.name) ? ChevronDownIcon : ChevronRightIcon"
                                        class="h-4 w-4 text-gray-400 mr-1.5" />
                                    <span class="font-medium">
                                        <template v-for="(p, i) in highlightParts(db.name)" :key="i">
                                            <span v-if="p.match" class="bg-yellow-200/60 rounded px-0.5"
                                                v-text="p.text"></span>
                                            <span v-else v-text="p.text"></span>
                                        </template>
                                    </span>
                                </div>

                                <div v-if="isDbExpanded(conn.id, db.name)"
                                    class="ml-4 border-l border-gray-200 pl-2 space-y-1">
                                    <template v-if="metadataByConnDb[conn.id]?.[db.name]">
                                        <!-- Show schemas only for PostgreSQL -->
                                        <template v-if="hasSchemas(conn.id)">
                                            <template v-for="schema in getSchemas(conn.id, db.name)"
                                                :key="schema.name || 'default'">
                                                <div class="flex items-center px-2 py-1 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer"
                                                    @click="toggleSchema(conn.id, db.name, schema.name)">
                                                    <component :is="isSchemaExpanded(conn.id, db.name, schema.name)
                                                            ? ChevronDownIcon
                                                            : ChevronRightIcon
                                                        " class="h-4 w-4 text-gray-400 mr-1.5" />
                                                    <span class="font-medium">{{ schema.name || 'default' }}</span>
                                                </div>
                                                <div v-if="isSchemaExpanded(conn.id, db.name, schema.name)"
                                                    class="ml-4 border-l border-gray-200 pl-2">
                                                    <div
                                                        class="text-xs uppercase tracking-wide text-gray-400 px-2 mt-1 flex items-center justify-between">
                                                        <span>Tables</span>
                                                        <span class="text-[11px] font-medium text-gray-500 normal-case">
                                                            {{ schema.tables.length }}
                                                        </span>
                                                    </div>
                                                    <div v-for="t in schema.tables" :key="t"
                                                        class="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer"
                                                        @click.stop="
                                                            onOpen(conn.id, db.name, 'table', t, 'preview', schema.name)
                                                            " @dblclick.stop="
                                onOpen(conn.id, db.name, 'table', t, 'pinned', schema.name)
                                ">
                                                        <TableCellsIcon class="h-4 w-4 mr-1.5 text-gray-400" />
                                                        <span>{{ t }}</span>
                                                    </div>
                                                    <div
                                                        class="text-xs uppercase tracking-wide text-gray-400 px-2 mt-2 flex items-center justify-between">
                                                        <span>Views</span>
                                                        <span class="text-[11px] font-medium text-gray-500 normal-case">
                                                            {{ schema.views.length }}
                                                        </span>
                                                    </div>
                                                    <div v-for="v in schema.views" :key="v"
                                                        class="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer"
                                                        @click.stop="
                                                            onOpen(conn.id, db.name, 'view', v, 'preview', schema.name)
                                                            " @dblclick.stop="
                                onOpen(conn.id, db.name, 'view', v, 'pinned', schema.name)
                                ">
                                                        <ViewfinderCircleIcon class="h-4 w-4 mr-1.5 text-gray-400" />
                                                        <span>{{ v }}</span>
                                                    </div>
                                                </div>
                                            </template>
                                        </template>
                                        <!-- Flat lists for DBs without schemas (e.g., MySQL) -->
                                        <template v-else>
                                            <div
                                                class="text-xs uppercase tracking-wide text-gray-400 px-2 mt-1 flex items-center justify-between">
                                                <span>Tables</span>
                                                <span class="text-[11px] font-medium text-gray-500 normal-case">
                                                    {{ getFlatTables(conn.id, db.name).length }}
                                                </span>
                                            </div>
                                            <div v-for="t in getFlatTables(conn.id, db.name)" :key="t"
                                                class="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer"
                                                @click.stop="onOpen(conn.id, db.name, 'table', t, 'preview')"
                                                @dblclick.stop="onOpen(conn.id, db.name, 'table', t, 'pinned')">
                                                <TableCellsIcon class="h-4 w-4 mr-1.5 text-gray-400" />
                                                <span>{{ t }}</span>
                                            </div>
                                            <div
                                                class="text-xs uppercase tracking-wide text-gray-400 px-2 mt-2 flex items-center justify-between">
                                                <span>Views</span>
                                                <span class="text-[11px] font-medium text-gray-500 normal-case">
                                                    {{ getFlatViews(conn.id, db.name).length }}
                                                </span>
                                            </div>
                                            <div v-for="v in getFlatViews(conn.id, db.name)" :key="v"
                                                class="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer"
                                                @click.stop="onOpen(conn.id, db.name, 'view', v, 'preview')"
                                                @dblclick.stop="onOpen(conn.id, db.name, 'view', v, 'pinned')">
                                                <ViewfinderCircleIcon class="h-4 w-4 mr-1.5 text-gray-400" />
                                                <span>{{ v }}</span>
                                            </div>
                                        </template>
                                    </template>
                                    <div v-else class="text-xs text-gray-500 px-2 py-1">Loading metadata…</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
