<template>
  <div :style="{ '--sidebar-width': sidebarWidth }">
    <ApiKeyInput v-if="commonStore.needsApiKey && !isInitializing" />

    <!-- API Key Expired Notification Banner -->
    <div
      v-if="showExpiredBanner"
      class="fixed top-0 left-0 right-0 bg-red-600 dark:bg-red-700 text-white px-4 py-3 z-30"
    >
      <div class="flex items-center justify-between max-w-7xl mx-auto">
        <div class="flex items-center space-x-3">
          <svg class="h-5 w-5 text-red-200" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="font-medium">API Key Expired</span>
          <span class="text-red-200"
            >Your API key has expired. Please enter a new one to continue.</span
          >
        </div>
        <button
          class="text-red-200 hover:text-white transition-colors"
          @click="showExpiredBanner = false"
        >
          <XMarkIcon :class="iconSizes.modalClose" />
        </button>
      </div>
    </div>

    <div
      v-if="isInitializing"
      class="fixed inset-0 bg-gray-900/50 dark:bg-black/70 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-850 p-6 rounded-lg shadow-xl">
        <div class="flex items-center space-x-3">
          <svg
            :class="[iconSizes.spinner, 'animate-spin text-gray-600 dark:text-gray-300']"
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
          <span class="text-gray-700 dark:text-gray-200">Initializing application...</span>
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
                  <button type="button" class="-m-2.5 p-2.5" @click="sidebarOpen = false">
                    <span class="sr-only">Close sidebar</span>
                    <XMarkIcon :class="[iconSizes.sidebarMenu, 'text-white']" aria-hidden="true" />
                  </button>
                </div>
              </TransitionChild>

              <div
                class="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-50 dark:bg-gray-900 px-6 pb-2 ring-1 ring-gray-200/80 dark:ring-white/5 border-r border-gray-200 dark:border-gray-800/80"
              >
                <nav class="flex flex-1 flex-col">
                  <ul role="list" class="-mx-2 flex-1 space-y-1">
                    <li v-for="item in navigation" :key="item.name">
                      <RouterLink
                        :to="item.href"
                        :class="[
                          $route.path.startsWith(item.href.split('/:')[0])
                            ? 'bg-white dark:bg-teal-900 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-0'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700',
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                        ]"
                        @click="sidebarOpen = false"
                      >
                        <component
                          :is="item.icon"
                          :class="[iconSizes.sidebarMenu, 'shrink-0']"
                          aria-hidden="true"
                        />
                        {{ item.name }}
                      </RouterLink>
                    </li>
                  </ul>

                  <!-- Overview Link (web only - desktop has native menu) -->
                  <div class="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <RouterLink
                      to="/"
                      class="w-full group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                      @click="sidebarOpen = false"
                    >
                      <ChartBarIcon
                        :class="[iconSizes.sidebarMenu, 'shrink-0']"
                        aria-hidden="true"
                      />
                      <span class="flex-1 text-left">Overview</span>
                    </RouterLink>
                  </div>

                  <!-- Logs Button -->
                  <div class="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      type="button"
                      class="w-full group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                      @click="handleLogsClick"
                    >
                      <ExclamationCircleIcon
                        v-if="logsStore.hasErrors"
                        :class="[iconSizes.sidebarMenu, 'shrink-0 animate-pulse text-gray-300']"
                        aria-hidden="true"
                      />
                      <DocumentTextIcon
                        v-else
                        :class="[iconSizes.sidebarMenu, 'shrink-0']"
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
                    <ul role="list" class="-mx-2 space-y-1">
                      <li>
                        <a
                          href="https://github.com/slotix/dbconvert-streams-public/discussions"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                          @click="sidebarOpen = false"
                        >
                          <svg
                            :class="[iconSizes.sidebarMenu, 'shrink-0']"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              d="M12 2C6.477 2 2 6.58 2 12.234c0 4.516 2.865 8.34 6.839 9.693c.5.096.682-.22.682-.493c0-.244-.009-.89-.014-1.747c-2.782.62-3.369-1.374-3.369-1.374c-.455-1.185-1.11-1.5-1.11-1.5c-.908-.641.069-.628.069-.628c1.004.072 1.532 1.056 1.532 1.056c.892 1.565 2.341 1.113 2.91.85c.091-.665.349-1.113.635-1.368c-2.22-.261-4.555-1.137-4.555-5.056c0-1.117.39-2.03 1.029-2.747c-.103-.261-.446-1.31.098-2.728c0 0 .84-.275 2.75 1.05c.798-.226 1.655-.339 2.506-.343c.85.004 1.707.117 2.506.343c1.909-1.325 2.748-1.05 2.748-1.05c.546 1.418.203 2.467.1 2.728c.64.717 1.028 1.63 1.028 2.747c0 3.93-2.339 4.792-4.566 5.047c.359.316.678.94.678 1.894c0 1.368-.012 2.471-.012 2.807c0 .275.18.595.688.494c3.971-1.356 6.832-5.178 6.832-9.692C22 6.58 17.523 2 12 2z"
                            />
                          </svg>
                          GitHub Discussions
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://docs.dbconvert.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                          @click="sidebarOpen = false"
                        >
                          <BookOpenIcon
                            :class="[iconSizes.sidebarMenu, 'shrink-0']"
                            aria-hidden="true"
                          />
                          Documentation
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
          <li v-for="item in navigation" :key="item.name" class="overflow-visible">
            <RouterLink
              :to="item.href"
              :class="[
                $route.path.startsWith(item.href.split('/:')[0])
                  ? 'bg-white dark:bg-teal-900 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-0'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700',
                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold relative overflow-visible',
                isSidebarExpanded ? 'w-full justify-start px-3' : 'justify-center'
              ]"
            >
              <component
                :is="item.icon"
                :class="[iconSizes.sidebarMenu, 'shrink-0']"
                aria-hidden="true"
              />
              <span v-if="isSidebarExpanded" class="truncate">{{ item.name }}</span>
              <span v-else class="sr-only">{{ item.name }}</span>

              <!-- Show tooltip on hover -->
              <div
                v-if="!isSidebarExpanded"
                class="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap pointer-events-none"
                style="z-index: 99999"
              >
                {{ item.name }}
              </div>
            </RouterLink>
          </li>

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
              <ExclamationCircleIcon
                v-if="logsStore.hasErrors"
                :class="[iconSizes.sidebarMenu, 'shrink-0 animate-pulse text-gray-300']"
                aria-hidden="true"
              />
              <DocumentTextIcon
                v-else
                :class="[iconSizes.sidebarMenu, 'shrink-0']"
                aria-hidden="true"
              />
              <span v-if="isSidebarExpanded" class="truncate">Logs</span>
              <span v-else class="sr-only">Logs</span>

              <!-- Log count badges (expanded) -->
              <div v-if="isSidebarExpanded" class="ml-auto flex items-center gap-1">
                <!-- System logs badge -->
                <span
                  v-if="logsStore.logs.length > 0"
                  class="bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200 text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center"
                  title="System Logs"
                >
                  {{ logsStore.logs.length > 99 ? '99+' : logsStore.logs.length }}
                </span>
                <!-- SQL logs badge -->
                <span
                  v-if="logsStore.sqlLogsCount > 0"
                  class="bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center"
                  title="SQL Logs"
                >
                  {{ logsStore.sqlLogsCount > 99 ? '99+' : logsStore.sqlLogsCount }}
                </span>
              </div>

              <!-- Log count badge (collapsed) - show total -->
              <span
                v-if="
                  !isSidebarExpanded && (logsStore.logs.length > 0 || logsStore.sqlLogsCount > 0)
                "
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

          <!-- Connection Status in Navigation -->
          <li class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 overflow-visible">
            <div
              :class="[
                'group flex items-center p-2 rounded-md relative overflow-visible',
                commonStore.isBackendConnected
                  ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
                  : commonStore.error
                    ? 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
                    : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20',
                isSidebarExpanded ? 'justify-start px-3 gap-3' : 'justify-center'
              ]"
              :title="getConnectionStatusText()"
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
                {{ getConnectionStatusText() }}
              </div>
            </div>
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
            <ChartBarIcon :class="iconSizes.sidebarMenu" aria-hidden="true" />
            <span v-if="isSidebarExpanded" class="truncate">Overview</span>
            <span v-else class="sr-only">Overview</span>
            <!-- Tooltip -->
            <div
              v-if="!isSidebarExpanded"
              class="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap z-[9999] pointer-events-none"
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
              <Cog6ToothIcon :class="iconSizes.sidebarMenu" aria-hidden="true" />
              <span v-if="isSidebarExpanded" class="truncate">Settings</span>
              <span v-else class="sr-only">Settings</span>
              <!-- Tooltip -->
              <div
                v-if="!isSidebarExpanded"
                class="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap z-[9999] pointer-events-none"
              >
                Settings
              </div>
            </button>
            <div
              v-if="settingsOpen"
              class="absolute left-full ml-2 bottom-0 w-64 rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/10 dark:ring-gray-700 z-[9999] p-3"
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
                    :is="themeStore.isDark ? MoonIcon : SunIcon"
                    :class="iconSizes.tableAction"
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
                      type="range"
                      :min="zoomMin"
                      :max="zoomMax"
                      :step="zoomStep"
                      class="h-2 w-full accent-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
                      aria-label="Zoom"
                      :aria-valuetext="zoomPendingPercent"
                      v-model.number="zoomSlider"
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
            </div>
          </div>
          <!-- External links (hidden in desktop mode - available in Help menu) -->
          <a
            v-if="!isDesktop"
            href="https://github.com/slotix/dbconvert-streams-public/discussions"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'group flex items-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 rounded-md relative',
              isSidebarExpanded ? 'justify-start gap-3 px-3 w-full' : 'justify-center'
            ]"
          >
            <svg
              :class="iconSizes.sidebarMenu"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M12 2C6.477 2 2 6.58 2 12.234c0 4.516 2.865 8.34 6.839 9.693c.5.096.682-.22.682-.493c0-.244-.009-.89-.014-1.747c-2.782.62-3.369-1.374-3.369-1.374c-.455-1.185-1.11-1.5-1.11-1.5c-.908-.641.069-.628.069-.628c1.004.072 1.532 1.056 1.532 1.056c.892 1.565 2.341 1.113 2.91.85c.091-.665.349-1.113.635-1.368c-2.22-.261-4.555-1.137-4.555-5.056c0-1.117.39-2.03 1.029-2.747c-.103-.261-.446-1.31.098-2.728c0 0 .84-.275 2.75 1.05c.798-.226 1.655-.339 2.506-.343c.85.004 1.707.117 2.506.343c1.909-1.325 2.748-1.05 2.748-1.05c.546 1.418.203 2.467.1 2.728c.64.717 1.028 1.63 1.028 2.747c0 3.93-2.339 4.792-4.566 5.047c.359.316.678.94.678 1.894c0 1.368-.012 2.471-.012 2.807c0 .275.18.595.688.494c3.971-1.356 6.832-5.178 6.832-9.692C22 6.58 17.523 2 12 2z"
              />
            </svg>
            <span v-if="isSidebarExpanded" class="truncate">GitHub Discussions</span>
            <span v-else class="sr-only">GitHub Discussions</span>
            <!-- Tooltip -->
            <div
              v-if="!isSidebarExpanded"
              class="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap z-[9999] pointer-events-none"
            >
              GitHub Discussions
            </div>
          </a>
          <a
            v-if="!isDesktop"
            href="https://docs.dbconvert.com"
            target="_blank"
            rel="noopener noreferrer"
            :class="[
              'group flex items-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 rounded-md relative',
              isSidebarExpanded ? 'justify-start gap-3 px-3 w-full' : 'justify-center'
            ]"
          >
            <BookOpenIcon :class="iconSizes.sidebarMenu" aria-hidden="true" />
            <span v-if="isSidebarExpanded" class="truncate">Documentation</span>
            <span v-else class="sr-only">Documentation</span>
            <!-- Tooltip -->
            <div
              v-if="!isSidebarExpanded"
              class="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap z-[9999] pointer-events-none"
            >
              Documentation
            </div>
          </a>

          <!-- Version Display -->
          <VersionDisplay />
        </div>
      </div>
    </div>

    <div class="lg:pl-[var(--sidebar-width)]">
      <RouteGuard v-if="!isInitializing">
        <RouterView />
      </RouteGuard>
    </div>

    <LogsPanel />

    <!-- About Dialog -->
    <AboutDialog v-model:isOpen="showAboutDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, watchEffect, provide } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import { useLogsStore } from '@/stores/logs'
