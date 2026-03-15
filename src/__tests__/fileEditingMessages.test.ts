import { describe, expect, it } from 'vitest'
import {
  FILE_NON_FILE_READ_ONLY_TOOLTIP,
  FILE_TABLE_FOLDER_READ_ONLY_TOOLTIP,
  getFileEditBlockedToastMessage
} from '@/utils/fileEditingMessages'

describe('fileEditingMessages', () => {
  it('explains how to edit table folders', () => {
    expect(getFileEditBlockedToastMessage({ type: 'dir', isTable: true })).toBe(
      `Double-click editing is disabled. ${FILE_TABLE_FOLDER_READ_ONLY_TOOLTIP}`
    )
  })

  it('explains that generic folders are not editable', () => {
    expect(getFileEditBlockedToastMessage({ type: 'dir', isTable: false })).toBe(
      `Double-click editing is disabled. ${FILE_NON_FILE_READ_ONLY_TOOLTIP}`
    )
  })

  it('returns no blocked-edit message for files', () => {
    expect(getFileEditBlockedToastMessage({ type: 'file' })).toBeNull()
  })
})
