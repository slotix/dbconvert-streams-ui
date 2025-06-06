<template>
  <nav class="flex flex-col sm:flex-row max-w-sm mx-auto mb-4 mt-8">
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
  <div class="container mx-auto w-full">
    <keep-alive>
      <component :is="paramsComponent" :connectionType="props.connectionType" />
    </keep-alive>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import UnifiedConnectionParams from './UnifiedConnectionParams.vue'
import SSLParams from './SSLParams.vue'
import { normalizeConnectionType } from '@/utils/connectionUtils'
import { useConnectionsStore } from '@/stores/connections'

interface Props {
  connectionType: string
}

const props = defineProps<Props>()
const connectionsStore = useConnectionsStore()

const tabs = ref(['Direct', 'SSL'])
const currentTab = ref('')

const currentConnection = computed(() => connectionsStore.currentConnection)

const componentMap = {
  Direct: UnifiedConnectionParams,
  SSL: SSLParams
}

const paramsComponent = computed(() => {
  return componentMap[currentTab.value as keyof typeof componentMap] || UnifiedConnectionParams
})

const changeDBType = () => {
  tabs.value[0] = 'Direct'
  currentTab.value = 'Direct'
}

const changeTab = (tab: string) => {
  currentTab.value = tab
}

watch(() => props.connectionType, changeDBType, { immediate: true })

onMounted(changeDBType)
</script>
