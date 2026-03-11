import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { listDirectory, type FileSystemEntry } from '@/api/fileSystem'
import { getFileMetadata, listS3Objects, listS3Buckets, readS3Manifest } from '@/api/files'
import { getFileFormat } from '@/utils/fileFormat'
import {
  detectTableFolder,
  isManifestMetadataFolder,
  isManifestMetadataPath
} from '@/utils/s3TableDetection'
import { useConnectionsStore } from '@/stores/connections'
import { getConnectionKindFromSpec, isFileBasedKind } from '@/types/specs'
import type { FileMetadata } from '@/types/files'
import type { Connection } from '@/types/connections'
import type { S3ManifestFile, S3ManifestObject } from '@/types/s3'

const EXPANDED_FOLDERS_STORAGE_KEY_BASE = 'explorer.fileExplorer.expandedFolders.v1'

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function getExpandedFoldersStorageKey(): string {
  const apiUrl = window.ENV?.VITE_API_URL || import.meta.env.VITE_API_URL || '/api'
  return `${EXPANDED_FOLDERS_STORAGE_KEY_BASE}:${apiUrl}`
}

function loadPersistedExpandedFolders(): Record<string, Set<string>> {
  if (!hasBrowserStorage()) {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(getExpandedFoldersStorageKey())
    if (!raw) return {}

    const parsed = JSON.parse(raw) as Record<string, unknown>
    const restored: Record<string, Set<string>> = {}

    for (const [connectionId, paths] of Object.entries(parsed)) {
      if (!Array.isArray(paths)) continue
      restored[connectionId] = new Set(
        paths.filter((path): path is string => typeof path === 'string')
      )
    }

    return restored
  } catch (error) {
    console.warn('Failed to load file explorer expanded folders from localStorage:', error)
    return {}
  }
}

function persistExpandedFolders(state: Record<string, Set<string>>) {
  if (!hasBrowserStorage()) {
    return
  }

  try {
    const serialized: Record<string, string[]> = {}
    for (const [connectionId, paths] of Object.entries(state)) {
      serialized[connectionId] = Array.from(paths)
    }
    window.localStorage.setItem(getExpandedFoldersStorageKey(), JSON.stringify(serialized))
  } catch (error) {
    console.warn('Failed to persist file explorer expanded folders to localStorage:', error)
  }
}

