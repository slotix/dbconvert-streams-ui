<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import connections from '@/api/connections'
import type { DatabaseSummary, DatabaseMetadata } from '@/types/metadata'

const props = defineProps<{
  connectionId: string
  database: string
}>()

const emit = defineEmits<{
  (e: 'show-diagram', payload: { connectionId: string; database: string }): void
}>()

const isLoading = ref(true)
const error = ref<string | null>(null)
const summary = ref<DatabaseSummary | null>(null)

function toSummaryFromMeta(db: string, meta: DatabaseMetadata): DatabaseSummary {
  const tables = Object.keys(meta.tables || {}).sort((a, b) => a.localeCompare(b))
  const views = Object.keys(meta.views || {}).sort((a, b) => a.localeCompare(b))
  // Try to infer schemas if keys are qualified like schema.name
  const schemasSet = new Set<string>()
  tables.concat(views).forEach((qn) => {
    const dot = qn.indexOf('.')
    if (dot > 0) schemasSet.add(qn.slice(0, dot))
  })
  const schemas = Array.from(schemasSet).sort((a, b) => a.localeCompare(b))
  return {
    database: db,
    schemas: schemas.length ? schemas : undefined,
    tables,
    views,
    stats: {
      tables: tables.length,
      views: views.length,
      schemas: schemas.length || undefined
    }
  }
}

async function load() {
  isLoading.value = true
  error.value = null
  summary.value = null
  try {
    // Prefer lightweight summary from backend
    summary.value = await connections.getDatabaseSummary(props.connectionId, props.database)
  } catch {
    // Fallback to full metadata and derive summary
    try {
      const meta = await connections.getMetadata(props.connectionId, props.database)
      summary.value = toSummaryFromMeta(props.database, meta)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load database overview'
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
watch(() => [props.connectionId, props.database], load)

const sampleTables = computed(() => (summary.value?.tables || []).slice(0, 10))
const sampleViews = computed(() => (summary.value?.views || []).slice(0, 10))
</script>

<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-base font-semibold text-gray-900">Database Overview</h3>
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
    <div v-if="isLoading" class="text-sm text-gray-500 py-8 text-center">Loading overview…</div>
    <div v-else-if="error" class="text-sm text-red-600 py-8 text-center">{{ error }}</div>
    <div v-else-if="summary" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white ring-1 ring-gray-900/5 rounded-lg p-4">
        <div class="text-sm text-gray-500">Tables</div>
        <div class="text-2xl font-semibold">{{ summary.stats.tables }}</div>
        <ul class="mt-2 text-sm text-gray-700 space-y-1">
          <li v-for="t in sampleTables" :key="t" class="truncate" :title="t">{{ t }}</li>
        </ul>
      </div>
      <div class="bg-white ring-1 ring-gray-900/5 rounded-lg p-4">
        <div class="text-sm text-gray-500">Views</div>
        <div class="text-2xl font-semibold">{{ summary.stats.views }}</div>
        <ul class="mt-2 text-sm text-gray-700 space-y-1">
          <li v-for="v in sampleViews" :key="v" class="truncate" :title="v">{{ v }}</li>
        </ul>
      </div>
      <div
        v-if="summary.schemas && summary.stats.schemas"
        class="bg-white ring-1 ring-gray-900/5 rounded-lg p-4"
      >
        <div class="text-sm text-gray-500">Schemas</div>
        <div class="text-2xl font-semibold">{{ summary.stats.schemas }}</div>
        <ul class="mt-2 text-sm text-gray-700 space-y-1">
          <li
            v-for="s in (summary.schemas || []).slice(0, 10)"
            :key="s"
            class="truncate"
            :title="s"
          >
            {{ s }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
