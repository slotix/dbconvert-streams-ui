<template>
  <WizardLayout
    :steps="wizardSteps"
    :currentStepIndex="currentStepIndex"
    :canProceed="canProceed"
    :isProcessing="isUpdatingConnection"
    :isTestingConnection="isTestingConnection"
    :isEditMode="true"
    :showTestButton="showTestButton"
    @next-step="goToNextStep"
    @previous-step="goToPreviousStep"
    @finish="updateConnection"
    @test="testConnection"
    @cancel="cancelWizard"
  >
    <!-- Step 1: Connection Details -->
    <ConnectionDetailsStep
      v-if="currentStepIndex === 0"
      :connectionType="connection?.type"
      @update:can-proceed="updateCanProceed"
    />

    <!-- Step 2: Review (Database Selection step removed) -->
    <ReviewStep
      v-else-if="currentStepIndex === 1"
      :testResult="testResult"
      :isEditMode="true"
      @update:can-proceed="updateCanProceed"
    />
  </WizardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import WizardLayout from './WizardLayout.vue'
import ConnectionDetailsStep from './steps/ConnectionDetailsStep.vue'
import ReviewStep from './steps/ReviewStep.vue'
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

// Wizard state
const currentStepIndex = ref(0)
const canProceed = ref(false)
const testResult = ref<{ success: boolean; message: string } | undefined>(undefined)

// Wizard steps configuration (Database Selection step removed)
const wizardSteps = [
  {
    name: 'details',
    title: 'Connection Details',
    description: 'Modify your database connection parameters'
  },
  {
    name: 'review',
    title: 'Review & Update',
    description: 'Review your changes and update the connection'
  }
]

// Computed properties
const connection = computed(() => connectionsStore.currentConnection)
const isUpdatingConnection = computed(() => connectionsStore.isUpdatingConnection)
const isTestingConnection = computed(() => connectionsStore.isTestingConnection)
const showTestButton = computed(() => !!connection.value)

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

// Navigation methods
function goToNextStep() {
  if (currentStepIndex.value < wizardSteps.length - 1) {
    currentStepIndex.value++
    canProceed.value = false // Reset for next step
  }
}

function goToPreviousStep() {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--
  }
}

// Event handlers
function updateCanProceed(canProceedValue: boolean) {
  canProceed.value = canProceedValue
}

async function testConnection() {
  try {
    testResult.value = undefined
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