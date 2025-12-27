import { ref, computed } from 'vue'
import type { StreamConfig } from '@/types/streamConfig'
import type { ConnectionMapping } from '@/api/federated'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'

export interface WizardStep {
  name: string
  title: string
  description: string
}

export interface SelectionState {
  sourceConnectionId: string | null
  targetConnectionId: string | null
  sourceDatabase: string | null
  targetDatabase: string | null
  sourceSchema: string | null
  targetSchema: string | null
  targetPath: string | null // For file connections
}

const DEFAULT_ALIAS = 'src'

// Snapshot for tracking changes
interface WizardSnapshot {
  selection: SelectionState
  sourceConnections: ConnectionMapping[]
  createTables: boolean
  createIndexes: boolean
  createForeignKeys: boolean
  copyData: boolean
  // Serialized stream config for deep comparison
  streamConfigJson: string
}

export function useStreamWizard() {
  // Step management
  const currentStepIndex = ref(0)
  const steps: WizardStep[] = [
    {
      name: 'selection',
      title: 'Select Source and Target',
      description: 'Choose source and target connections'
    },
    {
      name: 'structure',
      title: 'Structure and Data',
      description: 'Configure tables and structure options'
    },
    {
      name: 'configuration',
      title: 'Stream Configuration',
      description: 'Set stream name and performance options'
    }
  ]

  // Selection state
  const selection = ref<SelectionState>({
    sourceConnectionId: null,
    targetConnectionId: null,
    sourceDatabase: null,
    targetDatabase: null,
    sourceSchema: null,
    targetSchema: null,
    targetPath: null
  })

  const sourceConnections = ref<ConnectionMapping[]>([])
  const primarySourceId = computed(() => sourceConnections.value[0]?.connectionId || null)
  const primarySourceDatabase = computed(() => sourceConnections.value[0]?.database || null)
  const isMultiSource = computed(() => sourceConnections.value.length > 1)

  // Transfer options - granular structure creation
  const createTables = ref(true)
  const createIndexes = ref(true)
  const createForeignKeys = ref(true)
  const copyData = ref(true)

  // Initial state snapshot for change detection (edit mode only)
  const initialSnapshot = ref<WizardSnapshot | null>(null)

  // Track removed connections during load (deleted connections that were filtered out)
  const removedConnectionsCount = ref(0)

  // Helper to serialize stream config for comparison (excludes volatile fields)
  function serializeStreamConfig(): string {
    const streamsStore = useStreamsStore()
    const config = streamsStore.currentStreamConfig
    if (!config) return ''

    // Create a normalized copy excluding volatile/UI-only fields
    // Tables and queries are now per-connection
    const normalized = {
      mode: config.mode,
      name: config.name,
      source: {
        connections: config.source?.connections?.map((c) => ({
          alias: c.alias,
          connectionId: c.connectionId,
          database: c.database,
          tables: c.tables?.map((t) => ({
            name: t.name,
            selected: t.selected,
            filter: t.filter
          })),
          queries: c.queries?.map((q) => ({
            name: q.name,
            query: q.query
          }))
        })),
        options: config.source?.options
      },
      files: config.files?.map((f) => ({
        name: f.name,
        path: f.path,
        selected: f.selected
      })),
      limits: config.limits,
      reportingInterval: config.reportingInterval,
      skipData: config.skipData,
      structureOptions: config.structureOptions
    }
    return JSON.stringify(normalized)
  }

  // Helper to create a snapshot of current state
  function createSnapshot(): WizardSnapshot {
    return {
      selection: { ...selection.value },
      sourceConnections: sourceConnections.value.map((c) => ({ ...c })),
      createTables: createTables.value,
      createIndexes: createIndexes.value,
      createForeignKeys: createForeignKeys.value,
      copyData: copyData.value,
      streamConfigJson: serializeStreamConfig()
    }
  }

  // Check if current state differs from initial snapshot
  const hasChanges = computed(() => {
    // If no initial snapshot, we're in create mode - always consider as having changes
    if (!initialSnapshot.value) {
      // In create mode, check if any meaningful selection has been made
      return sourceConnections.value.length > 0 || selection.value.targetConnectionId !== null
    }

    const initial = initialSnapshot.value

    // Compare selection state
    if (
      selection.value.sourceConnectionId !== initial.selection.sourceConnectionId ||
      selection.value.targetConnectionId !== initial.selection.targetConnectionId ||
      selection.value.sourceDatabase !== initial.selection.sourceDatabase ||
      selection.value.targetDatabase !== initial.selection.targetDatabase ||
      selection.value.sourceSchema !== initial.selection.sourceSchema ||
      selection.value.targetSchema !== initial.selection.targetSchema ||
      selection.value.targetPath !== initial.selection.targetPath
    ) {
      return true
    }

    // Compare source connections
    if (sourceConnections.value.length !== initial.sourceConnections.length) {
      return true
    }
    for (let i = 0; i < sourceConnections.value.length; i++) {
      const current = sourceConnections.value[i]
      const orig = initial.sourceConnections[i]
      if (
        current.connectionId !== orig.connectionId ||
        current.database !== orig.database ||
        current.alias !== orig.alias
      ) {
        return true
      }
    }

    // Compare transfer options
    if (
      createTables.value !== initial.createTables ||
      createIndexes.value !== initial.createIndexes ||
      createForeignKeys.value !== initial.createForeignKeys ||
      copyData.value !== initial.copyData
    ) {
      return true
    }

    // Compare stream config (tables, filters, queries, limits, etc.)
    const currentConfigJson = serializeStreamConfig()
    if (currentConfigJson !== initial.streamConfigJson) {
      return true
    }

    return false
  })

  // Computed properties
  const currentStep = computed(() => steps[currentStepIndex.value])
  const isFirstStep = computed(() => currentStepIndex.value === 0)
  const isLastStep = computed(() => currentStepIndex.value === steps.length - 1)

  // Validation for each step
  const canProceedStep1 = computed(() => {
    // Source and target cannot be the same connection AND database combination
    const isSameConnectionAndDatabase =
      !isMultiSource.value &&
      primarySourceId.value &&
      selection.value.targetConnectionId &&
      primarySourceId.value === selection.value.targetConnectionId &&
      (primarySourceDatabase.value || selection.value.sourceDatabase) ===
        selection.value.targetDatabase &&
      (primarySourceDatabase.value || selection.value.sourceDatabase)

    return Boolean(
      sourceConnections.value.length > 0 &&
        selection.value.targetConnectionId &&
        !isSameConnectionAndDatabase
    )
  })

  const canProceedStep2 = computed(() => {
    const streamsStore = useStreamsStore()
    const connectionsStore = useConnectionsStore()
    const config = streamsStore.currentStreamConfig

    const primarySourceType =
      (primarySourceId.value && connectionsStore.connectionByID(primarySourceId.value)?.type) || ''
    const isFileSource =
      primarySourceType.toLowerCase() === 'files' || primarySourceType.toLowerCase() === 's3'

    // Check if tables or custom queries are selected (now per-connection)
    // Note: connection.tables only contains selected tables (filtered in TableList.vue)
    let selectedTablesCount = 0
    let customQueriesCount = 0
    for (const conn of config?.source?.connections || []) {
      if (conn.tables) {
        selectedTablesCount += conn.tables.length
      }
      if (conn.queries) {
        customQueriesCount += conn.queries.length
      }
    }
    const selectedFiles = config?.files?.filter((f) => f.selected) || []

    // Must have at least one table selected OR one custom query defined
    const hasDataSource = isFileSource
      ? selectedFiles.length > 0 || selectedTablesCount > 0
      : selectedTablesCount > 0 || customQueriesCount > 0

    // In CDC mode, enforce tables-only (no custom queries allowed)
    if (config?.mode === 'cdc' && customQueriesCount > 0) {
      return false
    }

    // At least one option must be selected (structure or data) for database targets
    const hasStructureOrDataOption =
      createTables.value || createIndexes.value || createForeignKeys.value || copyData.value

    return hasStructureOrDataOption && hasDataSource
  })

  const canProceedStep3 = computed(() => {
    // Final validation before save
    return true // Handled by StreamSettings validation
  })

  const canProceed = computed(() => {
    switch (currentStepIndex.value) {
      case 0:
        return canProceedStep1.value
      case 1:
        return canProceedStep2.value
      case 2:
        return canProceedStep3.value
      default:
        return false
    }
  })

  // Navigation methods
  function nextStep() {
    if (!isLastStep.value && canProceed.value) {
      currentStepIndex.value++
    }
  }

  function previousStep() {
    if (!isFirstStep.value) {
      currentStepIndex.value--
    }
  }

  function goToStep(index: number) {
    if (index >= 0 && index < steps.length) {
      currentStepIndex.value = index
    }
  }

  function normalizeSourceConnections(connections: ConnectionMapping[]): ConnectionMapping[] {
    const usedAliases = new Set<string>()
    return connections.map((conn, idx) => {
      let alias = (conn.alias || '').trim()
      if (!alias) {
        alias = `${DEFAULT_ALIAS}${idx ? idx + 1 : ''}`
      }
      let aliasIndex = idx + 1
      while (usedAliases.has(alias)) {
        aliasIndex += 1
        alias = `${DEFAULT_ALIAS}${aliasIndex}`
      }
      usedAliases.add(alias)
      return {
        alias,
        connectionId: conn.connectionId,
        database: conn.database
      }
    })
  }

  function syncPrimarySelection(schemaOverride?: string | null) {
    const previousId = selection.value.sourceConnectionId
    const primary = sourceConnections.value[0]
    selection.value.sourceConnectionId = primary?.connectionId || null
    selection.value.sourceDatabase = primary?.database || null

    if (schemaOverride !== undefined) {
      selection.value.sourceSchema = schemaOverride
    } else if (!primary || previousId !== selection.value.sourceConnectionId) {
      selection.value.sourceSchema = null
    }
  }

  // Selection methods
  function setSourceConnection(connectionId: string, database?: string, schema?: string) {
    const alias =
      sourceConnections.value.find((c) => c.connectionId === connectionId)?.alias ||
      sourceConnections.value[0]?.alias ||
      DEFAULT_ALIAS
    setSourceConnections([
      {
        alias,
        connectionId,
        database
      }
    ])
    selection.value.sourceSchema = schema || null
  }

  function setTargetConnection(
    connectionId: string,
    database?: string,
    schema?: string,
    path?: string
  ) {
    selection.value.targetConnectionId = connectionId
    selection.value.targetDatabase = database || null
    selection.value.targetSchema = schema || null
    selection.value.targetPath = path || null
  }

  function clearSourceSelection() {
    setSourceConnections([])
  }

  function clearTargetSelection() {
    selection.value.targetConnectionId = null
    selection.value.targetDatabase = null
    selection.value.targetSchema = null
    selection.value.targetPath = null
  }

  function setCreateTables(value: boolean) {
    createTables.value = value
  }

  function setCreateIndexes(value: boolean) {
    createIndexes.value = value
  }

  function setCreateForeignKeys(value: boolean) {
    createForeignKeys.value = value
  }

  function setCopyData(value: boolean) {
    copyData.value = value
  }

  function setSourceConnections(connections: ConnectionMapping[]) {
    const previousPrimary = sourceConnections.value[0]?.connectionId
    sourceConnections.value = normalizeSourceConnections(connections)
    const newPrimary = sourceConnections.value[0]?.connectionId
    const schemaOverride =
      connections.length === 0 ? null : previousPrimary === newPrimary ? undefined : null
    syncPrimarySelection(schemaOverride)
  }

  // Reset wizard state
  function reset() {
    currentStepIndex.value = 0
    selection.value = {
      sourceConnectionId: null,
      targetConnectionId: null,
      sourceDatabase: null,
      targetDatabase: null,
      sourceSchema: null,
      targetSchema: null,
      targetPath: null
    }
    createTables.value = true
    createIndexes.value = true
    createForeignKeys.value = true
    copyData.value = true
    setSourceConnections([])
    initialSnapshot.value = null
    removedConnectionsCount.value = 0
  }

  // Load wizard state from existing stream config (for edit mode)
  function loadFromStreamConfig(config: Partial<StreamConfig>) {
    const resolveConnectionId = (value: unknown): string | null => {
      if (!value) return null
      if (typeof value === 'string') return value
      if (typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
        const idValue = (value as Record<string, unknown>).id
        return typeof idValue === 'string' ? idValue : null
      }
      return null
    }

    // Helper to get database from either root level or nested in source/target
    const resolveDatabase = (
      rootLevel: string | undefined | null,
      nested: unknown
    ): string | null => {
      if (rootLevel) return rootLevel
      if (nested && typeof nested === 'object') {
        const obj = nested as Record<string, unknown>
        // Check direct .database property first
        if ('database' in obj) {
          const dbValue = obj.database
          if (typeof dbValue === 'string') return dbValue
        }
        // Check nested .spec.database.database path (for target with spec structure)
        if ('spec' in obj && obj.spec && typeof obj.spec === 'object') {
          const spec = obj.spec as Record<string, unknown>
          if ('database' in spec && spec.database && typeof spec.database === 'object') {
            const dbSpec = spec.database as Record<string, unknown>
            if ('database' in dbSpec && typeof dbSpec.database === 'string') {
              return dbSpec.database
            }
          }
        }
      }
      return null
    }

    // Helper to get schema from either root level or nested in source/target
    const resolveSchema = (
      rootLevel: string | undefined | null,
      nested: unknown
    ): string | null => {
      if (rootLevel) return rootLevel
      if (nested && typeof nested === 'object' && 'schema' in (nested as Record<string, unknown>)) {
        const schemaValue = (nested as Record<string, unknown>).schema
        return typeof schemaValue === 'string' ? schemaValue : null
      }
      return null
    }

    const resolvedTargetId = resolveConnectionId(config.target)
    const resolvedSourceDatabase = resolveDatabase(config.sourceDatabase, config.source)

    // Check if target connection still exists
    const targetExists = resolvedTargetId
      ? !!useConnectionsStore().connectionByID(resolvedTargetId)
      : false

    // For S3 targets, get the bucket from spec
    const s3Bucket = config.target?.spec?.s3?.upload?.bucket
    if (targetExists && s3Bucket) {
      selection.value.targetDatabase = s3Bucket
    } else if (targetExists) {
      selection.value.targetDatabase = resolveDatabase(config.targetDatabase, config.target)
    } else {
      selection.value.targetDatabase = null
    }

    // Only set target connection ID if it still exists
    selection.value.targetConnectionId = targetExists ? resolvedTargetId : null

    // Track if target was removed
    if (resolvedTargetId && !targetExists) {
      removedConnectionsCount.value += 1
    }
    selection.value.targetSchema = targetExists
      ? resolveSchema(config.targetSchema, config.target)
      : null
    selection.value.targetPath = targetExists ? (config.targetPath ?? null) : null
    const sourceSchema = resolveSchema(config.sourceSchema, config.source)

    // Populate structure options - check multiple possible locations
    // Priority: 1. target.spec.database.structureOptions (spec is source of truth)
    //           2. config.structureOptions (root level, legacy/wizard state)
    //           3. target.options.structureOptions (deprecated, for backwards compat)
    let structureOptions: Record<string, unknown> | undefined

    // First check target.spec.database.structureOptions (source of truth)
    const targetSpec = config?.target?.spec as Record<string, unknown> | undefined
    if (targetSpec?.database && typeof targetSpec.database === 'object') {
      const dbSpec = targetSpec.database as Record<string, unknown>
      if (dbSpec.structureOptions && typeof dbSpec.structureOptions === 'object') {
        structureOptions = dbSpec.structureOptions as Record<string, unknown>
      }
    }

    // Fall back to root level (legacy)
    if (!structureOptions || Object.keys(structureOptions).length === 0) {
      structureOptions = (config as StreamConfig & { structureOptions?: Record<string, unknown> })
        ?.structureOptions
    }

    if (structureOptions && Object.keys(structureOptions).length > 0) {
      // Handle both naming conventions: tables/indexes/foreignKeys and createTables/createIndexes/createForeignKeys
      const normalize = (value: unknown, defaultValue: boolean) =>
        typeof value === 'boolean' ? value : defaultValue
      createTables.value = normalize(structureOptions.tables ?? structureOptions.createTables, true)
      createIndexes.value = normalize(
        structureOptions.indexes ?? structureOptions.createIndexes,
        true
      )
      createForeignKeys.value = normalize(
        structureOptions.foreignKeys ?? structureOptions.createForeignKeys,
        true
      )
    } else {
      // Default to true when structureOptions is empty or missing
      createTables.value = true
      createIndexes.value = true
      createForeignKeys.value = true
    }

    // Check skipData from root level (legacy UI state)
    const configWithSkipData = config as StreamConfig & { skipData?: boolean }
    const skipData = configWithSkipData?.skipData
    copyData.value = skipData === undefined ? true : !skipData

    const connectionsStore = useConnectionsStore()

    // Check if any source connections are invalid (deleted)
    const originalConnections = config.source?.connections || []
    const hasInvalidConnection = originalConnections.some(
      (fc) => !connectionsStore.connectionByID(fc.connectionId)
    )

    // Track how many connections were removed (for user notification)
    removedConnectionsCount.value = hasInvalidConnection ? originalConnections.length : 0

    // If ANY connection is invalid, clear ALL - user must select new ones
    const connectionsFromConfig: ConnectionMapping[] = hasInvalidConnection
      ? []
      : originalConnections.map((fc) => ({
          alias: fc.alias,
          connectionId: fc.connectionId,
          database: fc.database
        }))

    setSourceConnections(connectionsFromConfig)

    if (resolvedSourceDatabase) {
      selection.value.sourceDatabase = resolvedSourceDatabase
      if (sourceConnections.value[0]) {
        sourceConnections.value[0].database = resolvedSourceDatabase
      }
    }
    selection.value.sourceSchema = sourceSchema

    // Save initial snapshot for change detection
    initialSnapshot.value = createSnapshot()
  }

  return {
    // State
    currentStepIndex,
    steps,
    currentStep,
    selection,
    createTables,
    createIndexes,
    createForeignKeys,
    copyData,
    sourceConnections,
    primarySourceId,
    primarySourceDatabase,
    isMultiSource,
    removedConnectionsCount,

    // Computed
    isFirstStep,
    isLastStep,
    canProceed,
    canProceedStep1,
    canProceedStep2,
    canProceedStep3,
    hasChanges,

    // Methods
    nextStep,
    previousStep,
    goToStep,
    setSourceConnection,
    setTargetConnection,
    clearSourceSelection,
    clearTargetSelection,
    setCreateTables,
    setCreateIndexes,
    setCreateForeignKeys,
    setCopyData,
    setSourceConnections,
    reset,
    loadFromStreamConfig
  }
}
