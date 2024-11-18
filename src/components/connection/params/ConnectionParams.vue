<template>
  <nav class="flex flex-col sm:flex-row max-w-sm mx-auto mb-4 mt-8">
    <button v-for="tab in tabs" :key="tab" :class="{
      'border-b-2 font-medium border-gray-500': currentTab === tab
    }" class="text-gray-500 py-4 px-6 flex-1 hover:text-gray-700 focus:outline-none" @click="changeTab(tab)">
      {{ tab }}
    </button>
  </nav>
  <div class="container max-w-2xl mx-auto md:w-full">
    <keep-alive>
      <component :is="paramsComponent" />
    </keep-alive>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import MySQLParams from './MySQLParams.vue'
import PostgreSQLParams from './PostgreSQLParams.vue'
import SSLParams from './SSLParams.vue'

interface Props {
  connectionType: string
}

const props = defineProps<Props>()

const tabs = ref(['Direct', 'SSL'])
const currentTab = ref('')

const componentMap = {
  MySQL: MySQLParams,
  PostgreSQL: PostgreSQLParams,
  SSL: SSLParams
}

const changeDBType = () => {
  tabs.value[0] = 'Direct'
  currentTab.value = 'Direct'
}

const changeTab = (tab: string) => {
  currentTab.value = tab
}

watch(() => props.connectionType, changeDBType, { immediate: true })


const paramsComponent = computed(() => {
  if (currentTab.value === 'Direct') {
    return componentMap[props.connectionType as keyof typeof componentMap] || null
  } else {
    return componentMap[currentTab.value as keyof typeof componentMap] || null
  }
})

onMounted(changeDBType)
</script>
