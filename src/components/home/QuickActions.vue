<!-- src/components/home/QuickActions.vue -->
<template>
  <div class="p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">Quick Actions</h2>
    <div class="space-y-4">
      <!-- Create Stream -->
      <div class="group cursor-pointer" @click="createStream">
        <div
          class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/50 transition-all duration-200"
        >
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="bg-indigo-50 rounded-lg p-3 group-hover:bg-indigo-100 transition-colors">
                <ClockIcon class="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <div class="ml-4">
              <h3 class="text-sm font-semibold text-gray-900">Create Stream</h3>
              <p class="text-sm text-gray-500">Set up a new data stream</p>
            </div>
          </div>
          <ArrowRightIcon
            class="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors"
          />
        </div>
      </div>

      <!-- Create Connection -->
      <div class="group cursor-pointer" @click="createConnection">
        <div
          class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-violet-200 hover:bg-violet-50/50 transition-all duration-200"
        >
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="bg-violet-50 rounded-lg p-3 group-hover:bg-violet-100 transition-colors">
                <PlusIcon class="h-6 w-6 text-violet-600" />
              </div>
            </div>
            <div class="ml-4">
              <h3 class="text-sm font-semibold text-gray-900">Create Connection</h3>
              <p class="text-sm text-gray-500">Connect a new database</p>
            </div>
          </div>
          <ArrowRightIcon
            class="h-5 w-5 text-gray-400 group-hover:text-violet-600 transition-colors"
          />
        </div>
      </div>

      <!-- View All Connections -->
      <div class="group cursor-pointer" @click="viewAllConnections">
        <div
          class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/50 transition-all duration-200"
        >
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div
                class="bg-emerald-50 rounded-lg p-3 group-hover:bg-emerald-100 transition-colors"
              >
                <CircleStackIcon class="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <div class="ml-4">
              <h3 class="text-sm font-semibold text-gray-900">All Connections</h3>
              <p class="text-sm text-gray-500">View database connections</p>
            </div>
          </div>
          <ArrowRightIcon
            class="h-5 w-5 text-gray-400 group-hover:text-emerald-600 transition-colors"
          />
        </div>
      </div>

      <!-- View All Stream Configurations -->
      <div class="group cursor-pointer" @click="viewAllStreamConfigurations">
        <div
          class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-amber-200 hover:bg-amber-50/50 transition-all duration-200"
        >
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="bg-amber-50 rounded-lg p-3 group-hover:bg-amber-100 transition-colors">
                <ArrowPathIcon class="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div class="ml-4">
              <h3 class="text-sm font-semibold text-gray-900">All Streams</h3>
              <p class="text-sm text-gray-500">View stream configurations</p>
            </div>
          </div>
          <ArrowRightIcon
            class="h-5 w-5 text-gray-400 group-hover:text-amber-600 transition-colors"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import {
  ArrowPathIcon,
  CircleStackIcon,
  ClockIcon,
  PlusIcon,
  ArrowRightIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const commonStore = useCommonStore()

function createStream() {
  router.push({ name: 'ManageStream', params: { mode: 'add' } })
}

function createConnection() {
  commonStore.openAddConnectionDialog()
  router.push('/connections')
}

function viewAllConnections() {
  router.push('/connections')
}

function viewAllStreamConfigurations() {
  router.push('/streams')
}
</script>
