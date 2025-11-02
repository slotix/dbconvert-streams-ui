<template>
  <!-- Local Files - No tabs needed -->
  <div v-if="isLocalFiles" class="container mx-auto w-full">
    <LocalFilesConnectionParams :connectionType="props.connectionType" />
  </div>

  <!-- Database connections - Show tabs -->
  <div v-else>
    <nav class="flex flex-col sm:flex-row max-w-sm mx-auto mb-4 mt-8">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="{
          'border-b-2 font-semibold border-teal-600 text-teal-600': currentTab === tab,
          'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300':
            currentTab !== tab
        }"
        class="py-4 px-6 flex-1 focus:outline-none transition-all duration-200"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import UnifiedConnectionParams from './UnifiedConnectionParams.vue'
import LocalFilesConnectionParams from './LocalFilesConnectionParams.vue'
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

// Check if this is a Files connection (case-insensitive)
const isLocalFiles = computed(() => {
  return props.connectionType?.toLowerCase() === 'files'
})

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
