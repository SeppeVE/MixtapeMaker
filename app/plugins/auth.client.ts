import { defineNuxtPlugin } from '#app';
import { useAuthStore } from '~/stores/auth';
import { useProfileStore } from '~/stores/profile';

// Initialise the Supabase auth session listener on the client, and keep the
// signed-in user's profile row in sync with it.
export default defineNuxtPlugin(() => {
  const auth = useAuthStore();
  auth.init();
  useProfileStore().init();
});
