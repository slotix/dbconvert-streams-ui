<script setup lang="ts">
import { computed, type Component } from 'vue'
import DatabaseIcon from '@/components/base/DatabaseIcon.vue'

type Tone = 'blue' | 'teal' | 'orange' | 'purple' | 'sky' | 'amber' | 'green' | 'slate'

interface Props {
  icon?: Component
  tone?: Tone
  dbType?: string
  logoSrc?: string
}

const props = withDefaults(defineProps<Props>(), {
  tone: 'slate',
  icon: undefined,
  dbType: '',
  logoSrc: ''
})

const toneClasses: Record<Tone, { container: string; icon: string }> = {
  blue: {
    container: 'bg-[#dce6f7] border-[#bed0ea] dark:bg-[#23385A] dark:border-[#456A9E]/40',
    icon: 'text-[#345b9a] dark:text-[#d7e8ff]'
  },
  teal: {
    container: 'bg-[#d7e7eb] border-[#b7cfd5] dark:bg-[#113B49] dark:border-[#1F5E74]/45',
    icon: 'text-[#1f5e74] dark:text-[#c8edf8]'
  },
  orange: {
    container: 'bg-[#f2e3ce] border-[#e2caab] dark:bg-[#50391d] dark:border-[#9c6d29]/40',
    icon: 'text-[#9c6d29] dark:text-[#f3d9b1]'
  },
  purple: {
    container: 'bg-[#ece2f4] border-[#d9c6e8] dark:bg-[#47315f] dark:border-[#8d63b8]/40',
    icon: 'text-[#7c57a0] dark:text-[#eadbfb]'
  },
  sky: {
    container: 'bg-[#d9edf3] border-[#b9d9e3] dark:bg-[#0F4656] dark:border-[#19839F]/40',
    icon: 'text-[#19839f] dark:text-[#c8f1fb]'
  },
  amber: {
    container: 'bg-[#f4e8c4] border-[#e4d39d] dark:bg-[#544116] dark:border-[#a78424]/40',
    icon: 'text-[#a78424] dark:text-[#f4e5b4]'
  },
  green: {
    container: 'bg-[#d9ece6] border-[#bcd9d1] dark:bg-[#12473D] dark:border-[#1E6B5A]/40',
    icon: 'text-[#1e6b5a] dark:text-[#d3f3e7]'
  },
  slate: {
    container: 'bg-[#ececef] border-[#d5d7db] dark:bg-[#2B2D31] dark:border-[#4B5058]/45',
    icon: 'text-[#4b5058] dark:text-[#e7e9ec]'
  }
}

const usesLogo = computed(() => Boolean(props.dbType && props.logoSrc))
const classes = computed(() => toneClasses[props.tone])
</script>

<template>
  <DatabaseIcon
    v-if="usesLogo"
    :db-type="dbType"
    :logo-src="logoSrc"
    size="MD"
    container-class="h-11 w-11 rounded-xl border border-white/50 p-2 shadow-sm dark:border-white/8 dark:shadow-black/25"
  />
  <div
    v-else
    :class="[
      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm dark:shadow-black/25',
      classes.container
    ]"
  >
    <component
      :is="icon"
      v-if="icon"
      :class="['h-5 w-5 shrink-0', classes.icon]"
      aria-hidden="true"
    />
  </div>
</template>
