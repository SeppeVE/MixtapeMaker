import { watch } from 'vue';
import { defineNuxtPlugin } from '#app';
import { useAuthStore } from '~/stores/auth';
import { useProfileStore } from '~/stores/profile';
import { resumePendingCopy } from '~/composables/useCopyToLibrary';

// Initialise the Supabase auth session listener on the client, and keep the
// signed-in user's profile row in sync with it.
export default defineNuxtPlugin(() => {
  const auth = useAuthStore();
  auth.init();
  useProfileStore().init();

  // Replay a copy the visitor asked for before signing in. Watching the store
  // rather than subscribing to onAuthStateChange is deliberate: getSession()
  // and the INITIAL_SESSION event both deliver the same session, so a raw
  // subscription would fire twice, and supabase-js holds its auth lock across
  // that callback — awaiting further Supabase calls inside it can deadlock.
  // A watcher runs outside the lock, and the flag keeps it to a single replay.
  let resumed = false;
  watch(
    () => auth.user,
    (user) => {
      if (!user || resumed) return;
      resumed = true;
      void resumePendingCopy(user.id);
    },
    { immediate: true },
  );
});
