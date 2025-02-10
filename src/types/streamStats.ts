export interface NodeStat {
  failedCounter: number
  counter: number
  prevDataSize: number
  sumDataSize: number
  reportingInterval: number
  start: string
  duration: number
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