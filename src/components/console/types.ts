import type { ConsoleMode as ConsoleModeBase } from '@/composables/useConsoleSources'

export type ConsoleMode = ConsoleModeBase
export type DatabaseScope = 'database' | 'connection'
export type FileConnectionType = 'files' | 's3'
