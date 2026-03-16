<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="pb-4">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Connection Type</h2>
      <p class="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
        Pick the source you want to configure.
      </p>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div class="space-y-5">
        <section v-for="group in groupedTypes" :key="group.label">
          <div class="mb-2 px-2">
            <h3
              class="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
            >
              {{ group.label }}
            </h3>
          </div>

          <div class="space-y-2">
            <button
              v-for="dbType in group.items"
              :key="dbType.id"
              type="button"
              :disabled="isComingSoon(dbType)"
              :aria-pressed="isSelected(dbType)"
              :class="[
                'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                isComingSoon(dbType)
                  ? 'ui-surface-muted ui-border-default cursor-not-allowed opacity-70'
                  : isSelected(dbType)
                    ? 'ui-accent-selection-checked'
                    : 'ui-surface-raised ui-border-default hover:bg-(--ui-surface-muted)'
              ]"
              @click="selectType(dbType)"
            >
              <DatabaseIcon
                :dbType="dbType.type"
                :logoSrc="dbType.logo"
                size="BASE"
                containerClass="rounded-lg"
              />

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ dbType.type }}
                  </span>
                  <span
                    v-if="isComingSoon(dbType)"
                    class="ui-chip-muted inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                  >
                    Coming soon
                  </span>
                </div>
                <p class="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                  {{ getTypeDescription(dbType) }}
                </p>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DatabaseIcon from '@/components/base/DatabaseIcon.vue'
import { useConnectionsStore } from '@/stores/connections'
import { type DbType, getConnectionCategory } from '@/types/connections'

interface Props {
  selectedType?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  selectedType: null
})

const emit = defineEmits<{
  'update:selected-db-type': [dbType: DbType]
}>()

const connectionsStore = useConnectionsStore()
const comingSoonTypes = new Set(['Snowflake'])

const groupedTypes = computed(() => {
  const groups = [
    {
      label: 'Databases',
      items: connectionsStore.dbTypes.filter(
        (dbType) => getConnectionCategory(dbType) === 'database'
      )
    },
    {
      label: 'Files and Storage',
      items: connectionsStore.dbTypes.filter((dbType) => getConnectionCategory(dbType) === 'file')
    }
  ]

  return groups.filter((group) => group.items.length > 0)
})

function isComingSoon(dbType: DbType): boolean {
  return comingSoonTypes.has(dbType.type)
}

function isSelected(dbType: DbType): boolean {
  return props.selectedType?.toLowerCase() === dbType.type.toLowerCase()
}

function selectType(dbType: DbType) {
  if (isComingSoon(dbType)) {
    return
  }

  emit('update:selected-db-type', dbType)
}

function getTypeDescription(dbType: DbType): string {
  const descriptions: Record<string, string> = {
    PostgreSQL: 'Configure host, credentials, and SSL options.',
    MySQL: 'Configure host, credentials, and default database settings.',
    Snowflake: 'Warehouse-style setup is planned for a later release.',
    Files: 'Point the app at a local folder with supported data files.',
    S3: 'Connect to AWS S3 or another S3-compatible object store.'
  }

  return descriptions[dbType.type] || dbType.description || 'Set up a new connection.'
}
</script>
