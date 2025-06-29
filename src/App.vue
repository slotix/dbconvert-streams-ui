<template>
  <div>
    <ApiKeyInput v-if="commonStore.needsApiKey && !isInitializing" />
    
    <!-- API Key Expired Notification Banner -->
    <div
      v-if="showExpiredBanner"
      class="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-3 z-30"
    >
      <div class="flex items-center justify-between max-w-7xl mx-auto">
        <div class="flex items-center space-x-3">
          <svg class="h-5 w-5 text-red-200" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span class="font-medium">API Key Expired</span>
          <span class="text-red-200">Your API key has expired. Please enter a new one to continue.</span>
        </div>
        <button
          @click="showExpiredBanner = false"
          class="text-red-200 hover:text-white transition-colors"
        >
          <XMarkIcon class="h-5 w-5" />
        </button>
      </div>
    </div>
    
    <div
      v-if="isInitializing"
      class="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-50"
    >
      <div class="bg-white p-6 rounded-lg shadow-xl">
        <div class="flex items-center space-x-3">
          <svg
            class="animate-spin h-5 w-5 text-gray-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span class="text-gray-700">Initializing application...</span>
        </div>
      </div>
    </div>
    <TransitionRoot as="template" :show="sidebarOpen">
      <Dialog as="div" class="relative z-50 lg:hidden" @close="sidebarOpen = false">
        <TransitionChild
          as="template"
          enter="transition-opacity ease-linear duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-gray-900/80" />
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
                  <button type="button" class="-m-2.5 p-2.5" @click="sidebarOpen = false">
                    <span class="sr-only">Close sidebar</span>
                    <XMarkIcon class="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              </TransitionChild>

              <div
                class="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-2 ring-1 ring-white/10"
              >
                <div class="flex h-16 shrink-0 items-center">
                  <RouterLink to="/">
                    <img class="h-8 w-auto" src="/images/logo.svg" alt="DBConvert Streams" />
                  </RouterLink>
                </div>

                <nav class="flex flex-1 flex-col">
                  <ul role="list" class="-mx-2 flex-1 space-y-1">
                    <li v-for="item in navigation" :key="item.name">
                      <RouterLink
                        :to="item.href"
                        :class="[
                          $route.path.startsWith(item.href.split('/:')[0])
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800',
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                        ]"
                        @click="sidebarOpen = false"
                      >
                        <component :is="item.icon" class="h-6 w-6 shrink-0" aria-hidden="true" />
                        {{ item.name }}
                      </RouterLink>
                    </li>
                  </ul>

                  <!-- External Links for Mobile -->
                  <div class="mt-auto pt-4 border-t border-gray-700">
                    <ul role="list" class="-mx-2 space-y-1">
                      <li>
                        <a
                          href="https://discord.gg/3CACYYKSAb"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-400 hover:text-white hover:bg-gray-800"
                          @click="sidebarOpen = false"
                        >
                          <svg class="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path
                              d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"
                            />
                          </svg>
                          Discord
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://docs.dbconvert.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-400 hover:text-white hover:bg-gray-800"
                          @click="sidebarOpen = false"
                        >
                          <DocumentTextIcon class="h-6 w-6 shrink-0" aria-hidden="true" />
                          Documentation
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://streams.dbconvert.com/account"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-400 hover:text-white hover:bg-gray-800"
                          @click="sidebarOpen = false"
                        >
                          <UserCircleIcon class="h-6 w-6 shrink-0" aria-hidden="true" />
                          Account
                        </a>
                      </li>
                    </ul>
                  </div>
                </nav>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Static sidebar for desktop -->
    <div
      class="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-100 lg:block lg:w-20 lg:overflow-y-auto lg:bg-gray-900 lg:pb-10"
    >
      <div class="flex h-16 shrink-0 items-center justify-center">
        <RouterLink to="/">
          <img class="h-8 w-auto" src="/images/logo.svg" alt="DBConvert Streams" />
        </RouterLink>
      </div>
      <nav class="mt-8">
        <ul role="list" class="flex flex-col items-center space-y-1">
          <li v-for="item in navigation" :key="item.name">
            <RouterLink
              :to="item.href"
              :class="[
                $route.path.startsWith(item.href.split('/:')[0])
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800',
                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
              ]"
            >
              <component :is="item.icon" class="h-6 w-6 shrink-0" aria-hidden="true" />
              <span class="sr-only">{{ item.name }}</span>

              <!-- Show tooltip on hover -->
              <div
                class="absolute left-20 hidden group-hover:block bg-gray-900 text-white px-2 py-1 rounded text-sm whitespace-nowrap"
              >
                {{ item.name }}
              </div>
            </RouterLink>
          </li>
          
          <!-- Connection Status in Navigation -->
          <li class="mt-4 pt-4 border-t border-gray-700">
            <div
              :class="[
                'group flex items-center justify-center p-2 rounded-md',
                commonStore.isBackendConnected
                  ? 'text-green-400 bg-green-900/20'
                  : commonStore.error
                    ? 'text-red-400 bg-red-900/20'
                    : 'text-yellow-400 bg-yellow-900/20'
              ]"
              :title="getConnectionStatusText()"
            >
              <div
                :class="[
                  'h-4 w-4 rounded-full border-2',
                  commonStore.isBackendConnected
                    ? 'bg-green-400 border-green-400 animate-pulse'
                    : commonStore.error
                      ? 'bg-red-400 border-red-400'
                      : 'bg-yellow-400 border-yellow-400'
                ]"
              ></div>
              <!-- Show tooltip on hover -->
              <div
                class="absolute left-20 hidden group-hover:block bg-gray-900 text-white px-2 py-1 rounded text-sm whitespace-nowrap z-50"
              >
                {{ getConnectionStatusText() }}
              </div>
            </div>
          </li>
        </ul>
      </nav>

      <!-- External Links -->
      <div class="fixed bottom-0 w-20 pb-5 bg-gray-900">
        <div class="flex flex-col items-center space-y-1">
          <a
            href="https://discord.gg/3CACYYKSAb"
            target="_blank"
            rel="noopener noreferrer"
            class="group flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md"
          >
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"
              />
            </svg>
            <span class="sr-only">Discord</span>
          </a>
          <a
            href="https://docs.dbconvert.com"
            target="_blank"
            rel="noopener noreferrer"
            class="group flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md"
          >
            <DocumentTextIcon class="h-6 w-6" aria-hidden="true" />
            <span class="sr-only">Documentation</span>
          </a>
          <a
            href="https://streams.dbconvert.com/account"
            target="_blank"
            rel="noopener noreferrer"
            class="group flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md"
          >
            <UserCircleIcon class="h-6 w-6" aria-hidden="true" />
            <span class="sr-only">Account</span>
          </a>
        </div>
      </div>
    </div>

    <div class="lg:pl-20">
      <button
        type="button"
        class="fixed top-0 left-3 p-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
        @click="sidebarOpen = true"
      >
        <span class="sr-only">Open sidebar</span>
        <Bars3Icon class="h-5 w-5" aria-hidden="true" />
      </button>

      <div class="py-4">
        <RouteGuard v-if="!isInitializing">
          <RouterView />
        </RouteGuard>
      </div>
    </div>

    <LogsPanel />
    <LogsIndicator />
    <VersionDisplay />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, watchEffect } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import ApiKeyInput from '@/components/ApiKeyInput.vue'
