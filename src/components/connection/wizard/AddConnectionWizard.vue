<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Add New Connection</h1>
      <p class="mt-2 text-sm text-gray-600">Create a new database connection for streaming data</p>
    </div>

    <!-- Database Type Selection -->
    <div v-if="currentStep === 'type'" class="space-y-6">
      <DatabaseTypeStep
        @update:selected-db-type="handleDBTypeUpdate"
        @update:can-proceed="updateCanProceed"
      />
      
      <!-- Action Buttons -->
      <div class="flex justify-between">
        <button
          @click="cancelWizard"
          type="button"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          @click="goToDetails"
          :disabled="!canProceed"
          type="button"
          class="inline-flex items-center px-4 py-2 bg-gray-600 border border-transparent text-sm font-medium rounded-md text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>

    <!-- Connection Details -->
    <div v-else-if="currentStep === 'details'" class="space-y-6">
      <ConnectionDetailsStep
        :connectionType="selectedDBType?.type"
        @update:can-proceed="updateCanProceed"
      />
      
      <!-- Action Buttons -->
      <div class="flex justify-between">
        <button
          @click="goBackToType"
          type="button"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Back
        </button>
        <div class="flex space-x-3">
          <button
            @click="cancelWizard"
            type="button"
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            @click="createConnection"
            :disabled="!canProceed || isCreatingConnection"
            type="button"
            class="inline-flex items-center px-4 py-2 bg-gray-600 border border-transparent text-sm font-medium rounded-md text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isCreatingConnection" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </span>
            <span v-else>Create Connection</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import DatabaseTypeStep from './steps/DatabaseTypeStep.vue'
import ConnectionDetailsStep from './steps/ConnectionDetailsStep.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import type { DbType } from '@/types/connections'

const router = useRouter()
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

// Form state
const currentStep = ref<'type' | 'details'>('type')
const selectedDBType = ref<DbType | null>(null)
const canProceed = ref(false)
const isCreatingConnectionStep = ref(false)

// Computed properties
const isCreatingConnection = computed(() => connectionsStore.isUpdatingConnection || isCreatingConnectionStep.value)

// Initialize a new connection when the form starts
function initializeNewConnection() {
  isCreatingConnectionStep.value = false
  connectionsStore.initializeNewConnection()
}

// Navigation methods
function goToDetails() {
  currentStep.value = 'details'
  canProceed.value = false // Reset for next step
}

function goBackToType() {
  currentStep.value = 'type'
}

// Event handlers
function handleDBTypeUpdate(dbType: DbType | null) {
  selectedDBType.value = dbType
  if (dbType) {
    // Set connection type - defaults will be applied by UnifiedConnectionParams watch
    connectionsStore.setConnectionType(dbType.type)
  }
}

// Connection name update removed - now handled in ConnectionDetailsStep

function updateCanProceed(canProceedValue: boolean) {
  canProceed.value = canProceedValue
}

// Create connection and complete setup
async function createConnection() {
  if (!selectedDBType.value) {
    commonStore.showNotification('Database type not selected', 'error')
    return
  }
  
  if (!connectionsStore.currentConnection) {
    commonStore.showNotification('Connection details not provided', 'error')
    return
  }

  isCreatingConnectionStep.value = true
  try {
    await connectionsStore.createConnection()
    await connectionsStore.refreshConnections()
    
    commonStore.showNotification('Connection created successfully!', 'success')
    // Navigate back to connections list
    router.push('/connections')
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    commonStore.showNotification(`Failed to create connection: ${errorMessage}`, 'error')
  } finally {
    isCreatingConnectionStep.value = false
  }
}

function cancelWizard() {
  // Reset state
  isCreatingConnectionStep.value = false
  connectionsStore.currentConnection = null
  // Navigate back to connections list
  router.push('/connections')
}

// Initialize when component mounts
initializeNewConnection()
</script>