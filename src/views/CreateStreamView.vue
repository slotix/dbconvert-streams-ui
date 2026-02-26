<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <!-- Header -->
    <header
      class="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700"
    >
      <div class="px-4 py-2 flex items-center gap-3">
        <button
          type="button"
          class="lg:hidden flex items-center justify-center p-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
          @click="sidebarMenuToggle?.openSidebar()"
        >
          <Menu class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
          <span class="sr-only">Open sidebar</span>
        </button>
        <h1 class="text-base font-semibold text-gray-900 dark:text-gray-100">
          {{ isEditMode ? 'Edit Stream Configuration' : 'New Stream Configuration' }}
        </h1>
        <div class="flex-1"></div>
        <button
          type="button"
          class="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          @click="goBack"
        >
          Cancel
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-h-0">
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
          <template #footer-left>
            <div v-if="showStepOneSelectionFooter" class="flex min-w-0 flex-1 items-center gap-2">
              <div
                class="min-w-0 max-w-[36rem] truncate bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-600/60 rounded-lg px-3 py-1.5 text-sm shadow-sm shadow-sky-900/10 dark:shadow-sky-900/40"
                :title="sourceFooterLabel"
              >
                <span class="font-semibold text-sky-700 dark:text-sky-200">Source:</span>
                <span class="text-sky-900 dark:text-sky-100 ml-1 font-medium">
                  {{ sourceFooterLabel }}
                </span>
              </div>
              <svg
                class="w-5 h-5 shrink-0 text-teal-500 dark:text-teal-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              <div
                class="min-w-0 max-w-[36rem] truncate bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-600/60 rounded-lg px-3 py-1.5 text-sm shadow-sm shadow-emerald-900/10 dark:shadow-emerald-900/40"
                :title="targetFooterLabel"
              >
                <span class="font-semibold text-emerald-700 dark:text-emerald-200">Target:</span>
                <span class="text-emerald-900 dark:text-emerald-100 ml-1 font-medium">
                  {{ targetFooterLabel }}
                </span>
              </div>
              <button
                v-if="hasAnySelection"
                type="button"
                class="ml-2 inline-flex items-center rounded-md border border-red-300 dark:border-red-700 px-2.5 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 whitespace-nowrap transition-colors duration-200"
                @click="handleClearAll"
              >
                Clear Connections
              </button>
            </div>
          </template>

          <template #default="{ currentStepIndex }">
            <!-- Step 1: Source & Target Selection -->
            <div v-if="currentStepIndex === 0" class="h-full min-h-0">
              <SourceTargetSelectionStep
                :source-connection-id="wizard.primarySourceId.value"
                :target-connection-id="wizard.selection.value.targetConnectionId"
                :source-database="wizard.selection.value.sourceDatabase"
                :target-database="wizard.selection.value.targetDatabase"
                :source-schema="wizard.selection.value.sourceSchema"
                :target-schema="wizard.selection.value.targetSchema"
                :target-path="wizard.selection.value.targetPath"
                :source-connections="wizard.sourceConnections.value"
                @update:source-connection="handleSourceUpdate"
                @update:target-connection="handleTargetUpdate"
                @update:source-connections="handleSourceConnectionsUpdate"
                @clear-all="handleClearAll"
                @add-connection="(paneType) => goToAddConnection(paneType)"
                @update:can-proceed="updateCanProceed"
              />
            </div>

            <!-- Step 2: Structure & Data -->
            <div v-if="currentStepIndex === 1" class="h-full min-h-0">
              <StructureDataStep
                :target-connection-id="wizard.selection.value.targetConnectionId"
                :create-tables="wizard.createTables.value"
                :create-indexes="wizard.createIndexes.value"
                :create-foreign-keys="wizard.createForeignKeys.value"
                :create-check-constraints="wizard.createCheckConstraints.value"
                :copy-data="wizard.copyData.value"
                :source-connections="wizard.sourceConnections.value"
                @update:create-tables="wizard.setCreateTables"
                @update:create-indexes="wizard.setCreateIndexes"
                @update:create-foreign-keys="wizard.setCreateForeignKeys"
                @update:create-check-constraints="wizard.setCreateCheckConstraints"
                @update:copy-data="wizard.setCopyData"
                @update:can-proceed="updateCanProceed"
              />
            </div>

            <!-- Step 3: Stream Configuration -->
            <div v-if="currentStepIndex === 2" class="h-full min-h-0">
              <StreamConfigurationStep
                :source-connection-id="wizard.primarySourceId.value"
                :target-connection-id="wizard.selection.value.targetConnectionId"
                :source-database="wizard.selection.value.sourceDatabase"
                :target-database="wizard.selection.value.targetDatabase"
                :target-schema="wizard.selection.value.targetSchema"
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
import { ref, computed, inject, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Menu } from 'lucide-vue-next'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { useStreamWizard } from '@/composables/useStreamWizard'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import type { StreamConnectionMapping } from '@/types/streamConfig'
import { getConnectionKindFromSpec } from '@/types/specs'
import { DEFAULT_ALIAS } from '@/utils/federatedUtils'
import { getSourceSelectionValue } from '@/components/stream/wizard/sourceMappings'
import WizardLayout from '@/components/connection/wizard/WizardLayout.vue'
import SourceTargetSelectionStep from '@/components/stream/wizard/steps/SourceTargetSelectionStep.vue'
import StructureDataStep from '@/components/stream/wizard/steps/StructureDataStep.vue'
import StreamConfigurationStep from '@/components/stream/wizard/steps/StreamConfigurationStep.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { setSelectedStreamInViewState } from '@/utils/streamsViewState'

