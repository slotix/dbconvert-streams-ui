<template>
  <div
    :class="[
      'hidden lg:fixed lg:top-16 lg:bottom-0 lg:left-0 lg:z-20 lg:block lg:bg-gray-50 dark:lg:bg-gray-900 lg:pb-10 lg:border-r lg:border-gray-200 dark:lg:border-gray-800/80',
      isSidebarExpanded ? 'lg:w-64' : 'lg:w-20'
    ]"
  >
    <nav class="mt-8 overflow-visible">
      <ul
        role="list"
        :class="[
          'flex flex-col space-y-1 overflow-visible',
          isSidebarExpanded ? 'items-stretch px-2' : 'items-center'
        ]"
      >
        <SidebarNavItems
          :active-class="'bg-white dark:bg-teal-900 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-0'"
          :inactive-class="'text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700'"
          item-class="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold relative overflow-visible"
          expanded-class="w-full justify-start px-3"
          collapsed-class="justify-center"
          :is-collapsed="!isSidebarExpanded"
          :show-tooltips="true"
          :icon-class="desktopNavIconClass"
          :icon-stroke="iconStroke"
        />

        <!-- Logs Button -->
        <li class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 overflow-visible">
          <button
            type="button"
            :class="[
              'group flex items-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 rounded-md relative w-full overflow-visible',
              isSidebarExpanded ? 'justify-start px-3 gap-3' : 'justify-center'
            ]"
            @click="logsStore.toggleLogsPanel"
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
            <span v-if="isSidebarExpanded" class="truncate">Logs</span>
            <span v-else class="sr-only">Logs</span>

            <!-- Log count badges (expanded) -->
            <div v-if="isSidebarExpanded" class="ml-auto flex items-center gap-1">
              <!-- System logs badge -->
              <span
                v-if="logsStore.logs.length > 0"
                class="bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200 text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center"
                title="System Logs"
              >
                {{ logsStore.logs.length > 99 ? '99+' : logsStore.logs.length }}
              </span>
              <!-- SQL logs badge -->
              <span
                v-if="logsStore.sqlLogsCount > 0"
                class="bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center"
                title="SQL Logs"
              >
                {{ logsStore.sqlLogsCount > 99 ? '99+' : logsStore.sqlLogsCount }}
              </span>
            </div>

            <!-- Log count badge (collapsed) - show total -->
            <span
              v-if="!isSidebarExpanded && (logsStore.logs.length > 0 || logsStore.sqlLogsCount > 0)"
              class="absolute -top-1 -right-1 bg-gray-200 text-gray-700 dark:bg-gray-500 dark:text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
            >
              {{
                logsStore.logs.length + logsStore.sqlLogsCount > 99
                  ? '99+'
                  : logsStore.logs.length + logsStore.sqlLogsCount
              }}
            </span>

            <!-- Show tooltip on hover -->
            <div
              v-if="!isSidebarExpanded"
              class="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap pointer-events-none"
              style="z-index: 99999"
            >
              Logs ({{ logsStore.logs.length }} system, {{ logsStore.sqlLogsCount }} SQL)
            </div>
          </button>
        </li>
      </ul>
    </nav>

    <!-- External Links -->
    <div
      :class="[
        'fixed bottom-0 left-0 pb-5 bg-gray-50 dark:bg-gray-900',
        isSidebarExpanded ? 'w-64' : 'w-20'
      ]"
    >
      <div
        :class="[
          'flex flex-col space-y-1',
          isSidebarExpanded ? 'items-stretch px-2' : 'items-center'
        ]"
      >
        <!-- Overview Link (web only - desktop has native menu) -->
        <RouterLink
          to="/"
          :class="[
            'group flex items-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 rounded-md relative',
            isSidebarExpanded ? 'justify-start gap-3 px-3 w-full' : 'justify-center'
          ]"
        >
          <BarChart3 :class="iconSizes.sidebarMenu" :stroke-width="iconStroke" aria-hidden="true" />
          <span v-if="isSidebarExpanded" class="truncate">Overview</span>
          <span v-else class="sr-only">Overview</span>
          <!-- Tooltip -->
          <div
            v-if="!isSidebarExpanded"
            class="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap z-9999 pointer-events-none"
          >
            Overview
          </div>
        </RouterLink>
        <!-- Settings -->
        <div ref="settingsPopoverRef" class="relative">
          <button
            type="button"
            :class="[
              'group flex items-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 relative',
              isSidebarExpanded ? 'justify-start gap-3 px-3 w-full' : 'justify-center'
            ]"
            @click="toggleSettings"
          >
            <Settings
              :class="iconSizes.sidebarMenu"
              :stroke-width="iconStroke"
              aria-hidden="true"
            />
            <span v-if="isSidebarExpanded" class="truncate">Settings</span>
            <span v-else class="sr-only">Settings</span>
            <!-- Tooltip -->
            <div
              v-if="!isSidebarExpanded"
              class="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap z-9999 pointer-events-none"
            >
              Settings
            </div>
          </button>
          <div
            v-if="settingsOpen"
            class="absolute left-full ml-2 bottom-0 w-64 rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/10 dark:ring-gray-700 z-9999 p-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">Theme</span>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                title="Toggle theme"
                @click="themeStore.toggleTheme"
              >
                <component
                  :is="themeStore.isDark ? Moon : Sun"
                  :class="iconSizes.tableAction"
                  :stroke-width="iconStroke"
                  aria-hidden="true"
                />
                <span>{{ themeStore.isDark ? 'Dark' : 'Light' }}</span>
              </button>
            </div>
            <div v-if="isDesktop" class="mt-3 flex items-center justify-between">
              <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">Zoom</span>
              <div class="flex items-center gap-2">
                <div class="relative w-28">
                  <input
                    v-model.number="zoomSlider"
                    type="range"
                    :min="zoomMin"
                    :max="zoomMax"
                    :step="zoomStep"
                    class="h-2 w-full accent-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
                    aria-label="Zoom"
                    :aria-valuetext="zoomPendingPercent"
                    @focus="isZoomActive = true"
                    @blur="isZoomActive = false"
                    @pointerdown="isZoomActive = true"
                    @pointerup="isZoomActive = false"
                    @pointercancel="isZoomActive = false"
                    @change="setZoom(zoomSlider / 100)"
                    @keydown.enter.prevent="setZoom(zoomSlider / 100)"
                  />
                  <div
                    v-if="isZoomActive"
                    class="absolute -top-6 -translate-x-1/2 text-[11px] font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 px-2 py-0.5 rounded shadow"
                    :style="zoomTooltipStyle"
                  >
                    {{ zoomPendingPercent }}
                  </div>
                  <div
                    class="mt-1 flex justify-between text-[0.625rem] text-gray-500 dark:text-gray-400"
                  >
                    <span>{{ zoomMin }}%</span>
                    <span>{{ zoomMax }}%</span>
                  </div>
                </div>
                <button
                  type="button"
                  class="px-2 py-1 text-xs font-semibold rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Reset zoom"
                  :disabled="isZoomDefault"
                  @click="resetZoom"
                >
                  {{ zoomPendingPercent }}
                </button>
              </div>
            </div>
            <div class="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/60"
                @click="toggleStatusExpanded"
              >
                <span class="flex items-center gap-2">
                  <span
                    :class="[
                      'h-2.5 w-2.5 rounded-full',
                      commonStore.isBackendConnected ? 'bg-emerald-500' : 'bg-red-500'
                    ]"
                  ></span>
                  <span>System Status</span>
                </span>
                <span
                  :class="[
                    'rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide',
                    commonStore.isBackendConnected
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
                  ]"
                >
                  {{ commonStore.isBackendConnected ? 'Healthy' : 'Offline' }}
                </span>
              </button>
              <div
                v-if="statusExpanded"
                class="mt-3 rounded-lg border border-gray-200/60 bg-white/70 p-3 shadow-sm dark:border-gray-700/80 dark:bg-gray-900/60"
              >
                <div class="max-h-[45vh] overflow-y-auto">
                  <SystemStatusPanel
                    compact
                    show-open-logs
                    :show-title="false"
                    :show-description="false"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- External links -->
        <SidebarExternalLinks
          :link-class="
            [
              'group flex items-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 rounded-md relative',
              isSidebarExpanded ? 'justify-start gap-3 px-3 w-full' : 'justify-center'
            ].join(' ')
          "
          :icon-class="iconSizes.sidebarMenu"
          :icon-stroke="iconStroke"
          :is-collapsed="!isSidebarExpanded"
          :show-tooltips="true"
        />

        <!-- Backend Status (desktop + web) -->
        <div v-if="showStatusDot" class="relative overflow-visible">
          <button
            type="button"
            :class="[
              'group flex items-center p-2 rounded-md relative overflow-visible w-full text-left',
              commonStore.isBackendConnected
                ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
                : commonStore.error
                  ? 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
                  : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20',
              isSidebarExpanded ? 'justify-start gap-3 px-3' : 'justify-center'
            ]"
            :title="statusText"
            @click="openStatusPanelFromSidebar"
          >
            <div
              :class="[
                'h-4 w-4 rounded-full border-2',
                commonStore.isBackendConnected
                  ? 'bg-green-500 border-green-500 animate-pulse dark:bg-green-400 dark:border-green-400'
                  : commonStore.error
                    ? 'bg-red-500 border-red-500 dark:bg-red-400 dark:border-red-400'
                    : 'bg-red-500 border-red-500 dark:bg-red-400 dark:border-red-400'
              ]"
            ></div>
            <span v-if="isSidebarExpanded" class="truncate">Status</span>
            <!-- Show tooltip on hover -->
            <div
              v-if="!isSidebarExpanded"
              class="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap pointer-events-none"
              style="z-index: 99999"
            >
              {{ statusText }}
            </div>
          </button>
        </div>

        <!-- Version Display -->
        <VersionDisplay />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { AlertCircle, BarChart3, FileText, Moon, Settings, Sun } from 'lucide-vue-next'
