// Standard structured log entry from backend
export interface StandardLogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  timestamp: string
  message: string
  nodeType: 'api' | 'source' | 'target'
  nodeId?: string
  streamId?: string
  caller?: string
  category?: 'general' | 'progress' | 'stat' | 'sql' | 'error' | 'debug'
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
  status?: 'RUNNING' | 'FINISHED' | 'FAILED'

  // SQL
  query?: string
  database?: string
  connectionId?: string
  durationMs?: number
  rowCount?: number
  error?: string
}

export interface LogFilter {
  levels?: Array<'debug' | 'info' | 'warn' | 'error'>
  nodeTypes?: Array<'api' | 'source' | 'target'>
  categories?: Array<string>
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
