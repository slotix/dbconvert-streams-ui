<!-- src/views/ApiKeyView.vue -->
<template>
  <div class="api-key-view">
    <div v-if="apiKey" class="mb-4">
      <label for="api-key" class="block text-sm font-medium text-gray-700 mb-1">API Key</label>
      <div class="mt-1 relative rounded-md shadow-sm">
        <input :type="showApiKey ? 'text' : 'password'" :value="apiKey" id="api-key"
          class="block w-full pr-10 focus:outline-none focus:ring-blue-500 focus:border-gray-500 sm:text-sm border-gray-300 rounded-md"
          readonly />
        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button @click="toggleApiKeyVisibility" class="text-gray-400 hover:text-gray-500">
            <component :is="showApiKey ? EyeSlashIcon : EyeIcon" class="h-5 w-5" />
          </button>
          <button @click="copyApiKey" class="ml-2 text-gray-400 hover:text-gray-500">
            <component :is="copied ? CheckIcon : ClipboardIcon" class="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
    <div v-else class="text-gray-600 text-sm italic animate-pulse mb-4">
      <p>Loading your API key...</p>
    </div>
    <button @click="updateApiKey" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
      Update API Key
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCommonStore } from '@/stores/common';
import { EyeIcon, EyeSlashIcon, ClipboardIcon, CheckIcon } from '@heroicons/vue/24/outline';
// import { useUserCountry } from '@/views/useUserCountry';

const commonStore = useCommonStore();
const apiKey = computed(() => commonStore.userData?.apiKey);
const showApiKey = ref(false);
const copied = ref(false);
// const { country } = useUserCountry();
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

const updateApiKey = async () => {
  if (confirm('Are you sure you want to update your API key? This will generate a new key.')) {
    try {
      await commonStore.updateAPIKey();
      commonStore.showNotification('Your API key has been updated. Please make sure to use the new key in your requests.', 'success');
    } catch (error) {
      console.error('Error updating API key:', error);
      commonStore.showNotification('An error occurred while updating your API key. Please try again.', 'error');
    }
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

</style>