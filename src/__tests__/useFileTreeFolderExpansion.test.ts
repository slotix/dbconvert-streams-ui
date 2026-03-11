import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { effectScope, nextTick, ref } from 'vue'
import type { FileSystemEntry } from '@/api/fileSystem'
import { useFileExplorerStore } from '@/stores/fileExplorer'
import { useFileTreeFolderExpansion } from '@/composables/useFileTreeFolderExpansion'

describe('useFileTreeFolderExpansion', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('hydrates an expanded unloaded folder immediately', async () => {
    const fileExplorerStore = useFileExplorerStore()
    const entries = ref<FileSystemEntry[]>([
      {
        name: 'e2e',
        path: 's3://bucket/e2e/',
        type: 'dir',
        isLoaded: false,
        children: []
      }
    ])

    fileExplorerStore.expandFolder('conn-s3', 's3://bucket/e2e/')
    const loadSpy = vi.spyOn(fileExplorerStore, 'loadFolderContents').mockResolvedValue()

    const scope = effectScope()
    scope.run(() => {
      useFileTreeFolderExpansion(() => 'conn-s3', entries)
    })

    await nextTick()

    expect(loadSpy).toHaveBeenCalledWith('conn-s3', 's3://bucket/e2e/')

    scope.stop()
  })

  it('collapses an already expanded folder without loading it again', async () => {
    const fileExplorerStore = useFileExplorerStore()
    const entry: FileSystemEntry = {
      name: 'e2e',
      path: 's3://bucket/e2e/',
      type: 'dir',
      isLoaded: true,
      children: []
    }

    fileExplorerStore.expandFolder('conn-s3', entry.path)
    const loadSpy = vi.spyOn(fileExplorerStore, 'loadFolderContents').mockResolvedValue()

    const scope = effectScope()
    const api = scope.run(() =>
      useFileTreeFolderExpansion(
        () => 'conn-s3',
        () => [entry]
      )
    )

    await api?.toggleFolder(entry)

    expect(fileExplorerStore.isFolderExpanded('conn-s3', entry.path)).toBe(false)
    expect(loadSpy).not.toHaveBeenCalled()

    scope.stop()
  })

  it('loads a collapsed unloaded folder before expanding it', async () => {
    const fileExplorerStore = useFileExplorerStore()
    const entry: FileSystemEntry = {
      name: 'e2e',
      path: 's3://bucket/e2e/',
      type: 'dir',
      isLoaded: false,
      children: []
    }

    const loadSpy = vi.spyOn(fileExplorerStore, 'loadFolderContents').mockResolvedValue()

    const scope = effectScope()
    const api = scope.run(() =>
      useFileTreeFolderExpansion(
        () => 'conn-s3',
        () => [entry]
      )
    )

    await api?.toggleFolder(entry)

    expect(loadSpy).toHaveBeenCalledWith('conn-s3', entry.path)
    expect(fileExplorerStore.isFolderExpanded('conn-s3', entry.path)).toBe(false)

    scope.stop()
  })

  it('expands a collapsed already loaded folder without reloading it', async () => {
    const fileExplorerStore = useFileExplorerStore()
    const entry: FileSystemEntry = {
      name: 'e2e',
      path: 's3://bucket/e2e/',
      type: 'dir',
      isLoaded: true,
      children: []
    }

    const loadSpy = vi.spyOn(fileExplorerStore, 'loadFolderContents').mockResolvedValue()

    const scope = effectScope()
    const api = scope.run(() =>
      useFileTreeFolderExpansion(
        () => 'conn-s3',
        () => [entry]
      )
    )

    await api?.toggleFolder(entry)

    expect(fileExplorerStore.isFolderExpanded('conn-s3', entry.path)).toBe(true)
    expect(loadSpy).not.toHaveBeenCalled()

    scope.stop()
  })
})
