<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Create Stream</h1>
            <p class="mt-1 text-sm text-gray-600">
              Configure a new data stream from source to target
            </p>
          </div>
          <button
            type="button"
            class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            @click="cancelWizard"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <WizardLayout
        :steps="wizard.steps"
        :current-step-index="wizard.currentStepIndex.value"
        :can-proceed="wizard.canProceed.value"
        :is-processing="isProcessing"
        @next-step="handleNextStep"
        @previous-step="wizard.previousStep"
        @finish="handleFinish"
        @cancel="cancelWizard"
      >
        <template #default="{ currentStepIndex }">
          <!-- Step 1: Source & Target Selection -->
          <div v-if="currentStepIndex === 0" class="min-h-[400px]">
            <SourceTargetSelectionStep
              :source-connection-id="wizard.selection.value.sourceConnectionId"
              :target-connection-id="wizard.selection.value.targetConnectionId"
              :source-database="wizard.selection.value.sourceDatabase"
              :target-database="wizard.selection.value.targetDatabase"
              :source-schema="wizard.selection.value.sourceSchema"
              :target-schema="wizard.selection.value.targetSchema"
              :target-path="wizard.selection.value.targetPath"
              @update:source-connection="handleSourceUpdate"
              @update:target-connection="handleTargetUpdate"
              @clear-all="handleClearAll"
              @update:can-proceed="updateCanProceed"
            />
          </div>

          <!-- Step 2: Structure & Data -->
          <div v-if="currentStepIndex === 1" class="min-h-[400px]">
            <StructureDataStep
              :create-tables="wizard.createTables.value"
              :create-indexes="wizard.createIndexes.value"
              :create-foreign-keys="wizard.createForeignKeys.value"
              :copy-data="wizard.copyData.value"
              @update:create-tables="wizard.setCreateTables"
              @update:create-indexes="wizard.setCreateIndexes"
              @update:create-foreign-keys="wizard.setCreateForeignKeys"
              @update:copy-data="wizard.setCopyData"
              @update:can-proceed="updateCanProceed"
            />
          </div>

          <!-- Step 3: Stream Configuration -->
          <div v-if="currentStepIndex === 2" class="min-h-[400px]">
            <StreamConfigurationStep
              :source-connection-id="wizard.selection.value.sourceConnectionId"
              :target-connection-id="wizard.selection.value.targetConnectionId"
              :source-database="wizard.selection.value.sourceDatabase"
              :target-database="wizard.selection.value.targetDatabase"
              @update:can-proceed="updateCanProceed"
            />
          </div>
        </template>
      </WizardLayout>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useStreamWizard } from '@/composables/useStreamWizard'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import WizardLayout from '@/components/connection/wizard/WizardLayout.vue'
import SourceTargetSelectionStep from '@/components/stream/wizard/steps/SourceTargetSelectionStep.vue'
import StructureDataStep from '@/components/stream/wizard/steps/StructureDataStep.vue'
import StreamConfigurationStep from '@/components/stream/wizard/steps/StreamConfigurationStep.vue'

const router = useRouter()
const wizard = useStreamWizard()
const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

const isProcessing = ref(false)
const canProceedOverride = ref(true)

// Initialize
onMounted(async () => {
  // Load connections if not already loaded
  if (!connectionsStore.connections.length) {
    await connectionsStore.refreshConnections()
  }

  // Initialize a new stream config
  streamsStore.resetCurrentStream()
})

// Watch for source/target changes and auto-discover tables
watch(
  () => wizard.selection.value.sourceConnectionId,
  async (newSourceId) => {
    if (newSourceId && streamsStore.currentStreamConfig) {
      // Update store with source connection
      streamsStore.updateSource(newSourceId)

      // Auto-discover tables when moving to step 2
      // if (wizard.currentStepIndex.value === 1) {
      //   await autoDiscoverTables()
      // }
    }
  }
)

watch(
  () => wizard.selection.value.targetConnectionId,
  (newTargetId) => {
    if (newTargetId && streamsStore.currentStreamConfig) {
      // Update store with target connection
      streamsStore.updateTarget(newTargetId)
    }
  }
)

// Auto-discover tables when entering step 2
watch(
  () => wizard.currentStepIndex.value,
  async (newIndex, oldIndex) => {
    if (newIndex === 1 && oldIndex === 0) {
      // Entering step 2 from step 1
      // Ensure source is set and trigger table refresh
      if (wizard.selection.value.sourceConnectionId && streamsStore.currentStreamConfig) {
        const sourceId = wizard.selection.value.sourceConnectionId

        // Re-set the source to trigger TableList's watch
        streamsStore.updateSource(sourceId)

        // Wait for next tick to ensure TableList component is rendered
        await nextTick()

        // TableList will automatically call refreshTables() when source changes
        // No need to do anything else - the watch in TableList handles it
      }
    }
  }
)

function handleSourceUpdate(connectionId: string, database?: string, schema?: string) {
  wizard.setSourceConnection(connectionId, database, schema)

  // Also update the connection's database field so TableList can find it
  if (database) {
    const connection = connectionsStore.connectionByID(connectionId)
    if (connection) {
      connection.database = database
    }
  }
}

function handleTargetUpdate(
  connectionId: string,
  database?: string,
  schema?: string,
  path?: string
) {
  wizard.setTargetConnection(connectionId, database, schema, path)

  // Also update the connection's database field if provided
  if (database) {
    const connection = connectionsStore.connectionByID(connectionId)
    if (connection) {
      connection.database = database
    }
  }
}

function handleClearAll() {
  wizard.clearSourceSelection()
  wizard.clearTargetSelection()
}

function updateCanProceed(value: boolean) {
  canProceedOverride.value = value
}

async function handleNextStep() {
  wizard.nextStep()
}

async function handleFinish() {
  if (!wizard.selection.value.sourceConnectionId || !wizard.selection.value.targetConnectionId) {
    commonStore.showNotification('Source and target must be selected', 'error')
    return
  }

  isProcessing.value = true
  try {
    // Ensure source and target are set in the store
    streamsStore.updateSource(wizard.selection.value.sourceConnectionId)
    streamsStore.updateTarget(wizard.selection.value.targetConnectionId)

    // Apply transfer options to the stream config
    if (!streamsStore.currentStreamConfig) {
      throw new Error('Stream configuration not initialized')
    }

    // Set skipData based on the "Copy data" checkbox
    streamsStore.currentStreamConfig.skipData = !wizard.copyData.value

    // Set granular structure creation options
    streamsStore.currentStreamConfig.structureOptions = {
      tables: wizard.createTables.value,
      indexes: wizard.createIndexes.value,
      foreignKeys: wizard.createForeignKeys.value
    }

    // Save the stream
    await streamsStore.saveStream()

    commonStore.showNotification('Stream created successfully!', 'success')

    // Navigate to streams list
    router.push({ name: 'Streams' })
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    commonStore.showNotification(`Failed to create stream: ${errorMessage}`, 'error')
  } finally {
    isProcessing.value = false
  }
}

function cancelWizard() {
  if (confirm('Are you sure you want to cancel? All configuration will be lost.')) {
    wizard.reset()
    streamsStore.resetCurrentStream()
    router.push({ name: 'Streams' })
  }
}
</script>