// Props for stream ID (when in edit mode)
interface Props {
  id?: string
}

const props = defineProps<Props>()

const { strokeWidth: iconStroke } = useLucideIcons()
const sidebarMenuToggle = inject<{ openSidebar: () => void }>('sidebarMenuToggle')
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
const hasAnySelection = computed(
  () =>
    wizard.sourceConnections.value.length > 0 || Boolean(wizard.selection.value.targetConnectionId)
)
const showStepOneSelectionFooter = computed(
  () => wizard.currentStepIndex.value === 0 && hasAnySelection.value
)

function getConnectionDisplayName(connectionId?: string | null): string {
  if (!connectionId) return 'Not selected'
  const conn = connectionsStore.connectionByID(connectionId)
  if (!conn) return 'Unknown connection'
  return conn.name || conn.id
}

const sourceFooterLabel = computed(() => {
  const sources = wizard.sourceConnections.value
  if (sources.length === 0) return 'Not selected'
  if (sources.length > 1) return `${sources.length} sources`

  const first = sources[0]
  const conn = connectionsStore.connectionByID(first.connectionId)
  const kind = getConnectionKindFromSpec(conn?.spec)
  const selection = getSourceSelectionValue(first, kind)
  return selection
    ? `${getConnectionDisplayName(first.connectionId)} / ${selection}`
    : getConnectionDisplayName(first.connectionId)
})

const targetFooterLabel = computed(() => {
  const targetId = wizard.selection.value.targetConnectionId
  if (!targetId) return 'Not selected'

  const segments: string[] = [getConnectionDisplayName(targetId)]
  if (wizard.selection.value.targetDatabase) segments.push(wizard.selection.value.targetDatabase)
  if (wizard.selection.value.targetSchema) segments.push(wizard.selection.value.targetSchema)
  if (!wizard.selection.value.targetDatabase && wizard.selection.value.targetPath) {
    segments.push(wizard.selection.value.targetPath)
  }
  return segments.join(' / ')
})

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

    // Show notification and sync if some connections were removed (deleted)
    if (wizard.removedConnectionsCount.value > 0) {
      // Only sync to store when connections were removed - otherwise store has full data with tables
      if (streamsStore.currentStreamConfig) {
        streamsStore.setSourceConnections(wizard.sourceConnections.value)
      }
      const count = wizard.removedConnectionsCount.value
      commonStore.showNotification(
        `${count} connection${count > 1 ? 's were' : ' was'} removed (no longer exist). Please select new ones.`,
        'warning'
      )
    }

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
  () => wizard.sourceConnections.value,
  (connections) => {
    if (!streamsStore.currentStreamConfig) return
    // Preserve existing per-connection data (tables, queries, s3) when syncing wizard state
    const existingConnections = streamsStore.currentStreamConfig.source?.connections || []
    const mergedConnections = mergeWizardConnections(connections, existingConnections)
    streamsStore.setSourceConnections(mergedConnections)
    const primary = connections[0]
    streamsStore.currentStreamConfig.sourceDatabase = primary?.database || undefined
    if (!primary) {
      streamsStore.currentStreamConfig.sourceSchema = undefined
    }
  },
  { deep: true, immediate: true }
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

