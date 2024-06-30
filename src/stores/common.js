import {defineStore} from 'pinia';
import idb from '@/api/iDBService';
import api from '@/api/api.js';

export const DIALOG_TYPES = {
  SAVE: 'Save',
  UPDATE: 'Update',
};
// export const VIEW_TYPES = {
//   { name: 'Cards', icon: Squares2X2Icon, current: true },
//   { name: 'Table', icon: TableCellsIcon, current: false }
// };

export const useCommonStore = defineStore ('modal', {
  state: () => ({
    showModal: false,
    dlgType: '',
    notificationQueue: [],
    currentNotification: null,
    showNotificationBar: false,
    currentViewType: '',
    apiKey: null, // Add state for API key
    backendHealthy: false, // New state to track backend health
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
      // {
      //   id: 4,
      //   name: "run",
      //   title: "Monitor running stream",
      //   description:
      //     "Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam facilis, voluptates error alias dolorem praesentium sit soluta iure incidunt labore explicabo eaque, quia architecto veritatis dolores, enim consequatur nihil ipsum.",
      //   img: "/images/steps/launch-step.svg",
      // },
    ],

    operationMap: {
      insert: 'Insert',
      update: 'Update',
      delete: 'Delete',
    },
    modes: [
      {id: 'convert', title: 'Migrate Data/ Convert'},
      {id: 'cdc', title: 'Change Data Capture/ Sync'},
    ],
    // modes: [
    //   {
    //     id: "convert",
    //     title: "Convert",
    //     description: "Copy Data",
    //     img: "/images/projects/copy-data.svg",
    //     imgSmall: "/images/projects/copy-data-round.svg"
    //   },
    //   {
    //     id: "cdc",
    //     type: "CDC Sync",
    //     description: "Synchronization",
    //     img: "/images/projects/synchronization.svg",
    //     imgSmall: "/images/projects/synchronization-round.svg"
    //   }
    // ],
  }),
  actions: {
    async fetchApiKey (token) {
      try {
        this.apiKey = await api.getApiKey (token);
        this.backendHealthy = true; // Set backend as healthy if successful
      } catch (error) {
        this.showNotification ('Failed to fetch API key', 'error');
        this.backendHealthy = false; // Set backend as unhealthy if failed
      }
    },
    async checkAPIHealth () {
      try {
        await api.healthCheck ();
        this.backendHealthy = true; // Set backend as healthy if successful
      } catch (error) {
        this.showNotification ('Health check failed', 'error');
        this.backendHealthy = false; // Set backend as unhealthy if failed
      }
    },
    async getViewType () {
      let vType = await idb.getCurrentViewType ();
      this.currentViewType = vType;
    },
    async setViewType (vType) {
      await idb.setCurrentViewType (vType);
      this.currentViewType = vType;
    },
    openModal (dlgType) {
      this.dlgType = dlgType;
      this.showModal = true;
    },
    closeModal () {
      this.showModal = false;
    },
    showNotification (msg, type = 'error') {
      const newNotification = {msg, type};
      // Prevent duplicate messages
      if (
        !this.notificationQueue.some (
          notification => notification.msg === msg && notification.type === type
        )
      ) {
        this.notificationQueue.push (newNotification);
      }
      if (!this.currentNotification) {
        this.displayNextNotification ();
      }
    },
    // showNotification (msg, type = 'error') {
    //   this.notificationQueue.push ({msg, type});
    //   if (!this.currentNotification) {
    //     this.displayNextNotification ();
    //   }
    // },
    displayNextNotification () {
      if (this.notificationQueue.length > 0) {
        this.currentNotification = this.notificationQueue.shift ();
        this.showNotificationBar = true;
        setTimeout (this.hideNotification, 3000); // Auto-hide notification after 3 seconds
      } else {
        this.currentNotification = null;
        this.showNotificationBar = false;
      }
    },
    hideNotification () {
      this.showNotificationBar = false;
      setTimeout (this.displayNextNotification, 500); // Display next notification after a short delay
    },
    async retryFetchApiKeyAndCheckHealth (token) {
      const retryInterval = 5000; // Retry every 5 seconds
      const retryFunction = async () => {
        if (!this.backendHealthy) {
          await this.checkAPIHealth ();
          if (this.backendHealthy) {
            await this.fetchApiKey (token);
          }
        }
      };
      setInterval (retryFunction, retryInterval);
    },
  },
  getters: {
    notificationBar (state) {
      return state.currentNotification;
    },
  },
});
