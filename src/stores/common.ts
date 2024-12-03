import { defineStore } from 'pinia'
import idb from '@/api/iDBService'
import api from '@/api/apiClient'
import { getToken } from '@/utils/auth'
import { UserData } from '@/types/user'
import { v4 as uuidv4 } from 'uuid'

export const DIALOG_TYPES = {
  SAVE: 'Add',
  SAVE_CHANGES: 'Save Changes',
  UPDATE: 'Update'
} as const

export interface Notification {
  id: string
  type: 'error' | 'success' | 'warning' | 'info'
  msg: string
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

type DialogType = (typeof DIALOG_TYPES)[keyof typeof DIALOG_TYPES]
export const useCommonStore = defineStore('common', {
  state: () => ({
    showModal: false,
    dlgType: '' as DialogType | '',
    notificationQueue: [] as Notification[],
    currentNotification: null as Notification | null,
    showNotificationBar: false,
    currentViewType: '',
    userData: null as UserData | null,
    sentryHealthy: false,
    apiHealthy: false,
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
        img: '/images/steps/destination-step.svg'
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
          this.showNotification('Connection to Sentry failed', 'error')
          this.sentryHealthy = false
          throw error // Rethrow to trigger retry
        }
      })
    },

    async checkAPIHealth() {
      await this.retryOperation(async () => {
        try {
          await api.backendHealthCheck()
          this.apiHealthy = true
        } catch (error) {
          this.showNotification('Connection to API server failed', 'error')
          this.apiHealthy = false
          throw error // Rethrow to trigger retry
        }
      })
    },
    async updateAPIKey() {
      try {
        const token = await getToken()
        if (!token) {
          this.showNotification('No token provided', 'error')
          return
        }
        const response = await api.updateAPIKey(token)
        if (this.userData) {
          this.userData.apiKey = response.apiKey
        } else {
          this.showNotification('User data not available', 'error')
        }
      } catch (error) {
        this.showNotification('Failed to update API key', 'error')
        throw error
      }
    },
    async userDataFromSentry(token: string) {
      try {
        const response = await api.getUserDataFromSentry(token)
        this.userData = response
      } catch (error) {
        this.showNotification('Failed to fetch user data', 'error')
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
        this.showNotification('Failed to load user data', 'error')
        throw error
      }
    },
    async fetchUsageData() {
      const apiKey = this.userData?.apiKey
      if (!apiKey) {
        console.error('API key not found')
        return
      }
      try {
        const dailyUsage = await api.getDailyUsage(apiKey)
        const monthlyData = await api.getMonthlyUsage(apiKey)
        if (this.userData) {
          this.userData = {
            ...this.userData,
            dailyUsage,
            monthlyUsage: monthlyData.usage
          }
        }
      } catch (error) {
        console.error('Error fetching usage data:', error)
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
    showNotification(msg: string, type: Notification['type'] = 'info') {
      const newNotification: Notification = { id: uuidv4(), msg, type }
      this.notificationQueue.push(newNotification)
      setTimeout(() => this.dismissNotification(newNotification.id), 5000)
    },
    dismissNotification(id: string) {
      const index = this.notificationQueue.findIndex(n => n.id === id)
      if (index !== -1) {
        this.notificationQueue.splice(index, 1)
      }
    },
    setCurrentPage(page: string) {
      this.currentPage = page
    },
    async initApp(): Promise<'success' | 'failed'> {
      this.showNotification('Initializing App', 'info')
      
      try {
        const token = await getToken()
        if (!token) {
          throw new Error('No token provided')
        }

        await Promise.all([
          this.checkSentryHealth(),
          this.checkAPIHealth()
        ])

        if (this.sentryHealthy && this.apiHealthy) {
          await this.userDataFromSentry(token)
          if (this.userData?.apiKey) {
            await this.loadUserConfigs()
          }
        }

        this.showNotification('App initialized successfully', 'success')
        return 'success'
      } catch (error: any) {
        console.error('Failed to initialize app:', error)
        this.showNotification(`Failed to initialize app: ${error.message}`, 'error')
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
    }
  },
  getters: {
    notificationBar: (state) => state.currentNotification,
    isStreamsPage: (state) => state.currentPage === 'ManageStream',
    apiKey: (state) => state.userData?.apiKey || null,
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
    }
  }
})
