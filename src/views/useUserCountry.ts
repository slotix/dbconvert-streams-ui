import { useUser } from 'vue-clerk'
import { computed } from 'vue'

export function useUserCountry() {
  const { isSignedIn, user } = useUser()

  const country = computed(() => {
    if (!isSignedIn || !user.value) return null

    // Check if country is stored in custom fields
    if (user.value.publicMetadata && user.value.publicMetadata.country) {
      return user.value.publicMetadata.country
    }

    // Fallback to email domain heuristic
    return user.value.primaryEmailAddress?.emailAddress?.split('@')[1]?.split('.').pop() || null
  })

  return { country }
}
