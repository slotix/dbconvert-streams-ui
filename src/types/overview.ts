export type Severity = 'info' | 'warn' | 'error'

export interface OverviewNote {
  severity: Severity
  message: string
  doc?: string
}

export interface OverviewConnections {
  used: number
  max?: number
}

export interface OverviewActivity {
  connections: OverviewConnections
  activeSessions: number
  longRunning: Array<{
    pid?: number
    threadId?: number
    user: string
    query: string
    duration: string
  }>
}

export interface OverviewHealthPGSlot {
  name: string
  plugin: string
  active: boolean
  restartLsn: string
  retainedBytes: number
}

export interface OverviewHealth {
  wal?: {
    level: string
    slots: OverviewHealthPGSlot[]
    maxReplicationSlots?: number
    freeReplicationSlots?: number
    maxWalSenders?: number
  }
  binlog?: {
    enabled: boolean
    format?: string
    rowImage?: string
    gtidMode?: string
    serverId?: number
  }
}

export interface DatabaseOverview {
  engine: 'postgres' | 'mysql'
  version: string
  encoding?: string
  collation?: string
  counts: { schemas?: number; tables: number; views: number; functions?: number }
  sizeBytes: number
  allTablesBySize: Array<{ name: string; sizeBytes: number }>
  allTablesByRows: Array<{ name: string; approxRows: number; exactRows?: number }>
  activity: OverviewActivity
  health: OverviewHealth
  notes: OverviewNote[]
}
