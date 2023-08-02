<template>
  <div>
    <connection-name v-model:name="connection.name" />
    <hr />
    <div class=" bg-white bg-opacity-5 text-center md:text-left ">
      <div
        class="items-center  w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0 "
      >
        <label class="max-w-sm mx-auto md:w-1/3">
          FoxPro Database(.dbc) or FoxPro free tables(.dbf)
        </label>

        <upload-box
          class="w-full overflow-auto md:w-2/3"
          :id="uploadBoxId"
          :multiple="true"
          :accept="accept"
          @changeFileName="changeFileName"
        />
      </div>
    </div>
  </div>
</template>

<script>
import UploadBox from "../../UploadBox.vue";
import ConnectionName from "./ConnectionName.vue";
import { mapMutations, mapGetters } from "vuex";
import { useModalStore, DIALOG_TYPES } from '@/stores/modalStore.js'
export default {
  name: "FoxproParams",
  components: {
    UploadBox,
    ConnectionName
  },
  data: () => ({
    connection: {
      name: "",
      fileName: ""
    },
    connectionType: "FoxPro",
    accept: ".dbc,.dbf",
    uploadBoxId: "uploadFoxProFile"
  }),
  mounted() {
    if (this.dlgTp === DIALOG_TYPES.SAVE) {
      this.connection.name = this.buildConnectionName;
    }
    this.connection.type = this.connectionType;
  },
  activated() {
    if (this.dlgTp === DIALOG_TYPES.SAVE) {
      this.UPDATE_CURRENT_CONNECTION(this.connection);
    } else {
      this.connection = this.currentConnection;
    }
  },
  methods: {
    changeFileName(fileName) {
      this.connection.fileName = fileName;
      this.connection.name = this.buildConnectionName;
    },
    ...mapMutations(["UPDATE_CURRENT_CONNECTION"])
  },
  computed: {
    ...mapGetters(["currentConnection"]),
    buildConnectionName() {
      return this.connectionType + "_" + this.connection.fileName;
    },
    dlgTp() {
      return useModalStore().dlgType
    }
  },
  watch: {
    "connection.fileName": function() {
    if (this.dlgTp === DIALOG_TYPES.SAVE) {
        this.connection.name = this.buildConnectionName;
      }
    },
    connection: {
      handler() {
        this.UPDATE_CURRENT_CONNECTION(this.connection);
      },
      deep: true
    }
  }
};
</script>

<style></style>
