export interface ServiceStatus {
  name: string
  status: 'passing' | 'critical' | 'warning' | 'unknown'
}

export interface ServiceStatusResponse {
  services: ServiceStatus[]
}
