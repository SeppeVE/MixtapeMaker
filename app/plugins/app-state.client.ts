import type { User, Session } from '@supabase/supabase-js';
import type { Mixtape, JCard } from '~/types';
import { supabase } from '~/utils/supabase';
import {
  saveMixtapeToLocal,
  loadMixtapeFromLocal,
  saveActiveCardToLocal,
  loadActiveCardFromLocal,
} from '~/utils/localStorage';
import { blankMixtape } from '~/composables/useAppMixtapeState';

/**
 * Client-side bootstrap: restores drafts from localStorage, keeps them
 * persisted, and wires the Supabase auth listener. Replaces the old
 * AuthProvider useEffect and useAppMixtapeState's localStorage effects.
 */
export default defineNuxtPlugin(() => {
  // ── Auth ────────────────────────────────────────────────────────────
  const user = useState<User | null>('auth-user', () => null);
  const session = useState<Session | null>('auth-session', () => null);
  const loading = useState<boolean>('auth-loading', () => false);

  loading.value = true;
  supabase.auth.getSession().then(({ data: { session: s } }) => {
    session.value = s;
    user.value = s?.user ?? null;
    loading.value = false;
  });

  supabase.auth.onAuthStateChange((_event, s) => {
    session.value = s;
    user.value = s?.user ?? null;
    loading.value = false;
  });

  // ── Draft restore + autosave ────────────────────────────────────────
  const mixtape = useState<Mixtape>('app-mixtape', blankMixtape);
  const activeCard = useState<JCard | null>('app-active-card', () => null);

  const savedMixtape = loadMixtapeFromLocal();
  // On the prerendered homepage the payload contains a build-time blank
  // mixtape; always replace it with the visitor's draft or a fresh blank.
  mixtape.value = savedMixtape ?? blankMixtape();

  const savedCard = loadActiveCardFromLocal();
  if (savedCard) activeCard.value = savedCard;

  watch(mixtape, (m) => saveMixtapeToLocal(m), { deep: true });
  watch(activeCard, (c) => saveActiveCardToLocal(c), { deep: true });
});
