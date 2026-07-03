import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '~/utils/supabase';

export function useAuthState() {
  return {
    user: useState<User | null>('auth-user', () => null),
    session: useState<Session | null>('auth-session', () => null),
    // In SSR/prerender there is no session; components render in logged-out state.
    loading: useState<boolean>('auth-loading', () => false),
  };
}

export function useAuth() {
  const { user, session, loading } = useAuthState();

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signUp, signIn, signInWithGoogle, signOut };
}