export const useFileExplorerStore = defineStore('fileExplorer', () => {
  interface ExpandSubtreeOptions {
    maxFolders?: number
    progressEvery?: number
    onProgress?: (expandedFolders: number, maxFolders: number) => void
  }

  interface ExpandSubtreeResult {
    expandedFolders: number
    truncated: boolean
    maxFolders: number
  }

  interface ManifestFolderState {
    manifestUsed: boolean
    manifestPath?: string
  }

  interface FolderPageState {
    nextToken: string
    isTruncated: boolean
    manifestUsed?: boolean
    manifestPath?: string
  }

  const DEFAULT_MAX_EXPAND_SUBTREE_FOLDERS = 250
  const DEFAULT_EXPAND_SUBTREE_PROGRESS_EVERY = 25

  // State - organized by connection ID
  const entriesByConnection = ref<Record<string, FileSystemEntry[]>>({})
  const directoryPathsByConnection = ref<Record<string, string>>({})
  const errorsByConnection = ref<Record<string, string>>({})
  const selectedPathsByConnection = ref<Record<string, string | null>>({})
  const loadingByConnection = ref<Record<string, boolean>>({})
  const expandedFoldersByConnection = ref<Record<string, Set<string>>>(
    loadPersistedExpandedFolders()
  )
  const folderPagesByConnection = ref<Record<string, Record<string, FolderPageState>>>({})
  const pendingMetadataRequests = new Map<string, Promise<FileMetadata | null>>()

  // S3 operations can be sensitive to shared backend/session state.
  // Serialize S3 list requests across connections to avoid cross-connection interference.
  let s3RequestQueue: Promise<unknown> = Promise.resolve()

  function enqueueS3Request<T>(work: () => Promise<T>): Promise<T> {
    const next = s3RequestQueue.then(work, work)
    s3RequestQueue = next.then(
      () => undefined,
      () => undefined
    )
    return next
  }

  function saveExpandedFolders() {
    persistExpandedFolders(expandedFoldersByConnection.value)
  }

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

  const getFolderPageState = computed(() => {
    return (connectionId: string, folderPath: string): FolderPageState | null => {
      return folderPagesByConnection.value[connectionId]?.[folderPath] || null
    }
  })

  const hasMoreEntries = computed(() => {
    return (connectionId: string, folderPath: string): boolean => {
      return !!folderPagesByConnection.value[connectionId]?.[folderPath]?.isTruncated
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

  function buildS3EntryPath(bucket: string, key: string): string {
    return `s3://${bucket}/${key}`
  }

  function getEntryNameFromPath(path: string): string {
    const trimmed = path.replace(/\/+$/, '')
    const segments = trimmed.split('/').filter(Boolean)
    return segments[segments.length - 1] || path
  }

  function sortEntries(entries: FileSystemEntry[]): FileSystemEntry[] {
    return [...entries].sort((a, b) => {
      const typeOrder = a.type === b.type ? 0 : a.type === 'dir' ? -1 : 1
      if (typeOrder !== 0) {
        return typeOrder
      }
      return (a.name || '').localeCompare(b.name || '')
    })
  }

  function mergeEntries(
    existing: FileSystemEntry[],
    incoming: FileSystemEntry[]
  ): FileSystemEntry[] {
    const merged = new Map<string, FileSystemEntry>()
    for (const entry of existing) {
      merged.set(entry.path, entry)
    }
    for (const entry of incoming) {
      const previous = merged.get(entry.path)
      merged.set(entry.path, previous ? { ...previous, ...entry } : entry)
    }
    return sortEntries(Array.from(merged.values()))
  }

  function setFolderPageState(
    connectionId: string,
    folderPath: string,
    pageState: FolderPageState
  ) {
    folderPagesByConnection.value = {
      ...folderPagesByConnection.value,
      [connectionId]: {
        ...(folderPagesByConnection.value[connectionId] || {}),
        [folderPath]: pageState
      }
    }
  }

  function buildS3LevelEntries(
    bucket: string,
    prefixes: string[],
    objects: Array<{ key: string; size: number }>
  ): FileSystemEntry[] {
    const entries: FileSystemEntry[] = []

    for (const prefix of prefixes) {
      entries.push({
        name: getEntryNameFromPath(prefix),
        path: buildS3EntryPath(bucket, prefix),
        type: 'dir',
        children: [],
        isLoaded: false,
        isManifest: isManifestMetadataFolder(getEntryNameFromPath(prefix))
      })
    }

    for (const object of objects) {
      const objectPath = buildS3EntryPath(bucket, object.key)
      entries.push({
        name: getEntryNameFromPath(object.key),
        path: objectPath,
        type: 'file',
        size: object.size,
        isManifest: isManifestMetadataPath(objectPath)
      })
    }

    return sortEntries(entries)
  }

  function detectDirectTableFolder(children: FileSystemEntry[]): Partial<FileSystemEntry> {
    const files = children
      .filter((entry) => entry.type === 'file')
      .map((entry) => ({
        name: entry.name,
        size: entry.size || 0,
        fullKey: entry.path
      }))

    const tableInfo = detectTableFolder(files, '')
    if (!tableInfo.isTable) {
      return {
        isTable: false,
        format: undefined,
        fileCount: undefined,
        size: undefined
      }
    }

    return {
      isTable: true,
      format: tableInfo.format,
      fileCount: tableInfo.fileCount,
      size: tableInfo.totalSize
    }
  }

  function finalizeManifestTreeEntries(entries: FileSystemEntry[]): FileSystemEntry[] {
    return sortEntries(
      entries.map((entry) => {
        if (entry.type !== 'dir') {
          return entry
        }

        const children = finalizeManifestTreeEntries(entry.children || [])
        const entryPatch = detectDirectTableFolder(children)

        return {
          ...entry,
          children,
          isLoaded: true,
          ...entryPatch
        }
      })
    )
  }

  function buildManifestTreeEntries(
    bucket: string,
    prefix: string,
    manifestPath: string,
    manifest: S3ManifestFile
  ): FileSystemEntry[] {
    const trimmedPrefix = prefix.replace(/^\/+|\/+$/g, '')
    const prefixWithSlash = trimmedPrefix ? `${trimmedPrefix}/` : ''
    const manifestObjectMetadata = new Map<string, S3ManifestObject>()
    const rootEntries: FileSystemEntry[] = []

    for (const object of manifest.objects || []) {
      const trimmedPath = object.path?.trim()
      if (trimmedPath) {
        manifestObjectMetadata.set(trimmedPath, object)
      }
    }

    function upsertDirectory(
      children: FileSystemEntry[],
      key: string,
      name: string
    ): FileSystemEntry {
      const dirPath = buildS3EntryPath(bucket, key)
      const existing = children.find((entry) => entry.type === 'dir' && entry.path === dirPath)
      if (existing) {
        return existing
      }

      const next: FileSystemEntry = {
        name,
        path: dirPath,
        type: 'dir',
        children: [],
        isLoaded: true
      }
      children.push(next)
      return next
    }

    function upsertFile(children: FileSystemEntry[], key: string) {
      const objectPath = buildS3EntryPath(bucket, key)
      if (children.some((entry) => entry.type === 'file' && entry.path === objectPath)) {
        return
      }

      const objectMeta = manifestObjectMetadata.get(objectPath)
      children.push({
        name: getEntryNameFromPath(key),
        path: objectPath,
        type: 'file',
        size: objectMeta?.size,
        isManifest: objectPath === manifestPath || isManifestMetadataPath(objectPath)
      })
    }

    for (const fileURI of manifest.files || []) {
      const parsed = parseS3Uri(fileURI)
      if (!parsed || parsed.bucket !== bucket) {
        continue
      }

      const key = parsed.prefix.replace(/^\/+|\/+$/g, '')
      if (!key) {
        continue
      }
      if (prefixWithSlash && !key.startsWith(prefixWithSlash)) {
        continue
      }

      const relativeKey = prefixWithSlash ? key.slice(prefixWithSlash.length) : key
      const segments = relativeKey.split('/').filter(Boolean)
      if (segments.length === 0) {
        continue
      }

      let currentChildren = rootEntries
      let currentPrefix = prefixWithSlash

      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index]
        const isLast = index === segments.length - 1
        if (isLast) {
          upsertFile(currentChildren, `${currentPrefix}${segment}`)
          break
        }

        const dirKey = `${currentPrefix}${segments.slice(0, index + 1).join('/')}/`
        const directory = upsertDirectory(currentChildren, dirKey, segment)
        currentChildren = directory.children || []
        currentPrefix = dirKey
      }
    }

    const manifestParsed = parseS3Uri(manifestPath)
    if (manifestParsed && manifestParsed.bucket === bucket) {
      const manifestKey = manifestParsed.prefix.replace(/^\/+|\/+$/g, '')
      if (manifestKey && (!prefixWithSlash || manifestKey.startsWith(prefixWithSlash))) {
        const relativeKey = prefixWithSlash
          ? manifestKey.slice(prefixWithSlash.length)
          : manifestKey
        if (relativeKey && !relativeKey.includes('/')) {
          upsertFile(rootEntries, manifestKey)
        }
      }
    }

    return finalizeManifestTreeEntries(rootEntries)
  }

  async function loadManifestTree(
    connectionId: string,
    bucket: string,
    folderPath: string,
    manifestPath: string
  ): Promise<{ entries: FileSystemEntry[]; pageState: FolderPageState }> {
    const parsed = parseS3Uri(folderPath)
    if (!parsed) {
      throw new Error('Invalid S3 folder path')
    }

    const response = await readS3Manifest(manifestPath, connectionId)
    return {
      entries: buildManifestTreeEntries(bucket, parsed.prefix, manifestPath, response.manifest),
      pageState: {
        nextToken: '',
        isTruncated: false,
        manifestUsed: true,
        manifestPath
      }
    }
  }

  async function listS3Level(
    connectionId: string,
    folderPath: string,
    force = false,
    continuationToken?: string
  ) {
    const parsed = parseS3Uri(folderPath)
    if (!parsed) {
      throw new Error('Invalid S3 folder path')
    }

    const requestPrefix = buildS3RequestPrefix(parsed.prefix)
    const response = await listS3Objects({
      bucket: parsed.bucket,
      prefix: requestPrefix,
      maxKeys: 1000,
      connectionId,
      refresh: force,
      recursive: false,
      continuationToken: continuationToken || undefined
    })

    return {
      entries: buildS3LevelEntries(parsed.bucket, response.prefixes || [], response.objects || []),
      pageState: {
        nextToken: response.next_token || '',
        isTruncated: !!response.is_truncated,
        manifestUsed: !!response.manifest_used,
        manifestPath: response.manifest_path
      }
    }
  }

  // Actions
  async function loadEntries(connectionId: string, force = false, overridePath?: string) {
    if (!connectionId) return
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

    // Resolve folder path (may change if connection scope/config changed)
    const folderPath = overridePath || resolveConnectionFolderPath(connection)

    // Fast-path cache: only skip if we already loaded THIS exact folderPath
    if (!force && !overridePath && entriesByConnection.value[connectionId]) {
      const lastPath = directoryPathsByConnection.value[connectionId]
      if (lastPath && folderPath && lastPath === folderPath) {
        return
      }
    }
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
        await enqueueS3Request(async () => {
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
            setFolderPageState(connectionId, uri, {
              nextToken: '',
              isTruncated: false
            })
            return
          }
          const { entries, pageState } = await listS3Level(connectionId, uri, force)
          if (pageState.manifestUsed && pageState.manifestPath && !force) {
            const manifestTree = await loadManifestTree(
              connectionId,
              parseS3Uri(uri)?.bucket || '',
              uri,
              pageState.manifestPath
            )
            entriesByConnection.value = {
              ...entriesByConnection.value,
              [connectionId]: manifestTree.entries
            }
            directoryPathsByConnection.value = {
              ...directoryPathsByConnection.value,
              [connectionId]: uri
            }
            errorsByConnection.value = {
              ...errorsByConnection.value,
              [connectionId]: ''
            }
            setFolderPageState(connectionId, uri, manifestTree.pageState)
            return
          }

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
          setFolderPageState(connectionId, uri, pageState)
        })
      } else {
        // Local filesystem - use existing logic
        const kind = getConnectionKindFromSpec(connection.spec)
        if (kind !== 'files') {
          throw new Error('Unsupported file explorer connection type')
        }
        const response = await listDirectory(folderPath, kind, connectionId)
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
    const newExpandedFolders = { ...expandedFoldersByConnection.value }
    const newFolderPages = { ...folderPagesByConnection.value }

    delete newEntries[connectionId]
    delete newPaths[connectionId]
    delete newErrors[connectionId]
    delete newSelected[connectionId]
    delete newLoading[connectionId]
    delete newExpandedFolders[connectionId]
    delete newFolderPages[connectionId]

    entriesByConnection.value = newEntries
    directoryPathsByConnection.value = newPaths
    errorsByConnection.value = newErrors
    selectedPathsByConnection.value = newSelected
    loadingByConnection.value = newLoading
    expandedFoldersByConnection.value = newExpandedFolders
    folderPagesByConnection.value = newFolderPages
    pendingMetadataRequests.clear()
    saveExpandedFolders()
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
    saveExpandedFolders()
  }

  function collapseFolder(connectionId: string, folderPath: string) {
    expandedFoldersByConnection.value[connectionId]?.delete(folderPath)
    saveExpandedFolders()
  }

  function expandFolder(connectionId: string, folderPath: string) {
    if (!expandedFoldersByConnection.value[connectionId]) {
      expandedFoldersByConnection.value[connectionId] = new Set()
    }
    expandedFoldersByConnection.value[connectionId].add(folderPath)
    saveExpandedFolders()
  }

  function collapseAllFolders(connectionId?: string) {
    if (connectionId) {
      if (!expandedFoldersByConnection.value[connectionId]) return
      expandedFoldersByConnection.value = {
        ...expandedFoldersByConnection.value,
        [connectionId]: new Set()
      }
      saveExpandedFolders()
      return
    }

    const next: Record<string, Set<string>> = {}
    for (const id of Object.keys(expandedFoldersByConnection.value)) {
      next[id] = new Set()
    }
    expandedFoldersByConnection.value = next
    saveExpandedFolders()
  }

  function collapseFolderSubtree(connectionId: string, folderPath: string) {
    const expandedSet = expandedFoldersByConnection.value[connectionId]
    if (!expandedSet) return

    const nextExpanded = new Set<string>()
    const normalizedPrefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`

    for (const path of expandedSet) {
      if (path === folderPath) continue
      if (path.startsWith(normalizedPrefix)) continue
      nextExpanded.add(path)
    }

    expandedFoldersByConnection.value = {
      ...expandedFoldersByConnection.value,
      [connectionId]: nextExpanded
    }
    saveExpandedFolders()
  }

  function findEntryByPath(entries: FileSystemEntry[], targetPath: string): FileSystemEntry | null {
    for (const entry of entries) {
      if (entry.path === targetPath) return entry
      if (entry.children && entry.children.length > 0) {
        const found = findEntryByPath(entry.children, targetPath)
        if (found) return found
      }
    }
    return null
  }

  async function expandFolderSubtree(
    connectionId: string,
    folderPath: string,
    options: ExpandSubtreeOptions = {}
  ): Promise<ExpandSubtreeResult> {
    const maxFolders = Math.max(1, options.maxFolders ?? DEFAULT_MAX_EXPAND_SUBTREE_FOLDERS)
    const progressEvery = Math.max(
      1,
      options.progressEvery ?? DEFAULT_EXPAND_SUBTREE_PROGRESS_EVERY
    )
    let expandedFolders = 0
    let truncated = false

    const reportProgress = () => {
      if (!options.onProgress) return
      if (expandedFolders === 1 || expandedFolders % progressEvery === 0 || truncated) {
        options.onProgress(expandedFolders, maxFolders)
      }
    }

    const expandRecursive = async (path: string) => {
      if (expandedFolders >= maxFolders) {
        truncated = true
        return
      }

      expandedFolders += 1
      reportProgress()
      expandFolder(connectionId, path)

      let folderEntry = findEntryByPath(entriesByConnection.value[connectionId] || [], path)
      if (!folderEntry || folderEntry.type !== 'dir') return

      if (!folderEntry.isLoaded) {
        await loadFolderContents(connectionId, path)
        folderEntry = findEntryByPath(entriesByConnection.value[connectionId] || [], path)
        if (!folderEntry || folderEntry.type !== 'dir') return
      }

      const children = folderEntry.children || []
      for (const child of children) {
        if (expandedFolders >= maxFolders) {
          truncated = true
          break
        }
        if (child.type === 'dir') {
          await expandRecursive(child.path)
        }
      }
    }

    await expandRecursive(folderPath)

    if (truncated) {
      reportProgress()
    }

    return {
      expandedFolders,
      truncated,
      maxFolders
    }
  }

  async function expandConnectionSubtree(
    connectionId: string,
    options: ExpandSubtreeOptions = {}
  ): Promise<ExpandSubtreeResult> {
    const maxFolders = Math.max(1, options.maxFolders ?? DEFAULT_MAX_EXPAND_SUBTREE_FOLDERS)
    let expandedFolders = 0
    let truncated = false

    const reportProgress = () => {
      options.onProgress?.(expandedFolders, maxFolders)
    }

    if (!entriesByConnection.value[connectionId]?.length) {
      await loadEntries(connectionId)
    }

    const roots = entriesByConnection.value[connectionId] || []
    for (const entry of roots) {
      if (expandedFolders >= maxFolders) {
        truncated = true
        break
      }
      if (entry.type === 'dir') {
        let branchReported = 0
        const result = await expandFolderSubtree(connectionId, entry.path, {
          ...options,
          maxFolders: maxFolders - expandedFolders,
          onProgress: (folderProgress) => {
            const delta = Math.max(0, folderProgress - branchReported)
            if (!delta) return
            branchReported = folderProgress
            expandedFolders += delta
            reportProgress()
          }
        })
        // Ensure totals are correct even if progress callback didn't fire at the final count.
        const remainingDelta = Math.max(0, result.expandedFolders - branchReported)
        if (remainingDelta > 0) {
          expandedFolders += remainingDelta
          reportProgress()
        }
        if (result.truncated) {
          truncated = true
          break
        }
      }
    }

    return {
      expandedFolders,
      truncated,
      maxFolders
    }
  }

  function cleanupStaleConnections(validConnectionIds: string[]) {
    const validIdSet = new Set(validConnectionIds)
    const keepValid = <T>(record: Record<string, T>): Record<string, T> => {
      const next: Record<string, T> = {}
      for (const [id, value] of Object.entries(record)) {
        if (validIdSet.has(id)) {
          next[id] = value
        }
      }
      return next
    }

    entriesByConnection.value = keepValid(entriesByConnection.value)
    directoryPathsByConnection.value = keepValid(directoryPathsByConnection.value)
    errorsByConnection.value = keepValid(errorsByConnection.value)
    selectedPathsByConnection.value = keepValid(selectedPathsByConnection.value)
    loadingByConnection.value = keepValid(loadingByConnection.value)
    expandedFoldersByConnection.value = keepValid(expandedFoldersByConnection.value)
    folderPagesByConnection.value = keepValid(folderPagesByConnection.value)
    saveExpandedFolders()
  }

  // Immutable helper to update a folder's children in the tree
  // Returns a new array with the updated entry (no mutation)
  function updateFolderChildren(
    entries: FileSystemEntry[],
    folderPath: string,
    children: FileSystemEntry[],
    manifestState?: ManifestFolderState,
    entryPatch?: Partial<FileSystemEntry>
  ): FileSystemEntry[] {
    return entries.map((entry) => {
      if (entry.path === folderPath) {
        // Found the folder - return new object with updated children
        return {
          ...entry,
          children,
          isLoaded: true,
          manifestUsed: manifestState?.manifestUsed ?? false,
          manifestPath: manifestState?.manifestPath,
          ...entryPatch
        }
      }
      if (entry.children) {
        const updatedChildren = updateFolderChildren(
          entry.children,
          folderPath,
          children,
          manifestState,
          entryPatch
        )
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
  async function loadFolderContents(connectionId: string, folderPath: string, force = false) {
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
        await enqueueS3Request(async () => {
          const { entries: folderContents, pageState } = await listS3Level(
            connectionId,
            folderPath,
            force
          )
          if (pageState.manifestUsed && pageState.manifestPath && !force) {
            const parsed = parseS3Uri(folderPath)
            if (!parsed) {
              throw new Error('Invalid S3 folder path')
            }
            const manifestTree = await loadManifestTree(
              connectionId,
              parsed.bucket,
              folderPath,
              pageState.manifestPath
            )
            const currentEntries = entriesByConnection.value[connectionId] || []
            const manifestState: ManifestFolderState = {
              manifestUsed: true,
              manifestPath: pageState.manifestPath
            }
            const updatedEntries = updateFolderChildren(
              currentEntries,
              folderPath,
              manifestTree.entries,
              manifestState
            )
            entriesByConnection.value = {
              ...entriesByConnection.value,
              [connectionId]: updatedEntries
            }
            setFolderPageState(connectionId, folderPath, manifestTree.pageState)
            return
          }

          // Update folder children immutably (single source of truth)
          const currentEntries = entriesByConnection.value[connectionId] || []
          const manifestState: ManifestFolderState = {
            manifestUsed: !!pageState.manifestUsed,
            manifestPath: pageState.manifestPath
          }
          const entryPatch = detectDirectTableFolder(folderContents)
          const updatedEntries = updateFolderChildren(
            currentEntries,
            folderPath,
            folderContents,
            manifestState,
            entryPatch
          )
          entriesByConnection.value = {
            ...entriesByConnection.value,
            [connectionId]: updatedEntries
          }
          setFolderPageState(connectionId, folderPath, pageState)
        })
      } else {
        // Local filesystem
        if (kind !== 'files') {
          throw new Error('Unsupported file explorer connection type')
        }
        const response = await listDirectory(folderPath, kind, connectionId)

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

  async function loadMoreFolderContents(connectionId: string, folderPath: string) {
    const pageState = folderPagesByConnection.value[connectionId]?.[folderPath]
    if (!pageState?.isTruncated || !pageState.nextToken) {
      return
    }

    await enqueueS3Request(async () => {
      const currentEntries = entriesByConnection.value[connectionId] || []
      const isRootFolder = directoryPathsByConnection.value[connectionId] === folderPath
      const { entries: nextEntries, pageState: nextPageState } = await listS3Level(
        connectionId,
        folderPath,
        false,
        pageState.nextToken
      )

      if (isRootFolder) {
        entriesByConnection.value = {
          ...entriesByConnection.value,
          [connectionId]: mergeEntries(currentEntries, nextEntries)
        }
      } else {
        const currentFolder = findEntryByPath(currentEntries, folderPath)
        const mergedChildren = mergeEntries(currentFolder?.children || [], nextEntries)
        const manifestState: ManifestFolderState = {
          manifestUsed: !!nextPageState.manifestUsed,
          manifestPath: nextPageState.manifestPath
        }
        const updatedEntries = updateFolderChildren(
          currentEntries,
          folderPath,
          mergedChildren,
          manifestState,
          detectDirectTableFolder(mergedChildren)
        )
        entriesByConnection.value = {
          ...entriesByConnection.value,
          [connectionId]: updatedEntries
        }
      }

      setFolderPageState(connectionId, folderPath, nextPageState)
    })
  }

  return {
    // State
    entriesByConnection,
    directoryPathsByConnection,
    errorsByConnection,
    selectedPathsByConnection,
    loadingByConnection,
    expandedFoldersByConnection,
    folderPagesByConnection,

    // Getters
    getEntries,
    getDirectoryPath,
    getError,
    getSelectedPath,
    isLoading,
    isFolderExpanded,
    getFolderPageState,
    hasMoreEntries,

    // Actions
    isFilesConnectionType,
    isS3ConnectionType,
    loadEntries,
    loadFileMetadata,
    setSelectedPath,
    clearSelection,
    clearAllSelectionsExcept,
    clearConnectionData,
    loadMoreFolderContents,
    toggleFolder,
    collapseFolder,
    expandFolder,
    collapseAllFolders,
    collapseFolderSubtree,
    expandFolderSubtree,
    expandConnectionSubtree,
    cleanupStaleConnections,
    loadFolderContents
  }
})