import LogsPanel from '@/components/logs/LogsPanel.vue'
import LogsIndicator from '@/components/logs/LogsIndicator.vue'
import VersionDisplay from '@/components/common/VersionDisplay.vue'
import RouteGuard from '@/components/common/RouteGuard.vue'
import { initializeApiClient } from '@/api/apiClient'

import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import {
  Bars3Icon,
  ArrowPathIcon,
  CircleStackIcon,
  XMarkIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  UserCircleIcon,
  TableCellsIcon
} from '@heroicons/vue/24/outline'

const commonStore = useCommonStore()
const connectionsStore = useConnectionsStore()
const router = useRouter()
const isInitializing = ref(true)

interface NavigationItem {
  name: string
  href: string
  icon: any
  show?: boolean
}

// All navigation items
const navigation = computed(() => {
  const route = router.currentRoute.value
  const connectionId = route.params.id

  return [
    { name: 'Connections', href: '/connections', icon: CircleStackIcon, show: true },
    {
      name: 'Database Explorer',
      href: '/explorer',
      icon: TableCellsIcon,
      show: true
    },
    { name: 'Streams', href: '/streams', icon: ArrowPathIcon, show: true },
    { name: 'Monitor Stream', href: '/monitor', icon: ComputerDesktopIcon, show: true }
  ].filter((item) => item.show)
})

