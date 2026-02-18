<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { X } from 'lucide-vue-next'
import { useLucideIcons } from '@/composables/useLucideIcons'

const props = defineProps<{
  open: boolean
  title: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  bodyScrollable?: boolean
  bodyPadding?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { strokeWidth: iconStroke } = useLucideIcons()
const slots = useSlots()

const panelWidthClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'max-w-sm'
    case 'lg':
      return 'max-w-lg'
    case 'xl':
      return 'max-w-2xl'
    case 'md':
    default:
      return 'max-w-md'
  }
})

const hasFooter = computed(() => Boolean(slots.footer))

const bodyClass = computed(() => ({
  'flex-1': true,
  'overflow-y-auto': props.bodyScrollable !== false,
  'overflow-hidden': props.bodyScrollable === false,
  'px-4 py-4': props.bodyPadding !== false,
  'p-0': props.bodyPadding === false
}))
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
                class="pointer-events-auto w-screen bg-white dark:bg-gray-850 shadow-2xl dark:shadow-gray-900/50 border-l border-gray-200 dark:border-gray-700"
                :class="panelWidthClass"
              >
                <div class="h-full flex flex-col">
                  <div
                    class="px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between"
                  >
                    <div class="min-w-0">
                      <DialogTitle class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {{ title }}
                      </DialogTitle>
                      <p v-if="subtitle" class="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        {{ subtitle }}
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

                  <div :class="bodyClass">
                    <slot />
                  </div>

                  <div
                    v-if="hasFooter"
                    class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2"
                  >
                    <slot name="footer" />
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
