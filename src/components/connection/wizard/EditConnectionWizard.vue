<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

    <!-- Connection Details -->
    <div class="space-y-6">
      <ConnectionDetailsStep
        :connectionType="connection?.type"
        :hideTypeDisplay="true"
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
        <div class="flex space-x-3">
          <button
            @click="testConnection"
            :disabled="!canProceed || isTestingConnection"
            type="button"
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isTestingConnection" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Testing...
            </span>
            <span v-else>Test Connection</span>
          </button>
          <button
            @click="updateConnection"
            :disabled="!canProceed || isUpdatingConnection"
            type="button"
            class="inline-flex items-center px-4 py-2 bg-gray-600 border border-transparent text-sm font-medium rounded-md text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isUpdatingConnection" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating...
            </span>
            <span v-else>Update Connection</span>
          </button>
        </div>
      </div>

      <!-- Test Result (only show error messages) -->
      <div v-if="testResult && !testResult.success" class="border border-red-200 rounded-lg p-4 bg-red-50">
        <div class="flex items-center">
          <svg class="h-5 w-5 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <div>
            <p class="font-medium text-red-800">Connection Failed</p>
            <p class="text-sm text-red-700">{{ testResult.message }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ConnectionDetailsStep from './steps/ConnectionDetailsStep.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import type { Connection } from '@/types/connections'

const router = useRouter()
const route = useRoute()
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

// Props for connection ID
interface Props {
  connectionId?: string
}

const props = defineProps<Props>()

// Form state
const canProceed = ref(false)
const testResult = ref<{ success: boolean; message: string } | undefined>(undefined)

// Computed properties
const connection = computed(() => connectionsStore.currentConnection)
const isUpdatingConnection = computed(() => connectionsStore.isUpdatingConnection)
const isTestingConnection = computed(() => connectionsStore.isTestingConnection)

// Get connection ID from props or route params
const connectionId = computed(() => props.connectionId || route.params.id as string)

// Load the connection to edit
async function loadConnectionForEdit() {
  const id = connectionId.value
  if (!id) {
    commonStore.showNotification('No connection ID provided', 'error')
    router.push('/connections')
    return
  }

  try {
    // Try to find connection in existing list first
    let existingConnection = connectionsStore.connectionByID(id)
    
    if (!existingConnection) {
      // If not found, refresh connections and try again
      await connectionsStore.refreshConnections()
      existingConnection = connectionsStore.connectionByID(id)
    }

    if (!existingConnection) {
      throw new Error('Connection not found')
    }

    // Set the current connection for editing
    connectionsStore.setCurrentConnection(id)
    canProceed.value = true // Enable proceed since we have valid connection data
  } catch (error: any) {
    commonStore.showNotification(`Failed to load connection: ${error.message}`, 'error')
    router.push('/connections')
  }
}


// Event handlers
function updateCanProceed(canProceedValue: boolean) {
  canProceed.value = canProceedValue
}

function getDBTypeLogo(type?: string): string {
  if (!type) return '/images/db-logos/default.svg'
  const dbType = connectionsStore.dbTypes.find(db => db.type === type)
  return dbType?.logo || '/images/db-logos/default.svg'
}

async function testConnection() {
  testResult.value = undefined // Clear previous results first
  try {
    await connectionsStore.testConnection()
    testResult.value = {
      success: true,
      message: 'Connection established successfully!'
    }
  } catch (error: any) {
    testResult.value = {
      success: false,
      message: error.message || 'Failed to establish connection'
    }
  }
}

async function updateConnection() {
  try {
    if (!connection.value) {
      throw new Error('No connection data to update')
    }

    await connectionsStore.updateConnection()
    
    commonStore.showNotification('Connection updated successfully', 'success')
    await connectionsStore.refreshConnections()
    
    // Navigate back to connections list
    router.push('/connections')
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    commonStore.showNotification(errorMessage, 'error')
  }
}

function cancelWizard() {
  // Reset current connection to avoid affecting other operations
  connectionsStore.currentConnection = null
  // Navigate back to connections list
  router.push('/connections')
}

// Initialize when component mounts
onMounted(async () => {
  await loadConnectionForEdit()
})
</script>