const sidebarOpen = ref(false)

const getConnectionStatusText = () => {
  if (commonStore.isBackendConnected) {
    return 'Connected'
  } else if (commonStore.error) {
    return 'Connection Error'
  } else {
    return 'Offline Mode'
  }
}

// Dynamic browser tab title and favicon management
const baseTitle = 'DBConvert Streams'

const createStatusFavicon = (color: string) => {
  // Create a simple colored circle favicon
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  
  if (ctx) {
    // Clear canvas
    ctx.clearRect(0, 0, 32, 32)
    
    // Draw background circle
    ctx.fillStyle = '#1f2937' // Dark gray background
    ctx.beginPath()
    ctx.arc(16, 16, 15, 0, 2 * Math.PI)
    ctx.fill()
    
    // Draw status circle
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(16, 16, 10, 0, 2 * Math.PI)
    ctx.fill()
    
    // Add a subtle border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(16, 16, 10, 0, 2 * Math.PI)
    ctx.stroke()
  }
  
  return canvas.toDataURL()
}

const updateFavicon = (dataUrl: string) => {
  let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = dataUrl
}

const updateBrowserTabTitle = () => {
  const status = getConnectionStatusText()
  let faviconColor = ''
  
  if (commonStore.isBackendConnected) {
    faviconColor = '#10b981' // Green
  } else if (commonStore.error) {
    faviconColor = '#ef4444' // Red
  } else {
    faviconColor = '#f59e0b' // Yellow/Orange
  }
  
  // Update tab title (no emoji prefix since we have the favicon)
  document.title = `${baseTitle} - ${status}`
  
  // Update favicon
  const faviconDataUrl = createStatusFavicon(faviconColor)
  updateFavicon(faviconDataUrl)
}

// Store original favicon to restore on unmount
const originalFavicon = document.querySelector("link[rel*='icon']")?.getAttribute('href') || '/favicon.svg'

// Watch for connection status changes and update tab title + favicon
watchEffect(() => {
  updateBrowserTabTitle()
})

// Restore original favicon and title when component unmounts
onUnmounted(() => {
  document.title = baseTitle
  updateFavicon(originalFavicon)
  
  // Stop health monitoring
  commonStore.stopHealthMonitoring()
})

const initializeApp = async () => {
  try {
    isInitializing.value = true

    // Always try to initialize the app - the initApp method now handles 
    // API key validation and development fallbacks internally
    const initResult = await commonStore.initApp()
    if (initResult === 'failed') {
      throw new Error('Failed to initialize app')
    }
    return 'success'
  } catch (error) {
    console.error('Failed to initialize app:', error)
    return 'failed'
  } finally {
    isInitializing.value = false
  }
}

onMounted(async () => {
  try {
    isInitializing.value = true
    
    // Initialize connections from localStorage early
    connectionsStore.loadConnectionsFromRecentData()
    
    await initializeApiClient()
    const result = await initializeApp()
    // Don't clear API key here - let the individual methods handle it
    // Only clear if there's no API key at all
    if (result === 'failed' && !commonStore.apiKey) {
      console.log('No API key found during initialization')
    }
  } finally {
    isInitializing.value = false
  }
})

// Watch for changes in route and update the current page in the common store
watch(router.currentRoute, (to) => {
  commonStore.setCurrentPage(to.name as string)
})

const showExpiredBanner = ref(false)

// Watch for API key invalidation
watch(
  () => commonStore.apiKeyInvalidated,
  (isInvalidated) => {
    if (isInvalidated) {
      showExpiredBanner.value = true
      // Auto-hide the banner after 10 seconds
      setTimeout(() => {
        showExpiredBanner.value = false
      }, 10000)
    }
  }
)

// Hide banner when new API key is set
watch(
  () => commonStore.hasValidApiKey,
  (hasValid) => {
    if (hasValid) {
      showExpiredBanner.value = false
    }
  }
)
</script>
