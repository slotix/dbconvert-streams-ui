import { defineStore } from 'pinia'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileMetadata } from '@/types/files'

type ObjectType = 'table' | 'view'
type DefaultTab = 'structure' | 'data'

export interface SplitDatabaseContent {
  type: 'database'
  connectionId: string
  database: string
  schema?: string
  objectType: ObjectType
  objectName: string
  meta: SQLTableMeta | SQLViewMeta
  defaultTab?: DefaultTab
}

export interface SplitFileContent {
  type: 'file'
  connectionId: string
  entry: FileSystemEntry
  metadata?: FileMetadata
  defaultTab?: DefaultTab
}

export type SplitContent = SplitDatabaseContent | SplitFileContent

/**
 * Pinia store for split view content management
 * Handles what content is displayed in the right split pane
 */
export const useSplitViewStore = defineStore('splitView', {
  state: () => ({
    // Current split content (null when split is closed)
    splitContent: null as SplitContent | null,

    // Default tab for new content
    defaultTab: 'structure' as DefaultTab
  }),

  getters: {
    /**
     * Whether the split pane has content
     */
    hasContent: (state) => state.splitContent !== null,

    /**
     * Whether the split content is a database object
     */
    isDatabaseContent: (state) => state.splitContent?.type === 'database',

    /**
     * Whether the split content is a file
     */
    isFileContent: (state) => state.splitContent?.type === 'file',

    /**
     * Get the connection ID for the current split content
     */
    connectionId: (state) => state.splitContent?.connectionId || null,

    /**
     * Get database content (null if not database type)
     */
    databaseContent: (state): SplitDatabaseContent | null => {
      return state.splitContent?.type === 'database' ? state.splitContent : null
    },

    /**
     * Get file content (null if not file type)
     */
    fileContent: (state): SplitFileContent | null => {
      return state.splitContent?.type === 'file' ? state.splitContent : null
    }
  },

  actions: {
    /**
     * Set database object content in split pane
     */
    setSplitDatabaseContent(payload: {
      connectionId: string
      database: string
      schema?: string
      type: ObjectType
      name: string
      meta: SQLTableMeta | SQLViewMeta
      defaultTab?: DefaultTab
    }) {
      this.splitContent = {
        type: 'database',
        connectionId: payload.connectionId,
        database: payload.database,
        schema: payload.schema,
        objectType: payload.type,
        objectName: payload.name,
        meta: payload.meta,
        defaultTab: payload.defaultTab || this.defaultTab
      }
    },

    /**
     * Set file content in split pane
     */
    setSplitFileContent(payload: {
      connectionId: string
      entry: FileSystemEntry
      metadata?: FileMetadata
      defaultTab?: DefaultTab
    }) {
      this.splitContent = {
        type: 'file',
        connectionId: payload.connectionId,
        entry: payload.entry,
        metadata: payload.metadata,
        defaultTab: payload.defaultTab || this.defaultTab
      }
    },

    /**
     * Clear split content (close split pane)
     */
    clearSplit() {
      this.splitContent = null
    },

    /**
     * Set the default tab for new content
     */
    setDefaultTab(tab: DefaultTab) {
      this.defaultTab = tab
    }
  }
})
