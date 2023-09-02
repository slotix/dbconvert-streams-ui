import { defineStore } from 'pinia';

export const DIALOG_TYPES = {
  SAVE: 'Save',
  UPDATE: 'Update',
};

// export const VIEW_TYPES = {
//   { name: 'Cards', icon: Squares2X2Icon, current: true },
//   { name: 'Table', icon: TableCellsIcon, current: false }
// };

export const useSettingsStore = defineStore('modal', {
  state: () => ({
    showModal: false,
    dlgType: '',
    currentViewType: 'Cards',
  }),
  actions: {
    openModal(dlgType) {
      this.dlgType = dlgType;
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
    },
  },
});
