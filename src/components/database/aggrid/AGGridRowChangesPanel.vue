<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { X } from 'lucide-vue-next'
import { useLucideIcons } from '@/composables/useLucideIcons'

const props = defineProps<{
  open: boolean
  items: Array<{ field: string; oldValue: string; newValue: string }>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'revert', field: string): void
}>()

const { strokeWidth: iconStroke } = useLucideIcons()

const countLabel = computed(() => {
  const n = props.items.length
  return `${n} field${n === 1 ? '' : 's'} changed`
})
</script>

<template>
  <TransitionRoot as="template" :show="open">
    <Dialog as="div" class="relative z-50" @close="emit('close')">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/40" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-hidden">
        <div class="absolute inset-0 overflow-hidden">
          <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <TransitionChild
              as="template"
              enter="transform transition ease-in-out duration-200"
              enter-from="translate-x-full"
              enter-to="translate-x-0"
              leave="transform transition ease-in-out duration-150"
              leave-from="translate-x-0"
              leave-to="translate-x-full"
            >
              <DialogPanel
                class="pointer-events-auto w-screen max-w-md bg-white dark:bg-gray-850 shadow-2xl dark:shadow-gray-900/50 border-l border-gray-200 dark:border-gray-700"
              >
                <div class="h-full flex flex-col">
                  <div
                    class="px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between"
                  >
                    <div class="min-w-0">
                      <DialogTitle class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Changes in this row
                      </DialogTitle>
                      <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        {{ countLabel }}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="ml-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      @click="emit('close')"
                    >
                      <X class="h-5 w-5" :stroke-width="iconStroke" />
                      <span class="sr-only">Close</span>
                    </button>
                  </div>

                  <div class="flex-1 overflow-y-auto px-4 py-4">
                    <div v-if="items.length === 0" class="text-sm text-gray-600 dark:text-gray-400">
                      No pending edits for this row.
                    </div>

                    <div v-else class="space-y-3">
                      <div
                        v-for="item in items"
                        :key="item.field"
                        class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 p-3"
                      >
                        <div class="flex items-center justify-between gap-3">
                          <div
                            class="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate"
                          >
                            {{ item.field }}
                          </div>
                          <button
                            type="button"
                            class="text-xs text-teal-700 dark:text-teal-300 hover:underline"
                            @click="emit('revert', item.field)"
                          >
                            Revert
                          </button>
                        </div>
                        <div class="mt-2 text-xs text-gray-700 dark:text-gray-300">
                          <span class="line-through opacity-70">{{ item.oldValue }}</span>
                          <span class="mx-2 opacity-70">→</span>
                          <span class="font-semibold">{{ item.newValue }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
