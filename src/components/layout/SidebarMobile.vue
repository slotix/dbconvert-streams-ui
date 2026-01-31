<template>
  <TransitionRoot as="template" :show="open">
    <Dialog as="div" class="relative z-50 lg:hidden" @close="closeSidebar">
      <TransitionChild
        as="template"
        enter="transition-opacity ease-linear duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="transition-opacity ease-linear duration-300"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-900/50" />
      </TransitionChild>

      <div class="fixed inset-0 flex">
        <TransitionChild
          as="template"
          enter="transition ease-in-out duration-300 transform"
          enter-from="-translate-x-full"
          enter-to="translate-x-0"
          leave="transition ease-in-out duration-300 transform"
          leave-from="translate-x-0"
          leave-to="-translate-x-full"
        >
          <DialogPanel class="relative mr-16 flex w-full max-w-xs flex-1">
            <TransitionChild
              as="template"
              enter="ease-in-out duration-300"
              enter-from="opacity-0"
              enter-to="opacity-100"
              leave="ease-in-out duration-300"
              leave-from="opacity-100"
              leave-to="opacity-0"
            >
              <div class="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button type="button" class="-m-2.5 p-2.5" @click="closeSidebar">
                  <span class="sr-only">Close sidebar</span>
                  <X
                    :class="[iconSizes.sidebarMenu, 'text-white']"
                    :stroke-width="iconStroke"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </TransitionChild>

            <div
              class="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-50 dark:bg-gray-900 px-6 pb-2 ring-1 ring-gray-200/80 dark:ring-white/5 border-r border-gray-200 dark:border-gray-800/80"
            >
              <nav class="flex flex-1 flex-col">
                <ul role="list" class="-mx-2 flex-1 space-y-1">
                  <SidebarNavItems
                    :active-class="'bg-white dark:bg-teal-900 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-0'"
                    :inactive-class="'text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700'"
                    item-class="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                    :icon-class="mobileIconClass"
                    :icon-stroke="iconStroke"
                    @navigate="closeSidebar"
                  />
                </ul>

                <!-- Account Overview Link (web only - desktop has native menu) -->
                <div class="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <RouterLink
                    to="/"
                    class="w-full group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                    @click="closeSidebar"
                  >
                    <BarChart3
                      :class="[iconSizes.sidebarMenu, 'shrink-0']"
                      :stroke-width="iconStroke"
                      aria-hidden="true"
                    />
                    <span class="flex-1 text-left">Account Overview</span>
                  </RouterLink>
                </div>

                <!-- Logs Button -->
                <div class="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    class="w-full group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                    @click="handleLogsClick"
                  >
                    <AlertCircle
                      v-if="logsStore.hasErrors"
                      :class="[iconSizes.sidebarMenu, 'shrink-0 animate-pulse text-gray-300']"
                      :stroke-width="iconStroke"
                      aria-hidden="true"
                    />
                    <FileText
                      v-else
                      :class="[iconSizes.sidebarMenu, 'shrink-0']"
                      :stroke-width="iconStroke"
                      aria-hidden="true"
                    />
                    <span class="flex-1 text-left">Logs</span>
                    <div class="ml-auto flex items-center gap-1">
                      <span
                        v-if="logsStore.logs.length > 0"
                        class="bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200 px-1.5 py-0.5 text-xs rounded-full"
                        title="System Logs"
                      >
                        {{ logsStore.logs.length > 99 ? '99+' : logsStore.logs.length }}
                      </span>
                      <span
                        v-if="logsStore.sqlLogsCount > 0"
                        class="bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 px-1.5 py-0.5 text-xs rounded-full"
                        title="SQL Logs"
                      >
                        {{ logsStore.sqlLogsCount > 99 ? '99+' : logsStore.sqlLogsCount }}
                      </span>
                    </div>
                  </button>
                </div>

                <!-- Theme Toggle for Mobile -->
                <div class="mt-auto pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div class="flex items-center justify-between px-2 py-2">
                    <span class="text-sm text-gray-400">Theme</span>
                    <ThemeToggle />
                  </div>
                </div>

                <!-- External Links for Mobile (hidden in desktop mode - available in Help menu) -->
                <div v-if="!isDesktop" class="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div class="-mx-2 space-y-1">
                    <SidebarExternalLinks
                      :link-class="'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700'"
                      :icon-class="mobileIconClass"
                      :icon-stroke="iconStroke"
                      @navigate="closeSidebar"
                    />
                  </div>
                </div>
              </nav>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { AlertCircle, BarChart3, FileText, X } from 'lucide-vue-next'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useLogsStore } from '@/stores/logs'
import { useDesktopMode } from '@/composables/useDesktopMode'
import { useContextualIconSizes } from '@/composables/useIconSizes'
import { useLucideIcons } from '@/composables/useLucideIcons'
import SidebarNavItems from '@/components/layout/SidebarNavItems.vue'
import SidebarExternalLinks from '@/components/layout/SidebarExternalLinks.vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const logsStore = useLogsStore()
const { isDesktop } = useDesktopMode()
const { strokeWidth: iconStroke } = useLucideIcons()
const iconSizes = useContextualIconSizes()
const closeSidebar = () => emit('update:open', false)

const handleLogsClick = () => {
  logsStore.toggleLogsPanel()
  closeSidebar()
}

const mobileIconClass = `${iconSizes.sidebarMenu} shrink-0`

const open = computed(() => props.open)
</script>
