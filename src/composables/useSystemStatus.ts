import { computed, ref } from 'vue'
import { useCommonStore } from '@/stores/common'
import { useDesktopMode } from '@/composables/useDesktopMode'
import { SERVICE_STATUS, type ServiceStatus as HealthStatus } from '@/constants'
import { getSentryDsn } from '@/utils/environment'

type DesktopServiceStatus = {
  name: string
  state: string
  pid?: number
  exitCode?: number
  exitErr?: string
}

type DesktopStatus = {
  apiBaseUrl?: string
  logsDir?: string
  startupErr?: string
  services?: DesktopServiceStatus[]
}

export type StatusRow = {
  name: string
  label: string
  status: HealthStatus
  meta?: string
}

export function useSystemStatus() {
  const commonStore = useCommonStore()
  const { isDesktop } = useDesktopMode()

  const loading = ref(false)
  const fetchError = ref('')
  const desktopStatus = ref<DesktopStatus | null>(null)

  const mapDesktopStateToHealthStatus = (state?: string): HealthStatus => {
    switch ((state || '').toLowerCase()) {
      case 'running':
        return SERVICE_STATUS.PASSING
      case 'degraded':
        return SERVICE_STATUS.WARNING
      case 'exited':
      case 'unhealthy':
        return SERVICE_STATUS.CRITICAL
      case 'not_started':
        return SERVICE_STATUS.UNKNOWN
      default:
        return SERVICE_STATUS.UNKNOWN
    }
  }

  const formatServiceMeta = (service: DesktopServiceStatus): string => {
    const parts: string[] = []
    if (service.exitCode !== undefined && service.exitCode !== 0) {
      parts.push(`Exit ${service.exitCode}`)
    }
    if (service.exitErr) {
      parts.push(service.exitErr)
    }
    return parts.join(' • ')
  }

  const formatServiceLabel = (name: string): string => {
    const normalized = (name || '').trim().toLowerCase()
    if (normalized === 'sql-lsp') {
      return 'SQL-LSP'
    }

    return (name || '')
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('-')
  }

  const rows = computed<StatusRow[]>(() => {
    let list: StatusRow[] = []

    if (commonStore.isBackendConnected && commonStore.serviceStatuses.length > 0) {
      list = commonStore.serviceStatuses.map((service) => ({
        name: service.name,
        label: formatServiceLabel(service.name),
        status: service.status as HealthStatus
      }))
    }

    const desktopServices = desktopStatus.value?.services || []
    if (list.length === 0 && desktopServices.length) {
      list = desktopServices.map((service) => ({
        name: service.name,
        label: formatServiceLabel(service.name),
        status: mapDesktopStateToHealthStatus(service.state),
        meta: formatServiceMeta(service)
      }))
    }

    // In desktop mode, keep API service health rows from backend and append local-only services
    // (e.g. sql-lsp) from DesktopStatus when they are not reported by /services/status.
    if (isDesktop.value && list.length > 0 && desktopServices.length > 0) {
      const existingNames = new Set(list.map((row) => row.name.toLowerCase()))
      const desktopOnly = desktopServices.filter(
        (service) => !existingNames.has((service.name || '').toLowerCase())
      )
      if (desktopOnly.length > 0) {
        list = list.concat(
          desktopOnly.map((service) => ({
            name: service.name,
            label: formatServiceLabel(service.name),
            status: mapDesktopStateToHealthStatus(service.state),
            meta: formatServiceMeta(service)
          }))
        )
      }
    }

    if (list.length === 0) {
      list = [
        { name: 'stream-api', label: 'Stream-Api', status: SERVICE_STATUS.UNKNOWN },
        { name: 'stream-reader', label: 'Stream-Reader', status: SERVICE_STATUS.UNKNOWN },
        { name: 'stream-writer', label: 'Stream-Writer', status: SERVICE_STATUS.UNKNOWN }
      ]
    }

    const sentryConfigured = !!getSentryDsn()
    const sentryStatus = sentryConfigured
      ? commonStore.sentryHealthy
        ? SERVICE_STATUS.PASSING
        : SERVICE_STATUS.CRITICAL
      : SERVICE_STATUS.UNKNOWN
    const sentryMeta = sentryConfigured ? undefined : 'Not configured'

    const sentryIndex = list.findIndex((row) => row.name.toLowerCase() === 'sentry')
    const sentryRow: StatusRow = {
      name: 'sentry',
      label: 'Sentry',
      status: sentryStatus,
      meta: sentryMeta
    }

    if (sentryIndex >= 0) {
      list = list.map((row, index) => (index === sentryIndex ? sentryRow : row))
    } else {
      list = list.concat(sentryRow)
    }

    return list
  })

  const meta = computed(() => {
    const lines: string[] = []
    if (desktopStatus.value?.logsDir) {
      lines.push(`Logs: ${desktopStatus.value.logsDir}`)
    }
    return lines
  })

  const error = computed(() => desktopStatus.value?.startupErr || fetchError.value)

  const canOpenLogsFolder = computed(() => isDesktop.value && !!desktopStatus.value?.logsDir)

  const fetchDesktopStatus = async (): Promise<DesktopStatus | null> => {
    const w = window as typeof window & {
      go?: { main?: { App?: { DesktopStatus?: () => Promise<DesktopStatus> } } }
    }
    const app = w.go?.main?.App
    if (!app?.DesktopStatus) {
      return null
    }
    return app.DesktopStatus()
  }

  const openLogsFolder = async () => {
    if (!desktopStatus.value?.logsDir) {
      return
    }
    const w = window as typeof window & {
      go?: { main?: { App?: { OpenContainingFolder?: (path: string) => Promise<void> } } }
    }
    const app = w.go?.main?.App
    if (!app?.OpenContainingFolder) {
      return
    }
    try {
      await app.OpenContainingFolder(desktopStatus.value.logsDir)
    } catch (err) {
      fetchError.value = err instanceof Error ? err.message : String(err)
    }
  }

  const refresh = async () => {
    loading.value = true
    fetchError.value = ''
    try {
      if (commonStore.isBackendConnected) {
        await commonStore.fetchServiceStatus()
      }
      if (isDesktop.value) {
        desktopStatus.value = await fetchDesktopStatus()
      }
    } catch (err) {
      fetchError.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  const description = computed(() => {
    if (commonStore.isBackendConnected) {
      return 'Backend connected'
    }

    const parts: string[] = []
    if (commonStore.apiHealthy && !commonStore.sentryHealthy) {
      parts.push('Stream API healthy, Sentry unreachable')
    } else if (!commonStore.apiHealthy && commonStore.sentryHealthy) {
      parts.push('Stream API unreachable, Sentry healthy')
    } else if (!commonStore.apiHealthy && !commonStore.sentryHealthy) {
      parts.push('Backend offline')
    } else if (commonStore.apiHealthy && commonStore.sentryHealthy) {
      if (!commonStore.hasValidApiKey) {
        parts.push('Backend reachable — API key required')
      } else {
        parts.push('Backend reachable — not connected')
      }
    }

    if (isDesktop.value) {
      parts.push('showing local service state')
    }

    return parts.join(' — ') || 'Backend offline'
  })

  return {
    rows,
    meta,
    error,
    loading,
    description,
    canOpenLogsFolder,
    openLogsFolder,
    refresh
  }
}
