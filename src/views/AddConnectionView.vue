<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <!-- Header -->
    <header
      class="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700"
    >
      <div class="px-4 py-2 flex items-center gap-3">
        <button
          type="button"
          class="lg:hidden flex items-center justify-center p-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
          @click="sidebarMenuToggle?.openSidebar()"
        >
          <Menu class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
          <span class="sr-only">Open sidebar</span>
        </button>
        <div>
          <h1 class="text-base font-semibold text-gray-900 dark:text-gray-100">New Connection</h1>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Choose a source type to get started
          </p>
        </div>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto">
      <AddConnectionWizard />
    </main>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { Menu } from 'lucide-vue-next'
import { useLucideIcons } from '@/composables/useLucideIcons'
import AddConnectionWizard from '@/components/connection/wizard/AddConnectionWizard.vue'

const { strokeWidth: iconStroke } = useLucideIcons()
const sidebarMenuToggle = inject<{ openSidebar: () => void }>('sidebarMenuToggle')
</script>
