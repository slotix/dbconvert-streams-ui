<template>
  <nav v-show="showTabs" class="flex flex-col sm:flex-row max-w-sm mx-auto mb-4 mt-8">
    <button
      v-for="tab in tabs"
      :key="tab"
      :class="{
        'border-b-2 font-medium border-gray-500': currentTab === tab
      }"
      class="text-gray-500 py-4 px-6 flex-1 hover:text-gray-700 focus:outline-none"
      @click="changeTab(tab)"
    >
      {{ tab }}
    </button>
  </nav>
  <div class="container max-w-2xl mx-auto md:w-full">
    <keep-alive>
      <component :is="paramsComponent" />
    </keep-alive>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import MySQLParams from './MySQLParams.vue'
import PostgreSQLParams from './PostgreSQLParams.vue'
import SQLServerParams from './SQLServerParams.vue'
import OracleParams from './OracleParams.vue'
import AccessParams from './AccessParams.vue'
import AzureParams from './AzureParams.vue'
import DB2Params from './DB2Params.vue'
import FirebirdParams from './FirebirdParams.vue'
import InterbaseParams from './InterbaseParams.vue'
import FoxProParams from './FoxProParams.vue'
import SQLiteParams from './SQLiteParams.vue'
import SSHParams from './SSHParams.vue'
import SSLParams from './SSLParams.vue'

const props = defineProps({
  connectionType: {
    type: String,
    required: true
  }
})

const tabs = ref(['Direct', 'SSH', 'SSL'])
const currentTab = ref('')

const componentMap = {
  MySQL: MySQLParams,
  PostgreSQL: PostgreSQLParams,
  SQLServer: SQLServerParams,
  Oracle: OracleParams,
  Access: AccessParams,
  Azure: AzureParams,
  DB2: DB2Params,
  Firebird: FirebirdParams,
  Interbase: InterbaseParams,
  FoxPro: FoxProParams,
  SQLite: SQLiteParams,
  SSH: SSHParams,
  SSL: SSLParams
}

const changeDBType = () => {
  tabs.value[0] = 'Direct'
  currentTab.value = 'Direct'
}

const changeTab = (tab) => {
  currentTab.value = tab
}

watch(() => props.connectionType, changeDBType, { immediate: true })

const showTabs = computed(() => {
  return !['Access', 'FoxPro', 'SQLite'].includes(props.connectionType)
})

const paramsComponent = computed(() => {
  if (currentTab.value === 'Direct') {
    return componentMap[props.connectionType] || null
  } else {
    return componentMap[currentTab.value] || null
  }
})

onMounted(changeDBType)
</script>
