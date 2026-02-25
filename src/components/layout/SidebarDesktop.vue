<template>
  <div
    :class="[
      'hidden lg:fixed lg:top-0 lg:bottom-0 lg:left-0 lg:z-20 lg:block lg:bg-gray-50 dark:lg:bg-gray-900 lg:pb-10 lg:border-r lg:border-gray-200 dark:lg:border-gray-800/80',
      isSidebarExpanded ? 'lg:w-64' : 'lg:w-20'
    ]"
  >
    <!-- Sidebar width toggle -->
    <div
      :class="[
        'flex items-center pt-2 pb-1',
        isSidebarExpanded ? 'justify-start px-3' : 'justify-center'
      ]"
    >
      <button
        type="button"
        class="flex items-center justify-center p-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
        :title="isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'"
        @click="toggleSidebarWidth()"
      >
        <Menu class="h-5 w-5" :stroke-width="iconStroke" aria-hidden="true" />
        <span class="sr-only">{{ isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar' }}</span>
      </button>
    </div>

    <nav class="mt-4 overflow-visible">
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
        <!-- Account Overview Link (web only - desktop has native menu) -->
        <RouterLink
          to="/"
          :class="[
            'group flex items-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 rounded-md relative',
            isSidebarExpanded ? 'justify-start gap-3 px-3 w-full' : 'justify-center'
          ]"
        >
          <CircleUser
            :class="iconSizes.sidebarMenu"
            :stroke-width="iconStroke"
            aria-hidden="true"
          />
          <span v-if="isSidebarExpanded" class="truncate">Account Overview</span>
          <span v-else class="sr-only">Account Overview</span>
          <!-- Tooltip -->
          <div
            v-if="!isSidebarExpanded"
            class="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap z-9999 pointer-events-none"
          >
            Account Overview
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
            class="absolute bottom-0 left-full z-9999 ml-2 w-72 rounded-lg bg-white p-3 shadow-lg ring-1 ring-black/10 dark:bg-gray-800 dark:ring-gray-700"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Theme</span>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
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
              <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Zoom</span>
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
                    class="absolute -top-6 -translate-x-1/2 rounded bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700 shadow dark:bg-gray-900 dark:text-gray-200"
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
                  class="rounded-md px-2 py-1 text-xs font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-700"
                  title="Reset zoom"
                  :disabled="isZoomDefault"
                  @click="resetZoom"
                >
                  {{ zoomPendingPercent }}
                </button>
              </div>
            </div>
            <div class="mt-4 border-t border-gray-200 pt-3 dark:border-gray-700">
              <div class="grid grid-cols-2 gap-1 rounded-md bg-gray-100/70 p-1 dark:bg-gray-900/70">
                <button
                  type="button"
                  :class="[
                    'rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                    settingsTab === 'logging'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                  ]"
                  @click="settingsTab = 'logging'"
                >
                  Logging
                </button>
                <button
                  type="button"
                  :class="[
                    'rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                    settingsTab === 'system'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                  ]"
                  @click="settingsTab = 'system'"
                >
                  <span class="inline-flex items-center gap-1.5">
                    <span
                      :class="[
                        'h-2 w-2 rounded-full',
                        commonStore.isBackendConnected ? 'bg-emerald-500' : 'bg-red-500'
                      ]"
                    ></span>
                    <span>System Status</span>
                  </span>
                </button>
              </div>

              <div v-if="settingsTab === 'logging'" class="mt-3 space-y-3">
                <div class="space-y-2 rounded-md bg-gray-50/70 p-2 dark:bg-gray-900/60">
                  <div class="flex items-center justify-between">
                    <div class="text-xs font-medium text-gray-600 dark:text-gray-300">
                      SQL Capture Level
                    </div>
                    <div class="text-xs text-gray-600 dark:text-gray-300">
                      {{ currentSQLCaptureLabel }}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="1"
                    :value="sqlCaptureSliderValue"
                    :disabled="logsStore.runtimeLoggingSaving"
                    class="h-2 w-full accent-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 disabled:opacity-50"
                    aria-label="SQL Capture Level"
                    @input="onSQLCaptureSliderInput"
                    @change="onSQLCaptureSliderInput"
                  />
                  <div class="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <span
                      :class="sqlCaptureSliderValue === 0 ? 'text-teal-600 dark:text-teal-300' : ''"
                    >
                      Off
                    </span>
                    <span
                      :class="sqlCaptureSliderValue === 1 ? 'text-teal-600 dark:text-teal-300' : ''"
                    >
                      Minimal
                    </span>
                    <span
                      :class="sqlCaptureSliderValue === 2 ? 'text-teal-600 dark:text-teal-300' : ''"
                    >
                      Verbose
                    </span>
                  </div>
                </div>

                <div
                  class="space-y-2 rounded-md border border-gray-200/70 bg-white/70 p-2 dark:border-gray-700/80 dark:bg-gray-900/50"
                >
                  <div class="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Logs Folder
                  </div>
                  <div
                    v-for="line in systemStatusMeta"
                    :key="line"
                    class="text-[11px] leading-4 text-gray-600 dark:text-gray-300 break-all"
                  >
                    {{ line }}
                  </div>
                  <div
                    v-if="!systemStatusMeta.length"
                    class="text-[11px] text-gray-500 dark:text-gray-400"
                  >
                    Logs folder path unavailable
                  </div>
                  <button
                    v-if="canOpenLogsFolder"
                    type="button"
                    class="inline-flex items-center gap-2 rounded-md bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    @click="openLogsFolder"
                  >
                    Open Logs Folder
                  </button>
                  <div
                    v-if="systemStatusError"
                    class="text-[11px] whitespace-pre-wrap text-red-500 dark:text-red-300"
                  >
                    {{ systemStatusError }}
                  </div>
                </div>

                <div
                  v-if="logsStore.runtimeLoggingError"
                  class="text-[11px] text-amber-600 dark:text-amber-300"
                >
                  {{ logsStore.runtimeLoggingError }}
                </div>
              </div>

              <div
                v-else
                class="mt-3 rounded-lg border border-gray-200/60 bg-white/70 p-3 shadow-sm dark:border-gray-700/80 dark:bg-gray-900/60"
              >
                <div class="max-h-[45vh] overflow-y-auto">
                  <SystemStatusPanel
                    compact
                    :show-open-logs="false"
                    :show-meta="false"
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
                  ? 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/30'
                  : 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
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
import { AlertCircle, CircleUser, FileText, Menu, Moon, Settings, Sun } from 'lucide-vue-next'
import { useCommonStore } from '@/stores/common'
import { useLogsStore, type SQLCaptureMode } from '@/stores/logs'
import { useThemeStore } from '@/stores/theme'
import { useDesktopMode } from '@/composables/useDesktopMode'
import { useContextualIconSizes } from '@/composables/useIconSizes'
import { useLucideIcons } from '@/composables/useLucideIcons'
import { useDesktopZoom } from '@/utils/desktopZoom'
import { useSystemStatus } from '@/composables/useSystemStatus'
import SystemStatusPanel from '@/components/common/SystemStatusPanel.vue'
import VersionDisplay from '@/components/common/VersionDisplay.vue'
import SidebarNavItems from '@/components/layout/SidebarNavItems.vue'
import SidebarExternalLinks from '@/components/layout/SidebarExternalLinks.vue'

