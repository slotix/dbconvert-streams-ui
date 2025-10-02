import { ref } from 'vue'
import { listDirectory, type FileSystemEntry } from '@/api/fileSystem'
import { getFileMetadata } from '@/api/files'
import { getFileFormat } from '@/utils/fileFormat'
import { useConnectionsStore } from '@/stores/connections'
import type { FileMetadata } from '@/types/files'

export function useFileOperations() {
  const connectionsStore = useConnectionsStore()

  // File connections state
  const fileEntriesByConnection = ref<Record<string, FileSystemEntry[]>>({})
  const fileDirectoryPathsByConnection = ref<Record<string, string>>({})
  const fileEntryErrorsByConnection = ref<Record<string, string>>({})
  const selectedFilePathsByConnection = ref<Record<string, string | null>>({})

  function isFilesConnectionType(connId: string | null | undefined): boolean {
    if (!connId) return false
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    return (conn?.type || '').toLowerCase().includes('file')
  }

  async function loadFileEntries(connectionId: string, force = false) {
    if (!connectionId) return
    if (!force && fileEntriesByConnection.value[connectionId]) return
    if (!isFilesConnectionType(connectionId)) return

    const connection = connectionsStore.connections.find((c) => c.id === connectionId)
    if (!connection) return

    if (!connection.path) {
      fileEntriesByConnection.value = {
        ...fileEntriesByConnection.value,
        [connectionId]: []
      }
      fileDirectoryPathsByConnection.value = {
        ...fileDirectoryPathsByConnection.value,
        [connectionId]: ''
      }
      fileEntryErrorsByConnection.value = {
        ...fileEntryErrorsByConnection.value,
        [connectionId]: 'Connection has no folder path configured.'
      }
      selectedFilePathsByConnection.value = {
        ...selectedFilePathsByConnection.value,
        [connectionId]: null
      }
      return
    }

    try {
      const response = await listDirectory(connection.path)
      const files = response.entries.filter((entry) => entry.type === 'file')

      fileEntriesByConnection.value = {
        ...fileEntriesByConnection.value,
        [connectionId]: files
      }
      fileDirectoryPathsByConnection.value = {
        ...fileDirectoryPathsByConnection.value,
        [connectionId]: response.path
      }
      fileEntryErrorsByConnection.value = {
        ...fileEntryErrorsByConnection.value,
        [connectionId]: ''
      }

      // Don't auto-select any files - let user explicitly select
    } catch (error: unknown) {
      fileEntriesByConnection.value = {
        ...fileEntriesByConnection.value,
        [connectionId]: []
      }
      fileDirectoryPathsByConnection.value = {
        ...fileDirectoryPathsByConnection.value,
        [connectionId]: connection.path || ''
      }
      fileEntryErrorsByConnection.value = {
        ...fileEntryErrorsByConnection.value,
        [connectionId]: (error as Error).message || 'Failed to load files'
      }
      selectedFilePathsByConnection.value = {
        ...selectedFilePathsByConnection.value,
        [connectionId]: null
      }
    }
  }

  async function loadFileMetadata(fileEntry: FileSystemEntry): Promise<FileMetadata | null> {
    try {
      const fileFormat = getFileFormat(fileEntry.name)
      if (!fileFormat) {
        console.warn('Unable to determine file format for:', fileEntry.name)
        return null
      }

      const metadata = await getFileMetadata(fileEntry.path, fileFormat)
      return metadata
    } catch (error) {
      console.error('Failed to load file metadata:', error)
      return null
    }
  }

  function getFileEntriesForConnection(connectionId: string): FileSystemEntry[] {
    return fileEntriesByConnection.value[connectionId] || []
  }

  function clearFileSelectionForConnection(connectionId: string) {
    selectedFilePathsByConnection.value = {
      ...selectedFilePathsByConnection.value,
      [connectionId]: null
    }
  }

  function setFileSelectionForConnection(connectionId: string, filePath: string | null) {
    selectedFilePathsByConnection.value = {
      ...selectedFilePathsByConnection.value,
      [connectionId]: filePath
    }
  }

  return {
    // State
    fileEntriesByConnection,
    fileDirectoryPathsByConnection,
    fileEntryErrorsByConnection,
    selectedFilePathsByConnection,

    // Methods
    isFilesConnectionType,
    loadFileEntries,
    loadFileMetadata,
    getFileEntriesForConnection,
    clearFileSelectionForConnection,
    setFileSelectionForConnection
  }
}
