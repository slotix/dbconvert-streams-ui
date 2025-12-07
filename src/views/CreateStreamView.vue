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
          @quick-save="handleQuickSave"
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
                :federated-mode="wizard.federatedMode.value"
                :federated-connections="wizard.federatedConnections.value"
                @update:source-connection="handleSourceUpdate"
                @update:target-connection="handleTargetUpdate"
                @update:federated-mode="handleFederatedModeUpdate"
                @update:federated-connections="handleFederatedConnectionsUpdate"
                @clear-all="handleClearAll"
                @add-connection="(paneType) => goToAddConnection(paneType)"
                @update:can-proceed="updateCanProceed"
              />
            </div>

            <!-- Step 2: Structure & Data -->
            <div v-if="currentStepIndex === 1">
              <StructureDataStep
                :target-connection-id="wizard.selection.value.targetConnectionId"
                :create-tables="wizard.createTables.value"
                :create-indexes="wizard.createIndexes.value"
                :create-foreign-keys="wizard.createForeignKeys.value"
                :copy-data="wizard.copyData.value"
                :federated-mode="wizard.federatedMode.value"
                :federated-connections="wizard.federatedConnections.value"
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

    // For S3 targets, the spec is already loaded from existingStream.target.spec
    // No need to copy to options - spec is the source of truth
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
      // Update store with source connection and database
      streamsStore.updateSource(newSourceId)
      if (wizard.selection.value.sourceDatabase) {
        streamsStore.currentStreamConfig.sourceDatabase = wizard.selection.value.sourceDatabase
      }
      if (wizard.selection.value.sourceSchema) {
        streamsStore.currentStreamConfig.sourceSchema = wizard.selection.value.sourceSchema
      }
    }
  }
)

watch(
  () => wizard.selection.value.targetConnectionId,
  (newTargetId) => {
    if (newTargetId && streamsStore.currentStreamConfig) {
      // Update store with target connection and database
      streamsStore.updateTarget(newTargetId)
      if (wizard.selection.value.targetDatabase) {
        streamsStore.currentStreamConfig.targetDatabase = wizard.selection.value.targetDatabase
      }
      if (wizard.selection.value.targetSchema) {
        streamsStore.currentStreamConfig.targetSchema = wizard.selection.value.targetSchema
      }
      if (wizard.selection.value.targetPath) {
        streamsStore.currentStreamConfig.targetPath = wizard.selection.value.targetPath
      }
    }
  }
)

