<template>
  <connection-popup
    :is-open="isPopupOpen"
    :isShowActionBtns="true"
    @ok="update"
    @close="close"
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
  </connection-popup>
</template>

<script>
import ConnectionPopup from "./ConnectionPopup.vue";
import ConnectionParams from "./params/ConnectionParams.vue";
import { mapGetters, mapActions } from "vuex";

export default {
  name: "ConnectionEdit",
  components: {
    ConnectionPopup,
    ConnectionParams
  },
  props: {
    isOpen: {
      type: Boolean,
      required: true
    }
  },
  emits: {
    close: null
  },
  data: () => ({
    isPopupOpen: false
  }),
  provide: {
    //Edit or add connection
    isNewConnection: false
  },
  watch: {
    isOpen() {
      this.isPopupOpen = this.isOpen;
    }
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
    // edit() {
    //   this.isPopupOpen = true;
    // },
    close() {
      // this.isPopupOpen = false;
      this.$emit("close");
    }
  }
};
</script>

<style></style>
