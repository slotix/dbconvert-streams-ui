<template>
  <Modal @ok="ok">
    <template #dbtypes-combo>
      <DBTypesListBox @update:selected-db-type="selectDB" />
    </template>
    <template #connection-params>
      <ConnectionParams v-if="connection" :connectionType="connection.type" />
    </template>
  </Modal>
</template>

<script>
import Modal from './Modal.vue'
import ConnectionParams from './params/ConnectionParams.vue'
import DBTypesListBox from './DBTypesListBox.vue'
import {  mapActions } from 'vuex'

export default {
  components: {
    Modal,
    ConnectionParams,
    DBTypesListBox
  },
  data: () => ({
    connection: null,
    showDBCombo: false
  }),
  provide: {
    //Edit or add connection
    isNewConnection: true
  },
  // computed: {
  //   ...mapGetters(['currentConnection'])
  // },
  methods: {
    ...mapActions(['saveConnection', 'refreshConnections']),
    selectDB(conn) {
      this.connection = conn
    },
    async ok() {
      try {
        await this.saveConnection()
        await this.refreshConnections()
      } catch (e) {
        console.log(e)
      }
    }
  }
}
</script>
