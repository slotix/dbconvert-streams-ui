import { describe, it, expect } from 'vitest'
import router from '@/router'
import { useAppNavigation } from '@/composables/useAppNavigation'

describe('manifest navigation', () => {
  it('registers the manifests route', () => {
    const route = router.resolve('/manifests')
    expect(route.name).toBe('Manifests')
  })

  it('adds manifests to the app navigation', () => {
    const { navigation } = useAppNavigation()
    expect(
      navigation.value.some((item) => item.name === 'Manifests' && item.href === '/manifests')
    ).toBe(true)
  })
})
