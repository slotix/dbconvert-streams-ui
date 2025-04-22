<template>
  <div class="w-full">
    <div
      class="bg-white rounded-lg border overflow-hidden cursor-pointer transform hover:shadow-lg duration-300 ease-in-out flex flex-col h-full"
      @click="selectStream">
      <!-- Header -->
      <div class="border-b px-6 py-4 bg-gray-50">
        <div class="flex items-center justify-between">
          <div class="flex items-center min-w-0 flex-1">
            <h3 class="text-lg font-medium text-gray-900 truncate">{{ streamConfig.name }}</h3>
          </div>
          <div class="flex items-center gap-2 ml-4">
            <Switch v-model="isJsonView"
              class="relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
              :class="[isJsonView ? 'bg-gray-600' : 'bg-gray-400']">
              <span class="sr-only">Toggle JSON view</span>
              <span aria-hidden="true"
                class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
                :class="[
                  isJsonView ? 'translate-x-5' : 'translate-x-0',
                  'shadow-[0_1px_4px_rgba(0,0,0,0.15)]'
                ]" />
            </Switch>
            <span class="text-sm text-gray-600">JSON</span>
            <button v-if="isJsonView" v-tooltip="'Copy configuration'"
              class="p-1 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100" @click.stop="copyConfig">
              <ClipboardIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="space-y-6 p-6">
        <div v-if="isJsonView" class="space-y-1.5">
          <div class="rounded-md bg-gray-50 p-3 font-mono text-sm">
            <pre class="text-gray-900 whitespace-pre-wrap">{{ prettyConfig }}</pre>
          </div>
        </div>
        <div v-else class="space-y-6">
          <!-- Connection Details -->
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-6">
              <div class="flex items-center justify-between col-span-2 -mb-1">
                <label class="text-xs font-medium uppercase text-gray-500">Source Connection</label>
                <span
                  class="inline-flex items-center rounded-md bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                  {{ streamConfig.mode }}
                </span>
                <label class="text-xs font-medium uppercase text-gray-500">Target Connection</label>
              </div>

              <!-- Source Connection -->
              <div class="space-y-2">
                <div class="bg-gray-50 rounded-md p-4 border border-gray-200">
                  <div class="flex items-center gap-2 mb-2">
                    <img v-if="source && source.type" class="h-6 w-6 rounded-full" :src="logoSrc(source.type)"
                      :alt="source.type + ' logo'" />
                    <span class="font-medium text-gray-900" :class="{
                      'text-red-500': !source || !source.name
                    }">{{ source?.name || 'N/A' }}</span>
                    <ExclamationCircleIcon v-if="!source || !source.name" class="h-4 w-4 text-red-500"
                      aria-hidden="true" />
                  </div>
                  <div class="text-sm text-gray-600 mt-2">
                    <ConnectionStringDisplay v-if="source" :connection="source" />
                    <span v-else class="text-red-500 text-xs">Connection not found</span>
                  </div>
                </div>
              </div>

              <!-- Target Connection -->
              <div class="space-y-2">
                <div class="bg-gray-50 rounded-md p-4 border border-gray-200">
                  <div class="flex items-center gap-2 mb-2">
                    <img v-if="target && target.type" class="h-6 w-6 rounded-full" :src="logoSrc(target.type)"
                      :alt="target.type + ' logo'" />
                    <span class="font-medium text-gray-900" :class="{
                      'text-red-500': !target || !target.name
                    }">{{ target?.name || 'N/A' }}</span>
                    <ExclamationCircleIcon v-if="!target || !target.name" class="h-4 w-4 text-red-500"
                      aria-hidden="true" />
                  </div>
                  <div class="text-sm text-gray-600 mt-2">
                    <ConnectionStringDisplay v-if="target" :connection="target" />
                    <span v-else class="text-red-500 text-xs">Connection not found</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tables Section -->
            <div>
              <label class="text-xs font-medium uppercase text-gray-500">Tables</label>
              <p class="mt-1 text-sm text-gray-900">
                {{ displayedTables.join(', ') }}{{ remainingTablesCount > 0 ? ', ...' : '' }}
                <span v-if="remainingTablesCount > 0" class="text-xs text-gray-500 italic ml-1">
                  ({{ remainingTablesCount }} more)
                </span>
              </p>
            </div>
          </div>

          <!-- Creation Date -->
          <div class="flex items-center gap-2 pt-4 border-t border-gray-100">
            <CalendarIcon class="h-4 w-4 text-gray-500" />
            <span class="text-sm text-gray-500">Created: {{ streamCreated }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-auto flex divide-x divide-gray-200 border-t">
        <button v-tooltip="'Edit stream configuration'" type="button"
          class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-2"
          @click.stop="editStream">
          <PencilIcon class="h-4 w-4" />
          Edit
        </button>
        <ActionsMenu v-tooltip="'More stream actions'"
          class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100"
          :position="actionsMenuPosition" :viewType="'cards'" @selectRow="selectStream" @editRow="editStream"
          @cloneRow="cloneStreamConfig" @deleteRow="deleteStreamConfig" />
        <button v-tooltip="'Start the stream'" type="button"
          class="flex-1 px-4 py-2 text-sm font-medium text-green-700 bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-2"
          @click.stop="startStream">
          <PlayIcon class="h-4 w-4" />
          Start
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import shared from './shared'
import { vTooltip } from '@/directives/tooltip'

export default defineComponent({
  ...shared,
  directives: {
    tooltip: vTooltip
  }
})
</script>
