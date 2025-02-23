<script setup lang="ts">
import { useCommonStore } from '@/stores/common'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { watch, onMounted } from 'vue'
import ErrorDisplay from '@/components/common/ErrorDisplay.vue'

const route = useRoute()
const commonStore = useCommonStore()
const { isLoadingRoute, routeLoadError } = storeToRefs(commonStore)

async function loadRouteData() {
  const routeName = route.name as string
  await commonStore.loadRouteData(routeName)
}

// Watch for route changes
watch(
  () => route.name,
  async () => {
    await loadRouteData()
  }
)

// Initial load
onMounted(async () => {
  await loadRouteData()
})
</script>

<template>
  <div>
    <div v-if="isLoadingRoute" class="flex items-center justify-center p-4">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>

    <ErrorDisplay v-if="routeLoadError" />

    <div v-show="!isLoadingRoute">
      <slot></slot>
    </div>
  </div>
</template>