import { useCommonStore } from '@/stores/common'
import { useLogsStore } from '@/stores/logs'
import { useThemeStore } from '@/stores/theme'
import { useDesktopMode } from '@/composables/useDesktopMode'
import { useContextualIconSizes } from '@/composables/useIconSizes'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { useDesktopZoom } from '@/utils/desktopZoom'
import SystemStatusPanel from '@/components/common/SystemStatusPanel.vue'
import VersionDisplay from '@/components/common/VersionDisplay.vue'
import SidebarNavItems from '@/components/layout/SidebarNavItems.vue'
import SidebarExternalLinks from '@/components/layout/SidebarExternalLinks.vue'

const props = defineProps<{
  isSidebarExpanded: boolean
  statusText: string
  showStatusDot: boolean
}>()

const commonStore = useCommonStore()
const logsStore = useLogsStore()
const themeStore = useThemeStore()
const { isDesktop } = useDesktopMode()
const { strokeWidth: iconStroke } = useLucideIcons()
const iconSizes = useContextualIconSizes()

const settingsOpen = ref(false)
const settingsPopoverRef = ref<HTMLElement | null>(null)
const statusExpanded = ref(false)

const toggleSettings = () => {
  settingsOpen.value = !settingsOpen.value
  if (!settingsOpen.value) {
    statusExpanded.value = false
  }
}

