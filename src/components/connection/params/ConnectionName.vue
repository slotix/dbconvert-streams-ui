<template>
  <div
    class="items-center text-center md:text-left w-full p-4 space-y-4 text-gray-500 lg:inline-flex lg:space-y-0"
  >
    <label class="max-w-sm mx-auto lg:w-1/3 font-semibold"> Name </label>
    <div class="max-w-sm mx-auto lg:w-2/3">
      <div class="relative">
        <input
          type="text"
          :value="name"
          class="rounded-lg flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
          placeholder="Connection Name"
          @input="updateName"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    name: {
      type: String,
      required: true
    }
  },
  setup(props, { emit }) {
    const updateName = (event: Event) => {
      const target = event.target as HTMLInputElement | null
      if (target) {
        emit('update:name', target.value)
      }
    }

    return {
      updateName
    }
  }
})
</script>
