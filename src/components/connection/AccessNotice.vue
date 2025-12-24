<template>
  <div>
    <div
      class="mx-4 md:mx-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-5 shadow-sm dark:shadow-gray-900/20"
    >
      <div class="flex items-start">
        <Info class="h-5 w-5 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
        <div class="ml-3">
          <h3 class="text-sm font-semibold text-blue-900 dark:text-blue-100">
            Database Access Configuration
          </h3>
          <div class="mt-2">
            <div class="flex items-baseline flex-wrap">
              <span class="text-sm text-blue-700 dark:text-blue-300"
                >Configure database access for IP:</span
              >
              <code
                class="ml-2 px-2 py-1 bg-white dark:bg-gray-800 rounded border border-blue-300 dark:border-blue-600 text-blue-800 dark:text-blue-300 font-mono text-sm"
              >
                {{ publicIp }}
              </code>
            </div>
            <p class="mt-2 text-sm text-blue-600 dark:text-blue-400">
              <template v-if="publicIp === 'localhost' || publicIp === '127.0.0.1'">
                For local connections, ensure your database accepts connections from 127.0.0.1
              </template>
              <template v-else>
                Whitelist this IP in your database's network configuration
              </template>
            </p>
          </div>
          <a
            href="https://docs.dbconvert.com/network-security/database-access-configuration.html"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-3 inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            View setup guide
            <ExternalLink class="ml-1 h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ExternalLink, Info } from 'lucide-vue-next'

interface Props {
  publicIp: string
}

defineProps<Props>()
</script>
