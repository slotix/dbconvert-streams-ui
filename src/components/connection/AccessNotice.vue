<template>
  <div class="mb-4">
    <div class="rounded-lg bg-blue-50 border border-blue-200 p-4">
      <div class="flex items-start">
        <InformationCircleIcon class="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div class="ml-3">
          <h3 class="text-sm font-medium text-blue-800">Database Access Configuration</h3>
          <div class="mt-2">
            <div class="flex items-baseline flex-wrap">
              <span class="text-sm text-blue-700">Configure database access for IP:</span>
              <code class="ml-2 px-2 py-1 bg-white rounded border border-blue-300 text-blue-800 font-mono text-sm">
                {{ publicIp }}
              </code>
            </div>
            <p class="mt-2 text-sm text-blue-600">
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
            class="mt-3 inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View setup guide
            <ArrowTopRightOnSquareIcon class="ml-1 h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { InformationCircleIcon } from '@heroicons/vue/24/outline'
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/20/solid'

interface Props {
  publicIp: string
}

const props = defineProps<Props>()
</script>