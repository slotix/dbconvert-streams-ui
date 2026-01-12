import { useConfirmDialogStore } from '@/stores/confirmDialog'
import { useObjectTabStateStore } from '@/stores/objectTabState'
import { usePaneTabsStore, type PaneId, type PaneTab } from '@/stores/paneTabs'

function getTabObjectKey(tab: PaneTab | null | undefined): string | null {
  return tab?.objectKey || null
}

export function useUnsavedChangesGuard() {
  const paneTabsStore = usePaneTabsStore()
  const objectTabStateStore = useObjectTabStateStore()
  const confirmDialog = useConfirmDialogStore()

  const confirmDiscardUnsavedChanges = async (options?: {
    title?: string
    description?: string
  }): Promise<boolean> => {
    return await confirmDialog.confirm({
      title: options?.title ?? 'Unsaved changes',
      description: options?.description ?? 'You have unsaved changes. Discard them and continue?',
      confirmLabel: 'Discard changes',
      cancelLabel: 'Stay',
      danger: true
    })
  }

  const isObjectKeyDirty = (objectKey: string | null | undefined): boolean => {
    if (!objectKey) return false
    return objectTabStateStore.hasUnsavedChanges(objectKey)
  }

  const isTabDirty = (tab: PaneTab | null | undefined): boolean => {
    return isObjectKeyDirty(getTabObjectKey(tab))
  }

  const confirmLeavePaneIfDirty = async (
    paneId: PaneId,
    toIndex?: number | null
  ): Promise<boolean> => {
    const state = paneTabsStore.getPaneState(paneId)
    const fromIndex = state.activeIndex
    if (fromIndex === null) return true
    if (toIndex !== undefined && toIndex !== null && toIndex === fromIndex) return true

    const fromTab = state.tabs[fromIndex]
    if (!isTabDirty(fromTab)) return true
    return await confirmDiscardUnsavedChanges()
  }

  const confirmCloseTabIfDirty = async (paneId: PaneId, index: number): Promise<boolean> => {
    const state = paneTabsStore.getPaneState(paneId)
    const tab = state.tabs[index]
    if (!isTabDirty(tab)) return true
    return await confirmDiscardUnsavedChanges({
      description: 'You have unsaved changes in this tab. Discard them and close the tab?'
    })
  }

  const confirmCloseManyTabsIfAnyDirty = async (tabsToClose: PaneTab[]): Promise<boolean> => {
    const dirtyCount = tabsToClose.filter((t) => isTabDirty(t)).length
    if (dirtyCount <= 0) return true

    const description =
      dirtyCount === 1
        ? 'You have unsaved changes in 1 tab. Discard them and continue?'
        : `You have unsaved changes in ${dirtyCount} tabs. Discard them and continue?`

    return await confirmDiscardUnsavedChanges({ description })
  }

  return {
    confirmDiscardUnsavedChanges,
    confirmLeavePaneIfDirty,
    confirmCloseTabIfDirty,
    confirmCloseManyTabsIfAnyDirty,
    isObjectKeyDirty
  }
}
