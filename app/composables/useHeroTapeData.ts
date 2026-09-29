import { watch } from 'vue';
import type { LocationQuery } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import { useJCardLibraryStore } from '~/stores/jcardLibrary';
import { loadMixtapes, loadPublicMixtapesByUser, searchPublicMixtapes } from '~/utils/database';
import { listPublicJCardsByUser, listPublicJCardsForMixtapes } from '~/utils/jcardDatabase';
import { loadProfileByUsername, loadProfilesByIds } from '~/utils/profileDatabase';
import { pairTapes, type TapeData } from '~/lib/cassette3d/tapeData';
import { isTapeState, type TapeState } from '~/lib/cassette3d/animation/states';
import { reportError } from '~/lib/cassette3d/report';

const AUTH_TIMEOUT_MS = 5000;
const MAX_SEED = 2000;
/** Explore's shelf: this many of the newest public mixtapes. */
const COMMUNITY_TAPES = 150;

export interface ShelfData {
  tapes: TapeData[];
  /**
   * cloud: your mixtapes that have a J-card; samples: the built-in samples (signed
   * out, or ?fixture=); seed: generated tapes (dev, ?seed=<n>); public: one
   * user's public mixtapes (their profile's shelf); community: everyone's, the
   * newest public mixtapes (Explore). On the public shelves a mixtape without a
   * public J-card wears a plain paper one.
   */
  source: 'cloud' | 'samples' | 'seed' | 'public' | 'community';
  signedIn: boolean;
  /** Signed in with mixtapes, none of which has a J-card yet (for the empty state; the public shelves: any public mixtapes). */
  hasMixtapes: boolean;
  /** Take this tape off the shelf straight away (deep link / debug), no animation. */
  initial: { index: number; state: TapeState } | null;
  /** Loading your tapes failed. */
  error?: boolean;
  /** Every mixtape id you have in the cloud, J-card or not (to spot an unsaved draft). */
  mixtapeIds?: string[];
  /** ?tape= asked for a tape that isn't on this shelf. */
  missingTape?: boolean;
  /** The public shelf's owner. */
  owner?: PublicShelfOwner;
  /** The community shelf: each tape's author (user id → username), where known. */
  authors?: Record<string, string>;
}

export interface PublicShelfOwner {
  username: string;
  /** No such user, or their profile is private (and it isn't yours). */
  status: 'ok' | 'notFound' | 'private';
  /** It's your own profile. */
  isYou: boolean;
}

/** Which shelf to show: your library, a user's public tapes (/user/{username}/3d), or everyone's (/explore/3d). */
export interface ShelfScope {
  username?: string;
  community?: boolean;
}

/**
 * What goes on the shelf:
 *   ?seed=<n>        n generated tapes (dev only; the samples come first; 0 = the empty shelf)
 *   ?fixture=1|2|3   the samples, with that one presented
 *   signed in        your mixtapes that have a J-card, newest first; ?tape=<mixtape id>
 *                    presents that one
 *   signed out       the samples (?tape=fixture-<n> presents one)
 * ?debugState=<state> starts the picked tape (or the first one) in that state.
 */
export async function resolveShelfTapes(query: LocationQuery, isDev: boolean, scope: ShelfScope = {}): Promise<ShelfData> {
  // ?debugState=, ?seed= and ?fixture= are dev-build tools (Stage 8); ?tape= works everywhere.
  const debugState = isDev ? firstParam(query.debugState) : null;
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

  const fixture = isDev ? firstParam(query.fixture) : null;
  if (fixture) {
    const { sampleTapes } = await import('~/lib/cassette3d/fixtures');
    const tapes = sampleTapes();
    const index = tapes.findIndex((t) => t.mixtape.id === `fixture-${fixture}`);
    if (index < 0) console.warn(`[cassette3d] Unknown fixture "${fixture}"`);
    return { tapes, source: 'samples', signedIn: false, hasMixtapes: true, initial: initialFor(Math.max(index, 0)) };
  }

  const auth = useAuthStore();
  await waitFor(() => !auth.loading, AUTH_TIMEOUT_MS);
  if (scope.username) return resolvePublicShelf(scope.username, query, initialFor, auth.user?.id ?? null);
  if (scope.community) return resolveCommunityShelf(query, initialFor, auth.user?.id ?? null);
  if (auth.user) {
    try {
      const jcards = useJCardLibraryStore();
      const [mixtapes] = await Promise.all([loadMixtapes(auth.user.id), jcards.loadCards()]);
      const tapes = pairTapes(mixtapes, jcards.allCards);
      const { index, missingTape } = findWanted(tapes, query);
      return {
        tapes,
        source: 'cloud',
        signedIn: true,
        hasMixtapes: mixtapes.length > 0,
        initial: initialFor(index),
        mixtapeIds: mixtapes.map((m) => m.id),
        missingTape,
      };
    } catch (err) {
      console.error('[cassette3d] Could not load your mixtapes', err);
      reportError(err, 'loadTapes');
      return { tapes: [], source: 'cloud', signedIn: true, hasMixtapes: false, initial: null, error: true };
    }
  }
  const { sampleTapes } = await import('~/lib/cassette3d/fixtures');
  const tapes = sampleTapes();
  const { index, missingTape } = findWanted(tapes, query);
  return { tapes, source: 'samples', signedIn: false, hasMixtapes: false, initial: initialFor(index), mixtapeIds: [], missingTape };
}

