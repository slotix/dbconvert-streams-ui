export const FILE_EDITABLE_TOOLTIP = 'Double-click a cell to edit. Changes require Save.'
export const FILE_TABLE_FOLDER_READ_ONLY_TOOLTIP =
  'Table folders are read-only. Open a specific file to edit.'
export const FILE_NON_FILE_READ_ONLY_TOOLTIP = 'Only files are editable.'

export function getFileEditBlockedToastMessage(entry: {
  type: 'file' | 'dir'
  isTable?: boolean
}): string | null {
  if (entry.type === 'dir' && entry.isTable) {
    return `Double-click editing is disabled. ${FILE_TABLE_FOLDER_READ_ONLY_TOOLTIP}`
  }

  if (entry.type !== 'file') {
    return `Double-click editing is disabled. ${FILE_NON_FILE_READ_ONLY_TOOLTIP}`
  }

  return null
}