import ApiKeyInput from '@/components/ApiKeyInput.vue'
import LogsPanel from '@/components/logs/LogsPanel.vue'
import VersionDisplay from '@/components/common/VersionDisplay.vue'
import AboutDialog from '@/components/common/AboutDialog.vue'
import RouteGuard from '@/components/common/RouteGuard.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { initializeApiClient } from '@/api/apiClient'
import { useContextualIconSizes } from '@/composables/useIconSizes'
import { useWailsMenuEvents } from '@/composables/useWailsEvents'
import { useDesktopMode } from '@/composables/useDesktopMode'
import { setStorageValue, STORAGE_KEYS } from '@/constants/storageKeys'
import { useDesktopZoom } from '@/utils/desktopZoom'
import { useThemeStore } from '@/stores/theme'

import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import {
  ArrowPathIcon,
  XMarkIcon,
  DocumentTextIcon,
  BookOpenIcon,
  TableCellsIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/vue/24/outline'
import { ExclamationCircleIcon } from '@heroicons/vue/24/solid'

const commonStore = useCommonStore()
const logsStore = useLogsStore()
const themeStore = useThemeStore()
const router = useRouter()
const isInitializing = ref(true)
const isSidebarExpanded = ref(false)
const sidebarWidth = computed(() => (isSidebarExpanded.value ? '16rem' : '5rem'))
const toggleSidebarWidth = () => {
  isSidebarExpanded.value = !isSidebarExpanded.value
}
const settingsOpen = ref(false)
const settingsPopoverRef = ref<HTMLElement | null>(null)
const toggleSettings = () => {
  settingsOpen.value = !settingsOpen.value
}

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

provide('sidebarWidthToggle', {
  isSidebarExpanded,
  toggleSidebarWidth
})

// Icon sizes
const iconSizes = useContextualIconSizes()

// Initialize Wails menu event listeners (no-op when running as web app)
useWailsMenuEvents()

// Desktop mode detection
const { isDesktop } = useDesktopMode()
const { zoomLevel, resetZoom, setZoom } = useDesktopZoom()
const zoomMin = 70
const zoomMax = 200
const zoomStep = 5
const zoomSlider = ref(Math.round(zoomLevel.value * 100))
const isZoomActive = ref(false)

const zoomPendingPercent = computed(() => `${zoomSlider.value}%`)
const isZoomDefault = computed(() => zoomSlider.value === 100)
const zoomTooltipStyle = computed(() => {
  const range = zoomMax - zoomMin
  const ratio = range > 0 ? (zoomSlider.value - zoomMin) / range : 0
  const clamped = Math.min(1, Math.max(0, ratio))
  return { left: `${clamped * 100}%` }
})

watch(zoomLevel, (value) => {
  zoomSlider.value = Math.round(value * 100)
})

// All navigation items
const navigation = computed(() => {
  return [
    {
      name: 'Data Explorer',
      href: '/explorer',
      icon: TableCellsIcon,
      show: true
    },
    { name: 'Streams', href: '/streams', icon: ArrowPathIcon, show: true }
  ].filter((item) => item.show)
})

const sidebarOpen = ref(false)
const openSidebar = () => {
  sidebarOpen.value = true
}

provide('sidebarMenuToggle', {
  openSidebar
})

const getConnectionStatusText = () => {
  if (commonStore.isBackendConnected) {
    return 'Connected to backend'
  } else if (commonStore.error) {
    return 'Connection to backend lost'
  } else {
    return 'Backend not available'
  }
}

const handleLogsClick = () => {
  logsStore.toggleLogsPanel()
  sidebarOpen.value = false
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
    faviconColor = '#ef4444' // Red
  }

  // Update tab title (no emoji prefix since we have the favicon)
  document.title = `${baseTitle} - ${status}`

  // Update favicon
  const faviconDataUrl = createStatusFavicon(faviconColor)
  updateFavicon(faviconDataUrl)
}

