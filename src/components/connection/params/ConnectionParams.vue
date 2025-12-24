<template>
  <!-- S3 - No tabs needed -->
  <div v-if="isS3" class="container mx-auto w-full">
    <S3ConnectionParams :connectionType="props.connectionType" :logo="props.logo" />
  </div>

  <!-- Local Files - No tabs needed -->
  <div v-else-if="isLocalFiles" class="container mx-auto w-full">
    <LocalFilesConnectionParams :connectionType="props.connectionType" :logo="props.logo" />
  </div>

  <!-- Database connections - Show tabs -->
  <div v-else>
    <nav class="flex flex-col sm:flex-row max-w-sm mx-auto mb-4 mt-8">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="{
          'border-b-2 font-semibold border-teal-600 dark:border-teal-400 text-teal-600 dark:text-teal-400':
            currentTab === tab,
          'border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600':
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
        <component
          :is="paramsComponent"
          :connectionType="props.connectionType"
          :logo="props.logo"
        />
      </keep-alive>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import UnifiedConnectionParams from './UnifiedConnectionParams.vue'
import LocalFilesConnectionParams from './LocalFilesConnectionParams.vue'
import S3ConnectionParams from './S3ConnectionParams.vue'
import SSLParams from './SSLParams.vue'
import { useConnectionsStore } from '@/stores/connections'

interface Props {
  connectionType: string
  logo?: string
}

const props = defineProps<Props>()
const connectionsStore = useConnectionsStore()

const tabs = ref(['Direct', 'SSL'])
const currentTab = ref('')

const currentConnection = computed(() => connectionsStore.currentConnection)

// Check if this is an S3 connection
// In wizard: type="s3" or type="S3"
// After save: type="files" with spec.s3
const isS3 = computed(() => {
  const connType = props.connectionType?.toLowerCase()
  // Direct S3 type (wizard shows "S3", we check lowercase)
  if (connType === 's3') {
    return true
  }
  // Files type - check spec.s3 presence (for editing existing connections)
  if (connType === 'files' && currentConnection.value?.spec?.s3) {
    return true
  }
  return false
})

// Check if this is a Local Files connection
// Local files have type="files" with spec.files
const isLocalFiles = computed(() => {
  const connType = props.connectionType?.toLowerCase()
  if (connType !== 'files') {
    return false
  }
  // If it's files type, check spec.files (local) vs spec.s3 (cloud)
  return !!currentConnection.value?.spec?.files || !currentConnection.value?.spec?.s3
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
