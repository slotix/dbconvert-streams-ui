<template>
  <section class="max-w-7xl mx-auto px-4 py-10">
    <div v-for="(step, index) in allSteps" :key="step.id">
      <div
        class="flex"
        :class="{
          'flex-row': (index + 1) % 2 != 0,
          'flex-row-reverse': (index + 1) % 2 == 0
        }"
      >
        <div class="hidden md:flex flex-col items-center">
          <div
            class="w-32 py-5 border border-gray-300 rounded-lg mr-4 uppercase flex flex-col items-center justify-center"
          >
            <div class="text-3xl font-black text-gray-500">Step {{ index + 1 }}</div>
          </div>
          <div class="h-full border-l-2 border-transparent">
            <div
              class="border-l-2 h-full border-gray-300 border-dashed"
              :class="{
                'mr-4': (index + 1) % 2 != 0,
                'ml-2': (index + 1) % 2 == 0
              }"
            ></div>
          </div>
        </div>
        <div class="flex-auto rounded">
          <div class="flex md:flex-row flex-col items-center">
            <div class="flex-auto">
              <div class="md:hidden text-sm font-normal uppercase pt-3 pl-3 text-gray-500">
                <span class="font-black">Step {{ index + 1 }}</span> - LOREM
              </div>
              <div class="p-3 text-3xl text-gray-800 font">
                {{ step.title }}
              </div>
              <div class="px-3 pb-6">
                {{ step.description }}
              </div>
            </div>
            <div class="md:w-96 w-full p-5">
              <img :src="step.img" :alt="step.title" class="object-scale-down" />
            </div>
          </div>
        </div>
      </div>
      <div
        class="flex items-start"
        :class="{
          'flex-row': (index + 1) % 2 != 0,
          'flex-row-reverse': (index + 1) % 2 == 0
        }"
        v-if="index != Object.keys(allSteps).length - 1"
      >
        <div class="border-t-2 border-r-2 border-transparent">
          <div
            class="w-16 h-16 border-gray-300 border-dashed border-b-2"
            :class="{
              'ml-16 border-l-2 rounded-bl-full': (index + 1) % 2 != 0,
              'mr-16 border-r-2 rounded-br-full': (index + 1) % 2 == 0
            }"
          ></div>
        </div>
        <div class="border-t-2 border-transparent flex-auto">
          <div class="h-16 border-b-2 border-gray-300 border-dashelogod"></div>
        </div>
        <div
          class="w-16 mt-16 h-16 border-gray-300 border-dashed border-t-2"
          :class="{
            'ml-16 border-l-2 rounded-tl-full': (index + 1) % 2 == 0,
            'mr-16 border-r-2 rounded-tr-full': (index + 1) % 2 != 0
          }"
        ></div>
      </div>
    </div>
  </section>
</template>
<script setup>
import { useStreamsStore } from '@/stores/streams.js'
const allSteps = useStreamsStore().steps
</script>
