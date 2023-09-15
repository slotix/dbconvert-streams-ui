<template>
  <nav
    v-show="showTabs"
    class="flex flex-col sm:flex-row max-w-sm mx-auto mb-4 mt-8"
  >
    <button
      v-for="tab in tabs"
      :key="tab.id"
      :class="{
        'border-b-2 font-medium border-gray-500': currentTab === tab
      }"
      @click="changeTab(tab)"
      class="text-gray-500 py-4 px-6 flex-1 hover:text-gray-700 focus:outline-none "
    >
      {{ tab }}
    </button>
  </nav>
  <div class="container max-w-2xl mx-auto  md:w-full">
    <keep-alive>
      <component :is="paramsComponent" />
    </keep-alive>
  </div>
</template>

<script>
import MySQLParams from "./MySQLParams.vue";
import PostgreSQLParams from "./PostgreSQLParams.vue";
import SQLServerParams from "./SQLServerParams.vue";
import OracleParams from "./OracleParams.vue";
import AccessParams from "./AccessParams.vue";
import AzureParams from "./AzureParams.vue";
import DB2Params from "./DB2Params.vue";
import FirebirdParams from "./FirebirdParams.vue";
import InterbaseParams from "./InterbaseParams.vue";
import FoxProParams from "./FoxProParams.vue";
import SQLiteParams from "./SQLiteParams.vue";
import SSHParams from "./SSHParams.vue";
import SSLParams from "./SSLParams.vue";

export default {
  name: "ConnectionParams",
  components: {
    MySQLParams,
    PostgreSQLParams,
    SQLServerParams,
    OracleParams,
    AzureParams,
    DB2Params,
    FirebirdParams,
    InterbaseParams,
    AccessParams,
    FoxProParams,
    SQLiteParams,
    SSHParams,
    SSLParams
  },
  props: {
    connectionType: {
      type: String,
      required: true
    }
  },
  data: () => ({
    tabs: ["Direct", "SSH", "SSL"],
    currentTab: "",
  }),
  watch: {
    connectionType() {
      this.changeDBType();
    }
  },
  mounted() {
    this.changeDBType();
  },
  methods: {
    changeDBType() {
      this.tabs[0] = this.connectionType;
      this.currentTab = this.tabs[0];
    },
    changeTab(tab) {
      this.currentTab = tab;
    }
  },
  computed: {
    showTabs() {
      if (["Access", "FoxPro", "SQLite"].includes(this.connectionType)) {
        return false;
      }
      return true;
    },
    paramsComponent() {
      switch (this.currentTab) {
        case "":
          return null;
        case "Direct":
          return this.connectionType + "Params";
        default:
          return this.currentTab + "Params";
      }
    }
  }
};
</script>

<style></style>
