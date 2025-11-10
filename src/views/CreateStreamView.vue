<template>
  <div>
    <!-- Header -->
    <header
      class="bg-white dark:bg-gray-850 shadow-sm dark:shadow-gray-900/30 border-b border-gray-100 dark:border-gray-700"
    >
      <div class="max-w-[1600px] mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div class="flex items-center">
          <button
            class="mr-4 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-linear-to-r hover:from-blue-50 hover:to-teal-50 dark:hover:from-blue-900/20 dark:hover:to-teal-900/20 transition-all duration-200"
            @click="goBack"
          >
            <ArrowLeftIcon class="h-5 w-5" />
          </button>
          <div>
            <h1
              class="text-2xl font-bold bg-linear-to-r from-slate-900 to-slate-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent"
            >
              {{ isEditMode ? 'Edit Stream Configuration' : 'New Stream Configuration' }}
            </h1>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{
                isEditMode
                  ? 'Update your stream configuration'
                  : 'Configure a new data stream from source to target'
              }}
            </p>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div
      class="bg-linear-to-br from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 flex flex-col pb-6"
    >
      <div
        class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-6 flex-1 flex flex-col min-h-0 w-full"
      >
        <WizardLayout
          :steps="wizard.steps"
          :current-step-index="wizard.currentStepIndex.value"
          :can-proceed="wizard.canProceed.value"
          :is-processing="isProcessing"
          :is-edit-mode="isEditMode"
          wizard-type="stream"
          @next-step="handleNextStep"
          @previous-step="wizard.previousStep"
          @finish="handleFinish"
          @cancel="cancelWizard"
        >
          <template #default="{ currentStepIndex }">
            <!-- Step 1: Source & Target Selection -->
            <div v-if="currentStepIndex === 0">
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
                @add-connection="(paneType) => goToAddConnection(paneType)"
                @update:can-proceed="updateCanProceed"
              />
            </div>

            <!-- Step 2: Structure & Data -->
            <div v-if="currentStepIndex === 1">
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
            <div v-if="currentStepIndex === 2">
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

      <ConfirmDialog
        v-model:is-open="showExitConfirm"
        title="Leave stream setup?"
        description="Your current configuration will be discarded if you go back."
        confirm-label="Leave"
        cancel-label="Stay"
        :danger="true"
        @confirm="confirmExit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useStreamWizard } from '@/composables/useStreamWizard'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import WizardLayout from '@/components/connection/wizard/WizardLayout.vue'
import SourceTargetSelectionStep from '@/components/stream/wizard/steps/SourceTargetSelectionStep.vue'
import StructureDataStep from '@/components/stream/wizard/steps/StructureDataStep.vue'
import StreamConfigurationStep from '@/components/stream/wizard/steps/StreamConfigurationStep.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

// Props for stream ID (when in edit mode)
interface Props {
  id?: string
}

const props = defineProps<Props>()

const router = useRouter()
const route = useRoute()
const wizard = useStreamWizard()
const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

const isProcessing = ref(false)
const canProceedOverride = ref(true)
const showExitConfirm = ref(false)

// Get stream ID from props or route params
const streamId = computed(() => props.id || (route.params.id as string))
const isEditMode = computed(() => Boolean(streamId.value))

// Initialize
onMounted(async () => {
  // Load connections if not already loaded
  if (!connectionsStore.connections.length) {
    await connectionsStore.refreshConnections()
  } else {
    // Refresh connections in case new ones were added
    await connectionsStore.refreshConnections()
  }

  if (isEditMode.value) {
    // Edit mode: Load existing stream config
    await loadStreamForEdit()
  } else {
    // Create mode: Initialize a new stream config
    streamsStore.resetCurrentStream()
  }

  // Check if returning from Add Connection wizard
  await handleReturnFromAddConnection()
})

// Handle auto-selection when returning from Add Connection wizard
async function handleReturnFromAddConnection() {
  const returnPane = sessionStorage.getItem('streamWizardReturnPane')

  if (!returnPane || (returnPane !== 'source' && returnPane !== 'target')) {
    return
  }

  // Clear the return context from sessionStorage
  sessionStorage.removeItem('streamWizardReturnPane')
  sessionStorage.removeItem('streamWizardId')

  // Wait a tick to ensure connections list is updated
  await nextTick()

  // Get the most recently created connection
  const allConnections = connectionsStore.connections
  if (!allConnections.length) return

  // Find the newest connection by creation timestamp
  const newestConnection = allConnections.reduce((newest, conn) => {
    const newestTime = (newest.created as number) || 0
    const connTime = (conn.created as number) || 0
    return connTime > newestTime ? conn : newest
  })

  if (!newestConnection) return

  // Auto-select the new connection in the appropriate pane
  if (returnPane === 'source') {
    handleSourceUpdate(newestConnection.id)
  } else {
    handleTargetUpdate(newestConnection.id)
  }
}

// Load existing stream config for editing
async function loadStreamForEdit() {
  const id = streamId.value
  if (!id) {
    commonStore.showNotification('No stream ID provided', 'error')
    router.push({ name: 'Streams' })
    return
  }

  try {
    // Try to find stream in existing list first
    let existingStream = streamsStore.streamConfigs.find((s) => s.id === id)

    if (!existingStream) {
      // If not found, refresh streams and try again
      await streamsStore.refreshStreams()
      existingStream = streamsStore.streamConfigs.find((s) => s.id === id)
    }

    if (!existingStream) {
      throw new Error('Stream not found')
    }

    // Set the current stream for editing
    streamsStore.setCurrentStream(id)

    // Populate wizard state from the loaded stream config
    wizard.loadFromStreamConfig(existingStream)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    commonStore.showNotification(`Failed to load stream: ${errorMessage}`, 'error')
    router.push({ name: 'Streams' })
  }
}

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

function goToAddConnection(paneType: 'source' | 'target') {
  // Store the paneType in session storage so we can return to the correct pane
  sessionStorage.setItem('streamWizardReturnPane', paneType)
  // Store the stream ID if we're in edit mode, or null for create mode
  sessionStorage.setItem('streamWizardId', streamId.value || '')
  router.push('/explorer/add')
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

    // Set database/schema information for name generation
    if (wizard.selection.value.sourceDatabase) {
      streamsStore.currentStreamConfig.sourceDatabase = wizard.selection.value.sourceDatabase
    }
    if (wizard.selection.value.targetDatabase) {
      streamsStore.currentStreamConfig.targetDatabase = wizard.selection.value.targetDatabase
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

    commonStore.showNotification(
      isEditMode.value ? 'Stream updated successfully!' : 'Stream created successfully!',
      'success'
    )

    // Navigate to streams list
    router.push({ name: 'Streams' })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    commonStore.showNotification(`Failed to create stream: ${errorMessage}`, 'error')
  } finally {
    isProcessing.value = false
  }
}

function goBack() {
  showExitConfirm.value = true
}

function cancelWizard() {
  goBack()
}

function confirmExit() {
  wizard.reset()
  streamsStore.resetCurrentStream()
  router.push({ name: 'Streams' })
}
</script>
