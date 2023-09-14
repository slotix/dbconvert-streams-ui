import { defineStore } from "pinia";
import idb from "@/api/iDBService";

export const DIALOG_TYPES = {
  SAVE: "Save",
  UPDATE: "Update",
};

// export const VIEW_TYPES = {
//   { name: 'Cards', icon: Squares2X2Icon, current: true },
//   { name: 'Table', icon: TableCellsIcon, current: false }
// };

export const useSettingsStore = defineStore("modal", {
  state: () => ({
    showModal: false,
    dlgType: "",
    currentViewType: "",
    showNotificationBar: false,
    notificationBar:{
      msg: "",
      type: "",
    } ,
  }),
  actions: {
    async getViewType() {
      let vType = await idb.getCurrentViewType();
      this.currentViewType = vType;
    },
    async setViewType(vType) {
      await idb.setCurrentViewType(vType);
      this.currentViewType = vType; 
    },
    openModal(dlgType) {
      this.dlgType = dlgType;
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
    },
  },
});
