import { defineStore } from 'pinia';
import idb from '@/api/iDBService';
import api from '@/api/api.js';

export const DIALOG_TYPES = {
  SAVE: 'Save',
  UPDATE: 'Update',
} as const;

interface Notification {
  msg: string;
  type: string;
}

export interface Step {
  id: number;
  name: string;
  title: string;
  description: string;
  img: string;
}

interface Mode {
  id: string;
  title: string;
}

export const useCommonStore = defineStore('modal', {
  state: () => ({
    showModal: false,
    dlgType: '' as keyof typeof DIALOG_TYPES,
    notificationQueue: [] as Notification[],
    currentNotification: null as Notification | null,
    showNotificationBar: false,
    currentViewType: '',
    apiKey: null as string | null,
    backendHealthy: false,
    steps: [
      {
        id: 1,
        name: 'source',
        title: 'Select source database',
        description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam facilis, voluptates error alias dolorem praesentium sit soluta iure incidunt labore explicabo eaque, quia architecto veritatis dolores, enim consequatur nihil ipsum.',
        img: '/images/steps/source-step.svg',
      },
      {
        id: 2,
        name: 'streamSettings',
        title: 'Configure your stream',
        description: 'We are fetching the schema of your data source. This should take less than a minute, but may take a few minutes on slow internet connections or data sources with a large amount of tables.',
        img: '/images/steps/settings-step.svg',
      },
      {
        id: 3,
        name: 'target',
        title: 'Select target database',
        description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam facilis, voluptates error alias dolorem praesentium sit soluta iure incidunt labore explicabo eaque, quia architecto veritatis dolores, enim consequatur nihil ipsum.',
        img: '/images/steps/destination-step.svg',
      },
    ] as Step[],
    operationMap: {
      insert: 'Insert',
      update: 'Update',
      delete: 'Delete',
    },
    modes: [
      { id: 'convert', title: 'Migrate Data/ Convert' },
      { id: 'cdc', title: 'Change Data Capture/ Sync' },
    ] as Mode[],
  }),
  actions: {
    async fetchApiKey(token: string) {
      try {
        this.apiKey = await api.getApiKey(token);
        this.backendHealthy = true;
      } catch (error) {
        this.showNotification('Failed to fetch API key', 'error');
        this.backendHealthy = false;
      }
    },
    async checkAPIHealth() {
      try {
        await api.healthCheck();
        this.backendHealthy = true;
      } catch (error) {
        this.showNotification('Connection to Backend API failed', 'error');
        this.backendHealthy = false;
      }
    },
    async getViewType() {
      const vType = await idb.getCurrentViewType();
      this.currentViewType = vType;
    },
    async setViewType(vType: string) {
      await idb.setCurrentViewType(vType);
      this.currentViewType = vType;
    },
    openModal(dlgType: keyof typeof DIALOG_TYPES) {
      this.dlgType = dlgType;
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
    },
    showNotification(msg: string, type: string = 'error') {
      const newNotification: Notification = { msg, type };
      if (!this.notificationQueue.some(notification => notification.msg === msg && notification.type === type)) {
        this.notificationQueue.push(newNotification);
      }
      if (!this.currentNotification) {
        this.displayNextNotification();
      }
    },
    displayNextNotification() {
      if (this.notificationQueue.length > 0) {
        this.currentNotification = this.notificationQueue.shift() || null;
        this.showNotificationBar = true;
        setTimeout(this.hideNotification, 3000);
      } else {
        this.currentNotification = null;
        this.showNotificationBar = false;
      }
    },
    hideNotification() {
      this.showNotificationBar = false;
      setTimeout(this.displayNextNotification, 500);
    },
    async retryFetchApiKeyAndCheckHealth(token: string) {
      const retryInterval = 5000;
      const retryFunction = async () => {
        if (!this.backendHealthy) {
          await this.checkAPIHealth();
          if (this.backendHealthy) {
            await this.fetchApiKey(token);
          }
        }
      };
      setInterval(retryFunction, retryInterval);
    },
  },
  getters: {
    notificationBar: (state) => state.currentNotification,
  },
});
