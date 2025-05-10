<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Table, Relationship } from '@/types/schema'
import MermaidERD from './MermaidERD.vue'
import DatabaseDiagramD3 from './DatabaseDiagramD3.vue'

const props = withDefaults(
  defineProps<{
    tables: Table[]
    relationships: Relationship[]
    views: Table[]
  }>(),
  {
    tables: () => [],
    relationships: () => [],
    views: () => []
  }
)

const hasData = computed(() => {
  return props.tables?.length > 0 || props.views?.length > 0
})

const useD3 = ref(false)
</script>

<template>
  <div class="h-full relative">
    <!-- Move Interactive Mode switch to left -->
    <div class="absolute top-4 left-4 z-50">
      <div class="bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
        <span class="text-sm font-medium text-gray-600">Interactive Mode</span>
        <button type="button" @click="useD3 = !useD3"
          class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          :class="useD3 ? 'bg-blue-600' : 'bg-gray-200'" role="switch" :aria-checked="useD3">
          <span :class="useD3 ? 'translate-x-5' : 'translate-x-0'"
            class="pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out">
            <span :class="[
              useD3 ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in',
              'absolute inset-0 flex h-full w-full items-center justify-center transition-opacity'
            ]" aria-hidden="true">
              <svg class="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 12 12">
                <path d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
            </span>
            <span :class="[
              useD3 ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out',
              'absolute inset-0 flex h-full w-full items-center justify-center transition-opacity'
            ]" aria-hidden="true">
              <svg class="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 12 12">
                <path
                  d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
              </svg>
            </span>
          </span>
        </button>
      </div>
    </div>

    <!-- Diagram content -->
    <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg relative h-full">
      <div v-if="!hasData" class="h-full flex items-center justify-center text-gray-500">
        <p>No tables or views to display</p>
      </div>
      <DatabaseDiagramD3 v-else-if="useD3" :tables="tables" :relations="relationships" :views="views" />
      <MermaidERD v-else :tables="tables" :views="views" :relationships="relationships" />
    </div>
  </div>
</template>

<style scoped>
.h-full {
  height: 100%;
  min-height: 600px;
}
</style>
