export interface ServiceStatus {
  name: string
  status: 'passing' | 'critical' | 'warning' | 'unknown'
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
