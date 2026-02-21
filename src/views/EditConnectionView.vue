<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <!-- Header -->
    <header
      class="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700"
    >
      <div class="px-4 py-2 flex items-center gap-3">
        <button
          type="button"
          class="flex items-center justify-center p-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
          @click="goBack"
        >
          <ArrowLeft class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
          <span class="sr-only">Back</span>
        </button>
        <h1 class="text-base font-semibold text-gray-900 dark:text-gray-100">Edit Connection</h1>
        <span v-if="connection" class="text-xs text-gray-500 dark:text-gray-400">
          — {{ connection.name }}
        </span>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 py-8">
      <EditConnectionWizard :connectionId="connectionId" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { ArrowLeft } from 'lucide-vue-next'
import EditConnectionWizard from '@/components/connection/wizard/EditConnectionWizard.vue'
import { useConnectionsStore } from '@/stores/connections'

const { strokeWidth: iconStroke } = useLucideIcons()

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
