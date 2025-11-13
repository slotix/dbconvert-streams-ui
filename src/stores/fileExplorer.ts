import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { listDirectory, type FileSystemEntry } from '@/api/fileSystem'
import { getFileMetadata, configureS3Session, listS3Objects } from '@/api/files'
import { getFileFormat } from '@/utils/fileFormat'
import { useConnectionsStore } from '@/stores/connections'
import type { FileMetadata } from '@/types/files'
import type { Connection } from '@/types/connections'
import type { S3ConfigRequest } from '@/types/s3'

export const useFileExplorerStore = defineStore('fileExplorer', () => {
  // State - organized by connection ID
  const entriesByConnection = ref<Record<string, FileSystemEntry[]>>({})
  const directoryPathsByConnection = ref<Record<string, string>>({})
  const errorsByConnection = ref<Record<string, string>>({})
  const selectedPathsByConnection = ref<Record<string, string | null>>({})
  const loadingByConnection = ref<Record<string, boolean>>({})

  // S3 session configuration
  const s3SessionConfigured = ref<boolean>(false)
  const s3CurrentConnection = ref<Connection | null>(null)

  // Getters
  const getEntries = computed(() => {
    return (connectionId: string): FileSystemEntry[] => {
      return entriesByConnection.value[connectionId] || []
    }
  })

  const getDirectoryPath = computed(() => {
    return (connectionId: string): string => {
      return directoryPathsByConnection.value[connectionId] || ''
    }
  })

  const getError = computed(() => {
    return (connectionId: string): string => {
      return errorsByConnection.value[connectionId] || ''
    }
  })

  const getSelectedPath = computed(() => {
    return (connectionId: string): string | null => {
      return selectedPathsByConnection.value[connectionId] || null
    }
  })

  const isLoading = computed(() => {
    return (connectionId: string): boolean => {
      return loadingByConnection.value[connectionId] || false
    }
  })

  // Helper functions
  function isFilesConnectionType(connId: string | null | undefined): boolean {
    if (!connId) return false
    const connectionsStore = useConnectionsStore()
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    return (conn?.type || '').toLowerCase() === 'files'
  }

  function isS3ConnectionType(connId: string | null | undefined): boolean {
    if (!connId) return false
    const connectionsStore = useConnectionsStore()
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    // S3 connections have type='files' with storage_config.provider='s3'
    return conn?.storage_config?.provider === 's3'
  }

  // Actions
  async function loadEntries(connectionId: string, force = false) {
    if (!connectionId) return
    if (!force && entriesByConnection.value[connectionId]) return
    if (!isFilesConnectionType(connectionId)) return

    const connectionsStore = useConnectionsStore()
    const connection = connectionsStore.connections.find((c) => c.id === connectionId)
    if (!connection) return

    // Handle missing path
    const folderPath = connection.storage_config?.uri
    if (!folderPath) {
      entriesByConnection.value = {
        ...entriesByConnection.value,
        [connectionId]: []
      }
      directoryPathsByConnection.value = {
        ...directoryPathsByConnection.value,
        [connectionId]: ''
      }
      errorsByConnection.value = {
        ...errorsByConnection.value,
        [connectionId]: 'Connection has no folder path configured.'
      }
      selectedPathsByConnection.value = {
        ...selectedPathsByConnection.value,
        [connectionId]: null
      }
      return
    }

    // Set loading state
    loadingByConnection.value = {
      ...loadingByConnection.value,
      [connectionId]: true
    }

    try {
      // Check if this is an S3 connection
      const isS3 = connection.storage_config?.provider === 's3'

      if (isS3) {
        // Ensure storage_config exists for S3 connections
        if (!connection.storage_config) {
          throw new Error('S3 connection missing storage_config')
        }

        // Configure S3 session first
        const { configureS3Session } = await import('@/api/files')
        const storedCredentials = connection.storage_config.credentials
        const hasCredentials = storedCredentials && storedCredentials.aws_access_key

        await configureS3Session({
          credentialSource: hasCredentials ? 'static' : 'aws',
          credentials: hasCredentials
            ? {
                accessKeyId: storedCredentials.aws_access_key || '',
                secretAccessKey: storedCredentials.aws_secret_key || '',
                sessionToken: storedCredentials.aws_session_token
              }
            : undefined,
          region: connection.storage_config.region || 'us-east-1',
          endpoint: connection.storage_config.endpoint || undefined,
          useSSL: connection.storage_config.endpoint
            ? !connection.storage_config.endpoint.includes('localhost')
            : true
        })

        // Parse bucket and prefix from URI (e.g., s3://my-bucket/prefix)
        const uri: string = connection.storage_config.uri
        const s3Match = uri.match(/^s3:\/\/([^/]+)(\/(.*))?$/)
        if (!s3Match) {
          throw new Error('Invalid S3 URI format. Expected s3://bucket-name/optional-prefix')
        }

        const bucket = s3Match[1]
        const prefix = s3Match[3] || ''

        // List S3 objects
        const { listS3Objects } = await import('@/api/files')
        const response = await listS3Objects({
          bucket,
          prefix,
          maxKeys: 1000
        })

        // Convert S3 objects to file entries
        const files = response.objects.map((obj) => ({
          name: obj.key.split('/').pop() || obj.key,
          path: `s3://${bucket}/${obj.key}`,
          type: 'file' as const,
          size: obj.size
        }))

        entriesByConnection.value = {
          ...entriesByConnection.value,
          [connectionId]: files
        }
        directoryPathsByConnection.value = {
          ...directoryPathsByConnection.value,
          [connectionId]: uri
        }
        errorsByConnection.value = {
          ...errorsByConnection.value,
          [connectionId]: ''
        }
      } else {
        // Local filesystem - use existing logic
        const response = await listDirectory(folderPath, connection.type)
        const files = response.entries.filter((entry) => entry.type === 'file')

        entriesByConnection.value = {
          ...entriesByConnection.value,
          [connectionId]: files
        }
        directoryPathsByConnection.value = {
          ...directoryPathsByConnection.value,
          [connectionId]: response.path
        }
        errorsByConnection.value = {
          ...errorsByConnection.value,
          [connectionId]: ''
        }
      }
    } catch (error: unknown) {
      entriesByConnection.value = {
        ...entriesByConnection.value,
        [connectionId]: []
      }
      directoryPathsByConnection.value = {
        ...directoryPathsByConnection.value,
        [connectionId]: folderPath || ''
      }
      errorsByConnection.value = {
        ...errorsByConnection.value,
        [connectionId]: (error as Error).message || 'Failed to load files'
      }
      selectedPathsByConnection.value = {
        ...selectedPathsByConnection.value,
        [connectionId]: null
      }
    } finally {
      loadingByConnection.value = {
        ...loadingByConnection.value,
        [connectionId]: false
      }
    }
  }

  async function loadFileMetadata(
    fileEntry: FileSystemEntry,
    computeStats: boolean = true
  ): Promise<FileMetadata | null> {
    try {
      const fileFormat = getFileFormat(fileEntry.name)
      if (!fileFormat) {
        console.warn('Unable to determine file format for:', fileEntry.name)
        return null
      }

      const metadata = await getFileMetadata(fileEntry.path, fileFormat, computeStats)
      return metadata
    } catch (error) {
      console.error('Failed to load file metadata:', error)
      return null
    }
  }

  function setSelectedPath(connectionId: string, filePath: string | null) {
    selectedPathsByConnection.value = {
      ...selectedPathsByConnection.value,
      [connectionId]: filePath
    }
  }

  function clearSelection(connectionId: string) {
    selectedPathsByConnection.value = {
      ...selectedPathsByConnection.value,
      [connectionId]: null
    }
  }

  function clearConnectionData(connectionId: string) {
    const newEntries = { ...entriesByConnection.value }
    const newPaths = { ...directoryPathsByConnection.value }
    const newErrors = { ...errorsByConnection.value }
    const newSelected = { ...selectedPathsByConnection.value }
    const newLoading = { ...loadingByConnection.value }

    delete newEntries[connectionId]
    delete newPaths[connectionId]
    delete newErrors[connectionId]
    delete newSelected[connectionId]
    delete newLoading[connectionId]

    entriesByConnection.value = newEntries
    directoryPathsByConnection.value = newPaths
    errorsByConnection.value = newErrors
    selectedPathsByConnection.value = newSelected
    loadingByConnection.value = newLoading
  }

  // S3-specific actions
  async function configureS3SessionForConnection(connection: Connection) {
    if (connection.type.toLowerCase() !== 's3') {
      return
    }

    const config: S3ConfigRequest = {
      credentialSource: connection.s3Config?.credentialSource || 'static',
      region: connection.s3Config?.region || 'us-east-1',
      endpoint: connection.s3Config?.endpoint,
      urlStyle: connection.s3Config?.urlStyle || 'auto',
      useSSL: connection.s3Config?.useSSL !== false,
      credentials:
        connection.username !== 'aws-default'
          ? {
              accessKeyId: connection.username,
              secretAccessKey: connection.password,
              sessionToken: connection.s3Config?.sessionToken
            }
          : undefined
    }

    await configureS3Session(config)
    s3SessionConfigured.value = true
    s3CurrentConnection.value = connection
  }

  async function loadS3Files(bucket: string, prefix?: string) {
    const result = await listS3Objects({ bucket, prefix, maxKeys: 1000 })

    // Convert S3 objects to FileSystemEntry format
    const entries: FileSystemEntry[] = result.objects.map((obj) => ({
      name: obj.key.split('/').pop() || obj.key,
      path: `s3://${bucket}/${obj.key}`,
      type: obj.key.endsWith('/') ? 'dir' : 'file',
      size: obj.size
    }))

    return entries
  }

  return {
    // State
    entriesByConnection,
    directoryPathsByConnection,
    errorsByConnection,
    selectedPathsByConnection,
    loadingByConnection,
    s3SessionConfigured,
    s3CurrentConnection,

    // Getters
    getEntries,
    getDirectoryPath,
    getError,
    getSelectedPath,
    isLoading,

    // Actions
    isFilesConnectionType,
    isS3ConnectionType,
    loadEntries,
    loadFileMetadata,
    setSelectedPath,
    clearSelection,
    clearConnectionData,
    configureS3SessionForConnection,
    loadS3Files
  }
})
