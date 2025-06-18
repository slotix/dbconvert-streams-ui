<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  InformationCircleIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/vue/24/outline'
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/20/solid'

interface Props {
  publicIp: string
}

const props = defineProps<Props>()
const isExpanded = ref(false)
const isVisible = ref(true)

// Check localStorage on mount
onMounted(() => {
  const dismissed = localStorage.getItem('dbAccessNoticeDismissed')
  if (dismissed === 'true') {
    isVisible.value = false
  }

  const collapsed = localStorage.getItem('dbAccessNoticeCollapsed')
  if (collapsed === 'true') {
    isExpanded.value = false
  }
})

function handleToggle() {
  isExpanded.value = !isExpanded.value
  localStorage.setItem('dbAccessNoticeCollapsed', isExpanded.value ? 'false' : 'true')
}

function handleClose() {
  isVisible.value = false
  localStorage.setItem('dbAccessNoticeDismissed', 'true')
}
</script>

<template>
  <div v-if="isVisible" class="mb-4">
    <div class="rounded-lg bg-blue-50 border border-blue-100 shadow-sm">
      <!-- Collapsed State -->
      <div
        v-if="!isExpanded"
        class="p-3 flex items-center cursor-pointer hover:bg-blue-100/50 transition-colors duration-200"
        @click="handleToggle"
      >
        <InformationCircleIcon class="h-5 w-5 text-blue-600 flex-shrink-0" />
        <span class="ml-2 text-blue-700 font-medium"> Database Access Configuration </span>
        <div class="ml-auto flex items-center space-x-2">
          <button class="text-blue-400 hover:text-blue-600 transition-colors" title="Expand">
            <ChevronDownIcon class="h-5 w-5" />
            <span class="sr-only">Expand</span>
          </button>
          <button
            @click.stop="handleClose"
            class="text-blue-400 hover:text-blue-600 transition-colors"
            title="Dismiss"
          >
            <XMarkIcon class="h-5 w-5" />
            <span class="sr-only">Close</span>
          </button>
        </div>
      </div>

      <!-- Expanded State -->
      <div v-else class="p-4">
        <div class="flex items-center justify-between">
          <!-- Header -->
          <div class="flex items-center">
            <InformationCircleIcon class="h-5 w-5 text-blue-600 flex-shrink-0" />
            <h3 class="ml-2 text-base font-medium text-blue-700">Database Access Configuration</h3>
          </div>

          <!-- Controls -->
          <div class="flex space-x-2">
            <button
              @click="handleToggle"
              class="text-blue-400 hover:text-blue-600 transition-colors focus:outline-none"
              title="Collapse"
            >
              <ChevronUpIcon class="h-5 w-5" />
              <span class="sr-only">Collapse</span>
            </button>
            <button
              @click="handleClose"
              class="text-blue-400 hover:text-blue-600 transition-colors focus:outline-none"
              title="Dismiss"
            >
              <XMarkIcon class="h-5 w-5" />
              <span class="sr-only">Close</span>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="mt-3 text-blue-700">
          <div class="flex items-baseline">
            <span class="font-medium">Whitelist your server's IP:</span>
            <code
              class="ml-2 px-2 py-0.5 bg-white rounded border border-blue-200 text-blue-700 font-mono"
            >
              {{ publicIp }}
            </code>
          </div>

          <a
            href="https://docs.dbconvert.com/network-security/database-access-configuration.html"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-3 inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            View full setup guide
            <ArrowTopRightOnSquareIcon class="ml-1 h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
