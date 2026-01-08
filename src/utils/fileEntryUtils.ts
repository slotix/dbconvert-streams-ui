import type { FileSystemEntry } from '@/api/fileSystem'

/**
 * Recursively finds a file entry by its path in a tree of FileSystemEntry items.
 */
export function findFileEntryByPath(
  entries: FileSystemEntry[],
  targetPath: string
): FileSystemEntry | null {
  for (const entry of entries) {
    if (entry.path === targetPath) {
      return entry
    }
    if (entry.children?.length) {
      const found = findFileEntryByPath(entry.children, targetPath)
      if (found) {
        return found
      }
    }
  }
  return null
}
