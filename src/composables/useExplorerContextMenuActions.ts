import type { ComputedRef, Ref } from 'vue'
import type { Connection } from '@/types/connections'
import { getConnectionKindFromSpec } from '@/types/specs'
import type { ContextTarget } from '@/composables/useTreeContextMenu'
import type { DiagramFocusTarget } from '@/types/diagram'

const MAX_FILE_SUBTREE_EXPAND_FOLDERS = 250
const FILE_SUBTREE_PROGRESS_STEP = 100

type RefLike<T> = Ref<T> | ComputedRef<T>

interface ExplorerConnectionActions {
  testConnection: (connectionId: string) => void
  refreshDatabases: (connectionId: string) => void
  createDatabase: (connectionId: string) => void
  editConnection: (connectionId: string) => void
  cloneConnection: (connectionId: string) => void
  deleteConnection: (connectionId: string) => void
  copyToClipboard: (value: string, message: string) => void
  refreshDatabase: (connectionId: string, database: string) => void
  createSchema: (connectionId: string, database: string) => void
  showDiagram: (
    connectionId: string,
    database: string,
    focus?: DiagramFocusTarget | undefined
  ) => void
  openObject: (
    connectionId: string,
    database: string,
    kind: 'table' | 'view' | 'function' | 'procedure',
    name: string,
    mode: 'preview' | 'pinned',
    schema?: string,
    defaultTab?: 'structure' | 'data',
    openInRightSplit?: boolean
  ) => void
  openFile: (
    connectionId: string,
    path: string,
    mode: 'preview' | 'pinned',
    defaultTab?: 'structure' | 'data',
    openInRightSplit?: boolean
  ) => void
  copyDDL: (
    connectionId: string,
    database: string,
    name: string,
    kind: 'table' | 'view' | 'function' | 'procedure',
    schema?: string
  ) => Promise<void>
}

interface ExplorerNavigationStore {
  expandedDatabases: Set<string>
  toggleShowSystemDatabasesFor: (connectionId: string) => void
  invalidateMetadata: (connectionId: string, database: string) => void
  ensureMetadata: (connectionId: string, database: string) => Promise<unknown>
  collapseConnectionSubtree: (connectionId: string) => void
  collapseDatabaseSubtree: (connectionId: string, database: string) => void
  collapseSchemaSubtree: (connectionId: string, database: string, schema: string) => void
  toggleShowSystemObjectsFor: (connectionId: string, database: string) => void
  isDatabaseExpanded: (databaseKey: string) => boolean
  expandConnectionSubtree: (connectionId: string) => Promise<unknown>
  expandDatabaseSubtree: (connectionId: string, database: string) => Promise<unknown>
  expandSchemaSubtree: (connectionId: string, database: string, schema: string) => Promise<unknown>
}

interface ExpandSubtreeOptions {
  maxFolders: number
  progressEvery: number
  onProgress: (expandedFolders: number, maxFolders: number) => void
}

interface ExpandSubtreeResult {
  expandedFolders: number
  truncated: boolean
  maxFolders: number
}

interface ExplorerFileStore {
  collapseAllFolders: (connectionId?: string) => void
  collapseFolderSubtree: (connectionId: string, path: string) => void
  expandConnectionSubtree: (
    connectionId: string,
    options: ExpandSubtreeOptions
  ) => Promise<ExpandSubtreeResult>
  expandFolderSubtree: (
    connectionId: string,
    path: string,
    options: ExpandSubtreeOptions
  ) => Promise<ExpandSubtreeResult>
}

interface ToastLike {
  success: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
  error: (message: string) => void
}

