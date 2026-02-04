import { defineStore } from 'pinia'
import type { Ref } from 'vue'
import storage from '@/api/storageService'
import api, { configureApiClient } from '@/api/apiClient'
import type { UserData } from '@/types/user'
import type { ServiceStatus } from '@/types/common'
import { useToast } from 'vue-toastification'
import { sseLogsService } from '@/api/sseLogsServiceStructured'
import { useLocalStorage } from '@vueuse/core'
import { SERVICE_STATUS, STORAGE_KEYS } from '@/constants'
import axios from 'axios'
import { isWailsContext } from '@/composables/useWailsEvents'

// Health check and retry configuration
const HEALTH_CHECK_INTERVAL_MS = 10000
const HEALTH_CHECK_RETRY_DELAY_MS = 1000
const HEALTH_CHECK_MAX_RETRIES = 2
const CONNECTION_GRACE_PERIOD_MS = 5000

const PERMISSION_ERROR_CODES = new Set([
  'SEAT_LIMIT_REACHED',
  'DEVICE_DEACTIVATED',
  'PAYMENT_REQUIRED'
])

type BackendErrorPayload = {
  code?: string
  error?: string
  message?: string
}

function extractBackendError(error: unknown): BackendErrorPayload | null {
  if (!axios.isAxiosError(error)) {
    return null
  }
  const data = error.response?.data as BackendErrorPayload | string | undefined
  if (!data) {
    return null
  }
  if (typeof data === 'string') {
    return { message: data }
  }
  return data
}

function getPermissionError(error: unknown): { code: string; message: string } | null {
  const payload = extractBackendError(error)
  if (!payload) {
    return null
  }

  if (payload.code && PERMISSION_ERROR_CODES.has(payload.code)) {
    return {
      code: payload.code,
      message: payload.error || payload.message || 'Access blocked by account limits.'
    }
  }

  const message = (payload.error || payload.message || '').toLowerCase()
  if (
    message.includes('seat limit') ||
    message.includes('device deactivated') ||
    message.includes('payment required') ||
    message.includes('past due')
  ) {
    return {
      code: payload.code || 'PERMISSION_ERROR',
      message: payload.error || payload.message || 'Access blocked by account limits.'
    }
  }

  return null
}

export interface Step {
  id: number
  name: string
  title: string
  description: string
  img: string
}

export interface ModeOption {
  id: 'cdc' | 'convert'
  title: string
}

interface ErrorState {
  message: string
  isRetrying: boolean
  retryCount?: number
}

// Create apiKey ref outside the store to properly type useLocalStorage
const apiKeyStorage: Ref<string> = useLocalStorage(STORAGE_KEYS.API_KEY, '')

