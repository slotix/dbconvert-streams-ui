<template>
  <div :style="{ '--sidebar-width': sidebarWidth }">
    <ApiKeyInput v-if="commonStore.needsApiKey && !isInitializing" />

    <ApiKeyExpiredBanner :show="showExpiredBanner" @dismiss="dismissBanner" />

    <InitializingOverlay :show="isInitializing" />

    <SidebarMobile v-model:open="sidebarOpen" />

    <ConfirmDialog
      :is-open="confirmDialog.isOpen"
      :title="confirmDialog.title"
      :description="confirmDialog.description"
      :confirm-label="confirmDialog.confirmLabel"
      :cancel-label="confirmDialog.cancelLabel"
      :danger="confirmDialog.danger"
      @confirm="confirmDialog.resolveConfirm"
      @cancel="confirmDialog.resolveCancel"
      @update:isOpen="(open) => (!open ? confirmDialog.resolveCancel() : null)"
    />

    <SidebarDesktop
      :is-sidebar-expanded="isSidebarExpanded"
      :status-text="statusText"
      :show-status-dot="showStatusDot"
    />

    <div class="lg:pl-(--sidebar-width)">
      <RouteGuard v-if="!isInitializing">
        <RouterView />
      </RouteGuard>
    </div>

    <LogsPanel />

    <!-- About Dialog -->
    <AboutDialog v-model:isOpen="showAboutDialog" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch, watchEffect } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import { useConfirmDialogStore } from '@/stores/confirmDialog'
import ApiKeyInput from '@/components/ApiKeyInput.vue'
import LogsPanel from '@/components/logs/LogsPanel.vue'
import AboutDialog from '@/components/common/AboutDialog.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import RouteGuard from '@/components/common/RouteGuard.vue'
import { useWailsAppCloseEvents, useWailsMenuEvents } from '@/composables/useWailsEvents'
import { useDesktopMode } from '@/composables/useDesktopMode'
import { setStorageValue, STORAGE_KEYS } from '@/constants/storageKeys'
import { useAppInitialization } from '@/composables/useAppInitialization'
import { useApiKeyBanner } from '@/composables/useApiKeyBanner'
import { useStatusFavicon } from '@/composables/useStatusFavicon'
import ApiKeyExpiredBanner from '@/components/layout/ApiKeyExpiredBanner.vue'
import InitializingOverlay from '@/components/layout/InitializingOverlay.vue'
import SidebarMobile from '@/components/layout/SidebarMobile.vue'
import SidebarDesktop from '@/components/layout/SidebarDesktop.vue'

const commonStore = useCommonStore()
const confirmDialog = useConfirmDialogStore()
const router = useRouter()

const isSidebarExpanded = ref(false)
const sidebarWidth = computed(() => (isSidebarExpanded.value ? '16rem' : '5rem'))
const toggleSidebarWidth = () => {
  isSidebarExpanded.value = !isSidebarExpanded.value
}

provide('sidebarWidthToggle', {
  isSidebarExpanded,
  toggleSidebarWidth
})

const sidebarOpen = ref(false)
const openSidebar = () => {
  sidebarOpen.value = true
}

provide('sidebarMenuToggle', {
  openSidebar
})
useWailsMenuEvents()
useWailsAppCloseEvents()

const { isDesktop } = useDesktopMode()
watchEffect(() => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('desktop-mode', isDesktop.value)
})

const { isInitializing, initialize } = useAppInitialization()
const { showExpiredBanner, dismissBanner } = useApiKeyBanner()
const { statusText, showStatusDot } = useStatusFavicon({ baseTitle: 'DBConvert Streams' })

const showAboutDialog = ref(false)
const handleShowAbout = () => {
  showAboutDialog.value = true
}

onMounted(async () => {
  window.addEventListener('wails:show-about', handleShowAbout)
  const result = await initialize()
  if (result === 'failed' && !commonStore.apiKey) {
    console.log('No API key found during initialization')
  }
})

onUnmounted(() => {
  commonStore.stopHealthMonitoring()
  window.removeEventListener('wails:show-about', handleShowAbout)
})

// Watch for changes in route and update the current page in the common store
watch(router.currentRoute, (to) => {
  commonStore.setCurrentPage(to.name as string)
  if (!to.name || to.name === 'Home' || to.path === '/') {
    return
  }
  setStorageValue(STORAGE_KEYS.DESKTOP_LAST_ROUTE, to.fullPath)
})
</script>
