<template>
  <div v-if="isS3" class="w-full">
    <S3ConnectionParams :connectionType="props.connectionType" :logo="props.logo" />
  </div>

  <div v-else-if="isLocalFiles" class="w-full">
    <LocalFilesConnectionParams :connectionType="props.connectionType" :logo="props.logo" />
  </div>

  <div v-else>
    <nav :class="tabsContainerClass">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="getTabClass(tab)"
        @click="changeTab(tab)"
      >
        <Plug v-if="tab === 'Direct'" class="w-4 h-4" />
        <ShieldCheck v-else-if="tab === 'SSL'" class="w-4 h-4" />
        {{ tab }}
      </button>
    </nav>
    <div class="w-full">
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
import { Plug, ShieldCheck } from 'lucide-vue-next'
import UnifiedConnectionParams from './UnifiedConnectionParams.vue'
import LocalFilesConnectionParams from './LocalFilesConnectionParams.vue'
import S3ConnectionParams from './S3ConnectionParams.vue'
import SSLParams from './SSLParams.vue'
import { useConnectionsStore } from '@/stores/connections'

interface Props {
  connectionType: string
  logo?: string
  layout?: 'default' | 'workspace'
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'default'
})
const connectionsStore = useConnectionsStore()

const tabs = ref(['Direct', 'SSL'])
const currentTab = ref('')

const currentConnection = computed(() => connectionsStore.currentConnection)

const isS3 = computed(() => {
  const connType = props.connectionType?.toLowerCase()
  if (connType === 's3') {
    return true
  }
  if (connType === 'files' && currentConnection.value?.spec?.s3) {
    return true
  }
  return false
})

const isLocalFiles = computed(() => {
  const connType = props.connectionType?.toLowerCase()
  if (connType !== 'files') {
    return false
  }
  return !!currentConnection.value?.spec?.files || !currentConnection.value?.spec?.s3
})

const componentMap = {
  Direct: UnifiedConnectionParams,
  SSL: SSLParams
}

const paramsComponent = computed(() => {
  return componentMap[currentTab.value as keyof typeof componentMap] || UnifiedConnectionParams
})

const isWorkspaceLayout = computed(() => props.layout === 'workspace')
const tabsContainerClass = computed(() =>
  isWorkspaceLayout.value
    ? 'mb-5 flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 pb-4 pt-4 dark:border-gray-700 md:px-6'
    : 'mx-auto mb-4 mt-8 flex max-w-sm flex-col sm:flex-row'
)

function getTabClass(tab: string): string[] {
  if (isWorkspaceLayout.value) {
    return [
      'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus:outline-none',
      currentTab.value === tab
        ? 'border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-400 dark:bg-teal-900/20 dark:text-teal-200'
        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
    ]
  }

  return [
    'flex flex-1 items-center justify-center gap-2 px-6 py-4 focus:outline-none transition-all duration-200',
    currentTab.value === tab
      ? 'border-b-2 border-teal-600 font-semibold text-teal-600 dark:border-teal-400 dark:text-teal-400'
      : 'border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
  ]
}

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
