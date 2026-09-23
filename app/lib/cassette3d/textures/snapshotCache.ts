import type { JCardSnapshot } from './jcardSnapshot';

/**
 * In-memory cache of J-card snapshots, keyed by card id + content hash, so
 * re-entering the 3D view or re-selecting a tape skips both the download of a
 * stored render and rendering in the browser. Module level: it survives leaving
 * and re-entering the route, and is gone on a full reload.
 */

export type SnapshotOrigin = 'stored' | 'runtime';

export interface CachedSnapshot {
  snapshot: JCardSnapshot;
  /** Where the snapshot originally came from. */
  origin: SnapshotOrigin;
}

const MAX_ENTRIES = 6;
const cache = new Map<string, Promise<CachedSnapshot>>();

export function getSnapshot(key: string, load: () => Promise<CachedSnapshot>): Promise<CachedSnapshot> {
  const hit = cache.get(key);
  if (hit) {
    // Refresh its place in the LRU order.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const pending = load();
  cache.set(key, pending);
  pending.catch(() => cache.delete(key));
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return pending;
}

export function isSnapshotCached(key: string): boolean {
  return cache.has(key);
}

export function clearSnapshotCache() {
  cache.clear();
}
