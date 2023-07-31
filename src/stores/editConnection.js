import { defineStore } from 'pinia';

export const useEditConnectionStore = defineStore('editModal', {
  state: () => ({
    showEditModal: false,
  }),
  actions: {
    openModal() {
      this.showEditModal = true;
    },
    closeModal() {
      this.showEditModal = false;
    },
  },
});
