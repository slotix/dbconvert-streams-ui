import { ref, computed } from 'vue'
import type { Connection } from '@/types/connections'

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

  // Transfer options - granular structure creation
  const createTables = ref(true)
  const createIndexes = ref(true)
  const createForeignKeys = ref(true)
  const copyData = ref(true)

  // Computed properties
  const currentStep = computed(() => steps[currentStepIndex.value])
  const isFirstStep = computed(() => currentStepIndex.value === 0)
  const isLastStep = computed(() => currentStepIndex.value === steps.length - 1)

  // Validation for each step
  const canProceedStep1 = computed(() => {
    // Source and target cannot be the same connection AND database combination
    const isSameConnectionAndDatabase =
      selection.value.sourceConnectionId &&
      selection.value.targetConnectionId &&
      selection.value.sourceConnectionId === selection.value.targetConnectionId &&
      selection.value.sourceDatabase === selection.value.targetDatabase &&
      selection.value.sourceDatabase

    return Boolean(
      selection.value.sourceConnectionId &&
        selection.value.targetConnectionId &&
        !isSameConnectionAndDatabase
    )
  })

  const canProceedStep2 = computed(() => {
    // At least one option must be selected (structure or data)
    return createTables.value || createIndexes.value || createForeignKeys.value || copyData.value
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

  // Selection methods
  function setSourceConnection(connectionId: string, database?: string, schema?: string) {
    selection.value.sourceConnectionId = connectionId
    selection.value.sourceDatabase = database || null
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
    selection.value.sourceConnectionId = null
    selection.value.sourceDatabase = null
    selection.value.sourceSchema = null
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
  }

  // Load wizard state from existing stream config (for edit mode)
  function loadFromStreamConfig(config: any) {
    // Populate source and target selection
    selection.value.sourceConnectionId = config.source || null
    selection.value.targetConnectionId = config.target || null
    selection.value.sourceDatabase = config.sourceDatabase || null
    selection.value.targetDatabase = config.targetDatabase || null
    selection.value.sourceSchema = config.sourceSchema || null
    selection.value.targetSchema = config.targetSchema || null
    selection.value.targetPath = config.targetPath || null

    // Populate structure options
    if (config.structureOptions) {
      createTables.value = config.structureOptions.tables ?? true
      createIndexes.value = config.structureOptions.indexes ?? true
      createForeignKeys.value = config.structureOptions.foreignKeys ?? true
    }

    // Populate data copy option (inverse of skipData)
    copyData.value = !config.skipData
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

    // Computed
    isFirstStep,
    isLastStep,
    canProceed,
    canProceedStep1,
    canProceedStep2,
    canProceedStep3,

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
    reset,
    loadFromStreamConfig
  }
}
