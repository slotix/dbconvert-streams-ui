<template>
  <div
    v-if="isCloudConnection(cloudProvider)"
    class="inline-flex items-center rounded-full font-medium transition-colors"
    :class="[badgeStyle.bgColor, badgeStyle.textColor, sizeClasses]"
    :title="`Hosted on ${displayName}`"
  >
    <img
      v-if="providerLogo"
      :src="providerLogo"
      :alt="`${displayName} logo`"
      :class="[
        logoSizeClasses,
        'object-contain shrink-0 transition dark:invert dark:brightness-200'
      ]"
    />
    <CloudIcon v-else :class="logoSizeClasses" class="shrink-0" />
    <span class="whitespace-nowrap">{{ displayName }}</span>
    <button
      v-if="documentationUrl"
      v-tooltip="'View setup documentation'"
      class="shrink-0 hover:opacity-70 transition-opacity text-current"
      @click.stop="openDocumentation"
    >
      <QuestionMarkCircleIcon :class="helpIconSizeClasses" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CloudIcon, QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import {
  isCloudConnection,
  getCloudProviderDisplayName,
  getCloudProviderLogo,
  getCloudProviderBadgeStyle
} from '@/utils/cloudProviderUtils'
import { getDocumentationUrl } from '@/utils/documentationUtils'

interface Props {
  cloudProvider?: string
  size?: 'sm' | 'md' | 'lg'
  dbType?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const displayName = computed(() => {
  if (!props.cloudProvider) return ''
  return getCloudProviderDisplayName(props.cloudProvider)
})

const providerLogo = computed(() => {
  if (!props.cloudProvider) return null
  return getCloudProviderLogo(props.cloudProvider)
})

const badgeStyle = computed(() => {
  if (!props.cloudProvider) return { bgColor: 'bg-gray-100', textColor: 'text-gray-700' }
  return getCloudProviderBadgeStyle(props.cloudProvider)
})

const documentationUrl = computed(() => {
  if (!props.cloudProvider || !props.dbType) return null
  return getDocumentationUrl(props.cloudProvider, props.dbType)
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'gap-1.5 px-2 py-0.5 text-xs'
    case 'lg':
      return 'gap-2 px-4 py-2 text-base'
    default: // md
      return 'gap-2 px-3 py-1.5 text-sm'
  }
})

const logoSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-4 w-4'
    case 'lg':
      return 'h-6 w-6'
    default: // md
      return 'h-6 w-6'
  }
})

const helpIconSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-3.5 w-3.5'
    case 'lg':
      return 'h-6 w-6'
    default: // md
      return 'h-5 w-5'
  }
})

const openDocumentation = () => {
  if (documentationUrl.value) {
    window.open(documentationUrl.value, '_blank', 'noopener,noreferrer')
  }
}
</script>

<script lang="ts">
import { vTooltip } from '@/directives/tooltip'

export default {
  directives: {
    tooltip: vTooltip
  }
}
</script>
