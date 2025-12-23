/**
 * Composable for Lucide icons with desktop zoom compensation
 * Provides stroke width that compensates for CSS zoom scaling in desktop mode
 */
import { computed } from 'vue'
import { useDesktopMode } from '@/composables/useDesktopMode'

/**
 * Returns stroke width for Lucide icons
 * Uses thinner stroke on desktop to compensate for CSS zoom scaling
 */
export function useLucideIcons() {
  const { isDesktop } = useDesktopMode()

  // Thinner stroke for desktop to compensate for CSS zoom scaling
  // At 200% zoom, a 1.0 stroke looks like 2.0, matching web default
  const strokeWidth = computed(() => (isDesktop.value ? 1.0 : 1.0))

  return {
    strokeWidth
  }
}
