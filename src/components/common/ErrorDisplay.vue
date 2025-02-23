<script setup lang="ts">
import { useCommonStore } from '@/stores/common'
import { storeToRefs } from 'pinia'

const commonStore = useCommonStore()
const { error } = storeToRefs(commonStore)
</script>

<template>
  <TransitionRoot
    v-if="error"
    appear
    as="template"
    enter="transform ease-out duration-300"
    enter-from="translate-y-2 opacity-0"
    enter-to="translate-y-0 opacity-100"
    leave="transition ease-in duration-100"
    leave-from="opacity-100"
    leave-to="opacity-0"
  >
    <!-- Allow custom error display through slot -->
    <slot :error="error">
      <div class="rounded-md bg-red-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <XCircleIcon v-if="!error.isRetrying" class="h-5 w-5 text-red-400" />
            <ArrowPathIcon v-else class="h-5 w-5 text-yellow-400 animate-spin" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium" :class="error.isRetrying ? 'text-yellow-800' : 'text-red-800'">
              {{ error.message }}
            </h3>
          </div>
        </div>
      </div>
    </slot>
  </TransitionRoot>
</template> 