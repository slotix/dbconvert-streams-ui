import { defineStore } from 'pinia'
import idb from '@/api/iDBService'
import api from '@/api/apiClient'
import { UserData } from '@/types/user'
import { ServiceStatus } from '@/types/common'
import { useToast } from 'vue-toastification'
import { useMonitoringStore } from './monitoring'
import { connect, AckPolicy, StringCodec, JetStreamManager, Consumer } from 'nats.ws'
import { useLogsStore } from './logs'

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
export const useCommonStore = defineStore('common', {
  state: () => ({
    showModal: false,
    dlgType: '' as DialogType | '',
    currentViewType: '',
    userData: null as UserData | null,
    sentryHealthy: false,
    apiHealthy: false,
    apiKey: import.meta.env.VITE_API_KEY || null,
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
        description: 'Initiate the data transfer process by starting your stream and monitoring the progress, ensuring a smooth migration or synchronization of data from the source to the target.',
        img: '/images/steps/start-step.svg'
      },
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
    isBackendConnected: false
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

    async userDataFromSentry(apiKey: string) {
      try {
        const response = await api.getUserDataFromSentry(apiKey)
        this.userData = response
      } catch (error) {
        const toast = useToast()
        toast.error('Failed to fetch user data')
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
      const vType = await idb.getCurrentViewType()
      this.currentViewType = vType
    },
    async setViewType(vType: string) {
      await idb.setCurrentViewType(vType)
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
    async getApiKey(): Promise<string | null> {
      if (this.apiKey) {
        return this.apiKey
      }

      const storedApiKey = localStorage.getItem('apiKey')
      if (storedApiKey) {
        this.apiKey = storedApiKey
        return storedApiKey
      }

      return null
    },

    async setApiKey(apiKey: string): Promise<void> {
      this.apiKey = apiKey
      localStorage.setItem('apiKey', apiKey)
    },

    async consumeLogsFromNATS() {
      // Start the logs connection in the background
      setTimeout(async () => {
        const logsStore = useLogsStore()
        const monitoringStore = useMonitoringStore()

        while (true) {
          try {
            const natsServer = import.meta.env.VITE_NATS_SERVER
            const nc = await connect({ servers: natsServer })
            const js = nc.jetstream()
            const jsm: JetStreamManager = await js.jetstreamManager()

            const sc = StringCodec()
            await jsm.consumers.add('LOGS', {
              durable_name: 'logsAll',
              ack_policy: AckPolicy.Explicit
            })

            const c: Consumer = await js.consumers.get('LOGS', 'logsAll')

            let iter = await c.consume()
            for await (const m of iter) {
              let data = sc.decode(m.data)
              let parsed = JSON.parse(data)
              parsed.id = m.seq
              const subjectParts = m.subject.split('.')
              parsed.type = subjectParts[1]
              parsed.nodeID = subjectParts[2]

              if (parsed.msg.startsWith('[init]') && parsed.type === 'api') {
                monitoringStore.nodes = []
                const parts = parsed.msg.split('ID:')
                const id = parts[1].trim()
                monitoringStore.streamID = id
              }
              if (parsed.msg.startsWith('[progress]')) {
                const parts = parsed.msg.split('|')
                const stage = parts[0].split('STAGE:')[1]
                monitoringStore.currentStageID = parseInt(stage)
              }
              const nodeExists = monitoringStore.nodes.find((node: { id: string }) => node.id === parsed.nodeID)
              if (!nodeExists) {
                monitoringStore.nodes.push({
                  id: parsed.nodeID,
                  type: parsed.type
                })
              }

              // Add to global logs store
              logsStore.addLog({
                message: parsed.msg,
                level: parsed.level,
                timestamp: parsed.ts,
                source: `${parsed.type}:${parsed.nodeID}`,
                details: parsed
              })

              monitoringStore.addLog(parsed)
              m.ack()
            }

            await nc.drain()
          } catch (error) {
            console.error('Error in NATS connection:', error)
            logsStore.addLog({
              message: `Error in NATS connection: ${error}`,
              level: 'error',
              timestamp: Date.now(),
              source: 'monitoring',
              details: { error }
            })
            // Wait before attempting to reconnect
            await new Promise((resolve) => setTimeout(resolve, 5000))
          }
        }
      }, 0)
    },

    async initApp(): Promise<'success' | 'failed'> {
      const toast = useToast()
      toast.info('Initializing App')

      try {
        await Promise.all([
          this.checkSentryHealth(),
          this.checkAPIHealth()
        ])

        if (this.sentryHealthy && this.apiHealthy) {
          const apiKey = await this.getApiKey()
          if (apiKey) {
            await this.userDataFromSentry(apiKey)
            if (this.userData?.apiKey) {
              await this.loadUserConfigs()
              // Initialize logs connection (non-blocking)
              this.consumeLogsFromNATS()
            }
          } else {
            toast.info('Please enter your API key to continue')
            return 'failed'
          }
        }

        toast.success('App initialized successfully')
        return 'success'
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
      } catch (error) {
        console.error('Failed to fetch service status:', error)
        const toast = useToast()
        toast.error('Failed to fetch service status')
      }
    },
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
    hasValidApiKey: (state) => !!state.apiKey,
  }
})