// Sync federated mode state to store (now in source)
watch(
  () => wizard.federatedMode.value,
  (enabled) => {
    if (streamsStore.currentStreamConfig) {
      streamsStore.currentStreamConfig.source.federatedMode = enabled
      // Force convert mode when federated mode is enabled
      if (enabled) {
        streamsStore.currentStreamConfig.mode = 'convert'
      }
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

        // Update source connection and database in the store
        streamsStore.updateSource(sourceId)
        if (wizard.selection.value.sourceDatabase) {
          streamsStore.currentStreamConfig.sourceDatabase = wizard.selection.value.sourceDatabase
        }
        if (wizard.selection.value.sourceSchema) {
          streamsStore.currentStreamConfig.sourceSchema = wizard.selection.value.sourceSchema
        }

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
  // Update both the wizard state and the stream config
  if (streamsStore.currentStreamConfig) {
    streamsStore.updateSource(connectionId)
    if (database) {
      streamsStore.currentStreamConfig.sourceDatabase = database
    }
    if (schema) {
      streamsStore.currentStreamConfig.sourceSchema = schema
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
  // Update both the wizard state and the stream config
  if (streamsStore.currentStreamConfig) {
    streamsStore.updateTarget(connectionId)
    if (database) {
      streamsStore.currentStreamConfig.targetDatabase = database
    }
    if (schema) {
      streamsStore.currentStreamConfig.targetSchema = schema
    }
    if (path) {
      streamsStore.currentStreamConfig.targetPath = path
    }

    // For S3 connections, set the bucket in target.spec.s3.upload
    const targetConnection = connectionsStore.connectionByID(connectionId)
    if (targetConnection?.spec?.s3 && database) {
      // database parameter holds the bucket name for S3 connections
      // Ensure S3 spec structure exists
      if (!streamsStore.currentStreamConfig.target.spec) {
        streamsStore.currentStreamConfig.target.spec = {}
      }
      if (!streamsStore.currentStreamConfig.target.spec.s3) {
        streamsStore.currentStreamConfig.target.spec.s3 = {
          outputDirectory: '/tmp/dbconvert',
          fileFormat: 'csv',
          upload: { bucket: '' }
        }
      }
      streamsStore.currentStreamConfig.target.spec.s3.upload.bucket = database
    }
  }
}

function handleClearAll() {
  wizard.clearSourceSelection()
  wizard.clearTargetSelection()
}

function handleFederatedModeUpdate(enabled: boolean) {
  wizard.setFederatedMode(enabled)
  // When entering federated mode, clear the source selection since
  // federated mode uses multiple sources via ConnectionAliasPanel
  if (enabled) {
    wizard.clearSourceSelection()
  }
}

function handleFederatedConnectionsUpdate(
  connections: import('@/api/federated').ConnectionMapping[]
) {
  wizard.setFederatedConnections(connections)
  // Store federated connections in the streams store for later use (now in source)
  if (streamsStore.currentStreamConfig) {
    streamsStore.currentStreamConfig.source.federatedConnections = connections
  }
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
  // In federated mode, we need federatedConnections instead of sourceConnectionId
  const isFederated = wizard.federatedMode.value
  const hasValidSource = isFederated
    ? wizard.federatedConnections.value.length > 0
    : !!wizard.selection.value.sourceConnectionId

  if (!hasValidSource || !wizard.selection.value.targetConnectionId) {
    const message = isFederated
      ? 'At least one source connection and a target must be selected'
      : 'Source and target must be selected'
    commonStore.showNotification(message, 'error')
    return
  }

  isProcessing.value = true
  try {
    // Ensure source and target are set in the store
    // For federated mode, use the first connection as the "source" for compatibility
    if (isFederated && wizard.federatedConnections.value.length > 0) {
      streamsStore.updateSource(wizard.federatedConnections.value[0].connectionId)
    } else if (wizard.selection.value.sourceConnectionId) {
      streamsStore.updateSource(wizard.selection.value.sourceConnectionId)
    }
    if (wizard.selection.value.targetConnectionId) {
      streamsStore.updateTarget(wizard.selection.value.targetConnectionId)
    }

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

    // Set federated mode settings (now in source)
    if (isFederated) {
      streamsStore.currentStreamConfig.source.federatedMode = true
      streamsStore.currentStreamConfig.source.federatedConnections =
        wizard.federatedConnections.value
      // Clear tables in federated mode - only queries are used
      streamsStore.currentStreamConfig.source.tables = []
    }

    // Save the stream (use update if editing existing stream)
    const savedStreamId = await streamsStore.saveStream(isEditMode.value)

    commonStore.showNotification(
      isEditMode.value ? 'Stream updated successfully!' : 'Stream created successfully!',
      'success'
    )

    // Navigate to streams list with the stream selected
    const selectId = savedStreamId || streamId.value
    if (selectId) {
      router.push({ name: 'Streams', query: { selected: selectId } })
    } else {
      router.push({ name: 'Streams' })
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    commonStore.showNotification(`Failed to create stream: ${errorMessage}`, 'error')
  } finally {
    isProcessing.value = false
  }
}

async function handleQuickSave() {
  // In federated mode, we need federatedConnections instead of sourceConnectionId
  const isFederated = wizard.federatedMode.value
  const hasValidSource = isFederated
    ? wizard.federatedConnections.value.length > 0
    : !!wizard.selection.value.sourceConnectionId

  if (!hasValidSource || !wizard.selection.value.targetConnectionId) {
    const message = isFederated
      ? 'At least one source connection and a target must be selected'
      : 'Source and target must be selected'
    commonStore.showNotification(message, 'error')
    return
  }

  isProcessing.value = true
  try {
    // Ensure source and target are set in the store
    // For federated mode, use the first connection as the "source" for compatibility
    if (isFederated && wizard.federatedConnections.value.length > 0) {
      streamsStore.updateSource(wizard.federatedConnections.value[0].connectionId)
    } else if (wizard.selection.value.sourceConnectionId) {
      streamsStore.updateSource(wizard.selection.value.sourceConnectionId)
    }
    if (wizard.selection.value.targetConnectionId) {
      streamsStore.updateTarget(wizard.selection.value.targetConnectionId)
    }

    // Apply transfer options to the stream config
    if (!streamsStore.currentStreamConfig) {
      throw new Error('Stream configuration not initialized')
    }

    // Set database/schema information
    if (wizard.selection.value.sourceDatabase) {
      streamsStore.currentStreamConfig.sourceDatabase = wizard.selection.value.sourceDatabase
    }
    if (wizard.selection.value.targetDatabase) {
      streamsStore.currentStreamConfig.targetDatabase = wizard.selection.value.targetDatabase
    }
    if (wizard.selection.value.targetPath) {
      streamsStore.currentStreamConfig.targetPath = wizard.selection.value.targetPath
    }

    // Set skipData based on the "Copy data" checkbox
    streamsStore.currentStreamConfig.skipData = !wizard.copyData.value

    // Set granular structure creation options
    streamsStore.currentStreamConfig.structureOptions = {
      tables: wizard.createTables.value,
      indexes: wizard.createIndexes.value,
      foreignKeys: wizard.createForeignKeys.value
    }

    // Set federated mode settings (now in source)
    if (isFederated) {
      streamsStore.currentStreamConfig.source.federatedMode = true
      streamsStore.currentStreamConfig.source.federatedConnections =
        wizard.federatedConnections.value
      // Clear tables in federated mode - only queries are used
      streamsStore.currentStreamConfig.source.tables = []
    }

    // Save the stream (use update if editing existing stream)
    const savedStreamId = await streamsStore.saveStream(isEditMode.value)

    commonStore.showNotification('Stream updated successfully!', 'success')

    // Navigate back to streams list with the stream selected
    const selectId = savedStreamId || streamId.value
    if (selectId) {
      router.push({ name: 'Streams', query: { selected: selectId } })
    } else {
      router.push({ name: 'Streams' })
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    commonStore.showNotification(`Failed to update stream: ${errorMessage}`, 'error')
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
  // If in edit mode, return to streams with the stream selected
  if (isEditMode.value && streamId.value) {
    router.push({ name: 'Streams', query: { selected: streamId.value } })
  } else {
    router.push({ name: 'Streams' })
  }
}
</script>
