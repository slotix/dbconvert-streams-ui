<template>
  <div class="space-y-6">
    <!-- Databases Section -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 mb-4 text-center">Databases</h3>
      <div class="flex flex-wrap justify-center gap-4">
        <button
          v-for="dbType in databaseTypes"
          :key="dbType.id"
          :class="[
            selectedDBType?.id === dbType.id
              ? 'ring-2 ring-gray-600 border-gray-600'
              : 'border-gray-300 hover:border-gray-400',
            'relative p-4 border rounded-lg flex flex-col items-center text-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200'
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
            class="absolute top-2 right-2 w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center"
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
      <h3 class="text-lg font-medium text-gray-900 mb-6 text-center">Files</h3>

      <!-- File Connection Button and Info Side by Side -->
      <div class="flex justify-center items-start gap-6 max-w-4xl mx-auto">
        <!-- File Connection Button -->
        <div class="flex-shrink-0">
          <button
            v-for="dbType in localFileTypes"
            :key="dbType.id"
            :class="[
              selectedDBType?.id === dbType.id
                ? 'ring-2 ring-gray-600 border-gray-600'
                : 'border-gray-300 hover:border-gray-400',
              'relative p-6 border rounded-lg flex flex-col items-center text-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 min-w-[160px]'
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
              class="absolute top-3 right-3 w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center"
            >
              <CheckIcon class="w-3 h-3 text-white" />
            </div>
          </button>
        </div>

        <!-- Supported Formats Info -->
        <div class="flex-1 max-w-xs bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 class="text-sm font-medium text-gray-900 mb-3">Supported Formats</h4>

          <!-- Format badges -->
          <div class="flex flex-wrap gap-2 mb-3">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              CSV
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
            >
              JSON
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
            >
              JSONL
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
            >
              Parquet
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
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
