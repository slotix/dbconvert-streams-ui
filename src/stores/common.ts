import { defineStore } from 'pinia'
import storage from '@/api/storageService'
import api from '@/api/apiClient'
import type { UserData } from '@/types/user'
import type { ServiceStatus } from '@/types/common'
import { useToast } from 'vue-toastification'
import { useMonitoringStore } from './monitoring'
import { sseLogsService } from '@/api/sseLogsService'
import { useLocalStorage } from '@vueuse/core'

export const DIALOG_TYPES = {
  SAVE: 'Add',
  SAVE_CHANGES: 'Save Changes',
  UPDATE: 'Update'
} as const

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

type DialogType = (typeof DIALOG_TYPES)[keyof typeof DIALOG_TYPES]

interface ErrorState {
  message: string
  isRetrying: boolean
  retryCount?: number
}

interface State {
  showModal: boolean
  dlgType: DialogType | ''
  currentViewType: string
  userData: UserData | null
  sentryHealthy: boolean
  apiHealthy: boolean
  apiKey: string | null
  serviceStatuses: ServiceStatus[]
  steps: Step[]
  operationMap: {
    insert: string
    update: string
    delete: string
  }
  modes: ModeOption[]
  currentPage: string
  isBackendConnected: boolean
  error: ErrorState | null
  isLoading: boolean
  isLoadingRoute: boolean
  routeLoadError: string | null
}

