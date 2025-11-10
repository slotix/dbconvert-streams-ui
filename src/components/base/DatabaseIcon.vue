<script setup lang="ts">
import { computed } from 'vue'
import { getDatabaseIconBgColor, getDatabaseIconTint } from '@/constants/databaseColors'
import { useIconSizes } from '@/composables/useIconSizes'
import type { IconSizeKey } from '@/constants'

interface Props {
  /** Database type (e.g., 'postgresql', 'mysql', etc.) */
  dbType: string
  /** Path to the logo image */
  logoSrc: string
  /** Icon size variant */
  size?: IconSizeKey
  /** Additional CSS classes for the container */
  containerClass?: string
  /** Additional CSS classes for the image */
  imageClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'LG',
  containerClass: '',
  imageClass: ''
})

// Get background color and filter based on database type
const iconBgColor = computed(() => getDatabaseIconBgColor(props.dbType))
const iconFilter = computed(() => getDatabaseIconTint(props.dbType))

// Get icon size classes
const { iconClass } = useIconSizes(props.size)
</script>

<template>
  <div
    :class="[
      'flex items-center justify-center shrink-0 rounded-lg p-1.5 transition-all duration-200',
      iconBgColor,
      containerClass
    ]"
  >
    <img
      :src="logoSrc"
      :alt="`${dbType} logo`"
      :class="[iconClass, 'object-contain', iconFilter, imageClass]"
    />
  </div>
</template>
