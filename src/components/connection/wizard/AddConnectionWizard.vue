<template>
  <WizardLayout
    :steps="wizardSteps"
    :currentStepIndex="currentStepIndex"
    :canProceed="canProceed"
    :isProcessing="isCreatingConnection"
    :isTestingConnection="isTestingConnection"
    :showTestButton="showTestButton"
    @next-step="goToNextStep"
    @previous-step="goToPreviousStep"
    @finish="createConnection"
    @cancel="cancelWizard"
  >
    <!-- Step 1: Database Type Selection -->
    <DatabaseTypeStep
      v-if="currentStepIndex === 0"
      @update:selected-db-type="handleDBTypeUpdate"
      @update:can-proceed="updateCanProceed"
    />

    <!-- Step 2: Connection Details -->
    <ConnectionDetailsStep
      v-else-if="currentStepIndex === 1"
      :connectionType="selectedDBType?.type"
      @update:can-proceed="updateCanProceed"
    />

    <!-- Step 3: Database Selection -->
    <DatabaseSelectionStep
      v-else-if="currentStepIndex === 2"
      :connectionType="selectedDBType?.type || ''"
      @update:can-proceed="updateCanProceed"
    />

    <!-- Step 4: Review -->
    <ReviewStep
      v-else-if="currentStepIndex === 3"
      :testResult="testResult"
      :isEditMode="false"
      @update:can-proceed="updateCanProceed"
    />
  </WizardLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import WizardLayout from './WizardLayout.vue'
import DatabaseTypeStep from './steps/DatabaseTypeStep.vue'
import ConnectionDetailsStep from './steps/ConnectionDetailsStep.vue'
import DatabaseSelectionStep from './steps/DatabaseSelectionStep.vue'
import ReviewStep from './steps/ReviewStep.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import type { DbType } from '@/types/connections'

const router = useRouter()
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

// Wizard state
const currentStepIndex = ref(0)
const selectedDBType = ref<DbType | null>(null)
const canProceed = ref(false)
const testResult = ref<{ success: boolean; message: string } | undefined>(undefined)
const isConnectionCreated = ref(false)
const isCreatingConnectionStep = ref(false)

// Wizard steps configuration
const wizardSteps = [
  {
    name: 'type',
    title: 'Choose Database Type',
    description: 'Select the type of database you want to connect to'
  },
  {
    name: 'details',
    title: 'Connection Details',
    description: 'Enter your database connection parameters'
  },
  {
    name: 'database',
    title: 'Database Selection',
    description: 'Select or create your target database'
  },
  {
    name: 'review',
    title: 'Review & Complete',
    description: 'Review your settings and complete the setup'
  }
]

// Computed properties
const isCreatingConnection = computed(() => connectionsStore.isUpdatingConnection || isCreatingConnectionStep.value)
const isTestingConnection = computed(() => connectionsStore.isTestingConnection)
const showTestButton = computed(() => false) // Disable test button for new connections

// Initialize a new connection when the wizard starts
function initializeNewConnection() {
  isConnectionCreated.value = false
  isCreatingConnectionStep.value = false
  connectionsStore.initializeNewConnection()
}

// Navigation methods
async function goToNextStep() {
  if (currentStepIndex.value < wizardSteps.length - 1) {
    // After connection details step (step 1), create the connection (only once)
    if (currentStepIndex.value === 1 && !isConnectionCreated.value) {
      isCreatingConnectionStep.value = true
      try {
        await createConnectionForDatabaseSelection()
        isConnectionCreated.value = true
      } catch (error: any) {
        // Show error to user
        commonStore.showNotification(
          `Failed to create connection: ${error.message || 'Unknown error'}`, 
          'error'
        )
        return // Don't advance step if connection creation failed
      } finally {
        isCreatingConnectionStep.value = false
      }
    }
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

// Create connection after details step for database selection
async function createConnectionForDatabaseSelection() {
  if (!selectedDBType.value) {
    throw new Error('Database type not selected')
  }
  
  if (!connectionsStore.currentConnection) {
    throw new Error('Connection details not provided')
  }

  await connectionsStore.createConnection()
  
  commonStore.showNotification('Connection created successfully! Now select your database.', 'success')
}

// Final completion - save any changes and navigate
async function createConnection() {
  try {
    // If database was selected, update the connection to save the database selection
    if (connectionsStore.currentConnection?.database) {
      await connectionsStore.updateConnection()
    }
    
    await connectionsStore.refreshConnections()
    
    commonStore.showNotification('Connection setup completed successfully!', 'success')
    // Navigate back to connections list
    router.push('/connections')
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    commonStore.showNotification(errorMessage, 'error')
  }
}

function cancelWizard() {
  // Reset state
  isConnectionCreated.value = false
  isCreatingConnectionStep.value = false
  connectionsStore.currentConnection = null
  // Navigate back to connections list
  router.push('/connections')
}

// Initialize when component mounts
initializeNewConnection()
</script>