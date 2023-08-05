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
import { useConnectionsStore } from '@/stores/connections.js'
import { mapActions, mapState } from 'pinia'

export default {
  components: {
    Modal,
    ConnectionParams
  },
  computed: {
    ...mapState(useConnectionsStore,['currentConnection']),
  },
  methods: {
    ...mapActions(useConnectionsStore, {save : 'saveConnection', refresh: 'refreshConnections'}),
    async ok() {
      try {
        await this.save()
        await this.refresh()
      } catch (e) {
        console.log(e)
      }
    }
  }
}
</script>
