import { computed, watch, type ComputedRef, type Ref, type WritableComputedRef } from 'vue'
import type { ConnectionMapping } from '@/api/federated'
import type { SelectOption, SelectValueOption } from '@/components/base/FormSelect.vue'

const EXECUTION_CONTEXT_STORAGE_KEY = 'explorer.sqlExecutionContext'

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

type PersistedExecutionContextState = Record<string, string>

function loadPersistedExecutionContexts(): PersistedExecutionContextState {
  if (!hasBrowserStorage()) return {}
  try {
    const raw = window.localStorage.getItem(EXECUTION_CONTEXT_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as PersistedExecutionContextState
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistExecutionContexts(state: PersistedExecutionContextState) {
  if (!hasBrowserStorage()) return
  try {
    window.localStorage.setItem(EXECUTION_CONTEXT_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export interface UseSqlExecutionContextSelectorOptions {
  mode: Ref<'database' | 'file'> | ComputedRef<'database' | 'file'>
  contextKey: Ref<string> | ComputedRef<string>
  runMode: Ref<'single' | 'federated'>
  selectedConnections: Ref<ConnectionMapping[]>
  databaseSourceMappings: ComputedRef<ConnectionMapping[]>
  singleSourceMapping: ComputedRef<ConnectionMapping | null>
  federatedScopeConnectionId: Ref<string>
  setRunMode: (mode: 'single' | 'federated') => void
  setSingleSourceConnectionId: (connectionId: string) => void
  isDatabaseMapping: (mapping: { connectionId: string }) => boolean
  getDatabaseTypeDisplay: (connectionId: string) => string | null
  getConnectionName: (connectionId: string) => string | null
}

export interface UseSqlExecutionContextSelectorReturn {
  showUnifiedExecutionSelector: ComputedRef<boolean>
  executionContextOptions: ComputedRef<SelectOption[]>
  executionContextValue: WritableComputedRef<string, string>
  singleExecutionLabel: ComputedRef<string>
}

export function useSqlExecutionContextSelector(
  options: UseSqlExecutionContextSelectorOptions
): UseSqlExecutionContextSelectorReturn {
  const {
    mode,
    contextKey,
    runMode,
    selectedConnections,
    databaseSourceMappings,
    singleSourceMapping,
    federatedScopeConnectionId,
    setRunMode,
    setSingleSourceConnectionId,
    isDatabaseMapping,
    getDatabaseTypeDisplay,
    getConnectionName
  } = options

  const directExecutionOptions = computed<SelectValueOption[]>(() =>
    databaseSourceMappings.value.map((mapping) => {
      const alias = mapping.alias || 'db'
      const databaseType = getDatabaseTypeDisplay(mapping.connectionId)
      const typePart = databaseType ? ` (${databaseType})` : ''
      return {
        value: `direct:${mapping.connectionId}`,
        label: `${alias}${typePart}`,
        selectedLabel: `Database: ${alias}${typePart}`,
        indented: true
      }
    })
  )

  const scopedExecutionOptions = computed<SelectValueOption[]>(() =>
    selectedConnections.value
      .filter((mapping) => !isDatabaseMapping(mapping))
      .map((mapping) => {
        const alias = mapping.alias || 'files'
        return {
          value: `scoped:${mapping.connectionId}`,
          label: alias,
          selectedLabel: `Files: ${alias}`,
          indented: true
        }
      })
  )

  const executionTargetCount = computed(
    () => directExecutionOptions.value.length + scopedExecutionOptions.value.length
  )

  const showUnifiedExecutionSelector = computed(() => executionTargetCount.value > 1)

  const executionContextOptions = computed<SelectOption[]>(() => {
    const computedOptions: SelectOption[] = [
      { type: 'header', label: 'Mode' },
      { value: 'federated', label: 'Multi-source', selectedLabel: 'Multi-source', indented: true }
    ]

    if (directExecutionOptions.value.length > 0) {
      computedOptions.push({ type: 'divider' })
      computedOptions.push({ type: 'header', label: 'Databases' })
      computedOptions.push(...directExecutionOptions.value)
    }

    if (scopedExecutionOptions.value.length > 0) {
      computedOptions.push({ type: 'divider' })
      computedOptions.push({ type: 'header', label: 'Files' })
      computedOptions.push(...scopedExecutionOptions.value)
    }

    return computedOptions
  })

  const executionContextValue = computed<string>({
    get() {
      if (!showUnifiedExecutionSelector.value && scopedExecutionOptions.value.length === 1) {
        return String(scopedExecutionOptions.value[0].value)
      }

      if (!showUnifiedExecutionSelector.value && directExecutionOptions.value.length === 1) {
        return String(directExecutionOptions.value[0].value)
      }

      if (runMode.value === 'federated') {
        if (
          federatedScopeConnectionId.value &&
          scopedExecutionOptions.value.some(
            (executionOption) =>
              executionOption.value === `scoped:${federatedScopeConnectionId.value}`
          )
        ) {
          return `scoped:${federatedScopeConnectionId.value}`
        }
        return 'federated'
      }

      const directId =
        singleSourceMapping.value?.connectionId || databaseSourceMappings.value[0]?.connectionId
      return directId ? `direct:${directId}` : 'federated'
    },
    set(value) {
      if (value === 'federated') {
        markRestoredCurrentKey()
        federatedScopeConnectionId.value = ''
        setRunMode('federated')
        return
      }

      if (value.startsWith('scoped:')) {
        markRestoredCurrentKey()
        const connectionId = value.slice('scoped:'.length)
        if (connectionId) {
          federatedScopeConnectionId.value = connectionId
        }

        setRunMode('federated')
        return
      }

      if (value.startsWith('direct:')) {
        markRestoredCurrentKey()
        federatedScopeConnectionId.value = ''
        const connectionId = value.slice('direct:'.length)
        if (connectionId) {
          setSingleSourceConnectionId(connectionId)
        }
        setRunMode('single')
      }
    }
  })

  const restoredContextKeys = new Set<string>()

  function markRestoredCurrentKey() {
    const key = contextKey.value?.trim()
    if (!key) return
    restoredContextKeys.add(key)
  }

  function restoreExecutionContextForCurrentKey() {
    const key = contextKey.value?.trim()
    if (!key || restoredContextKeys.has(key)) return

    const saved = loadPersistedExecutionContexts()[key]
    if (!saved) {
      markRestoredCurrentKey()
      return
    }

    if (saved === 'federated') {
      executionContextValue.value = saved
      markRestoredCurrentKey()
      return
    }

    if (saved.startsWith('direct:')) {
      const directId = saved.slice('direct:'.length)
      const hasOption = directExecutionOptions.value.some(
        (executionOption) => executionOption.value === saved
      )
      if (!directId) {
        markRestoredCurrentKey()
        return
      }
      if (hasOption) {
        executionContextValue.value = saved
        markRestoredCurrentKey()
      }
      return
    }

    if (saved.startsWith('scoped:')) {
      const scopedId = saved.slice('scoped:'.length)
      const hasOption = scopedExecutionOptions.value.some(
        (executionOption) => executionOption.value === saved
      )
      if (!scopedId) {
        markRestoredCurrentKey()
        return
      }
      if (hasOption) {
        executionContextValue.value = saved
        markRestoredCurrentKey()
      }
      return
    }

    markRestoredCurrentKey()
  }

  watch(
    [
      () => contextKey.value,
      () => selectedConnections.value.length,
      () => databaseSourceMappings.value.length,
      () => scopedExecutionOptions.value.length,
      () => directExecutionOptions.value.length
    ],
    restoreExecutionContextForCurrentKey,
    { immediate: true }
  )

  watch(
    [() => contextKey.value, () => executionContextValue.value],
    ([key, value]) => {
      const contextStorageKey = key?.trim()
      if (!contextStorageKey) return
      if (!restoredContextKeys.has(contextStorageKey)) return

      const saved = loadPersistedExecutionContexts()
      saved[contextStorageKey] = value
      persistExecutionContexts(saved)
    },
    { immediate: true }
  )

  const singleExecutionLabel = computed(() => {
    if (runMode.value === 'federated') {
      if (federatedScopeConnectionId.value) {
        const mapping = selectedConnections.value.find(
          (selectedMapping) => selectedMapping.connectionId === federatedScopeConnectionId.value
        )
        const connectionName = mapping ? getConnectionName(mapping.connectionId) : null
        if (mapping) {
          return `Executing: Files: ${mapping.alias || 'files'} · ${connectionName || mapping.connectionId}`
        }
      }
      return 'Executing: Multi-source'
    }

    if (mode.value === 'file') {
      const fileMapping =
        selectedConnections.value.find((selectedMapping) => !isDatabaseMapping(selectedMapping)) ||
        selectedConnections.value[0]
      const alias = fileMapping?.alias || 'files'
      return `Executing: Files: ${alias}`
    }

    const mapping = singleSourceMapping.value || databaseSourceMappings.value[0]
    if (!mapping) return 'Executing: Single source'

    const alias = mapping.alias || 'db'
    const databaseType = getDatabaseTypeDisplay(mapping.connectionId)
    const typePart = databaseType ? ` (${databaseType})` : ''
    return `Executing: Database: ${alias}${typePart}`
  })

  return {
    showUnifiedExecutionSelector,
    executionContextOptions,
    executionContextValue,
    singleExecutionLabel
  }
}
