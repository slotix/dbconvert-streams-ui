<template>
  <div class="space-y-6">
    <!-- Databases Section -->
    <div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
        Databases
      </h3>
      <div class="flex flex-wrap justify-center gap-4">
        <button
          v-for="dbType in databaseTypes"
          :key="dbType.id"
          :class="[
            selectedDBType?.id === dbType.id
              ? 'ring-2 ring-teal-500 dark:ring-teal-400 border-teal-500 dark:border-teal-400 bg-teal-50 dark:bg-teal-900/20'
              : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
            'relative p-4 border rounded-xl flex flex-col items-center text-center bg-white dark:bg-gray-850 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-teal-500 dark:focus:ring-teal-400 transition-all duration-200'
          ]"
          @click="selectDBType(dbType)"
        >
          <img
            :src="dbType.logo"
            :alt="dbType.type + ' logo'"
            class="h-12 w-12 object-contain mb-3 dark:brightness-0 dark:invert dark:opacity-70"
          />
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{
            dbType.type
          }}</span>

          <!-- Selection indicator -->
          <div
            v-if="selectedDBType?.id === dbType.id"
            class="absolute top-2 right-2 w-5 h-5 bg-teal-600 dark:bg-teal-400 rounded-full flex items-center justify-center shadow-sm"
          >
            <Check class="w-3 h-3 text-white dark:text-gray-900" />
          </div>
        </button>
      </div>
    </div>

    <!-- Divider -->
    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-gray-300 dark:border-gray-700" />
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="px-2 bg-white dark:bg-gray-900 text-gray-500">or</span>
      </div>
    </div>

    <!-- Files Section -->
    <div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 text-center">
        Files &amp; Object Storage
      </h3>

      <!-- File Connection Button and Info Side by Side -->
      <div class="flex flex-col lg:flex-row justify-center items-start gap-6 max-w-4xl mx-auto">
        <!-- File Connection Buttons -->
        <div class="flex flex-wrap justify-center gap-4 flex-1">
          <button
            v-for="dbType in fileTypes"
            :key="dbType.id"
            :class="[
              selectedDBType?.id === dbType.id
                ? 'ring-2 ring-teal-500 dark:ring-teal-400 border-teal-500 dark:border-teal-400 bg-teal-50 dark:bg-teal-900/20'
                : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
              'relative p-6 border rounded-xl flex flex-col items-center text-center bg-white dark:bg-gray-850 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-teal-500 dark:focus:ring-teal-400 transition-all duration-200 min-w-[160px]'
            ]"
            @click="selectDBType(dbType)"
          >
            <img
              :src="dbType.logo"
              :alt="dbType.type + ' logo'"
              class="h-12 w-12 object-contain mb-3 dark:brightness-0 dark:invert dark:opacity-70"
            />
            <span class="text-base font-medium text-gray-900 dark:text-gray-100">{{
              dbType.type
            }}</span>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ dbType.description || 'File-based source' }}
            </div>

            <!-- Selection indicator -->
            <div
              v-if="selectedDBType?.id === dbType.id"
              class="absolute top-3 right-3 w-5 h-5 bg-teal-600 dark:bg-teal-400 rounded-full flex items-center justify-center shadow-sm"
            >
              <Check class="w-3 h-3 text-white dark:text-gray-900" />
            </div>
          </button>
        </div>

        <!-- Supported Formats Info -->
        <div
          class="w-full lg:w-auto max-w-xs bg-linear-to-br from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-850 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm dark:shadow-gray-900/30"
        >
          <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Supported Formats
          </h4>

          <!-- Format badges -->
          <div class="flex flex-wrap gap-2 mb-3">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 shadow-sm"
            >
              CSV
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300 shadow-sm"
            >
              JSON
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-300 shadow-sm"
            >
              JSONL
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 shadow-sm"
            >
              Parquet
            </span>

            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300 shadow-sm"
            >
              .zst
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 shadow-sm"
            >
              .gz
            </span>
          </div>

          <!-- Additional info -->
          <div class="text-xs text-gray-700 dark:text-gray-300 space-y-1">
            <div>✓ Compressed files (.zst, .gz) supported</div>
            <div>✓ Mixed formats in same folder allowed</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-gray-300 dark:border-gray-700" />
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="px-2 bg-white dark:bg-gray-900 text-gray-500">or</span>
      </div>
    </div>

    <!-- Connection String Section -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 text-center">
        Connection String
      </h3>
      <div class="max-w-2xl mx-auto">
        <ConnectionStringInput
          :connectionType="selectedDBType?.type"
          @update:connection-params="updateConnectionParams"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Check } from 'lucide-vue-next'
import ConnectionStringInput from '../../ConnectionStringInput.vue'
import { useConnectionsStore } from '@/stores/connections'
import type { DbType, Connection } from '@/types/connections'

interface Props {
  initialSelectedType?: string
}

const props = defineProps<Props>()

const connectionsStore = useConnectionsStore()

const selectedDBType = ref<DbType | null>(null)

const categorizeDbType = (dbType: DbType): 'all' | 'database' | 'file' => {
  if (dbType.category) {
    return dbType.category
  }
  if (dbType.type === 'All') {
    return 'all'
  }
  if (dbType.type.toLowerCase().includes('file')) {
    return 'file'
  }
  return 'database'
}

// Get database types from store, separated by category
const databaseTypes = computed(() =>
  connectionsStore.dbTypes.filter((dbType) => categorizeDbType(dbType) === 'database')
)

const fileTypes = computed(() =>
  connectionsStore.dbTypes.filter((dbType) => categorizeDbType(dbType) === 'file')
)

const emit = defineEmits<{
  'update:selected-db-type': [dbType: DbType | null]
  'update:can-proceed': [canProceed: boolean]
}>()

function selectDBType(dbType: DbType) {
  selectedDBType.value = dbType
  emit('update:selected-db-type', dbType)
  updateCanProceed()
}

function updateCanProceed() {
  const canProceed = !!selectedDBType.value
  emit('update:can-proceed', canProceed)
}

function updateConnectionParams(params: Connection) {
  const dbType = connectionsStore.dbTypes.find((dbType) => dbType.type === params.type)
  if (dbType) {
    selectedDBType.value = dbType
    emit('update:selected-db-type', dbType)
    connectionsStore.ensureSpecForType(dbType.type)
    connectionsStore.updateConnectionParams(params)
    updateCanProceed()
  }
}

// Initialize with the initial selected type if provided
onMounted(() => {
  if (props.initialSelectedType) {
    const dbType = connectionsStore.dbTypes.find((db) => db.type === props.initialSelectedType)
    if (dbType) {
      selectedDBType.value = dbType
      emit('update:selected-db-type', dbType)
    }
  }
  updateCanProceed()
})
</script>
