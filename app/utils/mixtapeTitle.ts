/** Placeholder title assigned to every brand-new mixtape draft. */
export const DEFAULT_MIXTAPE_TITLE = 'Untitled Mixtape';

/**
 * True when a mixtape hasn't been given a real name yet — blank,
 * whitespace-only, or still the default placeholder. Used to keep users
 * from saving an unnamed tape to the cloud.
 */
export function isMixtapeUntitled(title: string): boolean {
  const trimmed = title.trim();
  return trimmed.length === 0 || trimmed.toLowerCase() === DEFAULT_MIXTAPE_TITLE.toLowerCase();
}
