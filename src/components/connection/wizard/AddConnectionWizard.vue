<template>
  <div
    class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-linear-to-br from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 min-h-[calc(100vh-65px)]"
  >
    <!-- Database Type Selection -->
    <div v-if="currentStep === 'type'" class="space-y-6">
      <DatabaseTypeStep
        @update:selected-db-type="handleDBTypeUpdate"
        @update:can-proceed="updateCanProceed"
        @proceed="goToDetails"
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
        <BaseButton variant="secondary" @click="goBackToType">Back</BaseButton>
        <div class="flex space-x-3">
          <BaseButton variant="secondary" @click="cancelWizard">Cancel</BaseButton>
          <BaseButton
            variant="secondary"
            :disabled="!canProceed || isTestingConnection"
            :loading="isTestingConnection"
            @click="testConnection"
          >
            {{ isTestingConnection ? 'Testing...' : 'Test Connection' }}
          </BaseButton>
          <BaseButton
            variant="primary"
            :disabled="!canProceed || isCreatingConnection"
            :loading="isCreatingConnection"
            @click="createConnection"
          >
            Create Connection
          </BaseButton>
        </div>
      </div>

      <!-- Test Result -->
      <div
        v-if="testResult"
        :class="[
          'border rounded-lg p-4',
          testResult.success
            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
            : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
        ]"
      >
        <div class="flex items-center">
          <CheckCircle
            v-if="testResult.success"
            class="h-5 w-5 text-green-600 dark:text-green-400 mr-3"
          />
          <XCircle v-else class="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
          <div>
            <p
              :class="[
                'font-medium',
                testResult.success
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300'
              ]"
            >
              {{ testResult.success ? 'Connection Successful' : 'Connection Failed' }}
            </p>
            <p
              :class="[
                'text-sm',
                testResult.success
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-red-700 dark:text-red-400'
              ]"
            >
              {{ testResult.message }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { CheckCircle, XCircle } from 'lucide-vue-next'
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
    connectionsStore.ensureSpecForType(dbType.type)
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to establish connection'
    testResult.value = {
      success: false,
      message
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
  } catch (error: unknown) {
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

// Keyboard event handler
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (currentStep.value === 'details') {
      goBackToType()
    } else {
      cancelWizard()
    }
  }
}

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  initializeNewConnection()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
