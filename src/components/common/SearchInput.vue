<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { FunnelIcon } from '@heroicons/vue/24/outline'
import { ICON_SIZES } from '@/constants'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  autoFocus?: boolean
  size?: 'sm' | 'md'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const local = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => {
    if (v !== local.value) local.value = v
  }
)
watch(local, (v) => emit('update:modelValue', v))

const inputRef = ref<HTMLInputElement | null>(null)
onMounted(() => {
  if (props.autoFocus && inputRef.value) inputRef.value.focus()
})

const sizes = {
  sm: 'px-2 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm'
}

// Use standardized icon sizes from constants
const iconSizes = {
  sm: ICON_SIZES.SM, // h-3.5 w-3.5
  md: ICON_SIZES.BASE // h-4 w-4
}

// Computed icon size based on props
const iconClass = computed(() => iconSizes[props.size || 'sm'])

// Expose focus method
defineExpose({
  focus: () => inputRef.value?.focus()
})
</script>

<template>
  <div class="relative w-full">
    <div class="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
      <FunnelIcon :class="[iconClass, 'text-gray-400']" />
    </div>
    <input
      ref="inputRef"
      v-model="local"
      type="text"
      :placeholder="props.placeholder || 'Filter...'"
      class="border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-400 w-full pl-8"
      :class="sizes[props.size || 'sm']"
    />
  </div>
</template>
