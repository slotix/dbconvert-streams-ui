<template>
  <div
    class="items-center text-center md:text-left w-full p-4 space-y-4 text-gray-500 lg:inline-flex lg:space-y-0"
  >
    <label class="max-w-sm mx-auto lg:w-1/3 font-semibold"> Name </label>
    <div class="max-w-sm mx-auto lg:w-2/3">
      <FormInput
        :model-value="name"
        placeholder="Connection Name"
        @update:model-value="(value) => $emit('update:name', value)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import FormInput from '@/components/base/FormInput.vue'

export default defineComponent({
  components: {
    FormInput
  },
  props: {
    name: {
      type: String,
      required: true
    }
  },
  emits: ['update:name']
})
</script>
