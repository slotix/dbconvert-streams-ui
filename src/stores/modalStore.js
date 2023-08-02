import { defineStore } from 'pinia';

export const DIALOG_TYPES = {
  SAVE: 'Save',
  UPDATE: 'Update',
};

export const useModalStore = defineStore('modal', {
  state: () => ({
    showModal: false,
    dlgType: '',
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
