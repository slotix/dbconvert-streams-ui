<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Database Type Selection -->
    <div v-if="currentStep === 'type'" class="space-y-6">
      <DatabaseTypeStep
        @update:selected-db-type="handleDBTypeUpdate"
        @update:can-proceed="updateCanProceed"
      />

      <!-- Action Buttons -->
      <div class="flex justify-between">
        <BaseButton variant="secondary" @click="cancelWizard"> Cancel </BaseButton>
        <BaseButton variant="primary" :disabled="!canProceed" @click="goToDetails">
          Next →
        </BaseButton>
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
          type="button"
          class="inline-flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-warm-50 dark:hover:bg-gray-700 hover:shadow-md dark:hover:shadow-gray-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
          @click="goBackToType"
        >
          Back
        </button>
        <div class="flex space-x-3">
          <button
            type="button"
            class="inline-flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-warm-50 dark:hover:bg-gray-700 hover:shadow-md dark:hover:shadow-gray-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
            @click="cancelWizard"
          >
            Cancel
          </button>
          <button
            :disabled="!canProceed || isTestingConnection"
            type="button"
            class="inline-flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-linear-to-r hover:from-blue-50 hover:to-teal-50 dark:hover:from-blue-900/20 dark:hover:to-teal-900/20 hover:shadow-md dark:hover:shadow-gray-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            @click="testConnection"
          >
            <span v-if="isTestingConnection" class="flex items-center">
              <svg
                class="animate-spin -ml-1 mr-3 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Testing...
            </span>
            <span v-else>Test Connection</span>
          </button>
          <button
            :disabled="!canProceed || isCreatingConnection"
            type="button"
            class="inline-flex items-center px-4 py-2 bg-teal-600 dark:bg-teal-500 border border-transparent text-sm font-medium rounded-lg text-white hover:bg-teal-700 dark:hover:bg-teal-400 hover:shadow-md dark:hover:shadow-teal-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            @click="createConnection"
          >
            <span v-if="isCreatingConnection" class="flex items-center">
              <svg
                class="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating...
            </span>
            <span v-else>Create Connection</span>
          </button>
        </div>
      </div>

      <!-- Test Result (only show error messages) -->
      <div
        v-if="testResult && !testResult.success"
        class="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20"
      >
        <div class="flex items-center">
          <svg
            class="h-5 w-5 text-red-600 dark:text-red-400 mr-3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
          <div>
            <p class="font-medium text-red-800 dark:text-red-300">Connection Failed</p>
            <p class="text-sm text-red-700 dark:text-red-400">{{ testResult.message }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/base/BaseButton.vue'
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
const testResult = ref<{ success: boolean; message: string } | undefined>(undefined)

// Computed properties
const isCreatingConnection = computed(
  () => connectionsStore.isUpdatingConnection || isCreatingConnectionStep.value
)
const isTestingConnection = computed(() => connectionsStore.isTestingConnection)

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
    const newId = connectionsStore.currentConnection?.id
    await connectionsStore.refreshConnections()

    commonStore.showNotification('Connection created successfully!', 'success')

    // Check if we came from stream wizard
    const streamId = sessionStorage.getItem('streamWizardId')
    if (streamId !== null) {
      // Return to stream wizard
      sessionStorage.removeItem('streamWizardReturnPane')
      sessionStorage.removeItem('streamWizardId')
      if (streamId) {
        router.push(`/streams/edit/${streamId}`)
      } else {
        router.push('/streams/create')
      }
    } else {
      // Navigate back to explorer and focus the new connection
      if (newId) {
        router.push({ path: `/explorer/${newId}`, query: { focus: '1' } })
      } else {
        router.push('/explorer')
      }
    }
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
  router.push('/explorer')
}

// Initialize when component mounts
initializeNewConnection()
</script>
