<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <header class="ui-surface-panel ui-border-default sticky top-0 z-30 border-b">
      <div class="px-4 py-2 flex items-center gap-3">
        <button
          type="button"
          class="lg:hidden flex items-center justify-center rounded-md p-1.5 text-gray-600 transition-colors hover:text-gray-900 hover:bg-(--ui-surface-raised) dark:text-gray-400 dark:hover:text-white"
          @click="sidebarMenuToggle?.openSidebar()"
        >
          <Menu class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
          <span class="sr-only">Open sidebar</span>
        </button>
        <button
          type="button"
          class="flex items-center justify-center rounded-md p-1.5 text-gray-600 transition-colors hover:text-gray-900 hover:bg-(--ui-surface-raised) dark:text-gray-400 dark:hover:text-white"
          @click="goBack"
        >
          <ArrowLeft class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
          <span class="sr-only">Back</span>
        </button>
        <div>
          <h1 class="text-base font-semibold text-gray-900 dark:text-gray-100">Edit Connection</h1>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{
              connection
                ? `Update settings for ${connection.name}`
                : 'Update saved connection settings'
            }}
          </p>
        </div>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto">
      <EditConnectionWizard :connectionId="connectionId" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { ArrowLeft, Menu } from 'lucide-vue-next'
import EditConnectionWizard from '@/components/connection/wizard/EditConnectionWizard.vue'
import { useConnectionsStore } from '@/stores/connections'

const { strokeWidth: iconStroke } = useLucideIcons()
const sidebarMenuToggle = inject<{ openSidebar: () => void }>('sidebarMenuToggle')

interface Props {
  id: string
}

const props = defineProps<Props>()
const router = useRouter()
const connectionsStore = useConnectionsStore()

const connectionId = computed(() => props.id)
const connection = computed(() => connectionsStore.currentConnection)

function goBack() {
  router.push('/explorer')
}
</script>