/**
 * A user's public shelf, as their profile page lists it: public, non-copy mixtapes
 * with their public J-cards (plain paper ones where they have none). A private profile is empty unless it's yours
 * (the profile page shows its owner their own public items the same way).
 */
async function resolvePublicShelf(
  username: string,
  query: LocationQuery,
  initialFor: (index: number | null) => ShelfData['initial'],
  viewerId: string | null,
): Promise<ShelfData> {
  const empty = (owner: PublicShelfOwner, error = false): ShelfData => ({
    tapes: [], source: 'public', signedIn: !!viewerId, hasMixtapes: false, initial: null, owner, error,
  });
  const name = username.toLowerCase();
  try {
    const profile = await loadProfileByUsername(name);
    if (!profile) return empty({ username: name, status: 'notFound', isYou: false });
    const isYou = profile.id === viewerId;
    const owner: PublicShelfOwner = { username: profile.username, status: 'ok', isYou };
    if (profile.isPrivate && !isYou) return empty({ ...owner, status: 'private' });
    const [mixtapes, jcards] = await Promise.all([loadPublicMixtapesByUser(profile.id), listPublicJCardsByUser(profile.id)]);
    const tapes = pairTapes(mixtapes, jcards, { plain: true });
    const { index, missingTape } = findWanted(tapes, query);
    return {
      tapes, source: 'public', signedIn: !!viewerId, hasMixtapes: mixtapes.length > 0, initial: initialFor(index), missingTape, owner,
    };
  } catch (err) {
    console.error(`[cassette3d] Could not load @${name}'s public tapes`, err);
    reportError(err, 'loadPublicTapes');
    return empty({ username: name, status: 'ok', isYou: false }, true);
  }
}

/**
 * Explore's shelf: the newest public mixtapes, as the Explore grid lists them, with
 * their public J-cards (plain paper ones where they have none) and their authors'
 * usernames for the bylines.
 */
async function resolveCommunityShelf(
  query: LocationQuery,
  initialFor: (index: number | null) => ShelfData['initial'],
  viewerId: string | null,
): Promise<ShelfData> {
  try {
    const { mixtapes } = await searchPublicMixtapes('', COMMUNITY_TAPES, 0);
    const jcards = await listPublicJCardsForMixtapes(mixtapes.map((m) => m.id));
    const tapes = pairTapes(mixtapes, jcards, { plain: true });
    // Bylines are best-effort, as on the Explore grid.
    const profiles = await loadProfilesByIds(tapes.map((t) => t.mixtape.userId ?? '')).catch(() => new Map());
    const authors = Object.fromEntries([...profiles].map(([id, p]) => [id, p.username]));
    const { index, missingTape } = findWanted(tapes, query);
    return {
      tapes, source: 'community', signedIn: !!viewerId, hasMixtapes: mixtapes.length > 0, initial: initialFor(index), missingTape, authors,
    };
  } catch (err) {
    console.error('[cassette3d] Could not load the public tapes', err);
    reportError(err, 'loadCommunityTapes');
    return { tapes: [], source: 'community', signedIn: !!viewerId, hasMixtapes: false, initial: null, error: true };
  }
}

/** The tape ?tape=<mixtape id> asks for, if it's on the shelf. */
function findWanted(tapes: TapeData[], query: LocationQuery): { index: number | null; missingTape: boolean } {
  const wanted = firstParam(query.tape);
  if (!wanted) return { index: null, missingTape: false };
  const index = tapes.findIndex((t) => t.mixtape.id === wanted);
  if (index < 0) console.warn(`[cassette3d] Mixtape ${wanted} is not on this shelf`);
  return { index: index < 0 ? null : index, missingTape: index < 0 };
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
