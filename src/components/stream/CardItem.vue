<template>
  <div class="w-full">
    <div
      class="bg-white dark:bg-gray-850 rounded-lg border dark:border-gray-700 overflow-hidden cursor-pointer transform hover:shadow-lg dark:hover:shadow-gray-900/30 duration-300 ease-in-out flex flex-col h-full"
      @click="selectStream"
    >
      <!-- Header -->
      <div class="border-b dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800">
        <div class="flex items-center justify-between">
          <div class="flex items-center min-w-0 flex-1">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
              {{ streamConfig.name }}
            </h3>
            <span
              :class="[
                'ml-3 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                streamConfig.mode === 'cdc'
                  ? 'bg-orange-50 text-orange-700 ring-orange-600/20'
                  : 'bg-green-50 text-green-700 ring-green-600/20'
              ]"
            >
              {{ streamConfig.mode }}
            </span>
          </div>
          <div class="flex items-center gap-2 ml-4">
            <Switch
              v-model="isJsonView"
              class="relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
              :class="[isJsonView ? 'bg-gray-600' : 'bg-gray-400']"
            >
              <span class="sr-only">Toggle JSON view</span>
              <span
                aria-hidden="true"
                class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
                :class="[
                  isJsonView ? 'translate-x-5' : 'translate-x-0',
                  'shadow-[0_1px_4px_rgba(0,0,0,0.15)]'
                ]"
              />
            </Switch>
            <span class="text-sm text-gray-600">JSON</span>
            <button
              v-if="isJsonView"
              v-tooltip="'Copy configuration'"
              class="p-1 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              @click.stop="copyConfig"
            >
              <ClipboardIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 p-6">
        <div v-if="isJsonView" class="h-full">
          <div class="rounded-md bg-gray-50 p-4 h-full overflow-auto custom-scrollbar">
            <pre
              v-highlightjs
              class="text-sm"
            ><code class="language-json block text-sm leading-6 select-text">{{ prettyConfig }}</code></pre>
          </div>
        </div>
        <div v-else class="space-y-6 h-full flex flex-col">
          <!-- Connection Details -->
          <div class="space-y-4">
            <!-- Source Connection -->
            <div>
              <label class="block text-xs font-medium uppercase text-gray-500 mb-2"
                >Source Connection</label
              >
              <div class="bg-gray-50 rounded-md p-4 border border-gray-200">
                <div class="flex items-center gap-2 mb-2">
                  <div
                    v-if="source && source.type"
                    :class="getDatabaseIconStyle(source.type)"
                    class="flex-shrink-0 rounded-lg p-1.5 transition-all duration-200 hover:shadow-md"
                  >
                    <img
                      class="h-5 w-5 object-contain"
                      :src="logoSrc(source.type)"
                      :alt="source.type + ' logo'"
                    />
                  </div>
                  <span
                    class="font-medium text-gray-900 truncate"
                    :class="{
                      'text-red-500': !source || !source.name
                    }"
                    >{{ source?.name || 'N/A' }}</span
                  >
                  <CloudProviderBadge
                    v-if="source"
                    :cloud-provider="source.cloud_provider"
                    :db-type="source.type"
                  />
                  <ExclamationCircleIcon
                    v-if="!source || !source.name"
                    class="h-4 w-4 text-red-500 flex-shrink-0"
                    aria-hidden="true"
                  />
                </div>
                <div class="text-sm text-gray-600">
                  <ConnectionStringDisplay v-if="source" :connection="source" />
                  <span v-else class="text-red-500 text-xs">Connection not found</span>
                </div>
              </div>
            </div>

            <!-- Target Connection -->
            <div>
              <label class="block text-xs font-medium uppercase text-gray-500 mb-2"
                >Target Connection</label
              >
              <div class="bg-gray-50 rounded-md p-4 border border-gray-200">
                <div class="flex items-center gap-2 mb-2">
                  <div
                    v-if="target && target.type"
                    :class="getDatabaseIconStyle(target.type)"
                    class="flex-shrink-0 rounded-lg p-1.5 transition-all duration-200 hover:shadow-md"
                  >
                    <img
                      class="h-5 w-5 object-contain"
                      :src="logoSrc(target.type)"
                      :alt="target.type + ' logo'"
                    />
                  </div>
                  <span
                    class="font-medium text-gray-900 truncate"
                    :class="{
                      'text-red-500': !target || !target.name
                    }"
                    >{{ target?.name || 'N/A' }}</span
                  >
                  <CloudProviderBadge
                    v-if="target"
                    :cloud-provider="target.cloud_provider"
                    :db-type="target.type"
                  />
                  <ExclamationCircleIcon
                    v-if="!target || !target.name"
                    class="h-4 w-4 text-red-500 flex-shrink-0"
                    aria-hidden="true"
                  />
                </div>
                <div class="text-sm text-gray-600">
                  <ConnectionStringDisplay v-if="target" :connection="target" />
                  <span v-else class="text-red-500 text-xs">Connection not found</span>
                </div>
              </div>
            </div>

            <!-- Tables Section -->
            <div>
              <label class="block text-xs font-medium uppercase text-gray-500 mb-2">Tables</label>
              <div class="bg-gray-50 rounded-md p-3 border border-gray-200">
                <p class="text-sm text-gray-900">
                  {{ displayedTables.join(', ') }}{{ remainingTablesCount > 0 ? ', ...' : '' }}
                  <span v-if="remainingTablesCount > 0" class="text-xs text-gray-500 italic ml-1">
                    ({{ remainingTablesCount }} more)
                  </span>
                </p>
              </div>
            </div>
          </div>

          <!-- Creation Date -->
          <div class="mt-auto pt-4 border-t border-gray-100">
            <div class="flex items-center gap-2">
              <CalendarIcon class="h-4 w-4 text-gray-500" />
              <span class="text-sm text-gray-500">Created: {{ streamCreated }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex divide-x divide-gray-200 border-t">
        <BaseButton
          v-tooltip="'Edit stream configuration'"
          variant="secondary"
          class="flex-1 rounded-none border-0 py-3"
          @click.stop="editStream"
        >
          <PencilIcon class="h-4 w-4" />
          Edit
        </BaseButton>
        <ActionsMenu
          v-tooltip="'More stream actions'"
          class="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100"
          :position="actionsMenuPosition"
          :viewType="'cards'"
          @selectRow="selectStream"
          @editRow="editStream"
          @cloneRow="cloneStreamConfig"
          @deleteRow="requestDelete"
        />
        <BaseButton
          v-tooltip="'Start the stream'"
          variant="primary"
          class="flex-1 rounded-none border-0 py-3"
          @click.stop="startStream"
        >
          <PlayIcon class="h-4 w-4" />
          Start
        </BaseButton>
      </div>
    </div>

    <ConfirmDialog
      v-model:is-open="showDeleteConfirm"
      title="Delete stream?"
      description="This action cannot be undone. The stream configuration will be permanently removed."
      confirm-label="Delete"
      cancel-label="Cancel"
      :danger="true"
      @confirm="deleteStreamConfig"
    />
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import shared from './shared'
import { vTooltip } from '@/directives/tooltip'
import BaseButton from '@/components/base/BaseButton.vue'

export default defineComponent({
  ...shared,
  components: {
    BaseButton
  },
  directives: {
    tooltip: vTooltip
  }
})
</script>

<style scoped>
@reference '../../assets/style.css';

/* Scrollbar styles */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  @apply h-2 w-2;
}

.custom-scrollbar::-webkit-scrollbar-track {
  @apply bg-gray-50;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full hover:bg-gray-400 transition-colors;
}

/* Code block styles */
pre {
  tab-size: 2;
  user-select: text;
}

::selection {
  @apply bg-blue-100;
}

/* JSON syntax highlighting */
.hljs {
  @apply bg-gray-50 font-mono;
  color: #24292e;
  padding: 0;
}

.hljs-attr {
  @apply text-[#d73a49] font-semibold;
}

.hljs-string {
  @apply text-[#032f62];
}

.hljs-number {
  @apply text-[#005cc5];
}

.hljs-literal {
  @apply text-[#005cc5];
}

.hljs-punctuation {
  @apply text-[#24292e];
}

.hljs-comment {
  @apply text-[#6a737d] italic;
}
</style>
