<template>
  <Modal @ok="ok">
    <template #connection-params>
      <ConnectionParams v-if="currentConnection" :connectionType="currentConnection.type" />
    </template>
  </Modal>
</template>

<script>
import Modal from './Modal.vue'
import ConnectionParams from './params/ConnectionParams.vue'
import { mapGetters, mapActions } from 'vuex'

export default {
  components: {
    Modal,
    ConnectionParams
  },
  data: () => ({
    // dlgType:'Update' 
  }),
  provide: {
    //Edit or add connection
    isNewConnection: false
  },
  computed: {
    ...mapGetters(['currentConnection']),
  },
  methods: {
    ...mapActions(['saveConnection', 'refreshConnections']),
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
