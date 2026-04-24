import { Mixtape, JCard } from '../types';

const STORAGE_KEY = 'mixtape-current';

/**
 * Save mixtape to local storage
 */
export const saveMixtapeToLocal = (mixtape: Mixtape): void => {
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
