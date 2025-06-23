export interface ServiceStatus {
  name: string
  status: 'passing' | 'critical' | 'unknown' | 'initializing'
  // Note: 'warning' removed as it's never used in practice
  // 'critical', 'unknown' both display as 'offline' to user
}

export interface ServiceStatusResponse {
  services: ServiceStatus[]
}

export type NodeType = 'source' | 'target' | 'api'

export const NodeTypes = {
  SOURCE: 'source' as NodeType,
  TARGET: 'target' as NodeType,
  API: 'api' as NodeType
} as const