// Enforce convert mode when CDC is not allowed (multiple DB sources or file sources)
watch(
  () => wizard.canUseCDCMode.value,
  (canCDC) => {
    if (!canCDC && streamsStore.currentStreamConfig) {
      streamsStore.currentStreamConfig.mode = 'convert'
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
      if (wizard.primarySourceId.value && streamsStore.currentStreamConfig) {
        if (wizard.selection.value.sourceDatabase) {
          streamsStore.currentStreamConfig.sourceDatabase = wizard.selection.value.sourceDatabase
        }
        streamsStore.currentStreamConfig.sourceSchema = undefined

        // Wait for next tick to ensure TableList component is rendered
        await nextTick()

        // TableList will automatically call refreshTables() when source changes
        // No need to do anything else - the watch in TableList handles it
      }
    }
  }
)

function handleSourceUpdate(connectionId: string, database?: string, _schema?: string) {
  const sourceConnection = connectionsStore.connectionByID(connectionId)
  const sourceKind = getConnectionKindFromSpec(sourceConnection?.spec)

  // S3 sources are selected by bucket (not by database).
  if (sourceKind === 's3') {
    if (!database) {
      return
    }
    const alias =
      wizard.sourceConnections.value.find((c) => c.connectionId === connectionId)?.alias ||
      wizard.sourceConnections.value[0]?.alias ||
      DEFAULT_ALIAS
    wizard.setSourceConnections([{ alias, connectionId, s3: { bucket: database } }])
    wizard.selection.value.sourceSchema = null
  } else {
    wizard.setSourceConnection(connectionId, database, undefined)
  }

  // Update both the wizard state and the stream config
  if (streamsStore.currentStreamConfig) {
    streamsStore.setSourceConnections(wizard.sourceConnections.value)
    // For S3 sources, keep sourceDatabase unset; bucket lives under mapping.s3.bucket.
    streamsStore.currentStreamConfig.sourceDatabase =
      wizard.selection.value.sourceDatabase ||
      (sourceKind === 's3' ? undefined : database) ||
      undefined
    if (sourceKind !== 's3') {
      streamsStore.currentStreamConfig.sourceSchema = undefined
    }
  }
}

