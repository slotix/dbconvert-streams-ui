<template>
  <div class="min-h-full">
    <!-- Header - matches StreamsView/CreateStreamView style -->
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

          <!-- Back -->
          <button
            type="button"
            class="group flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
            @click="goBack"
          >
            <ArrowLeft class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
            <span class="sr-only">Back</span>
          </button>

          <img
            v-if="!isDesktop"
            class="h-5 w-5 shrink-0"
            src="/images/logo.svg"
            alt="DBConvert Streams"
          />

          <div class="flex flex-col">
            <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Connection</h1>
            <p v-if="connection" class="text-xs text-gray-500 dark:text-gray-400">
              Update {{ connection.name }} settings
            </p>
            <p v-else class="text-xs text-gray-500 dark:text-gray-400">Loading connection...</p>
          </div>
        </div>

        <div class="flex-1"></div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="bg-gray-50 dark:bg-gray-900 pt-8 pb-8">
      <EditConnectionWizard :connectionId="connectionId" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { ArrowLeft, Menu } from 'lucide-vue-next'
import { useDesktopMode } from '@/composables/useDesktopMode'
import EditConnectionWizard from '@/components/connection/wizard/EditConnectionWizard.vue'
import { useConnectionsStore } from '@/stores/connections'

const { strokeWidth: iconStroke } = useLucideIcons()

interface Props {
  id: string
}

const props = defineProps<Props>()
const router = useRouter()
const connectionsStore = useConnectionsStore()
const { isDesktop } = useDesktopMode()
const sidebarWidthToggle = inject<{
  isSidebarExpanded: { value: boolean }
  toggleSidebarWidth: () => void
}>('sidebarWidthToggle')
const sidebarMenuToggle = inject<{ openSidebar: () => void }>('sidebarMenuToggle')

const connectionId = computed(() => props.id)
const connection = computed(() => connectionsStore.currentConnection)

function goBack() {
  router.push('/explorer')
}
</script>