const showStatusDot = computed(() => props.showStatusDot)
const isSidebarExpanded = computed(() => props.isSidebarExpanded)

const handleSettingsClickOutside = (event: MouseEvent) => {
  if (!settingsOpen.value) {
    return
  }
  const target = event.target as Node
  if (settingsPopoverRef.value && !settingsPopoverRef.value.contains(target)) {
    settingsOpen.value = false
    statusExpanded.value = false
  }
}

const handleSettingsKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    settingsOpen.value = false
    statusExpanded.value = false
  }
}

const toggleStatusExpanded = () => {
  statusExpanded.value = !statusExpanded.value
}

const openStatusPanelFromSidebar = () => {
  settingsOpen.value = true
  statusExpanded.value = true
}

const { zoomLevel, resetZoom, setZoom } = useDesktopZoom()
const zoomMin = 75
const zoomMax = 200
const zoomStep = 25
const snapZoomPercent = (value: number) => Math.round(value / zoomStep) * zoomStep
const zoomSlider = ref(snapZoomPercent(zoomLevel.value * 100))
const isZoomActive = ref(false)

const zoomPendingPercent = computed(() => {
  const value = zoomSlider.value
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`
})
const isZoomDefault = computed(() => zoomSlider.value === 100)
const zoomTooltipStyle = computed(() => {
  const range = zoomMax - zoomMin
  const ratio = range > 0 ? (zoomSlider.value - zoomMin) / range : 0
  const clamped = Math.min(1, Math.max(0, ratio))
  return { left: `${clamped * 100}%` }
})

watch(zoomLevel, (value) => {
  zoomSlider.value = snapZoomPercent(value * 100)
})

onMounted(() => {
  window.addEventListener('keydown', handleSettingsKeydown)
  document.addEventListener('mousedown', handleSettingsClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleSettingsKeydown)
  document.removeEventListener('mousedown', handleSettingsClickOutside)
})

const statusText = computed(() => props.statusText)

const desktopNavIconClass = `${iconSizes.sidebarMenu} shrink-0`
</script>
