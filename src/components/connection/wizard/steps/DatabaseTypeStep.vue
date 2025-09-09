<template>
  <div class="space-y-6">
    <!-- Databases Section -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 mb-4 text-center">Databases</h3>
      <div class="flex flex-wrap justify-center gap-4">
        <button
          v-for="dbType in databaseTypes"
          :key="dbType.id"
          @click="selectDBType(dbType)"
          :class="[
            selectedDBType?.id === dbType.id
              ? 'ring-2 ring-gray-600 border-gray-600'
              : 'border-gray-300 hover:border-gray-400',
            'relative p-4 border rounded-lg flex flex-col items-center text-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200'
          ]"
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
      <h3 class="text-lg font-medium text-gray-900 mb-4 text-center">Files</h3>
      <div class="flex justify-center">
        <button
          v-for="dbType in localFileTypes"
          :key="dbType.id"
          @click="selectDBType(dbType)"
          :class="[
            selectedDBType?.id === dbType.id
              ? 'ring-2 ring-gray-600 border-gray-600'
              : 'border-gray-300 hover:border-gray-400',
            'relative p-6 border rounded-lg flex flex-col items-center text-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 min-w-[200px]'
          ]"
        >
          <img
            :src="dbType.logo"
            :alt="dbType.type + ' logo'"
            class="h-16 w-16 object-contain mb-4"
          />
          <span class="text-base font-medium text-gray-900">{{ dbType.type }}</span>
          
          <!-- Subtext for Local Files -->
          <div class="text-xs text-gray-500 mt-2 leading-tight text-center max-w-[180px]">
            Supports CSV, JSON, JSONL, Parquet (mixed formats allowed)
          </div>
          
          <!-- Selection indicator -->
          <div
            v-if="selectedDBType?.id === dbType.id"
            class="absolute top-3 right-3 w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center"
          >
            <CheckIcon class="w-3 h-3 text-white" />
          </div>
        </button>
      </div>
    </div>

    <!-- Connection String Toggle -->
    <div class="text-center">
      <button
        @click="toggleConnectionString"
        class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ChevronDownIcon v-if="!showConnectionString" class="h-4 w-4" />
        <ChevronUpIcon v-else class="h-4 w-4" />
        Use connection string instead
      </button>
    </div>

    <!-- Connection String Input -->
    <div v-if="showConnectionString" class="border-t border-gray-200 pt-6">
      <ConnectionStringInput
        :connectionType="selectedDBType?.type"
        @update:connection-params="updateConnectionParams"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/outline'
import ConnectionStringInput from '../../ConnectionStringInput.vue'
import { useConnectionsStore } from '@/stores/connections'
import type { DbType, Connection } from '@/types/connections'

interface Props {
  initialSelectedType?: string
}

const props = defineProps<Props>()

const connectionsStore = useConnectionsStore()

const selectedDBType = ref<DbType | null>(null)
const showConnectionString = ref(false)

// Get database types from store, separated by category
const databaseTypes = computed(() => 
  connectionsStore.dbTypes.filter(dbType => 
    dbType.type !== 'All' && dbType.type !== 'Files'
  )
)

const localFileTypes = computed(() => 
  connectionsStore.dbTypes.filter(dbType => dbType.type === 'Files')
)

const emit = defineEmits<{
  'update:selected-db-type': [dbType: DbType | null]
  'update:can-proceed': [canProceed: boolean]
}>()

function selectDBType(dbType: DbType) {
  selectedDBType.value = dbType
  // Keep connection string section expanded if user had opened it
  emit('update:selected-db-type', dbType)
  updateCanProceed()
}

function updateCanProceed() {
  const canProceed = !!selectedDBType.value
  emit('update:can-proceed', canProceed)
}

function toggleConnectionString() {
  showConnectionString.value = !showConnectionString.value
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
    const dbType = connectionsStore.dbTypes.find(db => db.type === props.initialSelectedType)
    if (dbType) {
      selectedDBType.value = dbType
      emit('update:selected-db-type', dbType)
    }
  }
  updateCanProceed()
})
</script>