function handleSourceConnectionsUpdate(connections: StreamConnectionMapping[]) {
  wizard.setSourceConnections(connections)
  if (streamsStore.currentStreamConfig) {
    streamsStore.setSourceConnections(connections)
    const primary = connections[0]
    const primaryConn = primary ? connectionsStore.connectionByID(primary.connectionId) : undefined
    const primaryKind = getConnectionKindFromSpec(primaryConn?.spec)
    streamsStore.currentStreamConfig.sourceDatabase =
      primaryKind === 's3' ? undefined : primary?.database || undefined
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
        // Empty outputDirectory lets backend use platform-appropriate temp directory
        streamsStore.currentStreamConfig.target.spec.s3 = {
          outputDirectory: '',
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
  if (streamsStore.currentStreamConfig) {
    streamsStore.setSourceConnections([])
    streamsStore.currentStreamConfig.sourceDatabase = undefined
    streamsStore.currentStreamConfig.sourceSchema = undefined
    streamsStore.currentStreamConfig.target.id = ''
    streamsStore.currentStreamConfig.targetDatabase = undefined
    streamsStore.currentStreamConfig.targetSchema = undefined
    streamsStore.currentStreamConfig.targetPath = undefined
  }
}

function updateCanProceed(value: boolean) {
  canProceedOverride.value = value
}

function mergeWizardConnections(
  wizardConnections: StreamConnectionMapping[],
  existingConnections: StreamConnectionMapping[]
): StreamConnectionMapping[] {
  return wizardConnections.map((wizardConn) => {
    const existing = existingConnections.find(
      (ec) => ec.connectionId === wizardConn.connectionId || ec.alias === wizardConn.alias
    )
    return {
      alias: wizardConn.alias,
      connectionId: wizardConn.connectionId,
      database: wizardConn.database,
      // Preserve existing per-connection data (tables, queries, schema)
      schema: existing?.schema,
      tables: existing?.tables,
      queries: existing?.queries,
      // Prefer wizard's s3 config (from bucket selection) over existing (for edit mode fallback)
      s3: wizardConn.s3 || existing?.s3
    }
  })
}

function applyWizardSourceSelection(mergedConnections: StreamConnectionMapping[]) {
  if (!streamsStore.currentStreamConfig) return
  streamsStore.setSourceConnections(mergedConnections)
  const primarySource = wizard.sourceConnections.value[0]
  streamsStore.currentStreamConfig.sourceDatabase =
    primarySource?.database || wizard.selection.value.sourceDatabase || undefined
  streamsStore.currentStreamConfig.sourceSchema = undefined
}

function applyWizardTargetSelection(includeTargetPath: boolean) {
  if (!streamsStore.currentStreamConfig) return
  if (wizard.selection.value.targetConnectionId) {
    streamsStore.updateTarget(wizard.selection.value.targetConnectionId)
  }
  if (wizard.selection.value.targetDatabase) {
    streamsStore.currentStreamConfig.targetDatabase = wizard.selection.value.targetDatabase
  }
  if (wizard.selection.value.targetSchema) {
    streamsStore.currentStreamConfig.targetSchema = wizard.selection.value.targetSchema
  }
  if (includeTargetPath && wizard.selection.value.targetPath) {
    streamsStore.currentStreamConfig.targetPath = wizard.selection.value.targetPath
  }
}

function applyWizardStructureOptions() {
  if (!streamsStore.currentStreamConfig) return
  // Set skipData based on the "Copy data" checkbox
  streamsStore.currentStreamConfig.skipData = !wizard.copyData.value

  // Set granular structure creation options
  streamsStore.currentStreamConfig.structureOptions = {
    tables: wizard.createTables.value,
    indexes: wizard.createIndexes.value,
    foreignKeys: wizard.createForeignKeys.value,
    checkConstraints: wizard.createCheckConstraints.value
  }

  if (!wizard.canUseCDCMode.value) {
    streamsStore.currentStreamConfig.mode = 'convert'
  }
}

function hasValidSourceAndTarget(): boolean {
  return wizard.sourceConnections.value.length > 0 && !!wizard.selection.value.targetConnectionId
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
  if (!hasValidSourceAndTarget()) {
    commonStore.showNotification('Source and target must be selected', 'error')
    return
  }

  isProcessing.value = true
  try {
    if (!streamsStore.currentStreamConfig) {
      throw new Error('Stream configuration not initialized')
    }

    // Merge wizard connection metadata with existing store connections to preserve tables/queries/s3
    const existingConnections = streamsStore.currentStreamConfig.source?.connections || []
    const mergedConnections = mergeWizardConnections(
      wizard.sourceConnections.value,
      existingConnections
    )
    applyWizardSourceSelection(mergedConnections)
    applyWizardTargetSelection(false)
    applyWizardStructureOptions()

    // Save the stream (use update if editing existing stream)
    const savedStreamId = await streamsStore.saveStream(isEditMode.value)

    commonStore.showNotification(
      isEditMode.value ? 'Stream updated successfully!' : 'Stream created successfully!',
      'success'
    )

    // Navigate to streams list with the stream selected
    const selectId = savedStreamId || streamId.value
    if (selectId) {
      setSelectedStreamInViewState(selectId)
    }
    router.push({ name: 'Streams' })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    commonStore.showNotification(`Failed to create stream: ${errorMessage}`, 'error')
  } finally {
    isProcessing.value = false
  }
}

async function handleQuickSave() {
  if (!hasValidSourceAndTarget()) {
    commonStore.showNotification('Source and target must be selected', 'error')
    return
  }

  isProcessing.value = true
  try {
    if (!streamsStore.currentStreamConfig) {
      throw new Error('Stream configuration not initialized')
    }

    // Merge wizard connection metadata with existing store connections to preserve tables/queries/s3
    const existingConnections = streamsStore.currentStreamConfig.source?.connections || []
    const mergedConnections = mergeWizardConnections(
      wizard.sourceConnections.value,
      existingConnections
    )
    applyWizardSourceSelection(mergedConnections)
    applyWizardTargetSelection(true)
    applyWizardStructureOptions()

    // Save the stream (use update if editing existing stream)
    const savedStreamId = await streamsStore.saveStream(isEditMode.value)

    commonStore.showNotification('Stream updated successfully!', 'success')

    // Navigate back to streams list with the stream selected
    const selectId = savedStreamId || streamId.value
    if (selectId) {
      setSelectedStreamInViewState(selectId)
    }
    router.push({ name: 'Streams' })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    commonStore.showNotification(`Failed to update stream: ${errorMessage}`, 'error')
  } finally {
    isProcessing.value = false
  }
}

function goBack() {
  // Only show confirmation if there are unsaved changes
  if (wizard.hasChanges.value) {
    showExitConfirm.value = true
  } else {
    // No changes, navigate directly without confirmation
    confirmExit()
  }
}

function cancelWizard() {
  goBack()
}

function confirmExit() {
  wizard.reset()
  streamsStore.resetCurrentStream()
  // If in edit mode, return to streams with the stream selected
  if (isEditMode.value && streamId.value) {
    setSelectedStreamInViewState(streamId.value)
    router.push({ name: 'Streams' })
  } else {
    router.push({ name: 'Streams' })
  }
}
</script>
