<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
    ChevronRightIcon,
    ChevronDownIcon,
    TableCellsIcon,
    ViewfinderCircleIcon,
    ArrowPathIcon,
    CubeIcon
} from '@heroicons/vue/24/outline'
import connections from '@/api/connections'
import type { DatabaseInfo } from '@/types/connections'
import type { DatabaseMetadata, SQLTableMeta, SQLViewMeta } from '@/types/metadata'

type ObjectType = 'table' | 'view'

interface Selection {
    database?: string
    schema?: string
    type?: ObjectType | null
    name?: string | null
}

const props = defineProps<{
    connectionId: string
    selected?: Selection
}>()

const emit = defineEmits<{
    (
        e: 'select',
        payload: {
            database: string
            schema?: string
            type: ObjectType
            name: string
            meta: SQLTableMeta | SQLViewMeta
        }
    ): void
}>()

const databases = ref<DatabaseInfo[]>([])
const isLoading = ref(false)
const error = ref<string>()
const expandedDatabases = ref(new Set<string>())
const expandedSchemas = ref(new Set<string>())
const metadataByDb = ref<Record<string, DatabaseMetadata>>({})

function schemaIcon(db: string, schema: string) {
    return isSchemaExpanded(db, schema) ? ChevronDownIcon : ChevronRightIcon
}

function shouldShowSchemaBlock(db: string, schema: string | undefined, hasSchemas: boolean) {
    return !hasSchemas || isSchemaExpanded(db, schema || '') || !schema
}

async function loadDatabases() {
    isLoading.value = true
    error.value = undefined
    try {
        databases.value = await connections.getDatabases(props.connectionId)
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load databases'
    } finally {
        isLoading.value = false
    }
}

async function ensureDbMetadata(db: string) {
    if (metadataByDb.value[db]) return
    const meta = await connections.getMetadata(props.connectionId, db)
    metadataByDb.value[db] = meta
}

function toggleDb(db: string) {
    if (expandedDatabases.value.has(db)) {
        expandedDatabases.value.delete(db)
    } else {
        expandedDatabases.value.add(db)
        ensureDbMetadata(db).catch(() => { })
    }
}

function toggleSchema(key: string) {
    if (expandedSchemas.value.has(key)) {
        expandedSchemas.value.delete(key)
    } else {
        expandedSchemas.value.add(key)
    }
}

const tree = computed(() => {
    const items = databases.value.map((db) => {
        const dbName = db.name
        const meta = metadataByDb.value[dbName]
        if (!meta) {
            return {
                name: dbName,
                schemas: [] as Array<{ name: string; tables: string[]; views: string[] }>
            }
        }

        const schemaBuckets = new Map<string, { tables: string[]; views: string[] }>()

        Object.values(meta.tables || {}).forEach((t) => {
            const s = t.schema || ''
            if (!schemaBuckets.has(s)) schemaBuckets.set(s, { tables: [], views: [] })
            schemaBuckets.get(s)!.tables.push(t.name)
        })

        Object.values(meta.views || {}).forEach((v) => {
            const s = v.schema || ''
            if (!schemaBuckets.has(s)) schemaBuckets.set(s, { tables: [], views: [] })
            schemaBuckets.get(s)!.views.push(v.name)
        })

        const schemas = Array.from(schemaBuckets.entries())
            .sort((a, b) => {
                const an = a[0]
                const bn = b[0]
                if (!an) return -1
                if (!bn) return 1
                if (an === 'public') return -1
                if (bn === 'public') return 1
                return an.localeCompare(bn)
            })
            .map(([name, bucket]) => ({
                name,
                tables: bucket.tables.sort((x, y) => x.localeCompare(y)),
                views: bucket.views.sort((x, y) => x.localeCompare(y))
            }))

        return { name: dbName, schemas }
    })
    return items
})

function isDbExpanded(db: string) {
    return expandedDatabases.value.has(db)
}

function isSchemaExpanded(db: string, schema: string) {
    return expandedSchemas.value.has(`${db}:${schema}`)
}

