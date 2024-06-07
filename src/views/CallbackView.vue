<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <h1 class="text-2xl font-semibold">Callback View</h1>
      <p>Handling redirect, please wait...</p>
    </div>
  </div>
</template>

<script>
import { useCommonStore } from '@/stores/common.js'
import { kobbleClient } from '@/kobble/index.ts'
export default {
  name: 'CallbackView',
  async mounted() {
    const commonStore = useCommonStore();
    try {
      // Handle the redirect and process the authentication response
      await kobbleClient.handleRedirectCallback();

      // Fetch the user information after successful login
      const user = await kobbleClient.getUser();

      if (user) {
        commonStore.setUser(user);
      } else {
        console.error('No user information available');
      }
      // const isAuthenticated = await kobbleClient.isAuthenticated()
      // if (isAuthenticated) {
      //   console.log('User is authenticated');
      // } else {
      //   console.log('User is not authenticated');
      // }
      // Retrieve the pre-authentication path from session storage
      const preAuthPath = sessionStorage.getItem('preAuthPath') || '/';

      // Redirect to the saved path
      this.$router.replace(preAuthPath);
    } catch (e) {
      console.error('Error handling redirect callback:', e);
      // Optionally, you can redirect to an error page or show an error message
    }
  }
}
</script>
