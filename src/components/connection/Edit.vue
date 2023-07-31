<template>
  <EditModal
    :isShowActionBtns="true"
    @ok="update"
  >
    <template #title>
      Edit Database Connection
    </template>
    <template #connection-params>
      <connection-params
        v-if="currentConnection"
        :connectionType="currentConnection.type"
      />
    </template>
    <template #confirmButton>
      Update
    </template>
  </EditModal>
</template>

<script>
import EditModal from './EditModal.vue'
import ConnectionParams from "./params/ConnectionParams.vue";
import { mapGetters, mapActions } from "vuex";

export default {
  components: {
    EditModal,
    ConnectionParams
  },
  data: () => ({
  }),
  provide: {
    //Edit or add connection
    isNewConnection: false
  },
  computed: {
    ...mapGetters(["currentConnection"])
  },
  methods: {
    ...mapActions(["saveConnection", "refreshConnections"]),
    async update() {
      try {
        await this.saveConnection();
        await this.refreshConnections();
      } catch (e) {
        console.log(e);
      }
    },
  }
};
</script>
