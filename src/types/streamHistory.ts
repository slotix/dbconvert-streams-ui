export interface StreamRun {
  id: string
  configId: string
  streamId: string
  timestamp: number
  durationMs: number
  status: string
  dataSize?: string
  rowsInserted?: number
  rowsSkipped?: number
  errorMessage?: string
}
