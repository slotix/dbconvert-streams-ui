import { watch, type Ref } from 'vue'
import { usePersistedState } from './usePersistedState'

const MAX_RECENT_CONNECTIONS = 5

export type RecentConnection = {
  id: string
  name: string
  type?: string
  host?: string
  port?: string
  database?: string
  cloud_provider?: string
}

/**
 * Composable for managing recent connections and last viewed connection.
 */
export function useRecentConnections(currentConnectionId?: Ref<string | null>) {
  const recentConnections = usePersistedState<RecentConnection[]>('recentConnections', [])
  const lastViewedConnectionId = usePersistedState<string>('lastViewedConnectionId', '')

  /**
   * Add a connection to the recent list
   */
  function addToRecent(connection: RecentConnection) {
    const existingIndex = recentConnections.value.findIndex((c) => c.id === connection.id)

    if (existingIndex === -1) {
      recentConnections.value.push(connection)

      if (recentConnections.value.length > MAX_RECENT_CONNECTIONS) {
        recentConnections.value = recentConnections.value.slice(-MAX_RECENT_CONNECTIONS)
      }
      // usePersistedState automatically persists changes
    }
  }

  /**
   * Remove a connection from the recent list
   */
  function removeFromRecent(connectionId: string) {
    const idx = recentConnections.value.findIndex((c) => c.id === connectionId)
    if (idx !== -1) {
      recentConnections.value.splice(idx, 1)
    }
    if (lastViewedConnectionId.value === connectionId) {
      lastViewedConnectionId.value = ''
    }
  }

  /**
   * Set the last viewed connection
   */
  function setLastViewed(connectionId: string) {
    lastViewedConnectionId.value = connectionId
  }

  // Auto-track current connection changes if provided
  if (currentConnectionId) {
    watch(currentConnectionId, (newId) => {
      if (newId) {
        lastViewedConnectionId.value = newId
      }
    })
  }

  return {
    recentConnections,
    lastViewedConnectionId,
    addToRecent,
    removeFromRecent,
    setLastViewed
  }
}
