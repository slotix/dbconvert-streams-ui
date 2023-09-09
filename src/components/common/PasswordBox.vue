<template>
  <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
    <label class="max-w-sm mx-auto md:w-1/3"> Password </label>
    <div class="max-w-sm mx-auto md:w-2/3">
      <div class="relative">
        <input
          :type="passwordFieldType"
          :value="password"
          @input="$emit('update:password', $event.target.value)" 
          class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
          placeholder=""
        />
        <button
          type="button"
          class="absolute right-0 top-0 h-full px-4 py-2 flex items-center"
          @click="switchVisibility"
        >
          <EyeIcon v-if="passwordFieldType === 'password'" class="h-5 w-5 text-gray-400" aria-hidden="true" />
          <EyeSlashIcon v-else class="h-5 w-5 text-gray-400" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/solid'
export default {
  data() {
    return {
      // password: '',
      passwordFieldType: 'password'
    }
  },
  props: {
    password: {
      type: String
    }
  },
  components: {
    EyeIcon,
    EyeSlashIcon
  },
  methods: {
    switchVisibility() {
      this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password'
    }
  }
}
</script>
