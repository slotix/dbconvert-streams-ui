<!-- src/views/ApiKeyView.vue -->
<template>
  <div class="api-key-view p-4">
    <h1 class="text-xl font-bold mb-4">API Key</h1>
    <div v-if="apiKey" class="api-key-display bg-gray-100 p-4 rounded-md shadow-md flex items-center">
      <input
        :type="showApiKey ? 'text' : 'password'"
        :value="apiKey"
        class="flex-grow bg-gray-100 border-none focus:ring-0 text-gray-800"
        readonly
      />
      <button @click="toggleApiKeyVisibility" class="ml-2">
        <component :is="showApiKey ? EyeSlashIcon : EyeIcon" class="h-5 w-5 text-gray-500" />
      </button>
      <button @click="copyApiKey" class="ml-2">
        <component :is="copied ? CheckIcon : ClipboardIcon" class="h-5 w-5 text-gray-500" />
      </button>
    </div>
    <div v-else class="loading">
      <p>Loading your API key...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCommonStore } from '@/stores/common';
import { EyeIcon, EyeSlashIcon, ClipboardIcon, CheckIcon } from '@heroicons/vue/24/outline';

const commonStore = useCommonStore();
const apiKey = computed(() => commonStore.apiKey);
const showApiKey = ref(false);
const copied = ref(false);

const toggleApiKeyVisibility = () => {
  showApiKey.value = !showApiKey.value;
};

const copyApiKey = () => {
  if (apiKey.value) {
    navigator.clipboard.writeText(apiKey.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000); // Revert back to normal icon after 2 seconds
  }
};
</script>

<style scoped>
.api-key-view {
  max-width: 600px;
  margin: 0 auto;
}
.api-key-display {
  background-color: #f3f4f6;
  padding: 1rem;
  border-radius: 0.375rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.loading {
  font-size: 1rem;
  color: #9ca3af;
}
</style>
