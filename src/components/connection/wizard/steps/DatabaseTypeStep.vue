<template>
  <div class="space-y-6">
    <!-- Connection String Input -->
    <ConnectionStringInput
      v-if="showConnectionString"
      :connectionType="selectedDBType?.type"
      @update:connection-params="updateConnectionParams"
    />

    <!-- Database Type Selection -->
    <div>
      <label class="block text-sm font-medium text-gray-900 mb-4">
        Select Database Type
      </label>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          v-for="dbType in dbTypes"
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

    <!-- Connection name will be handled in the next step -->
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
const showConnectionString = computed(() => !!selectedDBType.value)

// Get database types from store
const dbTypes = computed(() => 
  connectionsStore.dbTypes.filter(dbType => dbType.type !== 'All')
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
    selectDBType(dbType)
    connectionsStore.updateConnectionParams(params)
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