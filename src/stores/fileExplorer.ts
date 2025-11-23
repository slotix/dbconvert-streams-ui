import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { listDirectory, type FileSystemEntry } from '@/api/fileSystem'
import { getFileMetadata, configureS3Session, listS3Objects, listS3Buckets } from '@/api/files'
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
  const expandedFoldersByConnection = ref<Record<string, Set<string>>>({})

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

  const isFolderExpanded = computed(() => {
    return (connectionId: string, folderPath: string): boolean => {
      return expandedFoldersByConnection.value[connectionId]?.has(folderPath) || false
    }
  })

  // Helper functions
  function isFilesConnectionType(connId: string | null | undefined): boolean {
    if (!connId) return false
    const connectionsStore = useConnectionsStore()
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    const connType = (conn?.type || '').toLowerCase()
    return connType === 'files' || connType === 'localfiles'
  }

  function isS3ConnectionType(connId: string | null | undefined): boolean {
    if (!connId) return false
    const connectionsStore = useConnectionsStore()
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    const provider = conn?.storage_config?.provider?.toLowerCase()
    return provider === 's3'
  }

  function parseS3Uri(uri: string): { bucket: string; prefix: string } | null {
    const match = uri.match(/^s3:\/\/([^/]+)(\/(.*))?$/)
    if (!match) return null
    const rawPrefix = match[3] || ''
    const prefix = rawPrefix.replace(/^\/+/, '')
    return { bucket: match[1], prefix }
  }

  function buildS3RequestPrefix(prefix: string): string | undefined {
    if (!prefix) return undefined
    const trimmed = prefix.replace(/^\/+/, '')
    if (!trimmed) return undefined
    return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
  }

  function getS3UriFromConnection(connection: Connection): string {
    return connection.storage_config?.uri || ''
  }

  function resolveConnectionFolderPath(connection: Connection): string {
    return getS3UriFromConnection(connection)
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
    const folderPath = resolveConnectionFolderPath(connection)
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
      const isS3 = folderPath.startsWith('s3://')

      if (isS3) {
        await configureS3SessionForConnection(connection)

        // Parse bucket and prefix from URI (e.g., s3://my-bucket/prefix or s3://)
        const uri: string = folderPath

        // Check if URI is just "s3://" (no bucket specified - browse all buckets)
        if (uri === 's3://') {
          // List all buckets
          const response = await listS3Buckets()

          // Convert buckets to FileSystemEntry format
          const entries: FileSystemEntry[] = response.buckets.map((bucketName) => ({
            name: bucketName,
            path: `s3://${bucketName}`,
            isDirectory: true,
            type: 'dir' as const,
            size: 0
          }))

          entriesByConnection.value = {
            ...entriesByConnection.value,
            [connectionId]: entries
          }
          directoryPathsByConnection.value = {
            ...directoryPathsByConnection.value,
            [connectionId]: uri
          }
          errorsByConnection.value = {
            ...errorsByConnection.value,
            [connectionId]: ''
          }
          return
        }

        // Parse bucket and prefix from URI
        const parsed = parseS3Uri(uri)
        if (!parsed) {
          throw new Error('Invalid S3 URI format. Expected s3://bucket-name/optional-prefix')
        }

        const bucket = parsed.bucket
        const prefix = parsed.prefix
        const requestPrefix = buildS3RequestPrefix(prefix)

        // List S3 objects
        const response = await listS3Objects({
          bucket,
          prefix: requestPrefix,
          maxKeys: 1000
        })

        // Group S3 objects into folders and files at the root level
        const entries = groupS3ObjectsIntoTree(response.objects, bucket, prefix)

        entriesByConnection.value = {
          ...entriesByConnection.value,
          [connectionId]: entries
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
        // Keep both files AND directories for nested browsing
        const entries = response.entries

        entriesByConnection.value = {
          ...entriesByConnection.value,
          [connectionId]: entries
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
      const fileFormat = fileEntry.format || getFileFormat(fileEntry.name)
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

  function clearAllSelectionsExcept(connectionId: string) {
    const newSelected: Record<string, string | null> = {}
    // Keep only the selection for the specified connection
    for (const key in selectedPathsByConnection.value) {
      newSelected[key] = key === connectionId ? selectedPathsByConnection.value[key] : null
    }
    selectedPathsByConnection.value = newSelected
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
    const storageConfig = connection.storage_config
    if (!storageConfig || storageConfig.provider?.toLowerCase() !== 's3') {
      return
    }

    if (s3SessionConfigured.value && s3CurrentConnection.value?.id === connection.id) {
      return
    }

    const storedCredentials = storageConfig.credentials
    const hasCredentials = storedCredentials && storedCredentials.aws_access_key

    const hasCustomEndpoint = !!storageConfig.endpoint
    const inferredUrlStyle =
      storageConfig.options?.urlStyle === 'virtual' ||
      storageConfig.options?.urlStyle === 'path' ||
      storageConfig.options?.urlStyle === 'auto'
        ? storageConfig.options.urlStyle
        : hasCustomEndpoint
          ? 'path'
          : 'auto'

    const config: S3ConfigRequest = {
      credentialSource: hasCredentials ? 'static' : 'aws',
      region: storageConfig.region || 'us-east-1',
      endpoint: storageConfig.endpoint || undefined,
      urlStyle: inferredUrlStyle,
      useSSL: hasCustomEndpoint ? !storageConfig.endpoint!.includes('localhost') : true,
      credentials: hasCredentials
        ? {
            accessKeyId: storedCredentials!.aws_access_key || '',
            secretAccessKey: storedCredentials!.aws_secret_key || '',
            sessionToken: storedCredentials!.aws_session_token
          }
        : undefined
    }

    await configureS3Session(config)
    s3SessionConfigured.value = true
    s3CurrentConnection.value = connection
  }

  async function loadS3Files(bucket: string, prefix?: string) {
    const result = await listS3Objects({
      bucket,
      prefix: prefix ? buildS3RequestPrefix(prefix) : undefined,
      maxKeys: 1000
    })

    // Convert S3 objects to FileSystemEntry format
    const entries: FileSystemEntry[] = result.objects.map((obj) => ({
      name: obj.key.split('/').pop() || obj.key,
      path: `s3://${bucket}/${obj.key}`,
      type: obj.key.endsWith('/') ? 'dir' : 'file',
      size: obj.size
    }))

    return entries
  }

  // Folder expansion management
  function toggleFolder(connectionId: string, folderPath: string) {
    if (!expandedFoldersByConnection.value[connectionId]) {
      expandedFoldersByConnection.value[connectionId] = new Set()
    }

    const expandedSet = expandedFoldersByConnection.value[connectionId]
    if (expandedSet.has(folderPath)) {
      expandedSet.delete(folderPath)
    } else {
      expandedSet.add(folderPath)
    }
  }

  function collapseFolder(connectionId: string, folderPath: string) {
    expandedFoldersByConnection.value[connectionId]?.delete(folderPath)
  }

  function expandFolder(connectionId: string, folderPath: string) {
    if (!expandedFoldersByConnection.value[connectionId]) {
      expandedFoldersByConnection.value[connectionId] = new Set()
    }
    expandedFoldersByConnection.value[connectionId].add(folderPath)
  }

  // Helper to find and update a folder entry in the nested structure
  function findFolderEntry(entries: FileSystemEntry[], folderPath: string): FileSystemEntry | null {
    for (const entry of entries) {
      if (entry.path === folderPath) {
        return entry
      }
      if (entry.children) {
        const found = findFolderEntry(entry.children, folderPath)
        if (found) return found
      }
    }
    return null
  }

  // Load contents of a specific folder
  async function loadFolderContents(connectionId: string, folderPath: string) {
    const connectionsStore = useConnectionsStore()
    const connection = connectionsStore.connections.find((c) => c.id === connectionId)
    if (!connection) return

    try {
      const isS3 = folderPath.startsWith('s3://')

      if (isS3) {
        // For S3, extract bucket and prefix from folder path
        const parsed = parseS3Uri(folderPath)
        if (!parsed) return

        const bucket = parsed.bucket
        const prefix = parsed.prefix

        await configureS3SessionForConnection(connection)

        // List objects under this prefix
        const response = await listS3Objects({
          bucket,
          prefix: prefix ? buildS3RequestPrefix(prefix) : undefined,
          maxKeys: 1000
        })

        // Group S3 objects into folders and files
        const folderContents = groupS3ObjectsIntoTree(response.objects, bucket, prefix)

        // Find the folder entry and update its children
        const allEntries = entriesByConnection.value[connectionId] || []
        const folderEntry = findFolderEntry(allEntries, folderPath)
        if (folderEntry) {
          folderEntry.children = folderContents
          folderEntry.isLoaded = true
          // Trigger reactivity
          entriesByConnection.value = { ...entriesByConnection.value }
        }
      } else {
        // Local filesystem
        const response = await listDirectory(folderPath, connection.type)

        // Find the folder entry and update its children
        const allEntries = entriesByConnection.value[connectionId] || []
        const folderEntry = findFolderEntry(allEntries, folderPath)
        if (folderEntry) {
          folderEntry.children = response.entries
          folderEntry.isLoaded = true
          // Trigger reactivity
          entriesByConnection.value = { ...entriesByConnection.value }
        }
      }

      // Expand the folder
      expandFolder(connectionId, folderPath)
    } catch (error) {
      console.error('Failed to load folder contents:', error)
    }
  }

  // Helper to group S3 objects into folders and files at the current level
  function groupS3ObjectsIntoTree(
    objects: Array<{ key: string; size: number }>,
    bucket: string,
    currentPrefix: string
  ): FileSystemEntry[] {
    const entries: FileSystemEntry[] = []
    const seen = new Set<string>()

    // Normalize prefix (remove trailing slash for comparison)
    const normalizedPrefix = currentPrefix.endsWith('/')
      ? currentPrefix.slice(0, -1)
      : currentPrefix

    for (const obj of objects) {
      // Get the relative path from current prefix
      let relativePath = obj.key
      if (normalizedPrefix && obj.key.startsWith(normalizedPrefix + '/')) {
        relativePath = obj.key.substring(normalizedPrefix.length + 1)
      } else if (normalizedPrefix === obj.key) {
        continue // Skip the prefix itself
      }

      // Find the first segment (immediate child)
      const firstSlash = relativePath.indexOf('/')
      const isFolder = firstSlash !== -1

      if (isFolder) {
        // This is a folder
        const folderName = relativePath.substring(0, firstSlash)
        if (!seen.has(folderName)) {
          seen.add(folderName)
          entries.push({
            name: folderName,
            path: `s3://${bucket}/${normalizedPrefix ? normalizedPrefix + '/' : ''}${folderName}`,
            type: 'dir',
            children: [],
            isLoaded: false
          })
        }
      } else {
        // This is a file at the current level
        const fileName = relativePath
        if (!seen.has(fileName) && fileName) {
          seen.add(fileName)
          entries.push({
            name: fileName,
            path: `s3://${bucket}/${obj.key}`,
            type: 'file',
            size: obj.size
          })
        }
      }
    }

    return entries
  }

  return {
    // State
    entriesByConnection,
    directoryPathsByConnection,
    errorsByConnection,
    selectedPathsByConnection,
    loadingByConnection,
    expandedFoldersByConnection,
    s3SessionConfigured,
    s3CurrentConnection,

    // Getters
    getEntries,
    getDirectoryPath,
    getError,
    getSelectedPath,
    isLoading,
    isFolderExpanded,

    // Actions
    isFilesConnectionType,
    isS3ConnectionType,
    loadEntries,
    loadFileMetadata,
    setSelectedPath,
    clearSelection,
    clearAllSelectionsExcept,
    clearConnectionData,
    configureS3SessionForConnection,
    loadS3Files,
    toggleFolder,
    collapseFolder,
    expandFolder,
    loadFolderContents
  }
})
