/**
 * Desktop Mode Detection Composable
 *
 * Provides a reactive way to detect if the app is running in desktop (Wails) mode.
 * Use this composable to conditionally render UI elements or behavior based on platform.
 */

import { computed } from 'vue'
import { isWailsContext } from './useWailsEvents'

/**
 * Composable for desktop mode detection
 *
 * @example
 * const { isDesktop } = useDesktopMode()
 * // In template: v-if="isDesktop"
 */
export function useDesktopMode() {
  const isDesktop = computed(() => isWailsContext())

  return {
    isDesktop
  }
}