function onSelect(db: string, type: ObjectType, name: string, schema?: string) {
    const meta = metadataByDb.value[db]
    if (!meta) return
    let obj: SQLTableMeta | SQLViewMeta | undefined
    if (type === 'table') {
        obj = Object.values(meta.tables).find((t) => t.name === name)
    } else {
        obj = Object.values(meta.views).find((v) => v.name === name)
    }
    if (!obj) return
    emit('select', { database: db, schema, type, name, meta: obj })
}

// Auto-load on mount
loadDatabases()

// Try to auto-expand when selection points to a database
watch(
    () => props.selected?.database,
    async (db) => {
        if (!db) return
        expandedDatabases.value.add(db)
        try {
            await ensureDbMetadata(db)
        } catch {
            // ignore
        }
        if (props.selected?.schema) {
            expandedSchemas.value.add(`${db}:${props.selected.schema}`)
        }
    },
    { immediate: true }
)
</script>

<template>
    <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg divide-y divide-gray-200">
        <div class="px-4 py-3 flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900">Databases</h3>
            <button
                class="inline-flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                :disabled="isLoading" @click="loadDatabases">
                <ArrowPathIcon :class="['h-4 w-4', isLoading ? 'animate-spin' : '']" />
                Refresh
            </button>
        </div>

        <div class="p-2">
            <div v-if="isLoading" class="text-center py-6 text-gray-500">
                <ArrowPathIcon class="h-6 w-6 animate-spin inline-block" />
            </div>
            <div v-else-if="error" class="text-center py-6 text-red-600">{{ error }}</div>
            <div v-else>
                <div v-if="!databases.length" class="text-center py-6 text-gray-500">
                    <CubeIcon class="h-6 w-6 inline-block mr-2" /> No databases
                </div>
                <div v-else class="space-y-1">
                    <div v-for="db in tree" :key="db.name">
                        <div class="flex items-center px-2 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer"
                            @click="toggleDb(db.name)">
                            <component :is="isDbExpanded(db.name) ? ChevronDownIcon : ChevronRightIcon"
                                class="h-4 w-4 text-gray-400 mr-1.5" />
                            <span class="font-medium">{{ db.name }}</span>
                        </div>

                        <div v-if="isDbExpanded(db.name)" class="ml-4 border-l border-gray-200 pl-2 space-y-1">
                            <template v-for="schema in db.schemas.length
                                ? db.schemas
                                : [{ name: '', tables: [], views: [] }]" :key="schema.name || 'default'">
                                <div v-if="db.schemas.length && schema.name"
                                    class="flex items-center px-2 py-1 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer"
                                    @click="toggleSchema(`${db.name}:${schema.name}`)">
                                    <component :is="schemaIcon(db.name, schema.name)"
                                        class="h-4 w-4 text-gray-400 mr-1.5" />
                                    <span class="font-medium">{{ schema.name || 'Default' }}</span>
                                </div>

                                <div v-if="shouldShowSchemaBlock(db.name, schema.name, !!db.schemas.length)"
                                    :class="['space-y-1', schema.name ? 'ml-4 border-l border-gray-200 pl-2' : '']">
                                    <div class="text-xs uppercase tracking-wide text-gray-400 px-2 mt-1">Tables</div>
                                    <div v-for="t in schema.tables" :key="t"
                                        class="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer"
                                        :class="[
                                            props.selected?.database === db.name &&
                                                props.selected?.type === 'table' &&
                                                props.selected?.name === t
                                                ? 'bg-slate-100 text-slate-700'
                                                : 'text-gray-600'
                                        ]" @click.stop="onSelect(db.name, 'table', t, schema.name)">
                                        <TableCellsIcon class="h-4 w-4 mr-1.5 text-gray-400" />
                                        <span>{{ t }}</span>
                                    </div>
                                    <div class="text-xs uppercase tracking-wide text-gray-400 px-2 mt-2">Views</div>
                                    <div v-for="v in schema.views" :key="v"
                                        class="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 cursor-pointer"
                                        :class="[
                                            props.selected?.database === db.name &&
                                                props.selected?.type === 'view' &&
                                                props.selected?.name === v
                                                ? 'bg-slate-100 text-slate-700'
                                                : 'text-gray-600'
                                        ]" @click.stop="onSelect(db.name, 'view', v, schema.name)">
                                        <ViewfinderCircleIcon class="h-4 w-4 mr-1.5 text-gray-400" />
                                        <span>{{ v }}</span>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
