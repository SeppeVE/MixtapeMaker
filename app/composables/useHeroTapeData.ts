import { watch } from 'vue';
import type { LocationQuery } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import { useJCardLibraryStore } from '~/stores/jcardLibrary';
import { loadMixtapes } from '~/utils/database';
import { pairTapes, type TapeData } from '~/lib/cassette3d/tapeData';
import { isTapeState, type TapeState } from '~/lib/cassette3d/animation/tapeMachine';

const AUTH_TIMEOUT_MS = 5000;
const MAX_SEED = 2000;

export interface ShelfData {
  tapes: TapeData[];
  /**
   * cloud: your mixtapes that have a J-card; samples: the built-in samples (signed
   * out, or ?fixture=); seed: generated tapes (dev, ?seed=<n>).
   */
  source: 'cloud' | 'samples' | 'seed';
  signedIn: boolean;
  /** Signed in with mixtapes, none of which has a J-card yet (for the empty state). */
  hasMixtapes: boolean;
  /** Take this tape off the shelf straight away (deep link / debug), no animation. */
  initial: { index: number; state: TapeState } | null;
  /** Loading your tapes failed. */
  error?: boolean;
}

/**
 * What goes on the shelf:
 *   ?seed=<n>        n generated tapes (dev only; the samples come first; 0 = the empty shelf)
 *   ?fixture=1|2|3   the samples, with that one presented
 *   signed in        your mixtapes that have a J-card, newest first; ?tape=<mixtape id>
 *                    presents that one
 *   signed out       the samples
 * ?debugState=<state> starts the picked tape (or the first one) in that state.
 */
export async function resolveShelfTapes(query: LocationQuery, isDev: boolean): Promise<ShelfData> {
  const debugState = firstParam(query.debugState);
  const state: TapeState | null = isTapeState(debugState) ? debugState : null;
  const initialFor = (index: number | null): ShelfData['initial'] => {
    if (state === 'onShelf') return null;
    if (index === null || index < 0) return state ? { index: 0, state } : null;
    return { index, state: state ?? 'presented' };
  };

  const seedParam = firstParam(query.seed);
  const seed = seedParam === null ? NaN : Number(seedParam);
  if (isDev && Number.isFinite(seed) && seed >= 0) {
    const { seedTapes } = await import('~/lib/cassette3d/fixtures');
    const tapes = seedTapes(Math.min(Math.round(seed), MAX_SEED));
    const wanted = firstParam(query.tape);
    const index = wanted ? tapes.findIndex((t) => t.mixtape.id === wanted) : null;
    return { tapes, source: 'seed', signedIn: true, hasMixtapes: tapes.length > 0, initial: tapes.length ? initialFor(index) : null };
  }

  const fixture = firstParam(query.fixture);
  if (fixture) {
    const { sampleTapes } = await import('~/lib/cassette3d/fixtures');
    const tapes = sampleTapes();
    const index = tapes.findIndex((t) => t.mixtape.id === `fixture-${fixture}`);
    if (index < 0) console.warn(`[cassette3d] Unknown fixture "${fixture}"`);
    return { tapes, source: 'samples', signedIn: false, hasMixtapes: true, initial: initialFor(Math.max(index, 0)) };
  }

  const auth = useAuthStore();
  await waitFor(() => !auth.loading, AUTH_TIMEOUT_MS);
  if (auth.user) {
    try {
      const jcards = useJCardLibraryStore();
      const [mixtapes] = await Promise.all([loadMixtapes(auth.user.id), jcards.loadCards()]);
      const tapes = pairTapes(mixtapes, jcards.allCards);
      const wanted = firstParam(query.tape);
      let index: number | null = null;
      if (wanted) {
        index = tapes.findIndex((t) => t.mixtape.id === wanted);
        if (index < 0) console.warn(`[cassette3d] Mixtape ${wanted} not found, or it has no J-card`);
      }
      return { tapes, source: 'cloud', signedIn: true, hasMixtapes: mixtapes.length > 0, initial: initialFor(index) };
    } catch (err) {
      console.error('[cassette3d] Could not load your mixtapes', err);
      return { tapes: [], source: 'cloud', signedIn: true, hasMixtapes: false, initial: null, error: true };
    }
  }
  const { sampleTapes } = await import('~/lib/cassette3d/fixtures');
  return { tapes: sampleTapes(), source: 'samples', signedIn: false, hasMixtapes: false, initial: initialFor(null) };
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
