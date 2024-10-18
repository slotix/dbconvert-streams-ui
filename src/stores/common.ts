import { defineStore } from 'pinia'
import idb from '@/api/iDBService'
import api from '@/api/apiClient'
import { getToken } from '@/utils/auth'
import { UserData } from '@/types/user'

export const DIALOG_TYPES = {
  SAVE: 'Add',
  SAVE_CHANGES: 'Save Changes',
  UPDATE: 'Update'
} as const

export interface Notification {
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
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam facilis, voluptates error alias dolorem praesentium sit soluta iure incidunt labore explicabo eaque, quia architecto veritatis dolores, enim consequatur nihil ipsum.',
        img: '/images/steps/source-step.svg'
      },
      {
        id: 2,
        name: 'streamSettings',
        title: 'Configure your stream',
        description:
          'We are fetching the schema of your data source. This should take less than a minute, but may take a few minutes on slow internet connections or data sources with a large amount of tables.',
        img: '/images/steps/settings-step.svg'
      },
      {
        id: 3,
        name: 'target',
        title: 'Select target or create new connection',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam facilis, voluptates error alias dolorem praesentium sit soluta iure incidunt labore explicabo eaque, quia architecto veritatis dolores, enim consequatur nihil ipsum.',
        img: '/images/steps/destination-step.svg'
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
    selectedPlan: null as string | null
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
    async userDataFromSentry() {
      try {
        const token = await getToken()
        if (!token) {
          this.showNotification('No token provided', 'error')
          return
        }
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
            monthlyUsage: monthlyData.usage,
            limit: monthlyData.limit
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
    showNotification(msg: string, type: Notification['type'] = 'error', duration = 3000) {
      const newNotification: Notification = { msg, type }
      if (
        !this.notificationQueue.some(
          (notification) => notification.msg === msg && notification.type === type
        )
      ) {
        this.notificationQueue.push(newNotification)
      }
      if (!this.currentNotification) {
        this.displayNextNotification(duration)
      }
    },
    displayNextNotification(duration: number) {
      if (this.notificationQueue.length > 0) {
        this.currentNotification = this.notificationQueue.shift() || null
        this.showNotificationBar = true
        setTimeout(this.hideNotification, duration)
      } else {
        this.currentNotification = null
        this.showNotificationBar = false
      }
    },
    hideNotification() {
      this.showNotificationBar = false
      setTimeout(this.displayNextNotification, 500)
    },
    setCurrentPage(page: string) {
      this.currentPage = page
    },
    async initApp(): Promise<'success' | 'failed'> {
      this.showNotification('Initializing App', 'success')
      const token = await getToken()
      if (!token) {
        this.showNotification('No token provided', 'error')
        return 'failed'
      }

      try {
        await this.checkSentryHealth()
        await this.checkAPIHealth()

        if (this.sentryHealthy && this.apiHealthy) {
          await this.userDataFromSentry()
          if (this.userData?.apiKey) {
            await this.loadUserConfigs()
          }
        }
        return 'success'
      } catch (error) {
        console.error('Failed to initialize app:', error)
        this.showNotification('Failed to initialize app', 'error')
        return 'failed'
      }
    },
    setSelectedPlan(planId: string) {
      this.selectedPlan = planId
    }
  },
  getters: {
    notificationBar: (state) => state.currentNotification,
    isStreamsPage: (state) => state.currentPage === 'ManageStream',
    apiKey: (state) => state.userData?.apiKey || null,
    userID: (state) => state.userData?.userID || null,
    monthlyLimit: (state) => state.userData?.limit || null,
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
