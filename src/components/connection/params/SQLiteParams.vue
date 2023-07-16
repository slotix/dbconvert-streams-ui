<template>
  <div>
    <connection-name v-model:name="connection.name" />
    <hr />
    <div class=" bg-white bg-opacity-5">
      <div
        class="items-center text-center md:text-left w-full p-4 space-y-4 text-gray-500 lg:inline-flex lg:space-y-0"
      >
        <label class="w-full overflow-hidden max-w-sm mx-auto lg:w-1/3">
          SQLite Database (.db)
        </label>
        <upload-box
          class="w-full overflow-auto lg:w-2/3"
          :id="uploadBoxId"
          :multiple="false"
          :accept="accept"
          @changeFileName="changeFileName"
        />
      </div>
    </div>
  </div>
</template>

<script>
import UploadBox from "../../UploadBox.vue";
import { mapMutations, mapGetters } from "vuex";
import ConnectionName from "./ConnectionName.vue";

export default {
  name: "SQLiteParams",
  components: {
    UploadBox,
    ConnectionName
  },
  data: () => ({
    connection: {
      name: "",
      fileName: ""
    },
    connectionType: "SQLite",
    accept: ".db",
    uploadBoxId: "uploadSQLiteFile"
  }),
  inject: ["isNewConnection"],
  mounted() {
    if (this.isNewConnection) {
      this.connection.name = this.buildConnectionName;
    }
    this.connection.type = this.connectionType;
  },
  activated() {
    if (this.isNewConnection) {
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
    }
  },
  watch: {
    "connection.fileName": function() {
      if (this.isNewConnection) {
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
