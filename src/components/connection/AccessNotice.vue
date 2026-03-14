<template>
  <div>
    <div :class="containerClass">
      <div class="flex items-start">
        <Info class="mt-0.5 h-5 w-5 shrink-0 text-sky-500 dark:text-sky-400" />
        <div class="ml-3">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Database Access Configuration
          </h3>
          <div class="mt-2">
            <div class="flex items-baseline flex-wrap">
              <span class="text-sm text-gray-600 dark:text-gray-300"
                >Configure database access for IP:</span
              >
              <code
                class="ui-surface-raised ui-border-default ml-2 rounded border px-2 py-1 font-mono text-sm text-gray-800 dark:text-gray-200"
              >
                {{ publicIp }}
              </code>
            </div>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
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
            class="mt-3 inline-flex items-center text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
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
import { computed } from 'vue'

interface Props {
  publicIp: string
  layout?: 'default' | 'workspace'
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'default'
})

const containerClass = computed(() =>
  props.layout === 'workspace'
    ? 'ui-border-default rounded-xl border bg-transparent p-5'
    : 'ui-border-default mx-4 rounded-xl border bg-transparent p-5 md:mx-6'
)
</script>
