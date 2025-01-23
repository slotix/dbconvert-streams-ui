import { defineStore } from 'pinia'

interface LogLevel {
  info: 'info'
  debug: 'debug'
  warn: 'warn'
  error: 'error'
}

export interface SystemLog {
  id: number
  message: string
  level: keyof LogLevel
  timestamp: number
  source?: string
  details?: Record<string, unknown>
}

interface DedupKey {
  message: string
  level: keyof LogLevel
  sourceType: string
}

export const useLogsStore = defineStore('logs', {
  state: () => ({
    logs: [] as SystemLog[],
    maxLogs: 1000,
    isLogsPanelOpen: false,
    panelHeight: '50vh',
    // Keep track of recent messages to prevent duplicates
    recentMessages: new Map<string, { count: number, timestamp: number }>()
  }),

  getters: {
    filteredLogs: (state) => (level?: keyof LogLevel) => {
      if (!level) return state.logs
      return state.logs.filter((log) => log.level === level)
    },

    hasErrors: (state) => {
      return state.logs.some((log) => log.level === 'error')
    }
  },

  actions: {
    getDedupKey(log: SystemLog | Omit<SystemLog, 'id'>): string {
      const sourceType = log.source?.split(':')[0] || 'unknown'
      return `${sourceType}:${log.level}:${log.message}`
    },

    addLog(log: Omit<SystemLog, 'id'>) {
      const now = Date.now()
      const dedupKey = this.getDedupKey(log)
      const recentMessage = this.recentMessages.get(dedupKey)

      // Check if we've seen this message recently (within 2 seconds)
      if (recentMessage && (now - recentMessage.timestamp) < 2000) {
        // Update the existing log instead of adding a new one
        const existingLog = this.logs.find(l => this.getDedupKey(l) === dedupKey)
        if (existingLog) {
          recentMessage.count++
          if (recentMessage.count > 1) {
            existingLog.details = {
              ...existingLog.details,
              duplicateCount: recentMessage.count,
              lastTimestamp: log.timestamp
            }
          }
          return
        }
      }

      // Clean up old messages from the dedup cache (older than 5 seconds)
      for (const [key, value] of this.recentMessages.entries()) {
        if (now - value.timestamp > 5000) {
          this.recentMessages.delete(key)
        }
      }

      // Add new message to dedup cache
      this.recentMessages.set(dedupKey, { count: 1, timestamp: now })

      // Trim logs if we exceed maxLogs
      if (this.logs.length >= this.maxLogs) {
        this.logs = this.logs.slice(-Math.floor(this.maxLogs / 2))
      }

      // Add the new log
      this.logs.push({
        ...log,
        id: Date.now() + Math.random()
      })
    },

    clearLogs() {
      this.logs = []
      this.recentMessages.clear()
    },

    toggleLogsPanel() {
      this.isLogsPanelOpen = !this.isLogsPanelOpen
    },

    updatePanelHeight(height: string) {
      this.panelHeight = height
    }
  }
})
