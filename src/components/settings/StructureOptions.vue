<template>
  <div class="space-y-6">
    <div class="border-b border-gray-200 pb-4">
      <h3 class="text-lg font-medium leading-6 text-gray-900">Database Structure Options</h3>
      <p class="mt-1 text-sm text-gray-500">
        Configure how database structures should be handled during data migration and synchronization operations.
        <a href="https://docs.dbconvert.com/streams/database-structure-options.html" target="_blank" class="text-blue-600 hover:text-blue-800 underline ml-1">
          Learn more about strategies →
        </a>
      </p>
    </div>

    <div class="space-y-4">
      <!-- Tables Strategy -->
      <div>
        <label for="tables-strategy" class="block text-sm font-medium text-gray-700 mb-2">
          Tables Strategy
        </label>
        <select
          id="tables-strategy"
          v-model="tablesStrategy"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
        >
          <option value="create_if_not_exists">Create If Not Exists (default, safe)</option>
          <option value="fail_if_exists">Fail If Exists (strict validation)</option>
          <option value="disabled">Disabled (don't create)</option>
        </select>
        <p class="mt-1 text-xs text-gray-500">
          Controls CREATE TABLE statements.
        </p>
      </div>

      <!-- Indexes Strategy -->
      <div>
        <label for="indexes-strategy" class="block text-sm font-medium text-gray-700 mb-2">
          Indexes Strategy
        </label>
        <select
          id="indexes-strategy"
          v-model="indexesStrategy"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
        >
          <option value="create_if_not_exists">Create If Not Exists (default, safe)</option>
          <option value="fail_if_exists">Fail If Exists (strict validation)</option>
          <option value="disabled">Disabled (performance tuning)</option>
        </select>
        <p class="mt-1 text-xs text-gray-500">
          Controls CREATE INDEX statements.
        </p>
      </div>

      <!-- Foreign Keys Strategy -->
      <div>
        <label for="foreign-keys-strategy" class="block text-sm font-medium text-gray-700 mb-2">
          Foreign Keys Strategy
        </label>
        <select
          id="foreign-keys-strategy"
          v-model="foreignKeysStrategy"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
        >
          <option value="create_if_not_exists">Create If Not Exists (default, safe)</option>
          <option value="fail_if_exists">Fail If Exists (strict validation)</option>
          <option value="disabled">Disabled (performance/CDC)</option>
        </select>
        <p class="mt-1 text-xs text-gray-500">
          Controls ALTER TABLE ADD CONSTRAINT statements.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStreamsStore, defaultStreamConfigOptions } from '@/stores/streamConfig'
import type { StreamConfig, StructureStrategy } from '@/types/streamConfig'

const streamsStore = useStreamsStore()
const currentStreamConfig = streamsStore.currentStreamConfig as StreamConfig

// Helper function to get structure options with defaults
const getStructureOptions = () => {
  if (!currentStreamConfig.structureOptions) {
    currentStreamConfig.structureOptions = {
      tables: defaultStreamConfigOptions.structureOptions?.tables || 'create_if_not_exists',
      indexes: defaultStreamConfigOptions.structureOptions?.indexes || 'create_if_not_exists',
      foreignKeys:
        defaultStreamConfigOptions.structureOptions?.foreignKeys || 'create_if_not_exists'
    }
  }
  return currentStreamConfig.structureOptions
}

const tablesStrategy = computed<StructureStrategy>({
  get: () => getStructureOptions().tables || 'create_if_not_exists',
  set: (value) => {
    getStructureOptions().tables = value
  }
})

const indexesStrategy = computed<StructureStrategy>({
  get: () => getStructureOptions().indexes || 'create_if_not_exists',
  set: (value) => {
    getStructureOptions().indexes = value
  }
})

const foreignKeysStrategy = computed<StructureStrategy>({
  get: () => getStructureOptions().foreignKeys || 'create_if_not_exists',
  set: (value) => {
    getStructureOptions().foreignKeys = value
  }
})
</script>
