<script setup lang="ts">
import { computed } from 'vue'
import { useSchemaStore } from '@/stores/schema'
import MermaidERD from './MermaidERD.vue'

const schemaStore = useSchemaStore()

// Expose store data for the ERD
const tables = computed(() => schemaStore.tables)
const relationships = computed(() => schemaStore.relationships)
</script>

<template>
    <div class="schema-viewer">
        <MermaidERD :tables="tables" :relationships="relationships" />
    </div>
</template>

<style scoped>
.schema-viewer {
    width: 100%;
    height: 100%;
    position: relative;
    background: white;
    display: flex;
}
</style>