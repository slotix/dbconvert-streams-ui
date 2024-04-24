<template>
    <div class=" lg:px-10">
        <div class="flex items-center">
            <div class="flex-auto border-b border-gray-400 pb-5">
                <h3 class="text-base font-semibold leading-6 text-gray-900">Stream Settings</h3>
            </div>
        </div>
        <div class="overflow-x-auto mt-6">
            <ModeButtons />
            <div class="mt-4">
                <label for="dataBundleSize" class="block text-sm font-medium text-gray-700">Data Bundle Size:</label>
                <input type="number" id="dataBundleSize" v-model="dataBundleSize"
                    class="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
            </div>

            <h3 class="text-base mt-6 font-semibold leading-6 text-gray-900">Reporting Intervals (seconds)</h3>
            <div class="mt-2 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
                <div class="">
                    <label for="elapsedTime" class="block text-sm font-medium text-gray-700">Source Reader</label>
                    <input type="number" id="sourceReaderReportingInterval" v-model="reportingIntervals.source"
                        class="mt-1 focus:ring-gray-500 focus:border-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                </div>
                <div class="">
                    <label for="elapsedTime" class="block text-sm font-medium text-gray-700">Target Writers</label>
                    <input type="number" id="targetWriterReportingInterval" v-model="reportingIntervals.target"
                        class="mt-1 focus:ring-gray-500 focus:border-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                </div>
            </div>
            <div class="mt-4">
                <input id="create-target-structure" name="create-target-structure" type="checkbox"
                    v-model="options.createStructure"
                    class="h-4 w-4 text-sm rounded border-gray-300 text-gray-600 focus:ring-gray-600" />
                <label for="create-target-structure" class="text-sm font-medium text-gray-700 pl-2">Create Structure on
                    Target</label>
            </div>
        </div>
        <Limits />
    </div>
</template>

<script setup>
import { ref, watch, watchEffect } from 'vue'
import { useStreamsStore } from '@/stores/streams.js'
import ModeButtons from './ModeButtons.vue';

import Limits from './Limits.vue'
const currentStream = useStreamsStore().currentStream

const defaultDataBundleSize = 100
const dataBundleSize = ref(currentStream.dataBundleSize || defaultDataBundleSize)
const defaultReportingIntervals = {
    source: 3,
    target: 3
}
const defaultOptions = {
    createStructure: true
}
const reportingIntervals = ref(currentStream?.reportingIntervals || defaultReportingIntervals)
const options = ref(currentStream?.options || defaultOptions)

// const stream =
//     ref(currentStream) ||
//     ref({
//         dataBundleSize: 100,
//         reportingIntervals: {
//             source: 3,
//             target: 3
//         },
//         options: {
//             createStructure: true
//         }
//     })
// const limits =
//     ref(currentStream.limits) ||
//     ref({
//         numberOfEvents: 0,
//         elapsedTime: 0
//     })
watch(
    dataBundleSize,
    (newValue) => {
        currentStream.dataBundleSize = newValue
    },
    reportingIntervals,
    (newValue) => {
        currentStream.reportingIntervals = newValue
    },
    options,
    (newValue) => {
        currentStream.options = newValue
    },
    // limits,
    // (newLimits) => {
    //     // Check if any limit is less than zero and reset it to zero
    //     if (newLimits.numberOfEvents < 0) {
    //         limits.value.numberOfEvents = 0
    //     }
    //     if (newLimits.elapsedTime < 0) {
    //         limits.value.elapsedTime = 0
    //     }

    //     // Update limits in streams store when limits change
    //     currentStream.limits = newLimits
    // },
    { deep: true }
)
</script>
