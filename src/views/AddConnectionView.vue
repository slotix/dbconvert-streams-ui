<template>
  <div class="min-h-full">
    <!-- Header - matches DatabaseExplorerView/StreamsView style -->
    <header
      class="sticky top-0 z-30 bg-linear-to-r from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 border-b border-slate-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 lg:-ml-[var(--sidebar-width)] lg:w-[calc(100%+var(--sidebar-width))]"
    >
      <div class="px-6 py-4 flex items-center gap-4">
        <div class="flex items-center gap-3">
          <!-- Mobile sidebar toggle -->
          <button
            v-if="sidebarMenuToggle"
            type="button"
            class="group flex items-center justify-center p-2 -ml-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 lg:hidden"
            @click="sidebarMenuToggle.openSidebar"
          >
            <Menu class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
            <span class="sr-only">Open sidebar</span>
          </button>
          <!-- Desktop sidebar toggle -->
          <button
            v-if="sidebarWidthToggle"
            type="button"
            class="group hidden lg:flex items-center justify-center p-2 -ml-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
            @click="sidebarWidthToggle.toggleSidebarWidth"
          >
            <Menu class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
            <span class="sr-only">Toggle sidebar width</span>
          </button>
          <img
            v-if="!isDesktop"
            class="h-5 w-5 shrink-0"
            src="/images/logo.svg"
            alt="DBConvert Streams"
          />
          <!-- Title -->
          <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">New Connection</h1>
        </div>

        <!-- Spacer -->
        <div class="flex-1"></div>

        <!-- Right side - Cancel button -->
        <div class="flex items-center gap-4">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            @click="goBack"
          >
            Cancel
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content - full dark background -->
    <main class="min-h-[calc(100vh-65px)]">
      <AddConnectionWizard @cancel="goBack" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { useRouter } from 'vue-router'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { Menu } from 'lucide-vue-next'
import { useDesktopMode } from '@/composables/useDesktopMode'
import AddConnectionWizard from '@/components/connection/wizard/AddConnectionWizard.vue'

const { strokeWidth: iconStroke } = useLucideIcons()

const router = useRouter()
const { isDesktop } = useDesktopMode()
const sidebarMenuToggle = inject<{ openSidebar: () => void }>('sidebarMenuToggle')
const sidebarWidthToggle = inject<{
  isSidebarExpanded: { value: boolean }
  toggleSidebarWidth: () => void
}>('sidebarWidthToggle')

function goBack() {
  // Check if we came from stream wizard
  const streamId = sessionStorage.getItem('streamWizardId')
  if (streamId !== null) {
    // Return to stream wizard
    sessionStorage.removeItem('streamWizardReturnPane')
    sessionStorage.removeItem('streamWizardId')
    if (streamId) {
      router.push(`/streams/edit/${streamId}`)
    } else {
      router.push('/streams/create')
    }
  } else {
    // Return to explorer
    router.push('/explorer')
  }
}
</script>
