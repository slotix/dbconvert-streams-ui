<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog as="div" class="relative z-50" @close="closeDialog">
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

      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <TransitionChild
          as="template"
          enter="ease-out duration-200"
          enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enter-to="opacity-100 translate-y-0 sm:scale-100"
          leave="ease-in duration-150"
          leave-from="opacity-100 translate-y-0 sm:scale-100"
          leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <DialogPanel
            class="relative w-full max-w-sm transform overflow-hidden rounded-2xl bg-white dark:bg-gray-850 p-6 text-center align-middle shadow-2xl dark:shadow-gray-900/50 transition-all border border-gray-100 dark:border-gray-800"
          >
            <!-- Close button -->
            <button
              type="button"
              class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              @click="closeDialog"
            >
              <XMarkIcon class="h-5 w-5" />
              <span class="sr-only">Close</span>
            </button>

            <!-- App Logo -->
            <div class="flex justify-center mb-4">
              <img src="/favicon.svg" alt="DBConvert Streams" class="h-16 w-16" />
            </div>

            <!-- App Name -->
            <DialogTitle as="h3" class="text-xl font-semibold text-gray-900 dark:text-gray-100">
              DBConvert Streams
            </DialogTitle>

            <!-- Version -->
            <div class="mt-2">
              <span
                class="inline-flex items-center rounded-full bg-teal-50 dark:bg-teal-900/30 px-3 py-1 text-sm font-medium text-teal-700 dark:text-teal-300"
              >
                v{{ version }}
              </span>
              <span
                v-if="isDev"
                class="ml-2 inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300"
              >
                DEV
              </span>
            </div>

            <!-- Description -->
            <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Database streaming and CDC replication platform
            </p>

            <!-- Links -->
            <div class="mt-6 flex justify-center space-x-4">
              <button
                type="button"
                class="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors hover:underline"
                @click="openUrl('https://streams.dbconvert.com')"
              >
                Website
              </button>
              <span class="text-gray-300 dark:text-gray-600">|</span>
              <button
                type="button"
                class="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors hover:underline"
                @click="openUrl('https://docs.dbconvert.com')"
              >
                Documentation
              </button>
              <span class="text-gray-300 dark:text-gray-600">|</span>
              <button
                type="button"
                class="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors hover:underline"
                @click="openUrl('https://github.com/slotix/dbconvert-streams-public/discussions')"
              >
                GitHub
              </button>
            </div>

            <!-- Copyright -->
            <p class="mt-6 text-xs text-gray-500 dark:text-gray-500">
              &copy; {{ currentYear }} Slotix s.r.o. All rights reserved.
            </p>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

interface Props {
  isOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
}>()

const version = import.meta.env.PACKAGE_VERSION || 'unknown'
const isDev = computed(() => import.meta.env.DEV)
const currentYear = new Date().getFullYear()

function closeDialog() {
  emit('update:isOpen', false)
}

function openUrl(url: string) {
  if (window.runtime?.BrowserOpenURL) {
    window.runtime.BrowserOpenURL(url)
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
</script>
