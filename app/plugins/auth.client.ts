import { defineNuxtPlugin } from '#app';
import { useAuthStore } from '~/stores/auth';

// Initialise the Supabase auth session listener on the client.
export default defineNuxtPlugin(() => {
  const auth = useAuthStore();
  auth.init();
});
