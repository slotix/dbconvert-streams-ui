import { ref, onUnmounted } from 'vue'
import type { SQLTableMeta, SQLViewMeta } from '@/types/metadata'
import type { FileSystemEntry } from '@/api/fileSystem'
import type { FileMetadata } from '@/types/files'

type ObjectType = 'table' | 'view'

/**
 * @deprecated This composable has been split into two parts:
 * - Use `useSplitPaneResize` for UI mechanics (resizing, drag interactions)
 * - Use `useSplitViewStore` (Pinia store) for content management
 *
 * This composable is kept for backwards compatibility but should not be used in new code.
 * It will be removed in a future version.
 */
export function useSplitPane() {
  // Split sizing/resizer state
  const splitGrow = ref(50) // percentage width for left pane (0..100)
  const isResizing = ref(false)
  const splitContainerRef = ref<HTMLElement | null>(null)
  const leftPaneRef = ref<HTMLElement | null>(null)

  // Right split selection (lightweight preview only)
  const splitConnectionId = ref<string | null>(null)
  const splitDatabaseName = ref<string | null>(null)
  const splitSchemaName = ref<string | null>(null)
  const splitObjectType = ref<ObjectType | null>(null)
  const splitObjectName = ref<string | null>(null)
  const splitMeta = ref<SQLTableMeta | SQLViewMeta | null>(null)
  const splitDefaultTab = ref<'structure' | 'data' | null>(null)
  // File split state
  const splitFileEntry = ref<FileSystemEntry | null>(null)
  const splitFileMetadata = ref<FileMetadata | null>(null)

  let startX = 0
  let startLeftWidth = 0
  let containerWidth = 0
  let prevUserSelect: string | null = null

  function onDividerMouseDown(e: MouseEvent) {
    if (!splitContainerRef.value || !leftPaneRef.value) return
    isResizing.value = true
    startX = e.clientX
    const leftRect = leftPaneRef.value.getBoundingClientRect()
    const contRect = splitContainerRef.value.getBoundingClientRect()
    startLeftWidth = leftRect.width
    containerWidth = contRect.width
    window.addEventListener('mousemove', onDividerMouseMove)
    window.addEventListener('mouseup', onDividerMouseUp, { once: true })
    // Prevent text selection during resize; remember previous value
    prevUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'
  }

  function onDividerMouseMove(e: MouseEvent) {
    if (!isResizing.value || !containerWidth) return
    const dx = e.clientX - startX
    const newLeft = startLeftWidth + dx
    const pct = Math.max(20, Math.min(80, (newLeft / containerWidth) * 100))
    splitGrow.value = pct
  }

  function onDividerMouseUp() {
    isResizing.value = false
    document.body.style.userSelect = prevUserSelect || ''
    window.removeEventListener('mousemove', onDividerMouseMove)
  }

  function onDividerDoubleClick() {
    // Reset split widths to 50/50
    splitGrow.value = 50
  }

  function closeRightSplit() {
    splitConnectionId.value = null
    splitDatabaseName.value = null
    splitSchemaName.value = null
    splitObjectType.value = null
    splitObjectName.value = null
    splitMeta.value = null
    splitDefaultTab.value = null
    // Clear file split state
    splitFileEntry.value = null
    splitFileMetadata.value = null
  }

  function resetRightSplit() {
    // Ensure split becomes visible and centered if content pushed it
    splitGrow.value = 50
  }

  function setSplitDatabaseContent(payload: {
    connectionId: string
    database: string
    schema?: string
    type: ObjectType
    name: string
    meta: SQLTableMeta | SQLViewMeta
    defaultTab?: 'structure' | 'data'
  }) {
    splitConnectionId.value = payload.connectionId
    splitDatabaseName.value = payload.database
    splitSchemaName.value = payload.schema || null
    splitObjectType.value = payload.type
    splitObjectName.value = payload.name
    splitMeta.value = payload.meta
    splitDefaultTab.value = payload.defaultTab || null
    // Clear file state when setting database content
    splitFileEntry.value = null
    splitFileMetadata.value = null
  }

  function setSplitFileContent(payload: {
    connectionId: string
    entry: FileSystemEntry
    metadata?: FileMetadata
    defaultTab?: 'structure' | 'data'
  }) {
    splitConnectionId.value = payload.connectionId
    splitFileEntry.value = payload.entry
    splitFileMetadata.value = payload.metadata || null
    splitDefaultTab.value = payload.defaultTab || null
    // Clear database state when setting file content
    splitDatabaseName.value = null
    splitSchemaName.value = null
    splitObjectType.value = null
    splitObjectName.value = null
    splitMeta.value = null
  }

  onUnmounted(() => {
    window.removeEventListener('mousemove', onDividerMouseMove)
  })

  return {
    // State
    splitGrow,
    isResizing,
    splitContainerRef,
    leftPaneRef,
    splitConnectionId,
    splitDatabaseName,
    splitSchemaName,
    splitObjectType,
    splitObjectName,
    splitMeta,
    splitDefaultTab,
    splitFileEntry,
    splitFileMetadata,

    // Methods
    onDividerMouseDown,
    onDividerDoubleClick,
    closeRightSplit,
    resetRightSplit,
    setSplitDatabaseContent,
    setSplitFileContent
  }
}
