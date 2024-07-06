<template>
    <div class="lg:px-10">
        <div class="px-2 flex items-center">
            <div class="flex-auto border-b border-gray-400 pb-5">
                <h3 class="text-base font-semibold leading-6 text-gray-900">Global Stream Settings</h3>
            </div>
        </div>
        <div class="px-2 overflow-x-auto mt-6">
            <ModeButtons />
            <div v-if="currentStream.mode === 'cdc'">
                <div class="mt-2">
                    <Operations v-model="operations" />
                </div>
            </div>
            <div class="mt-4">
                <label for="dataBundleSize" class="block text-sm font-medium text-gray-700">Data Bundle Size:</label>
                <input type="number" id="dataBundleSize" v-model="dataBundleSize"
                    class="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
            </div>
            <h3 class="text-base mt-6 font-semibold leading-6 text-gray-900">Reporting Intervals (seconds)</h3>
            <div class="mt-2 grid grid-cols-1 gap-x-2 gap-y-8 sm:grid-cols-2">
                <div class="">
                    <label for="elapsedTime" class="block text-sm font-medium text-gray-700">Source Reader</label>
                    <input type="number" id="sourceReaderReportingInterval" v-model="reportingIntervalsSource"
                        class="mt-1 focus:ring-gray-500 focus:border-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                </div>
                <div>
                    <label for="targetReaderReportingInterval" class="block text-sm font-medium text-gray-700">Target
                        Writers</label>
                    <input type="number" id="targetReaderReportingInterval" v-model="reportingIntervalsTarget"
                        class="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                </div>
            </div>
            <div class="mt-4">
                <input id="create-target-structure" name="create-target-structure" type="checkbox"
                    v-model="createStructure"
                    class="h-4 w-4 text-sm rounded border-gray-300 text-gray-600 focus:ring-gray-600" />
                <label for="create-target-structure" class="text-sm font-medium text-gray-700 pl-2">Create Structure on
                    Target</label>
            </div>

            <div class="mt-4">
                <input id="skip-index-creation" name="skip-index-creation" type="checkbox"
                    v-model="skipIndexCreation"
                    class="h-4 w-4 text-sm rounded border-gray-300 text-gray-600 focus:ring-gray-600" />
                <label for="skip-index-creation" class="text-sm font-medium text-gray-700 pl-2"> Skip Index Creation
                    for All Tables
                </label>
            </div>
        </div>
        <div class="px-2">
            <h3 class=" text-base mt-6 font-semibold leading-6 text-gray-900">Limits</h3>
            <div class="mt-2 grid grid-cols-1 gap-x-2 gap-y-8 sm:grid-cols-2">
                <div>
                    <label for="numberOfEvents" class="block text-sm font-medium text-gray-700">Number of
                        Events:</label>
                    <input type="number" id="numberOfEvents" v-model="limitsNumberOfEvents"
                        class="mt-1 focus:ring-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                </div>
                <div>
                    <label for="elapsedTime" class="block text-sm font-medium text-gray-700">Elapsed Time
                        (seconds):</label>
                    <input type="number" id="elapsedTime" v-model="limitsElapsedTime"
                        class="mt-1 focus:ring-gray-500 focus:border-gray-500 focus:border-gray-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed} from 'vue';
import { useStreamsStore, defaultStreamOptions } from '@/stores/streams';
import ModeButtons from './ModeButtons.vue';
import Operations from './Operations.vue';
import { Stream } from '@/types/streams';

const streamsStore = useStreamsStore();
const currentStream = streamsStore.currentStream as Stream;

const dataBundleSize = computed<number>({
    get: () => currentStream.dataBundleSize ?? defaultStreamOptions.dataBundleSize,
    set: (newValue) => { currentStream.dataBundleSize = newValue; }
});

const operations = computed<string[]>({
    get: () => currentStream.operations ?? defaultStreamOptions.operations ?? [],
    set: (value) => { currentStream.operations = value; }
});

const reportingIntervalsSource = computed<number>({
    get: () => currentStream.reportingIntervals?.source ?? defaultStreamOptions.reportingIntervals.source,
    set: (value) => {
        if (currentStream.reportingIntervals) {
            currentStream.reportingIntervals.source = value;
        }
    }
});
const reportingIntervalsTarget = computed<number>({
    get: () => currentStream.reportingIntervals?.target ?? defaultStreamOptions.reportingIntervals.target,
    set: (value) => {
        if (currentStream.reportingIntervals) {
            currentStream.reportingIntervals.target = value;
        }
    }
});

const limitsNumberOfEvents = computed<number>({
    get: () => currentStream.limits?.numberOfEvents ?? defaultStreamOptions.limits.numberOfEvents,
    set: (value) => {
        if (currentStream.limits) {
            currentStream.limits.numberOfEvents = value;
        }
    }
});

const limitsElapsedTime = computed<number>({
    get: () => currentStream.limits?.elapsedTime ?? defaultStreamOptions.limits.elapsedTime,
    set: (value) => {
        if (currentStream.limits) {
            currentStream.limits.elapsedTime = value;
        }
    }
});

const createStructure = computed<boolean>({
    get: () => currentStream.createStructure !== undefined ? currentStream.createStructure : defaultStreamOptions.createStructure,
    set: (value) => { currentStream.createStructure = value; }
});

const skipIndexCreation = computed<boolean>({
    get: () => currentStream.skipIndexCreation !== undefined ? currentStream.skipIndexCreation : defaultStreamOptions.skipIndexCreation,
    set: (value) => { currentStream.skipIndexCreation = value; }
});
</script>
