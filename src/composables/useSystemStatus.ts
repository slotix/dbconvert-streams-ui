import { computed, ref } from 'vue'
import { useCommonStore } from '@/stores/common'
import { useDesktopMode } from '@/composables/useDesktopMode'
import { SERVICE_STATUS, type ServiceStatus as HealthStatus } from '@/constants'

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

  const rows = computed<StatusRow[]>(() => {
    let list: StatusRow[] = []

    if (commonStore.isBackendConnected && commonStore.serviceStatuses.length > 0) {
      list = commonStore.serviceStatuses.map((service) => ({
        name: service.name,
        status: service.status as HealthStatus
      }))
    }

    if (list.length === 0 && desktopStatus.value?.services?.length) {
      list = desktopStatus.value.services.map((service) => ({
        name: service.name,
        status: mapDesktopStateToHealthStatus(service.state),
        meta: formatServiceMeta(service)
      }))
    }

    if (list.length === 0) {
      list = [
        { name: 'stream-api', status: SERVICE_STATUS.UNKNOWN },
        { name: 'stream-reader', status: SERVICE_STATUS.UNKNOWN },
        { name: 'stream-writer', status: SERVICE_STATUS.UNKNOWN }
      ]
    }

    if (commonStore.isBackendConnected) {
      const hasSentry = list.some((row) => row.name.toLowerCase() === 'sentry')
      if (!hasSentry) {
        list = list.concat({
          name: 'sentry',
          status: commonStore.sentryHealthy ? SERVICE_STATUS.PASSING : SERVICE_STATUS.CRITICAL
        })
      }
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
    if (isDesktop.value) {
      return 'Backend offline — showing local service state'
    }
    return 'Backend offline'
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