export const useCommonStore = defineStore('common', {
  state: () => ({
    showModal: false,
    dlgType: '' as DialogType | '',
    currentViewType: '',
    userData: null as UserData | null,
    sentryHealthy: false,
    apiHealthy: false,
    apiKey: useLocalStorage('dbconvert-api-key', '') as unknown as string | null,
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
          'Browse your connected databases to view tables, data, and relationships. Use the Database Explorer to understand your schema and data before starting any migration or streaming tasks.',
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
      { id: 'convert', title: 'Convert / Migrate Data' },
      { id: 'cdc', title: 'Stream / Change Data Capture' }
    ] as ModeOption[],
    currentPage: '',
    isBackendConnected: false,
    error: null as ErrorState | null,
    isLoading: false,
    isLoadingRoute: false,
    routeLoadError: null as string | null
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
      await this.retryOperation(async () => {
        try {
          await api.sentryHealthCheck()
          this.sentryHealthy = true
        } catch (error) {
          const toast = useToast()
          toast.error('Connection to Sentry failed')
          this.sentryHealthy = false
          throw error
        }
      })
    },

    async checkAPIHealth() {
      await this.retryOperation(async () => {
        try {
          await api.backendHealthCheck()
          this.apiHealthy = true
        } catch (error) {
          const toast = useToast()
          toast.error('Connection to API server failed')
          this.apiHealthy = false
          throw error
        }
      })
    },

    async getApiKey(): Promise<string | null> {
      try {
        if (this.apiKey) {
          await api.validateApiKey(this.apiKey)
          return this.apiKey
        }

        const storedApiKey = localStorage.getItem('apiKey')
        if (storedApiKey) {
          try {
            // Validate the stored API key
            await api.validateApiKey(storedApiKey)
            this.apiKey = storedApiKey
            return storedApiKey
          } catch (error) {
            // If the stored API key is invalid, clear it
            localStorage.removeItem('apiKey')
            this.apiKey = null
            this.setBackendConnected(false)
            return null
          }
        }

        this.setBackendConnected(false)
        return null
      } catch (error) {
        console.error('Error validating API key:', error)
        this.setBackendConnected(false)
        return null
      }
    },

    async setApiKey(apiKey: string): Promise<void> {
      try {
        // Validate the API key before storing
        await api.validateApiKey(apiKey)
        this.apiKey = apiKey
        localStorage.setItem('apiKey', apiKey)
      } catch (error) {
        const toast = useToast()
        toast.error('Invalid API key provided')
        throw error
      }
    },

    async clearApiKey(): Promise<void> {
      this.apiKey = null
      localStorage.removeItem('apiKey')
    },

    async userDataFromSentry(apiKey: string) {
      try {
        const response = await api.getUserDataFromSentry(apiKey)
        this.userData = response
      } catch (error) {
        // Clear invalid API key
        await this.clearApiKey()
        const toast = useToast()
        toast.error('Invalid API key. Please enter a valid key to continue.')
        this.userData = null
        throw error
      }
    },
    async loadUserConfigs() {
      try {
        if (!this.userData?.apiKey) {
          throw new Error('API key is not available')
        }
        await api.loadUserConfigs(this.userData.apiKey)
      } catch (error) {
        const toast = useToast()
        toast.error('Failed to load user data')
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
    openModal(dlgType: DialogType) {
      this.dlgType = dlgType
      this.showModal = true
    },
    closeModal() {
      this.showModal = false
    },
    openAddConnectionDialog() {
      this.openModal(DIALOG_TYPES.SAVE)
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
    },
    async consumeLogsFromSSE() {
      // Start the SSE logs connection in the background
      setTimeout(async () => {
        const monitoringStore = useMonitoringStore()
        monitoringStore.initSSEHandling()
        await sseLogsService.connect()
      }, 0)
    },

    async initApp(): Promise<'success' | 'failed'> {
      const toast = useToast()

      try {
        // Set to false initially during initialization
        this.setBackendConnected(false)

        await Promise.all([this.checkSentryHealth(), this.checkAPIHealth()])

        if (this.sentryHealthy && this.apiHealthy) {
          const apiKey = await this.getApiKey()
          if (apiKey) {
            await this.userDataFromSentry(apiKey)
            if (this.userData?.apiKey) {
              await this.loadUserConfigs()
              this.consumeLogsFromSSE()
              // Set to true only after complete successful initialization
              this.setBackendConnected(true)
              toast.success('App initialized successfully')
              this.clearError()
              return 'success'
            }
          }
          toast.info('Please enter your API key to continue')
          return 'failed'
        }

        return 'failed'
      } catch (error: any) {
        console.error('Failed to initialize app:', error)
        toast.error(`Failed to initialize app: ${error.message}`)
        return 'failed'
      }
    },
    setSelectedPlan(planId: string) {
      if (this.userData) {
        //todo: implement this
        // this.userData.subscription = planId
      }
    },
    setBackendConnected(status: boolean) {
      this.isBackendConnected = status
    },
    async fetchServiceStatus() {
      try {
        const response = await api.getServiceStatus()
        this.serviceStatuses = response.services
        if (response.services.every((service) => service.status === 'passing')) {
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
          case 'connections':
            // Load connections data
            await api.getConnections()
            break
          case 'streams':
            // Load streams data
            await api.getStreams()
            break
          case 'dashboard':
            // Load dashboard data
            await this.fetchServiceStatus()
            break
        }
        return true
      } catch (error: any) {
        this.routeLoadError = error.message
        return false
      } finally {
        this.isLoadingRoute = false
      }
    },
    clearRouteError() {
      this.routeLoadError = null
    }
  },
  getters: {
    isStreamsPage: (state) => state.currentPage === 'ManageStream',
    userApiKey: (state) => state.userData?.apiKey || null,
    userID: (state) => state.userData?.userID || null,
    stripeCustomerId: (state) => state.userData?.stripeCustomerId || null,
    trialEnd: (state) => state.userData?.trialEnd || null,
    currentPeriodStart: (state) => {
      const date = state.userData?.subscriptionPeriodUsage?.period_start
      return date ? new Date(date).getTime() / 1000 : null
    },
    currentPeriodEnd: (state) => {
      const date = state.userData?.subscriptionPeriodUsage?.period_end
      return date ? new Date(date).getTime() / 1000 : null
    },
    currentPeriodUsage: (state) => state.userData?.subscriptionPeriodUsage?.data_volume || 0,
    monthlyLimit: (state) => state.userData?.subscription.monthly_limit || null,
    dailyUsage: (state) => state.userData?.dailyUsage || null,
    monthlyUsage: (state) => state.userData?.monthlyUsage || null,
    currentMonthUsage: (state) => {
      const currentMonth = new Date().getMonth()
      return (
        state.userData?.monthlyUsage?.find(
          (usage) => new Date(usage.month).getMonth() === currentMonth
        ) || null
      )
    },
    hasValidApiKey: (state) => !!state.apiKey
  }
})
