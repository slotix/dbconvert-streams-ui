<template>
  <AddModal :isShowActionBtns="showActionBtns" @ok="ok">
    <template #dbtypes-combo>
      <DBTypesListBox @update:selected-db-type="selectDB" />
    </template>
    <template #connection-params>
      <ConnectionParams v-if="selectedDB" :connectionType="selectedDB.type" />
    </template>
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
    async ok() {
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
