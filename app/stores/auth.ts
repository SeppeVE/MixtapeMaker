import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '~/utils/supabase';

/** Supabase auth session. Replaces the React AuthContext. */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  // In SSR (no window) render logged-out with no loading spinner; on the client
  // start in loading state until the initial getSession() resolves.
  const loading = ref(import.meta.client);

  let started = false;

  /** Wire up the session listener. Call once on the client (auth plugin). */
  function init() {
    if (started || !import.meta.client) return;
    started = true;

    supabase.auth.getSession().then(({ data }) => {
      session.value = data.session;
      user.value = data.session?.user ?? null;
      loading.value = false;
    });

    supabase.auth.onAuthStateChange((_event, s) => {
      session.value = s;
      user.value = s?.user ?? null;
      loading.value = false;
    });
  }

  async function signUp(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async function signInWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { user, session, loading, init, signUp, signIn, signInWithGoogle, signOut };
});
