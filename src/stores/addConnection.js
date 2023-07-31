import { defineStore } from 'pinia';

export const useAddConnectionStore = defineStore('addModal', {
  state: () => ({
    showModal: false,
  }),
  actions: {
    openModal() {
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
    },
  },
});
