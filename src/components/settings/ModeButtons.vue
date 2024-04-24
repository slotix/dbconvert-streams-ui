<template>
  <!-- <div class="px-4 sm:px-6 lg:px-8"> -->
  <!-- <div class="flex items-center">
      <div class="flex-auto">
        <h3 class="text-base font-semibold leading-6 text-gray-900">Data transfer mode</h3>
      </div>
    </div> -->

  <label for="dataBundleSize" class="block text-sm font-medium text-gray-700">Data Transfer Mode:</label>
  <!-- <div class="mt-2 flow-root"> -->
    <RadioGroup v-model="mode" class="mt-2">
      <RadioGroupLabel class="sr-only">Choose a data transfer mode</RadioGroupLabel>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <RadioGroupOption as="template" v-for="option in modes" :key="option.id" :value="option"
          v-slot="{ active, checked }">
          <div :class="[
            active ? 'ring-2 ring-gray-600 ring-offset-2' : '',
            checked
              ? 'bg-gray-600 text-white hover:bg-gray-500'
              : 'ring-1 ring-inset ring-gray-300 bg-white text-gray-900 hover:bg-gray-50',
            'flex items-center justify-center rounded-md py-3 px-3 text-sm font-normal   sm:flex-1'
          ]">
            <RadioGroupLabel as="span">{{ option.title }}</RadioGroupLabel>
          </div>
        </RadioGroupOption>
      </div>
    </RadioGroup>
  <!-- </div> -->
  <!-- </div> -->
</template>

<script setup>
import { ref, watch } from 'vue'
import { useStreamsStore } from '@/stores/streams.js'
import { useCommonStore } from '@/stores/common.js'
import { RadioGroup, RadioGroupLabel, RadioGroupOption } from '@headlessui/vue'
const modes = useCommonStore().modes
const currentStream = useStreamsStore().currentStream
const mode = ref(modes.find((option) => option.id === currentStream.mode) || modes[-1])
watch(mode, (newVal) => {
  currentStream.mode = newVal.id
})
</script>
