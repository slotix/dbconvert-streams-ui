import type { LogLevel, LogCategory, NodeType, Status } from '@/constants'

// Standard structured log entry from backend
export interface StandardLogEntry {
  level: LogLevel
  timestamp: string
  message: string
  type: NodeType
  nodeId?: string
  streamId?: string
  caller?: string
  category?: LogCategory
  extra?: Record<string, unknown>

  // Category-specific fields (flattened from extra)
  // Progress
  stage?: number
  percentage?: number
  description?: string

  // Stats
  table?: string
  events?: number
  size?: string
  rate?: string
  elapsed?: number
  status?: Status

  // Table Metadata
  estimatedRows?: number
  estimatedSizeBytes?: number

  // SQL
  query?: string
  database?: string
  connectionId?: string
  durationMs?: number
  rowCount?: number
  error?: string
}

export interface LogFilter {
  levels?: LogLevel[]
  nodeTypes?: NodeType[]
  categories?: LogCategory[]
  streamId?: string
  search?: string
}

// Legacy types (kept for backward compatibility during migration)
export interface LogEntry {
  timestamp: string
  level: string
  message: string
  source?: string
  component?: string
  streamId?: string
  [key: string]: unknown
}
