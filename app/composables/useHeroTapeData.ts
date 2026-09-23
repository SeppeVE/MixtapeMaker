import { watch } from 'vue';
import type { LocationQuery } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import { useJCardLibraryStore } from '~/stores/jcardLibrary';
import { loadMixtapes } from '~/utils/database';
import { pairTapes, type TapeData } from '~/lib/cassette3d/tapeData';

const AUTH_TIMEOUT_MS = 5000;

/**
 * Which tape the 3D view shows (until Stage 4 brings the shelf):
 *   ?fixture=1|2|3  a built-in sample (no Supabase needed)
 *   ?tape=<id>      that mixtape of the signed-in user, if it has a J-card
 *   otherwise       the user's most recently updated mixtape that has a J-card,
 *                   or sample 1 when signed out or when no mixtape has a J-card.
 */
export async function resolveHeroTape(query: LocationQuery): Promise<TapeData | null> {
  const fixture = firstParam(query.fixture);
  if (fixture) return loadFixture(fixture);

  const auth = useAuthStore();
  await waitFor(() => !auth.loading, AUTH_TIMEOUT_MS);
  if (auth.user) {
    try {
      const jcards = useJCardLibraryStore();
      const [mixtapes] = await Promise.all([loadMixtapes(auth.user.id), jcards.loadCards()]);
      const tapes = pairTapes(mixtapes, jcards.allCards);
      const wanted = firstParam(query.tape);
      const tape = (wanted && tapes.find((t) => t.mixtape.id === wanted)) || tapes[0];
      if (tape) return tape;
      if (wanted) console.warn(`[cassette3d] Mixtape ${wanted} not found, or it has no J-card`);
    } catch (err) {
      console.error('[cassette3d] Could not load your mixtapes', err);
    }
  }
  return loadFixture('1');
}

export async function loadFixture(name: string): Promise<TapeData | null> {
  const { FIXTURES } = await import('~/lib/cassette3d/fixtures');
  const make = FIXTURES[name];
  if (!make) console.warn(`[cassette3d] Unknown fixture "${name}"`);
  return make ? make() : null;
}

function firstParam(value: LocationQuery[string] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

function waitFor(condition: () => boolean, timeoutMs: number): Promise<void> {
  if (condition()) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => { stop(); resolve(); }, timeoutMs);
    const stop = watch(condition, (ok) => {
      if (!ok) return;
      clearTimeout(timer);
      stop();
      resolve();
    });
  });
}