export const useCommonStore = defineStore('common', {
  state: () => ({
    currentViewType: '',
    userData: null as UserData | null,
    sentryHealthy: false,
    apiHealthy: false,
    apiKeyInvalidated: false,
    requiresApiKey: false,
    serviceStatuses: [] as ServiceStatus[],
    steps: [
      {
        id: 1,
        name: 'source',
        title: 'Select source or create new connection',
        description:
          'Choose an existing data source from your connections or set up a new one to begin the data transfer process.',
        img: '/images/steps/source-step.svg'
      },
      {
        id: 2,
        name: 'streamSettings',
        title: 'Configure your stream',
        description:
          'Customize your stream settings, including table selection, data filtering, and transformation rules to ensure optimal data transfer.',
        img: '/images/steps/settings-step.svg'
      },
      {
        id: 3,
        name: 'target',
        title: 'Select target or create new connection',
        description:
          'Choose or create a target connection where your data will be transferred, completing the stream configuration process.',
        img: '/images/steps/target-step.svg'
      },
      {
        id: 4,
        name: 'start',
        title: 'Start and monitor your stream',
        description:
          'Initiate the data transfer process by starting your stream and monitoring the progress, ensuring a smooth migration or synchronization of data from the source to the target.',
        img: '/images/steps/start-step.svg'
      }
    ] as Step[],

    homeSteps: [
      {
        id: 1,
        name: 'connect',
        title: 'Create or select connections',
        description:
          'Add a new database connection or choose from your existing connections to prepare for data transfer or further exploration.',
        img: '/images/steps/connection-step.svg'
      },
      {
        id: 2,
        name: 'explore',
        title: 'Explore your databases',
        description:
          'Browse your connected databases to view tables, data, and relationships. Use the Data Explorer to understand your schema and data before starting any migration or streaming tasks.',
        img: '/images/steps/explore-step.svg'
      },
      {
        id: 3,
        name: 'stream',
        title: 'Set up a data stream (Migration or CDC)',
        description:
          'Configure a new stream to migrate data or enable change data capture (CDC) between your source and target databases. Customize table selection, filtering, and transformation rules.',
        img: '/images/steps/settings-step.svg'
      },
      {
        id: 4,
        name: 'monitor',
        title: 'Monitor and manage your streams',
        description:
          'Start your stream and track progress in real time. Monitor data transfer, review logs, and ensure smooth synchronization or migration.',
        img: '/images/steps/monitor-step.svg'
      }
    ] as Step[],
    operationMap: {
      insert: 'Insert',
      update: 'Update',
      delete: 'Delete'
    },
    modes: [
      { id: 'convert', title: 'Convert (Migrate Data)' },
      { id: 'cdc', title: 'Stream (Change Data Capture)' }
    ] as ModeOption[],
    currentPage: '',
    isBackendConnected: false,
    error: null as ErrorState | null,
    isLoading: false,
    isLoadingRoute: false,
    routeLoadError: null as string | null,
    healthCheckInterval: null as number | null,
    initializationStartTime: Date.now()
  }),
  actions: {
    async retryOperation(
      operation: () => Promise<void>,
      maxRetries = 3,
      delay = 5000
    ): Promise<void> {
      let retries = 0
      while (retries < maxRetries) {
        try {
          await operation()
          return
        } catch (error) {
          retries++
          if (retries === maxRetries) {
            throw error
          }
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    },
    async checkSentryHealth() {
      try {
        await this.retryOperation(
          async () => {
            try {
              await api.sentryHealthCheck()
              this.sentryHealthy = true
            } catch (error) {
              this.sentryHealthy = false
              throw error
            }
          },
          HEALTH_CHECK_MAX_RETRIES,
          HEALTH_CHECK_RETRY_DELAY_MS
        )
      } catch (error) {
        // Silently catch health check failures - the health monitor will handle reconnection
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (!errorMessage.includes('Network Error')) {
          console.warn('Sentry health check failed:', errorMessage)
        }
      }
    },

    async checkAPIHealth() {
      try {
        await this.retryOperation(
          async () => {
            try {
              await api.backendHealthCheck()
              this.apiHealthy = true
            } catch (error) {
              this.apiHealthy = false
              throw error
            }
          },
          HEALTH_CHECK_MAX_RETRIES,
          HEALTH_CHECK_RETRY_DELAY_MS
        )
      } catch (error) {
        // Silently catch health check failures - the health monitor will handle reconnection
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (!errorMessage.includes('Network Error')) {
          console.warn('Backend health check failed:', errorMessage)
        }
      }
    },

    async getApiKey(): Promise<string | null> {
      try {
        const storedKey = apiKeyStorage.value
        // If we have an API key and it's not marked as invalidated, use it
        if (storedKey && !this.apiKeyInvalidated) {
          configureApiClient(storedKey)
          return storedKey
        }

        // No API key found
        this.setBackendConnected(false)
        return null
      } catch (error) {
        console.error('Error getting API key:', error)
        this.setBackendConnected(false)
        return null
      }
    },

    async setApiKey(newApiKey: string): Promise<void> {
      const toast = useToast()
      const trimmedKey = newApiKey.trim()
      try {
        // Validate the API key before storing
        await api.validateApiKey(trimmedKey)
        apiKeyStorage.value = trimmedKey
        this.apiKeyInvalidated = false
        this.requiresApiKey = false
        // Configure the API client with the new API key
        configureApiClient(trimmedKey)
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : ''
        const permissionError = getPermissionError(error)
        if (permissionError) {
          toast.error(permissionError.message)
          apiKeyStorage.value = trimmedKey
          this.apiKeyInvalidated = false
          this.requiresApiKey = false
          configureApiClient(trimmedKey)
          return
        }
        const invalidKey =
          errMsg.toLowerCase().includes('invalid api key') ||
          (axios.isAxiosError(error) && error.response?.status === 401)
        if (invalidKey) {
          toast.error('Invalid API key provided')
          throw error
        }

        if (axios.isAxiosError(error)) {
          if (error.response?.status === 503) {
            toast.warning('Unable to validate API key right now. Please try again in a moment.')
          } else {
            toast.warning('Unable to connect to backend. Please try again.')
          }
        } else {
          toast.warning('Unable to validate API key right now. Please try again in a moment.')
        }

        // Keep the key locally so the user doesn't have to re-enter it.
        apiKeyStorage.value = trimmedKey
        this.apiKeyInvalidated = false
        this.requiresApiKey = false
        configureApiClient(trimmedKey)
      }
    },

    async clearApiKey(): Promise<void> {
      apiKeyStorage.value = ''
      this.apiKeyInvalidated = true
      // Clear the API key header from axios instance
      configureApiClient('')
    },

    async clearApiKeyAndReset(): Promise<void> {
      const currentKey = apiKeyStorage.value
      if (currentKey) {
        try {
          await api.clearApiKey()
        } catch (error) {
          console.warn('Failed to clear API key on server:', error)
        }
      }

      await this.clearApiKey()
      this.apiKeyInvalidated = false
      this.userData = null
      this.requiresApiKey = true
    },

    requireApiKey() {
      this.requiresApiKey = true
    },

    clearApiKeyRequirement() {
      this.requiresApiKey = false
    },

    // Method to refresh API key validation without clearing localStorage
    async refreshApiKey(): Promise<boolean> {
      const currentKey = apiKeyStorage.value
      if (!currentKey) {
        return false
      }

      try {
        await api.validateApiKey(currentKey)
        this.apiKeyInvalidated = false
        configureApiClient(currentKey)
        return true
      } catch {
        this.apiKeyInvalidated = true
        return false
      }
    },

    async userDataFromSentry(apiKey: string) {
      try {
        const response = await api.getUserDataFromSentry(apiKey)
        this.userData = response
      } catch (error: unknown) {
        const toast = useToast()
        const axiosErr = axios.isAxiosError(error) ? error : null
        const errMsg = error instanceof Error ? error.message : String(error)
        const permissionError = getPermissionError(error)

        // Only clear API key for authentication errors (401)
        if (permissionError) {
          toast.error(permissionError.message)
          this.userData = null
        } else if (axiosErr?.response?.status === 401 || errMsg === 'Invalid API key') {
          console.warn('API key is invalid, clearing from storage')
          await this.clearApiKey()
          toast.error('Invalid API key. Please enter a valid key to continue.')
          this.userData = null
        } else {
          // For network errors, keep the API key and show appropriate message
          console.warn('Network error during user data fetch, keeping API key:', errMsg)
          toast.error('Unable to connect to server. Please check your connection and try again.')
        }
        throw error
      }
    },
    async loadUserConfigs() {
      const currentKey = apiKeyStorage.value
      try {
        if (!currentKey) {
          throw new Error('API key is not available')
        }
        await api.loadUserConfigs(currentKey)
      } catch (error) {
        // Don't show toast for network errors - the connection monitor handles that
        const errorMessage = error instanceof Error ? error.message : String(error)
        const isNetworkError =
          errorMessage.includes('Unable to connect') || errorMessage.includes('Network Error')

        if (!isNetworkError) {
          const toast = useToast()
          toast.error(errorMessage)
        }
        throw error
      }
    },
    async getViewType() {
      this.currentViewType = storage.getCurrentViewType()
    },
    async setViewType(vType: string) {
      storage.setCurrentViewType(vType)
      this.currentViewType = vType
    },
    showNotification(msg: string, type: 'error' | 'success' | 'warning' | 'info' = 'info') {
      const toast = useToast()
      switch (type) {
        case 'error':
          toast.error(msg)
          break
        case 'success':
          toast.success(msg)
          break
        case 'warning':
          toast.warning(msg)
          break
        case 'info':
          toast.info(msg)
          break
      }
    },
    setCurrentPage(page: string) {
      this.currentPage = page
      if (isWailsContext()) {
        const needsKeyPage = page === 'CreateStream' || page === 'EditStream'
        if (!needsKeyPage) {
          this.clearApiKeyRequirement()
        }
      }
    },
    consumeLogsFromSSE() {
      // Only start SSE connection if backend is available
      if (!this.isBackendConnected) {
        return
      }

      // Start the SSE logs connection in the background
      // Uses sseLogsServiceStructured (imported as sseLogsService) which handles:
      // - Category-aware deduplication (progress, stat, sql, error logs)
      // - Structured fields (stage, description, table, status, etc.)
      // - Validation that allows empty messages for structured logs
      setTimeout(() => {
        sseLogsService.setBackendAvailable(true)
        sseLogsService.connect()
      }, 0)
    },

    async initApp(): Promise<'success' | 'failed'> {
      const toast = useToast()

      try {
        // Reset initialization time when app starts
        this.initializationStartTime = Date.now()
        // Set to false initially during initialization
        this.setBackendConnected(false)

        // Check if we have a stored API key first
        const apiKey = await this.getApiKey()
        if (!apiKey) {
          if (isWailsContext()) {
            // Desktop IDE mode can proceed without API key
            await Promise.all([this.checkSentryHealth(), this.checkAPIHealth()])
            if (this.apiHealthy) {
              this.setBackendConnected(true)
              this.clearError()
              this.startHealthMonitoring()
              return 'success'
            }
            this.startHealthMonitoring()
            return 'failed'
          }
          toast.info('Please enter your API key to continue')
          return 'failed'
        }

        // Try to check backend health (methods now handle errors internally)
        await Promise.all([this.checkSentryHealth(), this.checkAPIHealth()])

        if (this.sentryHealthy && this.apiHealthy) {
          // Online mode - full initialization
          try {
            await this.userDataFromSentry(apiKey)
            if (this.userData?.apiKey) {
              // Load user configs - backend lazy-loads configurations as needed
              // await this.loadUserConfigs()
              this.consumeLogsFromSSE()
              this.setBackendConnected(true)

              // Reset invalidated flag on successful initialization
              this.apiKeyInvalidated = false

              toast.success('App initialized successfully')
              this.clearError()

              // Start real-time health monitoring
              this.startHealthMonitoring()

              return 'success'
            }
          } catch (error: unknown) {
            // If authentication fails, let it bubble up
            const axiosErr = axios.isAxiosError(error) ? error : null
            const errMsg = error instanceof Error ? error.message : String(error)
            const permissionError = getPermissionError(error)
            if (permissionError) {
              return 'failed'
            }
            if (axiosErr?.response?.status === 401 || errMsg === 'Invalid API key') {
              throw error
            }
            // For other errors, backend is unavailable
            console.warn('Failed to fetch user data, backend unavailable:', errMsg)
            // Don't show toast - let health monitor handle it
            return 'failed'
          }
        } else if (this.apiHealthy) {
          // Backend API is healthy but Sentry might not be - still try to initialize
          console.log('Backend API healthy, attempting initialization even if Sentry is down')
          try {
            // Try to load user configs directly since we have API access
            await this.loadUserConfigs()
            this.setBackendConnected(true)
            toast.success('App initialized successfully')
            this.clearError()

            // Start real-time health monitoring
            this.startHealthMonitoring()

            return 'success'
          } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error)
            console.warn('Failed to initialize with API only:', errMsg)
            // Don't show toast - error already handled in loadUserConfigs
            // Backend unavailable
          }
        } else {
          // Backend unavailable - cannot proceed
          console.log('Backend unavailable')
          this.setBackendConnected(false)
          // Don't show error toast immediately - let the health monitor handle reconnection
          // toast.error('Unable to connect to backend server.')

          // Start monitoring to detect when backend comes back online
          this.startHealthMonitoring()

          return 'failed'
        }

        // Fallback return - should not reach here normally
        return 'failed'
      } catch (error: unknown) {
        const axiosErr = axios.isAxiosError(error) ? error : null
        const errMsg = error instanceof Error ? error.message : String(error)
        console.error('App initialization failed:', errMsg)

        // Clear API key only for authentication errors
        if (axiosErr?.response?.status === 401 || errMsg === 'Invalid API key') {
          await this.clearApiKey()
          toast.error('Invalid API key. Please enter a valid key to continue.')
        } else {
          // Don't show generic error toast - specific errors are already handled
          console.warn('Initialization error handled by specific error handlers')
        }

        this.setBackendConnected(false)
        return 'failed'
      }
    },
    setSelectedPlan(_planId: string) {
      if (this.userData) {
        //todo: implement this
        // this.userData.subscription = _planId
      }
    },
    setBackendConnected(status: boolean) {
      this.isBackendConnected = status

      // Notify SSE service about backend status
      sseLogsService.setBackendAvailable(status)

      // If backend becomes available, try to connect SSE
      if (status) {
        this.consumeLogsFromSSE()
      }
    },
    async fetchServiceStatus() {
      try {
        const response = await api.getServiceStatus()
        this.serviceStatuses = response.services
        if (response.services.every((service) => service.status === SERVICE_STATUS.PASSING)) {
          this.clearError()
        }
        return response
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes('Network Error') ||
            error.message.includes('timeout') ||
            error.message.includes('connection'))
        ) {
          throw error
        }
        console.error('Failed to fetch service status:', error)
      }
    },
    setError(error: ErrorState | null) {
      this.error = error
    },
    setLoading(status: boolean) {
      this.isLoading = status
    },
    clearError() {
      this.error = null
    },
    async loadRouteData(route: string): Promise<boolean> {
      this.isLoadingRoute = true
      this.routeLoadError = null
      this.clearError()

      try {
        switch (route) {
          case 'Connections':
            // Load connections data
            await api.getConnections()
            break
          case 'Streams':
            // Load streams data
            await api.getStreams()
            break
          case 'Dashboard':
            // Load dashboard data
            await this.fetchServiceStatus()
            break
          case 'CreateStream':
          case 'EditStream':
            break
          case 'AddConnection':
          case 'EditConnection':
            // These routes handle their own data loading
            break
          case 'Home':
          case 'DatabaseExplorer':
          case 'DatabaseMetadata':
            // These routes don't need special data loading
            break
          default:
            // Unknown routes don't need special data loading
            break
        }
        return true
      } catch (error: unknown) {
        this.routeLoadError = error instanceof Error ? error.message : String(error)
        return false
      } finally {
        this.isLoadingRoute = false
      }
    },
    clearRouteError() {
      this.routeLoadError = null
    },

    // Real-time health monitoring
    async performHealthCheck() {
      try {
        // Quick health check without retries for monitoring - check both services
        await Promise.all([api.backendHealthCheck(), api.sentryHealthCheck()])

        // If we get here, both backend and sentry are healthy
        if (!this.isBackendConnected) {
          console.log('🔄 Backend connection restored')
          this.setBackendConnected(true)
          this.apiHealthy = true
          this.sentryHealthy = true
          this.clearError()
          try {
            await this.fetchServiceStatus()
          } catch (error) {
            console.warn('⚠️ Failed to refresh service status after reconnection:', error)
          }

          // Re-initialize user configs when backend comes back online
          // This ensures the /user/configs call is made and connections are available
          // Do this in the background without failing the health check
          setTimeout(async () => {
            try {
              const currentKey = apiKeyStorage.value
              if (currentKey) {
                await api.loadUserConfigs(currentKey)
                console.log('✅ User configs reloaded after reconnection')

                // Explicitly trigger connections reload after user configs are loaded
                // Emit a custom event that connections components can listen to
                window.dispatchEvent(new CustomEvent('backend-reconnected'))
              }
            } catch {
              console.warn('⚠️ Failed to reload user configs after reconnection')
              // This is non-critical - the main health check should still succeed
            }
          }, 1000) // Small delay to let the connection stabilize

          const toast = useToast()
          toast.success('Connection restored!')
        }
      } catch {
        // Backend or Sentry is down
        if (this.isBackendConnected) {
          console.warn('🔌 Backend connection lost')
          this.setBackendConnected(false)
          this.apiHealthy = false
          this.sentryHealthy = false

          // Only show toast if we've been connected for a while (not during initial startup)
          const timeSinceInit = Date.now() - this.initializationStartTime
          if (timeSinceInit > CONNECTION_GRACE_PERIOD_MS) {
            const toast = useToast()
            toast.warning('Backend connection lost. Reconnecting...')
          }
        }
      }
    },

    startHealthMonitoring() {
      // Don't start if already monitoring
      if (this.healthCheckInterval) {
        return
      }

      // Perform immediate health check
      this.performHealthCheck()

      // Check periodically
      this.healthCheckInterval = window.setInterval(() => {
        this.performHealthCheck()
      }, HEALTH_CHECK_INTERVAL_MS)
    },

    stopHealthMonitoring() {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
        this.healthCheckInterval = null
      }
    }
  },
  getters: {
    // Expose apiKey from the external ref for backward compatibility
    apiKey: () => apiKeyStorage.value || null,
    isStreamsPage: (state) => state.currentPage === 'Streams',
    userApiKey: (state) => state.userData?.apiKey || null,
    userID: (state) => state.userData?.userID || null,
    stripeCustomerId: (state) => state.userData?.stripeCustomerId || null,
    evaluation: (state) => state.userData?.evaluation || null,
    evaluationStatus: (state) => state.userData?.evaluation?.status || 'inactive',
    evalConvertBytes: (state) => state.userData?.evaluation?.convert_bytes || 0,
    evalConvertLimit: (state) => state.userData?.evaluation?.convert_limit_bytes || 0,
    evalCdcSeconds: (state) => state.userData?.evaluation?.cdc_seconds || 0,
    evalCdcLimit: (state) => state.userData?.evaluation?.cdc_limit_seconds || 0,
    hasValidApiKey: (state) => !!apiKeyStorage.value && !state.apiKeyInvalidated,
    needsApiKey: (state) => !apiKeyStorage.value || state.apiKeyInvalidated,
    shouldShowApiKeyPrompt: (state) => {
      const needsKey = !apiKeyStorage.value || state.apiKeyInvalidated
      if (isWailsContext()) {
        return state.requiresApiKey && needsKey
      }
      return needsKey
    }
  }
})
