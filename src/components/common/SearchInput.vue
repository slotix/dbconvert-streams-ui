<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

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
</script>

<template>
    <input ref="inputRef" v-model="local" type="text" :placeholder="props.placeholder || 'Filter...'"
        class="border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-400 w-full"
        :class="sizes[props.size || 'sm']" />
</template>
