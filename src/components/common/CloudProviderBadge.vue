<template>
  <div
    v-if="isCloudConnection(cloudProvider)"
    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
    :class="[badgeStyle.bgColor, badgeStyle.textColor, sizeClasses]"
    :title="`Hosted on ${displayName}`"
  >
    <img
      v-if="providerLogo"
      :src="providerLogo"
      :alt="`${displayName} logo`"
      :class="logoSizeClasses"
      class="object-contain flex-shrink-0"
    />
    <CloudIcon v-else :class="logoSizeClasses" class="flex-shrink-0" />
    <span class="whitespace-nowrap">{{ displayName }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CloudIcon } from '@heroicons/vue/24/outline'
import {
  isCloudConnection,
  getCloudProviderDisplayName,
  getCloudProviderLogo,
  getCloudProviderBadgeStyle
} from '@/utils/cloudProviderUtils'

interface Props {
  cloudProvider?: string
  size?: 'sm' | 'md' | 'lg'
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

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'px-2 py-1 text-xs'
    case 'lg':
      return 'px-4 py-2 text-base'
    default: // md
      return 'px-3 py-1.5 text-sm'
  }
})

const logoSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-3 w-3'
    case 'lg':
      return 'h-5 w-5'
    default: // md
      return 'h-4 w-4'
  }
})
</script> 