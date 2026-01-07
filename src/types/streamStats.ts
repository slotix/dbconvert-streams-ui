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
