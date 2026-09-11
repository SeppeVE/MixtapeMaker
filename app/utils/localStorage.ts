import { Mixtape, JCard } from '../types';

const isClient = typeof window !== 'undefined';
const STORAGE_KEY = 'mixtape-current';

/**
 * Save mixtape to local storage
 */
export const saveMixtapeToLocal = (mixtape: Mixtape): void => {
  if (!isClient) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mixtape));
  } catch (error) {
    console.error('Failed to save to local storage:', error);
  }
};

/**
 * Load mixtape from local storage
 */
export const loadMixtapeFromLocal = (): Mixtape | null => {
  if (!isClient) return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load from local storage:', error);
    return null;
  }
};

/**
 * Clear mixtape from local storage
 */
export const clearMixtapeFromLocal = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear local storage:', error);
  }
};

// ── Active (designer) JCard local storage ────────────────────────────────────
const ACTIVE_CARD_KEY = 'jcard-active';

export const saveActiveCardToLocal = (card: JCard | null): void => {
  try {
    if (card) {
      localStorage.setItem(ACTIVE_CARD_KEY, JSON.stringify(card));
    } else {
      localStorage.removeItem(ACTIVE_CARD_KEY);
    }
  } catch { /* ignore */ }
};

export const loadActiveCardFromLocal = (): JCard | null => {
  try {
    const stored = localStorage.getItem(ACTIVE_CARD_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch { return null; }
};

// ── Pending cloud-save id cache ──────────────────────────────────────────────
// Maps a mixtape's local (pre-save) id to the cloud id minted for it. This is
// a fast-path only: database.ts derives that cloud id deterministically from
// the local id (deterministicUuid), so a cache miss just costs one extra
// loadMixtape() existence check, not a duplicate row — the recomputed id is
// always the same one. The cache exists to skip that check on repeat saves.
//
// Capped at PENDING_SAVE_IDS_CAP entries (oldest evicted first) so an
// abandoned draft that's saved once and never finished doesn't leave this
// blob growing forever in localStorage.
const PENDING_SAVE_IDS_KEY = 'mixtape-pending-save-ids';
const PENDING_SAVE_IDS_CAP = 200;

type PendingSaveIds = Record<string, string>;

function loadPendingSaveIds(): PendingSaveIds {
  if (!isClient) return {};
  try {
    return JSON.parse(localStorage.getItem(PENDING_SAVE_IDS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export const getPendingSaveId = (localId: string): string | null => {
  return loadPendingSaveIds()[localId] ?? null;
};

export const setPendingSaveId = (localId: string, cloudId: string): void => {
  if (!isClient) return;
  try {
    const ids = loadPendingSaveIds();
    ids[localId] = cloudId;
    const keys = Object.keys(ids);
    if (keys.length > PENDING_SAVE_IDS_CAP) {
      for (const key of keys.slice(0, keys.length - PENDING_SAVE_IDS_CAP)) delete ids[key];
    }
    localStorage.setItem(PENDING_SAVE_IDS_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
};

export const clearPendingSaveId = (localId: string): void => {
  if (!isClient) return;
  try {
    const ids = loadPendingSaveIds();
    if (!(localId in ids)) return;
    delete ids[localId];
    localStorage.setItem(PENDING_SAVE_IDS_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
};

// ── JCard local storage ──────────────────────────────────────────────────────
const JCARDS_KEY = 'jcards';

export const loadJCardsFromLocal = (): JCard[] => {
  try { return JSON.parse(localStorage.getItem(JCARDS_KEY) ?? '[]'); } catch { return []; }
};

export const saveJCardToLocal = (card: JCard): void => {
  const cards = loadJCardsFromLocal();
  const idx = cards.findIndex(c => c.id === card.id);
  if (idx >= 0) cards[idx] = card; else cards.unshift(card);
  try { localStorage.setItem(JCARDS_KEY, JSON.stringify(cards)); } catch { /* ignore */ }
};

export const deleteJCardFromLocal = (id: string): void => {
  try { localStorage.setItem(JCARDS_KEY, JSON.stringify(loadJCardsFromLocal().filter(c => c.id !== id))); } catch { /* ignore */ }
};
