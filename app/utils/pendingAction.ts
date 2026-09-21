import { Mixtape } from '../types';

const isClient = typeof window !== 'undefined';
const STORAGE_KEY = 'pending-action';
const TTL_MS = 30 * 60 * 1000;
// A tape snapshot is small (titles + track ids), but never let a pathological
// one crowd out the editor drafts that share this origin's storage budget.
const MAX_BYTES = 256 * 1024;

/**
 * Something the visitor asked for while signed out, parked until a session
 * shows up. J-cards keep only the id: the copy re-reads the card from the
 * cloud anyway, and card content can be megabytes of inlined data: URLs.
 * Mixtapes keep the whole tape, because copying one is a purely client-side
 * operation with nothing to re-read — and a tape opened through a share link
 * isn't public, so an id alone would be unresolvable on the way back.
 */
export type PendingAction =
  | { kind: 'copy-jcard'; id: string; createdAt: number }
  | { kind: 'copy-mixtape'; mixtape: Mixtape; createdAt: number };

export const savePendingAction = (action: PendingAction): void => {
  if (!isClient) return;
  try {
    const payload = JSON.stringify(action);
    if (payload.length > MAX_BYTES) return;
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (error) {
    console.error('Failed to save pending action:', error);
  }
};

/** The parked action, or null when there is none, it can't be read, or it has expired. */
export const loadPendingAction = (): PendingAction | null => {
  if (!isClient) return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const action = JSON.parse(stored) as PendingAction;
    if (!action?.kind || typeof action.createdAt !== 'number') return null;
    if (Date.now() - action.createdAt > TTL_MS) {
      clearPendingAction();
      return null;
    }
    return action;
  } catch {
    return null;
  }
};

export const clearPendingAction = (): void => {
  if (!isClient) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
};
