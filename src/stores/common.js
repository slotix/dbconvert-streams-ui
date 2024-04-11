import {defineStore} from 'pinia';
import idb from '@/api/iDBService';

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
    currentViewType: '',
    showNotificationBar: false,
    notificationBar: {
      msg: '',
      type: '',
    },
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
    closeNotification () {
      this.showNotificationBar = false;
    },
  },
});
