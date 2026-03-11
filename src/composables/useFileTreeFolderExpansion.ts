import { toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { FileSystemEntry } from '@/api/fileSystem'
import { useFileExplorerStore } from '@/stores/fileExplorer'

function collectExpandedUnloadedFolderPaths(
  connectionId: string,
  entries: FileSystemEntry[],
  isFolderExpanded: (connectionId: string, folderPath: string) => boolean,
  paths: string[] = []
): string[] {
  for (const entry of entries) {
    if (entry.type !== 'dir') {
      continue
    }

    const expanded = isFolderExpanded(connectionId, entry.path)
    if (!expanded) {
      continue
    }

    if (!entry.isLoaded) {
      paths.push(entry.path)
      continue
    }

    if (entry.children?.length) {
      collectExpandedUnloadedFolderPaths(connectionId, entry.children, isFolderExpanded, paths)
    }
  }

  return paths
}

export function useFileTreeFolderExpansion(
  connectionId: MaybeRefOrGetter<string | null | undefined>,
  entries: MaybeRefOrGetter<FileSystemEntry[]>
) {
  const fileExplorerStore = useFileExplorerStore()

  function isFolderExpanded(folderPath: string): boolean {
    const currentConnectionId = toValue(connectionId)
    if (!currentConnectionId) {
      return false
    }
    return fileExplorerStore.isFolderExpanded(currentConnectionId, folderPath)
  }

  async function hydrateExpandedFolders(fileEntries: FileSystemEntry[]) {
    const currentConnectionId = toValue(connectionId)
    if (!currentConnectionId || fileEntries.length === 0) {
      return
    }

    const pendingPaths = collectExpandedUnloadedFolderPaths(
      currentConnectionId,
      fileEntries,
      fileExplorerStore.isFolderExpanded
    )

    for (const folderPath of pendingPaths) {
      await fileExplorerStore.loadFolderContents(currentConnectionId, folderPath)
    }
  }

  async function toggleFolder(entry: FileSystemEntry) {
    const currentConnectionId = toValue(connectionId)
    if (!currentConnectionId || entry.type !== 'dir') {
      return
    }

    if (fileExplorerStore.isFolderExpanded(currentConnectionId, entry.path)) {
      fileExplorerStore.collapseFolder(currentConnectionId, entry.path)
      return
    }

    if (!entry.isLoaded) {
      await fileExplorerStore.loadFolderContents(currentConnectionId, entry.path)
      return
    }

    fileExplorerStore.expandFolder(currentConnectionId, entry.path)
  }

  watch(
    [() => toValue(connectionId), () => toValue(entries)],
    async ([currentConnectionId, fileEntries]) => {
      if (!currentConnectionId || fileEntries.length === 0) {
        return
      }
      await hydrateExpandedFolders(fileEntries)
    },
    { immediate: true }
  )

  return {
    isFolderExpanded,
    toggleFolder
  }
}
