<!-- src/views/ApiKeyView.vue -->
<template>
  <div class="api-key-view ">
    <div class="border-b border-gray-200 pb-4 mb-4">
      <h3 class="text-lg leading-6 font-bold text-gray-900">Manage API Key</h3>
    </div>
    <div v-if="apiKey" class="api-key-display bg-gray-100 p-4 rounded-md shadow-md flex items-center">
      <input :type="showApiKey ? 'text' : 'password'" :value="apiKey"
        class="flex-grow bg-gray-100 border-none focus:ring-0 text-gray-800" readonly />
      <button @click="toggleApiKeyVisibility" class="ml-2">
        <component :is="showApiKey ? EyeSlashIcon : EyeIcon" class="h-5 w-5 text-gray-500" />
      </button>
      <button @click="copyApiKey" class="ml-2">
        <component :is="copied ? CheckIcon : ClipboardIcon" class="h-5 w-5 text-gray-500" />
      </button>
    </div>
    <div v-else class="text-gray-600 text-sm italic animate-pulse">
      <p>Loading your API key...</p>
    </div>
    <div class="mt-4 flex space-x-4">
      <button @click="updateApiKey" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
        Update API Key
      </button>
    </div>
    <!-- <div class="mt-4 flex space-x-4">
      <div class="text-gray-600 text-sm italic">
        Country: {{ country || 'Unknown' }}
      </div>
    </div> -->
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