const props = defineProps<{
  isSidebarExpanded: boolean
  toggleSidebarWidth: () => void
  statusText: string
  showStatusDot: boolean
}>()

const commonStore = useCommonStore()
const logsStore = useLogsStore()
const themeStore = useThemeStore()
const { isDesktop } = useDesktopMode()
const { strokeWidth: iconStroke } = useLucideIcons()
const iconSizes = useContextualIconSizes()
const {
  meta: systemStatusMeta,
  canOpenLogsFolder,
  openLogsFolder,
  error: systemStatusError,
  refresh
} = useSystemStatus()

type SettingsTab = 'logging' | 'system'

const settingsOpen = ref(false)
const settingsPopoverRef = ref<HTMLElement | null>(null)
const settingsTab = ref<SettingsTab>('logging')

const sqlCaptureModeLabels: Record<SQLCaptureMode, string> = {
  off: 'Off',
  minimal: 'Minimal',
  verbose: 'Verbose'
}

const sqlCaptureModes: SQLCaptureMode[] = ['off', 'minimal', 'verbose']

const loadSettingsData = () => {
  void logsStore.loadRuntimeLoggingSettings()
  void refresh()
}

const openLoggingSettings = () => {
  settingsOpen.value = true
  settingsTab.value = 'logging'
  loadSettingsData()
}

const toggleSettings = () => {
  settingsOpen.value = !settingsOpen.value
  if (settingsOpen.value) {
    settingsTab.value = 'logging'
    loadSettingsData()
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
  }
}

const handleSettingsKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    settingsOpen.value = false
  }
}

const openStatusPanelFromSidebar = () => {
  settingsOpen.value = true
  settingsTab.value = 'system'
  loadSettingsData()
}

const onSQLCaptureModeChange = async (value: unknown) => {
  const mode: SQLCaptureMode = value === 'off' || value === 'verbose' ? value : 'minimal'
  try {
    await logsStore.updateRuntimeLoggingSettings({ sqlCaptureMode: mode })
  } catch {
    // Error text is exposed via logsStore.runtimeLoggingError
  }
}

const sqlCaptureSliderValue = computed(() => {
  const mode = logsStore.runtimeLoggingSettings.sqlCaptureMode
  if (mode === 'off') return 0
  if (mode === 'verbose') return 2
  return 1
})

const currentSQLCaptureLabel = computed(
  () => sqlCaptureModeLabels[logsStore.runtimeLoggingSettings.sqlCaptureMode]
)

const onSQLCaptureSliderInput = async (event: Event) => {
  const target = event.target as HTMLInputElement | null
  if (!target) return

  const raw = Number(target.value)
  const rounded = Number.isFinite(raw) ? Math.round(raw) : 1
  const clamped = Math.max(0, Math.min(2, rounded))
  const mode = sqlCaptureModes[clamped] ?? 'minimal'

  await onSQLCaptureModeChange(mode)
}

const handleOpenSettingsEvent = (event: Event) => {
  const custom = event as CustomEvent<{ section?: string }>
  if (custom.detail?.section === 'logging') {
    openLoggingSettings()
    return
  }
  if (custom.detail?.section === 'system') {
    openStatusPanelFromSidebar()
    return
  }
  settingsOpen.value = true
  settingsTab.value = 'logging'
  loadSettingsData()
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
  window.addEventListener('wails:open-settings', handleOpenSettingsEvent as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleSettingsKeydown)
  document.removeEventListener('mousedown', handleSettingsClickOutside)
  window.removeEventListener('wails:open-settings', handleOpenSettingsEvent as EventListener)
})

const statusText = computed(() => props.statusText)

const desktopNavIconClass = `${iconSizes.sidebarMenu} shrink-0`
</script>
