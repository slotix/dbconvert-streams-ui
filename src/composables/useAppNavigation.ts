import { computed, type Component } from 'vue'
import { RefreshCw, Sheet } from 'lucide-vue-next'

export type AppNavigationItem = {
  name: string
  href: string
  icon: Component
  show?: boolean
}

export function useAppNavigation() {
  const navigation = computed<AppNavigationItem[]>(() => {
    return [
      {
        name: 'Data Explorer',
        href: '/explorer',
        icon: Sheet,
        show: true
      },
      {
        name: 'Streams',
        href: '/streams',
        icon: RefreshCw,
        show: true
      }
    ].filter((item) => item.show)
  })

  return {
    navigation
  }
}
