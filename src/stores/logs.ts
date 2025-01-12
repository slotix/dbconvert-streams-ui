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

export const useLogsStore = defineStore('logs', {
    state: () => ({
        logs: [] as SystemLog[],
        maxLogs: 1000,
        isLogsPanelOpen: false
    }),

    getters: {
        filteredLogs: (state) => (level?: keyof LogLevel) => {
            if (!level) return state.logs
            return state.logs.filter(log => log.level === level)
        },

        hasErrors: (state) => {
            return state.logs.some(log => log.level === 'error')
        }
    },

    actions: {
        addLog(log: Omit<SystemLog, 'id'>) {
            if (this.logs.length >= this.maxLogs) {
                this.logs = this.logs.slice(-Math.floor(this.maxLogs / 2))
            }
            this.logs.push({
                ...log,
                id: Date.now() + Math.random()
            })
        },

        clearLogs() {
            this.logs = []
        },

        toggleLogsPanel() {
            this.isLogsPanelOpen = !this.isLogsPanelOpen
        }
    }
}) 