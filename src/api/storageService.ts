const STORAGE_KEYS = {
    VIEW_TYPE: 'viewType'
} as const

function setCurrentViewType(type: string): void {
    try {
        localStorage.setItem(STORAGE_KEYS.VIEW_TYPE, type)
    } catch (error) {
        console.error('Error setting view type:', error)
    }
}

function getCurrentViewType(): string {
    try {
        return localStorage.getItem(STORAGE_KEYS.VIEW_TYPE) || 'cards'
    } catch (error) {
        console.error('Error getting view type:', error)
        return 'cards'
    }
}

export default {
    setCurrentViewType,
    getCurrentViewType
} 