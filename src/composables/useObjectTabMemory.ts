import { useStorage } from '@vueuse/core'

/**
 * Remembers the last active subtab for each object across sessions
 */
export function useObjectTabMemory() {
  // Store object -> last used tab mapping
  const objectTabMemory = useStorage<Record<string, 'data' | 'structure'>>(
    'objectTabMemory',
    {},
    localStorage,
    {
      serializer: {
        read: (value: string) => {
          try {
            return JSON.parse(value)
          } catch {
            return {}
          }
        },
        write: (value: Record<string, 'data' | 'structure'>) => JSON.stringify(value)
      }
    }
  )

  /**
   * Generate a unique key for an object
   */
  function getObjectKey(
    connectionId: string,
    objectType: 'database' | 'file',
    identifier: string
  ): string {
    return `${connectionId}:${objectType}:${identifier}`
  }

  /**
   * Get the last used tab for a database object
   */
  function getLastTabForDatabase(
    connectionId: string,
    database: string,
    schema: string | undefined,
    name: string
  ): 'data' | 'structure' | null {
    const key = getObjectKey(connectionId, 'database', `${database}:${schema || ''}:${name}`)
    return objectTabMemory.value[key] || null
  }

  /**
   * Get the last used tab for a file object
   */
  function getLastTabForFile(connectionId: string, filePath: string): 'data' | 'structure' | null {
    const key = getObjectKey(connectionId, 'file', filePath)
    return objectTabMemory.value[key] || null
  }

  /**
   * Remember the last used tab for a database object
   */
  function rememberTabForDatabase(
    connectionId: string,
    database: string,
    schema: string | undefined,
    name: string,
    tab: 'data' | 'structure'
  ) {
    const key = getObjectKey(connectionId, 'database', `${database}:${schema || ''}:${name}`)
    objectTabMemory.value[key] = tab
  }

  /**
   * Remember the last used tab for a file object
   */
  function rememberTabForFile(connectionId: string, filePath: string, tab: 'data' | 'structure') {
    const key = getObjectKey(connectionId, 'file', filePath)
    objectTabMemory.value[key] = tab
  }

  /**
   * Get the preferred tab for any object (fallback to 'data' if no memory)
   */
  function getPreferredTab(
    connectionId: string,
    objectType: 'database' | 'file',
    identifier: { database?: string; schema?: string; name?: string; filePath?: string },
    defaultTab?: 'data' | 'structure'
  ): 'data' | 'structure' {
    let rememberedTab: 'data' | 'structure' | null = null

    if (objectType === 'database' && identifier.database && identifier.name) {
      rememberedTab = getLastTabForDatabase(
        connectionId,
        identifier.database,
        identifier.schema,
        identifier.name
      )
    } else if (objectType === 'file' && identifier.filePath) {
      rememberedTab = getLastTabForFile(connectionId, identifier.filePath)
    }

    return rememberedTab || defaultTab || 'data'
  }

  /**
   * Remember the tab choice for any object
   */
  function rememberTab(
    connectionId: string,
    objectType: 'database' | 'file',
    identifier: { database?: string; schema?: string; name?: string; filePath?: string },
    tab: 'data' | 'structure'
  ) {
    if (objectType === 'database' && identifier.database && identifier.name) {
      rememberTabForDatabase(
        connectionId,
        identifier.database,
        identifier.schema,
        identifier.name,
        tab
      )
    } else if (objectType === 'file' && identifier.filePath) {
      rememberTabForFile(connectionId, identifier.filePath, tab)
    }
  }

  return {
    getPreferredTab,
    rememberTab,
    // Individual methods for specific use cases
    getLastTabForDatabase,
    getLastTabForFile,
    rememberTabForDatabase,
    rememberTabForFile
  }
}