// Store original favicon to restore on unmount
const originalFavicon =
  document.querySelector("link[rel*='icon']")?.getAttribute('href') || '/favicon.svg'

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

  // Remove About dialog event listener
  window.removeEventListener('wails:show-about', handleShowAbout)
  window.removeEventListener('keydown', handleSettingsKeydown)
  document.removeEventListener('mousedown', handleSettingsClickOutside)
})

const initializeApp = async () => {
  try {
    isInitializing.value = true

    // Always try to initialize the app - the initApp method now handles
    // API key validation and development fallbacks internally
    const initResult = await commonStore.initApp()
    if (initResult === 'failed') {
      // Don't throw error - just return failed status
      // The initApp method already shows appropriate toasts
      return 'failed'
    }
    return 'success'
  } catch (error) {
    // Catch and log errors, but don't show additional toasts
    // The error handlers in initApp already handle user notifications
    console.error('Failed to initialize app:', error)
    return 'failed'
  } finally {
    isInitializing.value = false
  }
}

onMounted(async () => {
  // Add About dialog event listener
  window.addEventListener('wails:show-about', handleShowAbout)
  window.addEventListener('keydown', handleSettingsKeydown)
  document.addEventListener('mousedown', handleSettingsClickOutside)

  try {
    isInitializing.value = true

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
  if (!to.name || to.name === 'Home' || to.path === '/') {
    return
  }
  setStorageValue(STORAGE_KEYS.DESKTOP_LAST_ROUTE, to.fullPath)
})

const showExpiredBanner = ref(false)
const showAboutDialog = ref(false)

// Listen for About dialog event from Wails menu
const handleShowAbout = () => {
  showAboutDialog.value = true
}

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
