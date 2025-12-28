import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { listDirectory, type FileSystemEntry } from '@/api/fileSystem'
import { getFileMetadata, configureS3Session, listS3Objects, listS3Buckets } from '@/api/files'
import { getFileFormat, type FileFormat } from '@/utils/fileFormat'
import { useConnectionsStore } from '@/stores/connections'
import { getConnectionKindFromSpec, isFileBasedKind } from '@/types/specs'
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
  const pendingMetadataRequests = new Map<string, Promise<FileMetadata | null>>()

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

  // Helper functions - use spec-only detection (no connection.type fallback)
  function isFilesConnectionType(connId: string | null | undefined): boolean {
    if (!connId) return false
    const connectionsStore = useConnectionsStore()
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    if (!conn) return false
    const kind = getConnectionKindFromSpec(conn.spec)
    return isFileBasedKind(kind)
  }

  function isS3ConnectionType(connId: string | null | undefined): boolean {
    if (!connId) return false
    const connectionsStore = useConnectionsStore()
    const conn = connectionsStore.connections.find((c) => c.id === connId)
    return getConnectionKindFromSpec(conn?.spec) === 's3'
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
    // Try to build S3 URI from spec.s3.scope
    const s3Spec = connection.spec?.s3
    if (s3Spec) {
      // If bucket is specified, use bucket/prefix path
      if (s3Spec.scope?.bucket) {
        const bucket = s3Spec.scope.bucket
        const prefix = s3Spec.scope.prefix || ''
        return `s3://${bucket}${prefix ? '/' + prefix : ''}`
      }
      // S3 connection without scoped bucket - return s3:// to browse all buckets
      return 's3://'
    }
    // Try spec.files.basePath for local file connections
    const filesSpec = connection.spec?.files
    if (filesSpec?.basePath) {
      return filesSpec.basePath
    }
    return ''
  }

  function resolveConnectionFolderPath(connection: Connection): string {
    return getS3UriFromConnection(connection)
  }

  // Actions
  async function loadEntries(connectionId: string, force = false, overridePath?: string) {
    if (!connectionId) return
    if (!force && entriesByConnection.value[connectionId] && !overridePath) return
    // Support both local files and S3 connections.
    if (!isFilesConnectionType(connectionId)) return

    const connectionsStore = useConnectionsStore()
    const connection = connectionsStore.connections.find((c) => c.id === connectionId)
    if (!connection) return
    const kind = getConnectionKindFromSpec(connection.spec)
    if (kind === 'gcs' || kind === 'azure') {
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
        [connectionId]: 'GCS/Azure browsing is not supported yet.'
      }
      selectedPathsByConnection.value = {
        ...selectedPathsByConnection.value,
        [connectionId]: null
      }
      return
    }

    // Handle missing path
    const folderPath = overridePath || resolveConnectionFolderPath(connection)
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
          const response = await listS3Buckets(connectionId)

          // Convert buckets to FileSystemEntry format
          const entries: FileSystemEntry[] = response.buckets.map((bucketName) => ({
            name: bucketName,
            path: `s3://${bucketName}`,
            isDirectory: true,
            type: 'dir' as const,
            isBucket: true,
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

        // List S3 objects recursively, then group into a tree.
        // This is required to detect "table folders" (folders containing uniform data files)
        // so the Explorer can open a consolidated DuckDB view for a folder.
        const response = await listS3Objects({
          bucket,
          prefix: requestPrefix,
          maxKeys: 1000,
          connectionId,
          recursive: true
        })

        const entries = groupS3ObjectsIntoTree(response.objects || [], bucket, requestPrefix || '')

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
        const kind = getConnectionKindFromSpec(connection.spec)
        if (kind !== 'files') {
          throw new Error('Unsupported file explorer connection type')
        }
        const response = await listDirectory(folderPath, kind)
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
    computeStats: boolean = true,
    connectionId?: string
  ): Promise<FileMetadata | null> {
    const requestKey = `${fileEntry.path}::${computeStats ? 'stats' : 'basic'}`
    if (pendingMetadataRequests.has(requestKey)) {
      return pendingMetadataRequests.get(requestKey)!
    }

    const requestPromise = (async () => {
      try {
        const fileFormat = fileEntry.format || getFileFormat(fileEntry.name)
        if (!fileFormat) {
          console.warn('Unable to determine file format for:', fileEntry.name)
          return null
        }

        const metadata = await getFileMetadata(
          fileEntry.path,
          fileFormat,
          computeStats,
          connectionId
        )
        return metadata
      } catch (error) {
        console.error('Failed to load file metadata:', error)
        return null
      } finally {
        pendingMetadataRequests.delete(requestKey)
      }
    })()

    pendingMetadataRequests.set(requestKey, requestPromise)
    return requestPromise
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
    pendingMetadataRequests.clear()
  }

  // S3-specific actions
  async function configureS3SessionForConnection(connection: Connection) {
    // Get S3 config from spec.s3 (S3 connections use dedicated spec)
    const s3Spec = connection.spec?.s3

    if (!s3Spec) {
      return
    }

    if (s3SessionConfigured.value && s3CurrentConnection.value?.id === connection.id) {
      return
    }

    // Get credentials from spec.s3
    const hasCredentials = s3Spec.credentials?.accessKey && s3Spec.credentials?.secretKey
    const hasCustomEndpoint = !!s3Spec.endpoint

    const inferredUrlStyle = hasCustomEndpoint ? 'path' : 'auto'

    const config: S3ConfigRequest = {
      credentialSource: hasCredentials ? 'static' : 'aws',
      region: s3Spec.region || 'us-east-1',
      endpoint: s3Spec.endpoint || undefined,
      urlStyle: inferredUrlStyle,
      useSSL: hasCustomEndpoint ? !s3Spec.endpoint!.includes('localhost') : true,
      credentials: hasCredentials
        ? {
            accessKeyId: s3Spec.credentials!.accessKey || '',
            secretAccessKey: s3Spec.credentials!.secretKey || '',
            sessionToken: s3Spec.credentials!.sessionToken
          }
        : undefined
    }

    await configureS3Session(config)
    s3SessionConfigured.value = true
    s3CurrentConnection.value = connection
  }

  async function loadS3Files(bucket: string, prefix?: string, connectionId?: string) {
    const result = await listS3Objects({
      bucket,
      prefix: prefix ? buildS3RequestPrefix(prefix) : undefined,
      maxKeys: 1000,
      connectionId
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

  // Immutable helper to update a folder's children in the tree
  // Returns a new array with the updated entry (no mutation)
  function updateFolderChildren(
    entries: FileSystemEntry[],
    folderPath: string,
    children: FileSystemEntry[]
  ): FileSystemEntry[] {
    return entries.map((entry) => {
      if (entry.path === folderPath) {
        // Found the folder - return new object with updated children
        return { ...entry, children, isLoaded: true }
      }
      if (entry.children) {
        // Recurse into children
        const updatedChildren = updateFolderChildren(entry.children, folderPath, children)
        if (updatedChildren !== entry.children) {
          // Children were updated - return new object
          return { ...entry, children: updatedChildren }
        }
      }
      // No change - return same object
      return entry
    })
  }

  // Load contents of a specific folder
  async function loadFolderContents(connectionId: string, folderPath: string) {
    const connectionsStore = useConnectionsStore()
    const connection = connectionsStore.connections.find((c) => c.id === connectionId)
    if (!connection) return
    const kind = getConnectionKindFromSpec(connection.spec)
    if (kind === 'gcs' || kind === 'azure') {
      errorsByConnection.value = {
        ...errorsByConnection.value,
        [connectionId]: 'GCS/Azure browsing is not supported yet.'
      }
      return
    }

    try {
      const isS3 = folderPath.startsWith('s3://')

      if (isS3) {
        // For S3, extract bucket and prefix from folder path
        const parsed = parseS3Uri(folderPath)
        if (!parsed) return

        const bucket = parsed.bucket
        const prefix = parsed.prefix

        await configureS3SessionForConnection(connection)

        const requestPrefix = prefix ? buildS3RequestPrefix(prefix) : undefined

        // Recursive list + grouping is required to mark table folders (entry.isTable)
        // so clicking a folder can open a consolidated DuckDB view.
        const response = await listS3Objects({
          bucket,
          prefix: requestPrefix,
          maxKeys: 1000,
          connectionId,
          recursive: true
        })

        const folderContents = groupS3ObjectsIntoTree(
          response.objects || [],
          bucket,
          requestPrefix || ''
        )

        // Update folder children immutably (single source of truth)
        const currentEntries = entriesByConnection.value[connectionId] || []
        const updatedEntries = updateFolderChildren(currentEntries, folderPath, folderContents)
        entriesByConnection.value = {
          ...entriesByConnection.value,
          [connectionId]: updatedEntries
        }
      } else {
        // Local filesystem
        if (kind !== 'files') {
          throw new Error('Unsupported file explorer connection type')
        }
        const response = await listDirectory(folderPath, kind)

        // Update folder children immutably (single source of truth)
        const currentEntries = entriesByConnection.value[connectionId] || []
        const updatedEntries = updateFolderChildren(currentEntries, folderPath, response.entries)
        entriesByConnection.value = {
          ...entriesByConnection.value,
          [connectionId]: updatedEntries
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

    // Map to track files in each folder for table detection
    const folderFiles = new Map<string, Array<{ name: string; size: number; fullKey: string }>>()

    // Normalize prefix (remove trailing slash for comparison)
    const normalizedPrefix = currentPrefix.endsWith('/')
      ? currentPrefix.slice(0, -1)
      : currentPrefix

    // First pass: group objects into folders and collect file information
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
            path: `s3://${bucket}/${normalizedPrefix ? normalizedPrefix + '/' : ''}${folderName}/`,
            type: 'dir',
            children: [],
            isLoaded: false
          })

          // Initialize file tracking for this folder
          folderFiles.set(folderName, [])
        }

        // Track files in this folder
        const remainingPath = relativePath.substring(firstSlash + 1)
        const nextSlash = remainingPath.indexOf('/')
        // Only track direct children (files at the immediate level)
        if (nextSlash === -1 && remainingPath) {
          folderFiles.get(folderName)!.push({
            name: remainingPath,
            size: obj.size,
            fullKey: obj.key
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

    // Second pass: detect table folders
    for (const entry of entries) {
      if (entry.type === 'dir') {
        const files = folderFiles.get(entry.name) || []
        const tableInfo = detectTableFolder(files)

        if (tableInfo.isTable) {
          entry.isTable = true
          entry.format = tableInfo.format
          entry.fileCount = tableInfo.fileCount
          entry.size = tableInfo.totalSize
        }
      }
    }

    // Stable UX: folders first, then files, alpha
    entries.sort((a, b) => {
      const at = a.type === 'dir' ? 0 : 1
      const bt = b.type === 'dir' ? 0 : 1
      if (at !== bt) return at - bt
      return (a.name || '').localeCompare(b.name || '')
    })

    return entries
  }

  // Detect if a folder contains part files that should be treated as a table
  function detectTableFolder(files: Array<{ name: string; size: number; fullKey: string }>): {
    isTable: boolean
    format?: FileFormat
    fileCount: number
    totalSize: number
  } {
    if (files.length === 0) {
      return { isTable: false, fileCount: 0, totalSize: 0 }
    }

    // Helper to extract full file extension (e.g., ".csv.zst", ".parquet")
    function getFullExtension(filename: string): string {
      const parts = filename.split('.')
      if (parts.length < 2) return ''

      // Check for compressed extensions
      const lastExt = parts[parts.length - 1].toLowerCase()
      const secondLastExt = parts.length >= 3 ? parts[parts.length - 2].toLowerCase() : ''

      const compressedExts = ['gz', 'gzip', 'zst', 'zstd', 'bz2', 'lz4', 'snappy']
      const dataExts = ['csv', 'json', 'jsonl', 'parquet']

      if (compressedExts.includes(lastExt) && dataExts.includes(secondLastExt)) {
        return `.${secondLastExt}.${lastExt}`
      } else if (dataExts.includes(lastExt)) {
        return `.${lastExt}`
      }

      return ''
    }

    // Helper to get format from extension
    function getFormatFromExtension(ext: string): FileFormat | null {
      if (ext.includes('.csv')) return 'csv'
      if (ext.includes('.json')) return ext.includes('.jsonl') ? 'jsonl' : 'json'
      if (ext.includes('.parquet')) return 'parquet'
      return null
    }

    // Check if all files have the same extension
    const extensions = new Set<string>()
    let totalSize = 0

    for (const file of files) {
      const ext = getFullExtension(file.name)
      if (!ext) return { isTable: false, fileCount: 0, totalSize: 0 }

      extensions.add(ext)
      totalSize += file.size
    }

    // All files must have the same extension
    if (extensions.size !== 1) {
      return { isTable: false, fileCount: 0, totalSize: 0 }
    }

    const extension = Array.from(extensions)[0]
    const format = getFormatFromExtension(extension)

    if (!format) {
      return { isTable: false, fileCount: 0, totalSize: 0 }
    }

    // Consider it a table folder if it has at least 1 file with a supported format
    return {
      isTable: true,
      format,
      fileCount: files.length,
      totalSize
    }
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
