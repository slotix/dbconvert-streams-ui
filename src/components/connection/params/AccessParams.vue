<template>
  <div>
    <connection-name v-model:name="connection.name" />
    <hr />
    <div class=" bg-white bg-opacity-5 text-center md:text-left">
      <div
        class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0 "
      >
        <label class="max-w-sm mx-auto md:w-1/3">
          User ID
        </label>
        <div class="max-w-sm mx-auto md:w-2/3">
          <div class=" relative ">
            <input
              v-model.lazy="connection.userName"
              type="text"
              class=" rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
              placeholder=""
            />
          </div>
        </div>
      </div>
      <div
        class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0"
      >
        <label class="max-w-sm mx-auto md:w-1/3">
          Password
        </label>

        <div class="max-w-sm mx-auto md:w-2/3">
          <div class=" relative ">
            <input
              v-model.trim.lazy="connection.password"
              type="password"
              class=" rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
              placeholder=""
            />
          </div>
        </div>
      </div>
      <div
        class="items-center w-full p-4   space-y-4 text-gray-500 md:inline-flex md:space-y-0 "
      >
        <label class="max-w-sm mx-auto md:w-1/3">
          MS Access Database (.mdb or .accdb)
        </label>
        <upload-box
          class="w-full overflow-auto md:w-2/3"
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
import ConnectionName from "./ConnectionName.vue";

import { mapMutations, mapGetters } from "vuex";
export default {
  name: "AccessParams",
  components: {
    UploadBox,
    ConnectionName
  },
  data: () => ({
    connection: {
      name: "",
      userName: "admin",
      password: "",
      fileName: "",
      linkedTables: true
    },
    connectionType: "Access",
    accept: ".accdb,.mdb",
    uploadBoxId: "uploadAccessFile"
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
