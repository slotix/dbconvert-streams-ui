<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { FunnelIcon } from '@heroicons/vue/24/outline'

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

const iconSizes = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4'
}
</script>

<template>
  <div class="relative w-full">
    <div class="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
      <FunnelIcon :class="[iconSizes[props.size || 'sm'], 'text-gray-400']" />
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
