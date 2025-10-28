export interface NodeStat {
  failedCounter: number
  counter: number
  prevDataSize: number
  sumDataSize: number
  reportingInterval: number
  start: string
  duration: number
  avgRate: number
  status: string
}

export interface StreamNode {
  id: string
  type: string
  stat: NodeStat
}

export interface StreamStats {
  configID: string
  streamID: string
  nodes: StreamNode[]
}

export interface AggregatedNodeStats {
  type: string // "source" or "target"
  status: string // Worst status among nodes
  counter: number // Sum of all events/rows
  failedEvents: number // Sum of failed events
  dataSize: number // Sum of data sizes
  avgRate: number // Average rate across nodes
  elapsed: number // Max elapsed time
  activeNodes: number // Number of active nodes
}

export interface AggregatedStatResponse {
  configID: string
  streamID: string
  source: AggregatedNodeStats | null
  target: AggregatedNodeStats | null
}