interface UseExplorerContextMenuActionsOptions {
  closeContextMenu: () => void
  isDesktop: RefLike<boolean>
  toast: ToastLike
  actions: ExplorerConnectionActions
  navigationStore: ExplorerNavigationStore
  fileExplorerStore: ExplorerFileStore
  isFileConnection: (connectionId: string) => boolean
  getConnectionById: (connectionId: string) => Connection | null
  listConnections: () => Connection[]
  resolveSystemPath: (path: string, basePath: string) => string
  emitOpenSqlConsole: (payload: {
    connectionId: string
    database?: string
    sqlScope: 'database' | 'connection'
  }) => void
  emitOpenFileConsole: (payload: {
    connectionId: string
    connectionType: 'files' | 's3'
    basePath?: string
  }) => void
  openTableInSqlConsole: (payload: {
    connectionId: string
    database: string
    tableName: string
    schema?: string
  }) => void
  openFileInDuckDbConsole: (payload: {
    connectionId: string
    filePath: string
    fileName: string
    isDir?: boolean
    format?: string
  }) => void
}

interface MenuActionPayload {
  action: string
  target: ContextTarget
  openInRightSplit?: boolean
}

function getWindowGo() {
  return (
    window as unknown as {
      go?: { main?: { App?: { OpenContainingFolder?: (path: string) => Promise<void> } } }
    }
  ).go
}

