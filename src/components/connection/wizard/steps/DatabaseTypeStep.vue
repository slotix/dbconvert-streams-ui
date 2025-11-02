<template>
  <div class="space-y-6">
    <!-- Databases Section -->
    <div>
      <h3 class="text-lg font-semibold text-gray-900 mb-4 text-center">Databases</h3>
      <div class="flex flex-wrap justify-center gap-4">
        <button
          v-for="dbType in databaseTypes"
          :key="dbType.id"
          :class="[
            selectedDBType?.id === dbType.id
              ? 'ring-2 ring-teal-500 border-teal-500 bg-linear-to-br from-blue-50 to-teal-50 shadow-md'
              : 'border-gray-200 hover:border-blue-300 hover:shadow-md',
            'relative p-4 border rounded-xl flex flex-col items-center text-center hover:bg-linear-to-r hover:from-blue-50/50 hover:to-teal-50/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:scale-[1.02]'
          ]"
          @click="selectDBType(dbType)"
        >
          <img
            :src="dbType.logo"
            :alt="dbType.type + ' logo'"
            class="h-12 w-12 object-contain mb-3"
          />
          <span class="text-sm font-medium text-gray-900">{{ dbType.type }}</span>

          <!-- Selection indicator -->
          <div
            v-if="selectedDBType?.id === dbType.id"
            class="absolute top-2 right-2 w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center shadow-sm"
          >
            <CheckIcon class="w-3 h-3 text-white" />
          </div>
        </button>
      </div>
    </div>

    <!-- Divider -->
    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-gray-300" />
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="px-2 bg-white text-gray-500">or</span>
      </div>
    </div>

    <!-- Files Section -->
    <div>
      <h3 class="text-lg font-semibold text-gray-900 mb-6 text-center">Files</h3>

      <!-- File Connection Button and Info Side by Side -->
      <div class="flex justify-center items-start gap-6 max-w-4xl mx-auto">
        <!-- File Connection Button -->
        <div class="shrink-0">
          <button
            v-for="dbType in localFileTypes"
            :key="dbType.id"
            :class="[
              selectedDBType?.id === dbType.id
                ? 'ring-2 ring-teal-500 border-teal-500 bg-linear-to-br from-blue-50 to-teal-50 shadow-md'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-md',
              'relative p-6 border rounded-xl flex flex-col items-center text-center hover:bg-linear-to-r hover:from-blue-50/50 hover:to-teal-50/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 min-w-[160px] hover:scale-[1.02]'
            ]"
            @click="selectDBType(dbType)"
          >
            <img
              :src="dbType.logo"
              :alt="dbType.type + ' logo'"
              class="h-12 w-12 object-contain mb-3"
            />
            <span class="text-base font-medium text-gray-900">{{ dbType.type }}</span>
            <div class="text-xs text-gray-500 mt-1">Local file formats</div>

            <!-- Selection indicator -->
            <div
              v-if="selectedDBType?.id === dbType.id"
              class="absolute top-3 right-3 w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center shadow-sm"
            >
              <CheckIcon class="w-3 h-3 text-white" />
            </div>
          </button>
        </div>

        <!-- Supported Formats Info -->
        <div
          class="flex-1 max-w-xs bg-linear-to-br from-slate-50 to-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm"
        >
          <h4 class="text-sm font-semibold text-gray-900 mb-3">Supported Formats</h4>

          <!-- Format badges -->
          <div class="flex flex-wrap gap-2 mb-3">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 shadow-sm"
            >
              CSV
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 shadow-sm"
            >
              JSON
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 shadow-sm"
            >
              JSONL
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 shadow-sm"
            >
              Parquet
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 shadow-sm"
            >
              .gz
            </span>
          </div>

          <!-- Additional info -->
          <div class="text-xs text-gray-700 space-y-1">
            <div>✓ Compressed files (.gz) supported</div>
            <div>✓ Mixed formats in same folder allowed</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-gray-300" />
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="px-2 bg-white text-gray-500">or</span>
      </div>
    </div>

    <!-- Connection String Section -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 mb-4 text-center">Connection String</h3>
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
import { CheckIcon } from '@heroicons/vue/24/outline'
import ConnectionStringInput from '../../ConnectionStringInput.vue'
import { useConnectionsStore } from '@/stores/connections'
import type { DbType, Connection } from '@/types/connections'

interface Props {
  initialSelectedType?: string
}

const props = defineProps<Props>()

const connectionsStore = useConnectionsStore()

const selectedDBType = ref<DbType | null>(null)

// Get database types from store, separated by category
const databaseTypes = computed(() =>
  connectionsStore.dbTypes.filter((dbType) => dbType.type !== 'All' && dbType.type !== 'Files')
)

const localFileTypes = computed(() =>
  connectionsStore.dbTypes.filter((dbType) => dbType.type === 'Files')
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
