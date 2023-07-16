<template>
  <base-layout>
    <template #header>
      <div
        class="bg-white flex flex-wrap justify-between space-y-4 sm:space-y-0 max-w-7xl mx-auto py-6 px-8"
      >
        <h1 class="flex-auto text-3xl font-bold text-gray-900 dark:text-white">
          Add Project.
        </h1>
        <div class="flex-auto items-center">
          <!-- Top Navigation -->
          <div v-for="(step, index) in allSteps" :key="step.id">
            <div v-show="currentStepNumber === index + 1">
              <div
                class="uppercase tracking-wide text-sm font-bold text-gray-500 mb-1 leading-tight"
              >
                Step: {{ currentStepNumber }} of {{ stepsCount }}
              </div>
              <div
                class="flex flex-col md:flex-row md:items-center md:justify-between"
              >
                <img class="mr-3 h-10 w-10" :src="step.img" :alt="step.title" />

                <div class="flex-1">
                  <div class="text-xl font-bold text-gray-700 leading-tight">
                    {{ step.title }}
                  </div>
                </div>

                <div class="flex items-center md:w-64">
                  <div class="w-full bg-gray-200 rounded-full mr-2">
                    <div
                      class="rounded-full bg-green-500 text-sm leading-none h-3 text-center text-white"
                      :style="{ width: stepsBarValue }"
                    ></div>
                  </div>
                  <div class="text-sm w-10 text-gray-600">
                    {{ stepsBarValue }}
                  </div>
                </div>
                <!-- </div> -->
              </div>
            </div>
          </div>
        </div>
        <!-- /Top Navigation -->
      </div>
    </template>
    <template #default>
      <div class="antialiased bg-gray-200">
        <div v-show="currentStepNumber === 'complete'">
          <div
            class="bg-white rounded-lg p-10 flex items-center shadow justify-between"
          >
            <div>
              <svg
                class="mb-4 h-20 w-20 text-green-500 mx-auto"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>

              <h2 class="text-2xl mb-4 text-gray-800 text-center font-bold">
                Registration Success
              </h2>

              <div class="text-gray-600 mb-8">
                Thank you. We have sent you an email to demo@demo.test. Please
                click the link in the message to activate your account.
              </div>

              <button
                @click="step = 1"
                class="w-40 block mx-auto focus:outline-none py-2 px-5 rounded-lg shadow-sm text-center text-gray-600 bg-white hover:bg-gray-100 font-medium border"
              >
                Back to home
              </button>
            </div>
          </div>
        </div>

        <div class="mb-20" v-show="currentStepNumber != 'complete'">
          <!-- Step Content -->
          <!-- <div class=""> -->
          <div v-show="currentStep.name === 'source'">
            <connections :isShowHeader="false" :isSelectable="true" />
          </div>
          <div v-show="currentStep.name === 'target'">
            <connections :isShowHeader="false" :isSelectable="true" />
          </div>
          <div v-show="currentStep.name === 'settings'">
            Settings
          </div>
          <div v-show="currentStep.name === 'run'">
            run
          </div>
          <!-- </div> -->
          <!-- / Step Content -->
        </div>

        <!-- Bottom Navigation -->
        <div
          class="fixed bottom-0 left-0 right-0  bg-white shadow-md"
          v-show="currentStepNumber != 'complete'"
        >
          <div class="justify-center px-4 my-6 sm:px-6 sm:flex sm:flex-row ">
            <button
              type="button"
              @click="gotoBackStep"
              class=" w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto "
              :class="{
                visible: currentStepNumber > 1,
                invisible: currentStepNumber == 1
              }"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
            <button
              type="button"
              @click="gotoNextStep"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-700  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:ml-3 sm:w-auto "
              :class="{
                visible: currentStepNumber < stepsCount,
                invisible: currentStepNumber == stepsCount
              }"
            >
              Next
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <button
              type="button"
              @click="currentStepNumber = 'complete'"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto "
            >
              Finish
            </button>
          </div>
        </div>
      </div>
    </template>
  </base-layout>
</template>
<script>
import { mapGetters, mapMutations } from "vuex";
import BaseLayout from "../../BaseLayout";
import Connections from "./../connection/Connections.vue";
export default {
  name: "AddProject",
  components: { BaseLayout, Connections },
  data: () => ({ currentStepNumber: 1 }),
  methods: {
    ...mapMutations(["UPDATE_CURRENT_STEP"]),
    gotoNextStep() {
      this.currentStepNumber++;
      this.UPDATE_CURRENT_STEP(this.allSteps[this.currentStepNumber - 1]);
    },
    gotoBackStep() {
      this.currentStepNumber--;
      this.UPDATE_CURRENT_STEP(this.allSteps[this.currentStepNumber - 1]);
    }
  },
  computed: {
    stepsBarValue() {
      return parseInt((this.currentStepNumber / this.stepsCount) * 100) + "%";
    },
    ...mapGetters(["allSteps", "currentStep"]),
    stepsCount() {
      return this.allSteps.length;
    }
  },
  watch: {},
  created() {
    this.UPDATE_CURRENT_STEP(this.allSteps[this.currentStepNumber - 1]);
  }
};
</script>
