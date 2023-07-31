<template>
  <AddModal :isShowActionBtns="showActionBtns" @ok="save">
    <template #title> Add Database Connection </template>
    <template #dbtypes-combo>
      <!-- dbTypes combo for mobiles  -->
      <DBTypesListBox @update:selected-db-type="selectDB" />
    </template>
    <template #connection-params>
      <connection-params v-if="selectedDB" :connectionType="selectedDB.type" />
    </template>
    <template #confirmButton> Save </template>
  </AddModal>
</template>

<script>
import AddModal from './AddModal.vue'
import ConnectionParams from './params/ConnectionParams.vue'
import DBTypesListBox from './DBTypesListBox.vue'
import { mapActions } from 'vuex'
import { useAddConnectionStore } from '@/stores/addConnection.js'

export default {
  components: {
    AddModal,
    ConnectionParams,
    DBTypesListBox
  },
  data: () => ({
    selectedDB: null,
    showDBCombo: false
  }),
  provide: {
    //Edit or add connection
    isNewConnection: true
  },
  computed: {
    showActionBtns() {
      if (this.selectedDB === null) {
        return false
      }
      return true
    }
  },
  methods: {
    ...mapActions(['saveConnection', 'refreshConnections']),
    selectDB(conn) {
      this.selectedDB = conn
    },
    async save() {
      try {
        await this.saveConnection()
        await this.refreshConnections()
      } catch (e) {
        console.log(e)
      }
    },
    closeModal() {
      useAddConnectionStore().closeModal()
    }
  }
}
</script>