export function useExplorerContextMenuActions(options: UseExplorerContextMenuActionsOptions) {
  async function expandContextSubtree(target: ContextTarget) {
    async function expandFileSubtreeWithGuard(
      run: (options: ExpandSubtreeOptions) => Promise<ExpandSubtreeResult>,
      label: string
    ) {
      let lastProgressToast = 0
      options.toast.info(`Expanding ${label}...`)

      try {
        const result = await run({
          maxFolders: MAX_FILE_SUBTREE_EXPAND_FOLDERS,
          progressEvery: FILE_SUBTREE_PROGRESS_STEP,
          onProgress: (expandedFolders, maxFolders) => {
            if (
              expandedFolders >= FILE_SUBTREE_PROGRESS_STEP &&
              expandedFolders - lastProgressToast >= FILE_SUBTREE_PROGRESS_STEP &&
              expandedFolders < maxFolders
            ) {
              lastProgressToast = expandedFolders
              options.toast.info(`Expanding... ${expandedFolders}/${maxFolders} folders`)
            }
          }
        })

        if (result.truncated) {
          options.toast.warning(
            `Stopped after ${result.expandedFolders} folders (limit ${result.maxFolders}). Expand a deeper branch to continue.`
          )
        } else {
          options.toast.success(`Expanded ${result.expandedFolders} folders`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to expand subtree'
        options.toast.error(message)
      }
    }

    if (target.kind === 'connection') {
      if (options.isFileConnection(target.connectionId)) {
        await expandFileSubtreeWithGuard(
          (expandOptions) =>
            options.fileExplorerStore.expandConnectionSubtree(target.connectionId, expandOptions),
          'connection subtree'
        )
      } else {
        await options.navigationStore.expandConnectionSubtree(target.connectionId)
      }
      return
    }

    if (target.kind === 'database') {
      await options.navigationStore.expandDatabaseSubtree(target.connectionId, target.database)
      return
    }

    if (target.kind === 'schema') {
      await options.navigationStore.expandSchemaSubtree(
        target.connectionId,
        target.database,
        target.schema
      )
      return
    }

    if (target.kind === 'file' && target.isDir) {
      await expandFileSubtreeWithGuard(
        (expandOptions) =>
          options.fileExplorerStore.expandFolderSubtree(
            target.connectionId,
            target.path,
            expandOptions
          ),
        `folder "${target.name}"`
      )
    }
  }

  function onMenuAction(payload: MenuActionPayload) {
    const target = payload.target
    options.closeContextMenu()

    switch (payload.action) {
      case 'sql-console':
        if (target.kind === 'connection') {
          options.emitOpenSqlConsole({
            connectionId: target.connectionId,
            sqlScope: 'connection'
          })
        } else if (target.kind === 'database') {
          options.emitOpenSqlConsole({
            connectionId: target.connectionId,
            database: target.database,
            sqlScope: 'database'
          })
        }
        break

      case 'file-console':
        if (target.kind === 'connection') {
          const conn = options.getConnectionById(target.connectionId)
          const kind = getConnectionKindFromSpec(conn?.spec)
          if (kind !== 'files' && kind !== 's3') {
            return
          }
          const isS3 = kind === 's3'
          const basePath = isS3 ? conn?.spec?.s3?.scope?.bucket : conn?.spec?.files?.basePath
          options.emitOpenFileConsole({
            connectionId: target.connectionId,
            connectionType: isS3 ? 's3' : 'files',
            basePath
          })
        }
        break

      case 'test-connection':
        if (target.kind === 'connection') options.actions.testConnection(target.connectionId)
        break

      case 'refresh-databases':
        if (target.kind === 'connection') options.actions.refreshDatabases(target.connectionId)
        break

      case 'toggle-system-databases':
        if (target.kind === 'connection') {
          options.navigationStore.toggleShowSystemDatabasesFor(target.connectionId)
          const prefix = `${target.connectionId}:`
          for (const dbKey of options.navigationStore.expandedDatabases) {
            if (!dbKey.startsWith(prefix)) continue
            const dbName = dbKey.slice(prefix.length)
            if (!dbName) continue
            options.navigationStore.invalidateMetadata(target.connectionId, dbName)
            options.navigationStore.ensureMetadata(target.connectionId, dbName).catch(() => {})
          }
        }
        break

      case 'create-database':
        if (target.kind === 'connection') options.actions.createDatabase(target.connectionId)
        break

      case 'edit-connection':
        if (target.kind === 'connection') options.actions.editConnection(target.connectionId)
        break

      case 'clone-connection':
        if (target.kind === 'connection') options.actions.cloneConnection(target.connectionId)
        break

      case 'delete-connection':
        if (target.kind === 'connection') options.actions.deleteConnection(target.connectionId)
        break

      case 'copy-base-path':
        if (target.kind === 'connection') {
          const conn = options.listConnections().find((c) => c.id === target.connectionId)
          const basePath = conn?.spec?.files?.basePath || ''
          if (basePath) options.actions.copyToClipboard(basePath, 'Path copied')
        }
        break

      case 'open-base-folder':
        if (target.kind === 'connection' && options.isDesktop.value) {
          const conn = options.listConnections().find((c) => c.id === target.connectionId)
          const basePath = conn?.spec?.files?.basePath || ''
          if (basePath) {
            const wailsGo = getWindowGo()
            if (wailsGo?.main?.App?.OpenContainingFolder) {
              wailsGo.main.App.OpenContainingFolder(basePath).catch((err: unknown) =>
                options.toast.error(`Failed to open folder: ${err}`)
              )
            }
          }
        }
        break

      case 'refresh-metadata':
        if (target.kind === 'database' || target.kind === 'schema') {
          options.actions.refreshDatabase(target.connectionId, target.database)
        }
        break

      case 'expand-subtree':
        void expandContextSubtree(target)
        break

      case 'collapse-subtree':
        if (target.kind === 'connection') {
          options.navigationStore.collapseConnectionSubtree(target.connectionId)
          if (options.isFileConnection(target.connectionId)) {
            options.fileExplorerStore.collapseAllFolders(target.connectionId)
          }
        } else if (target.kind === 'database') {
          options.navigationStore.collapseDatabaseSubtree(target.connectionId, target.database)
        } else if (target.kind === 'schema') {
          options.navigationStore.collapseSchemaSubtree(
            target.connectionId,
            target.database,
            target.schema
          )
        } else if (target.kind === 'file' && target.isDir) {
          options.fileExplorerStore.collapseFolderSubtree(target.connectionId, target.path)
        }
        break

      case 'toggle-system-objects':
        if (target.kind === 'database') {
          options.navigationStore.toggleShowSystemObjectsFor(target.connectionId, target.database)
          options.navigationStore.invalidateMetadata(target.connectionId, target.database)
          const dbKey = `${target.connectionId}:${target.database}`
          if (options.navigationStore.isDatabaseExpanded(dbKey)) {
            options.navigationStore
              .ensureMetadata(target.connectionId, target.database)
              .catch(() => {})
          }
        }
        break

      case 'create-schema':
        if (target.kind === 'database') {
          options.actions.createSchema(target.connectionId, target.database)
        }
        break

      case 'show-diagram':
        if (target.kind === 'database') {
          options.actions.showDiagram(target.connectionId, target.database)
        } else if (target.kind === 'table' || target.kind === 'view') {
          const focus: DiagramFocusTarget = {
            type: target.kind,
            name: target.name,
            schema: target.schema
          }
          options.actions.showDiagram(target.connectionId, target.database, focus)
        }
        break

      case 'copy-database-name':
        if (target.kind === 'database') {
          options.actions.copyToClipboard(target.database, 'Database name copied')
        }
        break

      case 'copy-schema-name':
        if (target.kind === 'schema') {
          options.actions.copyToClipboard(target.schema, 'Schema name copied')
        }
        break

      case 'open':
        if (
          target.kind === 'table' ||
          target.kind === 'view' ||
          target.kind === 'function' ||
          target.kind === 'procedure'
        ) {
          options.actions.openObject(
            target.connectionId,
            target.database,
            target.kind,
            target.name,
            'preview',
            target.schema,
            undefined,
            payload.openInRightSplit
          )
        } else if (target.kind === 'file') {
          options.actions.openFile(
            target.connectionId,
            target.path,
            'preview',
            undefined,
            payload.openInRightSplit
          )
        }
        break

      case 'copy-object-name':
        if (
          target.kind === 'table' ||
          target.kind === 'view' ||
          target.kind === 'function' ||
          target.kind === 'procedure'
        ) {
          options.actions.copyToClipboard(target.name, 'Object name copied')
        }
        break

      case 'copy-ddl':
        if (
          target.kind === 'table' ||
          target.kind === 'view' ||
          target.kind === 'function' ||
          target.kind === 'procedure'
        ) {
          void options.actions.copyDDL(
            target.connectionId,
            target.database,
            target.name,
            target.kind,
            target.schema
          )
        }
        break

      case 'copy-file-name':
        if (target.kind === 'file') options.actions.copyToClipboard(target.name, 'File name copied')
        break

      case 'copy-file-path':
        if (target.kind === 'file') options.actions.copyToClipboard(target.path, 'Path copied')
        break

      case 'copy-system-path':
        if (target.kind === 'file') {
          const conn = options.listConnections().find((c) => c.id === target.connectionId)
          const basePath = conn?.spec?.files?.basePath || ''
          const systemPath = options.resolveSystemPath(target.path, basePath)
          options.actions.copyToClipboard(systemPath, 'Path copied')
        }
        break

      case 'open-in-explorer':
        if (target.kind === 'file' && options.isDesktop.value) {
          const conn = options.listConnections().find((c) => c.id === target.connectionId)
          const basePath = conn?.spec?.files?.basePath || ''
          const systemPath = options.resolveSystemPath(target.path, basePath)
          const wailsGo = getWindowGo()
          if (wailsGo?.main?.App?.OpenContainingFolder) {
            wailsGo.main.App.OpenContainingFolder(systemPath).catch((err: unknown) =>
              options.toast.error(`Failed to open folder: ${err}`)
            )
          }
        }
        break

      case 'open-in-sql-console':
        if (target.kind === 'table' || target.kind === 'view') {
          options.openTableInSqlConsole({
            connectionId: target.connectionId,
            database: target.database,
            tableName: target.name,
            schema: target.schema
          })
        }
        break

      case 'insert-into-console':
        if (target.kind === 'file') {
          options.openFileInDuckDbConsole({
            connectionId: target.connectionId,
            filePath: target.path,
            fileName: target.name,
            isDir: target.isDir,
            format: target.format
          })
        }
        break
    }

    options.closeContextMenu()
  }

  return {
    onMenuAction
  }
}
