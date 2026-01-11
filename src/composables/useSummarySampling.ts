import { computed, ref, watch, type Ref } from 'vue'

const SAMPLE_PRESETS = [100, 25, 10, 5, 1] as const

export type SamplePreset = (typeof SAMPLE_PRESETS)[number] | 'custom'

export function useSummarySampling(storageKey: Ref<string>) {
  const selectedSamplePreset = ref<SamplePreset>(100)
  const customSamplePercent = ref<number>(10)
  let suppressPersist = false

  function presetKey(key: string): string {
    return `${key}.preset`
  }

  function customKey(key: string): string {
    return `${key}.custom`
  }

  function loadSettings(key: string): void {
    if (typeof window === 'undefined') return
    if (!key) return
    suppressPersist = true
    try {
      selectedSamplePreset.value = 100
      customSamplePercent.value = 10

      const rawPreset = window.localStorage.getItem(presetKey(key))
      if (rawPreset === 'custom') {
        selectedSamplePreset.value = 'custom'
      } else if (rawPreset != null) {
        const parsed = Number.parseInt(rawPreset, 10)
        if ((SAMPLE_PRESETS as readonly number[]).includes(parsed)) {
          selectedSamplePreset.value = parsed as (typeof SAMPLE_PRESETS)[number]
        }
      }

      const rawCustom = window.localStorage.getItem(customKey(key))
      if (rawCustom != null) {
        const parsed = Number.parseInt(rawCustom, 10)
        if (!Number.isNaN(parsed)) {
          customSamplePercent.value = Math.min(100, Math.max(1, parsed))
        }
      }
    } catch {
      // Ignore localStorage failures (e.g. privacy mode)
    } finally {
      suppressPersist = false
    }
  }

  function persistSettings(key: string): void {
    if (typeof window === 'undefined') return
    if (suppressPersist) return
    if (!key) return
    try {
      window.localStorage.setItem(presetKey(key), String(selectedSamplePreset.value))
      window.localStorage.setItem(customKey(key), String(customSamplePercent.value))
    } catch {
      // Ignore localStorage failures
    }
  }

  watch(
    storageKey,
    (key) => {
      loadSettings(key)
    },
    { immediate: true }
  )

  watch([selectedSamplePreset, customSamplePercent, storageKey], () => {
    persistSettings(storageKey.value)
  })

  const effectiveSamplePercent = computed<number>(() => {
    if (selectedSamplePreset.value === 'custom') {
      return Math.min(100, Math.max(1, Math.round(customSamplePercent.value)))
    }
    return selectedSamplePreset.value
  })

  const requestSamplePercent = computed<number | undefined>(() => {
    return effectiveSamplePercent.value >= 100 ? undefined : effectiveSamplePercent.value
  })

  return {
    SAMPLE_PRESETS,
    selectedSamplePreset,
    customSamplePercent,
    effectiveSamplePercent,
    requestSamplePercent
  }
}
