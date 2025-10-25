import { STORAGE_KEYS, VIEW_TYPES } from '@/constants'

function setCurrentViewType(type: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.VIEW_TYPE, type)
  } catch (error) {
    console.error('Error setting view type:', error)
  }
}

function getCurrentViewType(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.VIEW_TYPE) || VIEW_TYPES.CARDS
  } catch (error) {
    console.error('Error getting view type:', error)
    return VIEW_TYPES.CARDS
  }
}

export default {
  setCurrentViewType,
  getCurrentViewType
}
