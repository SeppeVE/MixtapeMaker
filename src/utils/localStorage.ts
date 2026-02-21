import { Mixtape } from '../types';

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
